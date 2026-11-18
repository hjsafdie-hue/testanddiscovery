import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMemo } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { cancelRestDone, haptic, scheduleRestDone } from './device';
import { BUILT_IN_EXERCISES } from './exercises-data';
import { allTimeBests, detectPrs, sessionsFor, warmupRamp } from './stats';
import type {
  BodyweightEntry,
  Exercise,
  RestTimer,
  Routine,
  RoutineExercise,
  Settings,
  SetKind,
  Workout,
  WorkoutExercise,
  WorkoutSet,
} from './types';

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

const DEFAULT_SETTINGS: Settings = {
  unit: 'kg',
  defaultRestSec: 120,
  autoStartRest: true,
  barWeightKg: 20,
  haptics: true,
  keepAwake: true,
  restNotifications: true,
  weeklyGoal: 3,
};

function rx(exerciseId: string, sets: number, reps: number, restSec = 120): RoutineExercise {
  return { id: uid(), exerciseId, sets, reps, restSec };
}

const STARTER_ROUTINES: Routine[] = [
  {
    id: 'starter-push',
    name: 'Push',
    exercises: [
      rx('bench-press', 4, 6, 180),
      rx('overhead-press', 3, 8, 150),
      rx('incline-dumbbell-press', 3, 10),
      rx('cable-lateral-raise', 3, 15, 60),
      rx('triceps-pushdown', 3, 12, 60),
    ],
  },
  {
    id: 'starter-pull',
    name: 'Pull',
    exercises: [
      rx('deadlift', 3, 5, 180),
      rx('pull-up', 3, 8, 120),
      rx('seated-cable-row', 3, 10),
      rx('face-pull', 3, 15, 60),
      rx('hammer-curl', 3, 12, 60),
    ],
  },
  {
    id: 'starter-legs',
    name: 'Legs',
    exercises: [
      rx('back-squat', 4, 6, 180),
      rx('romanian-deadlift', 3, 8, 150),
      rx('leg-press', 3, 12),
      rx('lying-leg-curl', 3, 12, 90),
      rx('standing-calf-raise', 4, 15, 60),
    ],
  },
  {
    id: 'starter-full',
    name: 'Full Body',
    exercises: [
      rx('back-squat', 3, 8, 150),
      rx('bench-press', 3, 8, 150),
      rx('barbell-row', 3, 8),
      rx('overhead-press', 2, 10),
      rx('plank', 3, 1, 60),
    ],
  },
];

type State = {
  customExercises: Exercise[];
  exerciseNotes: Record<string, string>;
  history: Workout[];
  routines: Routine[];
  active: Workout | null;
  rest: RestTimer;
  settings: Settings;
  bodyweight: BodyweightEntry[];
};

type Actions = {
  // workout lifecycle
  startWorkout: (routineId?: string) => void;
  finishWorkout: () => string | null;
  discardWorkout: () => void;
  renameActive: (name: string) => void;
  setActiveNotes: (notes: string) => void;
  // workout editing
  addExercises: (exerciseIds: string[]) => void;
  removeExercise: (entryId: string) => void;
  moveExercise: (entryId: string, dir: -1 | 1) => void;
  setExerciseNotes: (entryId: string, notes: string) => void;
  setExerciseRest: (entryId: string, restSec: number) => void;
  toggleSuperset: (entryId: string) => void;
  addSet: (entryId: string) => void;
  addWarmups: (entryId: string) => void;
  removeSet: (entryId: string, setId: string) => void;
  updateSet: (entryId: string, setId: string, patch: Partial<WorkoutSet>) => void;
  cycleSetKind: (entryId: string, setId: string) => void;
  toggleSetDone: (entryId: string, setId: string, fallback?: Partial<WorkoutSet>) => void;
  // rest
  startRest: (sec: number, label?: string) => void;
  adjustRest: (deltaSec: number) => void;
  stopRest: () => void;
  // routines
  createRoutine: (name?: string, exerciseIds?: string[]) => string;
  saveActiveAsRoutine: () => string | null;
  updateRoutine: (id: string, patch: Partial<Omit<Routine, 'id'>>) => void;
  deleteRoutine: (id: string) => void;
  addToRoutine: (id: string, exerciseIds: string[]) => void;
  updateRoutineExercise: (id: string, rowId: string, patch: Partial<RoutineExercise>) => void;
  removeFromRoutine: (id: string, rowId: string) => void;
  moveInRoutine: (id: string, rowId: string, dir: -1 | 1) => void;
  // history
  deleteWorkout: (id: string) => void;
  // library
  createExercise: (e: Omit<Exercise, 'id' | 'custom'>) => string;
  deleteExercise: (id: string) => void;
  setExerciseNote: (exerciseId: string, note: string) => void;
  // misc
  updateSettings: (patch: Partial<Settings>) => void;
  addBodyweight: (kg: number) => void;
  removeBodyweight: (id: string) => void;
  loadSampleData: () => void;
  resetAll: () => void;
};

export type Store = State & Actions;

const initial: State = {
  customExercises: [],
  exerciseNotes: {},
  history: [],
  routines: STARTER_ROUTINES,
  active: null,
  rest: { endsAt: null, durationSec: 0 },
  settings: DEFAULT_SETTINGS,
  bodyweight: [],
};

function exerciseById(state: State, id: string): Exercise | undefined {
  return BUILT_IN_EXERCISES.find((e) => e.id === id) ?? state.customExercises.find((e) => e.id === id);
}

function newSet(kind: SetKind = 'normal', from?: Partial<WorkoutSet>): WorkoutSet {
  return { id: uid(), kind, done: false, weight: from?.weight, reps: from?.reps, seconds: from?.seconds };
}

function timeOfDayName(ts: number) {
  const h = new Date(ts).getHours();
  if (h < 11) return 'Morning Workout';
  if (h < 16) return 'Afternoon Workout';
  return 'Evening Workout';
}

/** Build a workout entry for an exercise, mirroring the number of sets from last time. */
function entryFor(state: State, exerciseId: string, opts?: { sets?: number; reps?: number; restSec?: number }): WorkoutExercise {
  const last = sessionsFor(exerciseId, state.history)[0];
  const count = opts?.sets ?? Math.max(1, last?.sets.filter((s) => s.kind !== 'warmup').length ?? 3);
  return {
    id: uid(),
    exerciseId,
    restSec: opts?.restSec,
    targetReps: opts?.reps,
    sets: Array.from({ length: count }, () => newSet()),
  };
}

function mapEntry(w: Workout, entryId: string, fn: (e: WorkoutExercise) => WorkoutExercise): Workout {
  return { ...w, exercises: w.exercises.map((e) => (e.id === entryId ? fn(e) : e)) };
}

function move<T extends { id: string }>(list: T[], id: string, dir: -1 | 1): T[] {
  const i = list.findIndex((x) => x.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= list.length) return list;
  const copy = list.slice();
  [copy[i], copy[j]] = [copy[j], copy[i]];
  return copy;
}

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      ...initial,

      startWorkout: (routineId) => {
        const s = get();
        if (s.active) return;
        const now = Date.now();
        const routine = routineId ? s.routines.find((r) => r.id === routineId) : undefined;
        const exercises = routine
          ? routine.exercises.map((r) => entryFor(s, r.exerciseId, { sets: r.sets, reps: r.reps, restSec: r.restSec }))
          : [];
        set({
          active: { id: uid(), name: routine?.name ?? timeOfDayName(now), startedAt: now, exercises, routineId },
          routines: routine ? s.routines.map((r) => (r.id === routine.id ? { ...r, lastUsedAt: now } : r)) : s.routines,
        });
      },

      finishWorkout: () => {
        const { active, history } = get();
        if (!active) return null;
        // Keep only completed sets; drop exercises with nothing done.
        const exercises = active.exercises
          .map((e) => ({ ...e, sets: e.sets.filter((x) => x.done) }))
          .filter((e) => e.sets.length);
        get().stopRest();
        if (!exercises.length) {
          set({ active: null });
          return null;
        }
        const done: Workout = { ...active, exercises, endedAt: Date.now() };
        set({ active: null, history: [done, ...history] });
        haptic.success();
        return done.id;
      },

      discardWorkout: () => {
        get().stopRest();
        set({ active: null });
      },

      renameActive: (name) => set((s) => (s.active ? { active: { ...s.active, name } } : s)),
      setActiveNotes: (notes) => set((s) => (s.active ? { active: { ...s.active, notes } } : s)),

      addExercises: (ids) =>
        set((s) => {
          if (!s.active) return s;
          return { active: { ...s.active, exercises: [...s.active.exercises, ...ids.map((id) => entryFor(s, id))] } };
        }),

      removeExercise: (entryId) =>
        set((s) => (s.active ? { active: { ...s.active, exercises: s.active.exercises.filter((e) => e.id !== entryId) } } : s)),

      moveExercise: (entryId, dir) =>
        set((s) => (s.active ? { active: { ...s.active, exercises: move(s.active.exercises, entryId, dir) } } : s)),

      setExerciseNotes: (entryId, notes) =>
        set((s) => (s.active ? { active: mapEntry(s.active, entryId, (e) => ({ ...e, notes })) } : s)),

      setExerciseRest: (entryId, restSec) =>
        set((s) => (s.active ? { active: mapEntry(s.active, entryId, (e) => ({ ...e, restSec })) } : s)),

      toggleSuperset: (entryId) =>
        set((s) => {
          if (!s.active) return s;
          const list = s.active.exercises;
          const i = list.findIndex((e) => e.id === entryId);
          if (i < 0) return s;
          const cur = list[i];
          const next = list[i + 1];
          let exercises: WorkoutExercise[];
          if (cur.supersetId && next?.supersetId === cur.supersetId) {
            // unlink from the next exercise
            const sid = cur.supersetId;
            exercises = list.map((e, k) => (k === i + 1 && e.supersetId === sid ? { ...e, supersetId: undefined } : e));
            const stillUsed = exercises.filter((e) => e.supersetId === sid).length > 1;
            if (!stillUsed) exercises = exercises.map((e) => (e.supersetId === sid ? { ...e, supersetId: undefined } : e));
          } else if (next) {
            const sid = cur.supersetId ?? next.supersetId ?? uid();
            exercises = list.map((e, k) => (k === i || k === i + 1 ? { ...e, supersetId: sid } : e));
          } else {
            return s;
          }
          return { active: { ...s.active, exercises } };
        }),

      addSet: (entryId) =>
        set((s) => {
          if (!s.active) return s;
          return {
            active: mapEntry(s.active, entryId, (e) => {
              const prev = [...e.sets].reverse().find((x) => x.kind !== 'warmup');
              return { ...e, sets: [...e.sets, newSet('normal', prev && { weight: prev.weight, reps: prev.reps, seconds: prev.seconds })] };
            }),
          };
        }),

      addWarmups: (entryId) =>
        set((s) => {
          if (!s.active) return s;
          return {
            active: mapEntry(s.active, entryId, (e) => {
              const last = sessionsFor(e.exerciseId, s.history)[0];
              const working =
                Math.max(0, ...e.sets.filter((x) => x.kind !== 'warmup').map((x) => x.weight ?? 0)) ||
                Math.max(0, ...(last?.sets.map((x) => x.weight ?? 0) ?? [0]));
              const ramp = warmupRamp(working, s.settings.barWeightKg);
              if (!ramp.length) return e;
              const warmups = ramp.map((r) => newSet('warmup', r));
              return { ...e, sets: [...warmups, ...e.sets.filter((x) => x.kind !== 'warmup' || x.done)] };
            }),
          };
        }),

      removeSet: (entryId, setId) =>
        set((s) => (s.active ? { active: mapEntry(s.active, entryId, (e) => ({ ...e, sets: e.sets.filter((x) => x.id !== setId) })) } : s)),

      updateSet: (entryId, setId, patch) =>
        set((s) =>
          s.active
            ? { active: mapEntry(s.active, entryId, (e) => ({ ...e, sets: e.sets.map((x) => (x.id === setId ? { ...x, ...patch } : x)) })) }
            : s,
        ),

      cycleSetKind: (entryId, setId) => {
        const order: SetKind[] = ['normal', 'warmup', 'drop', 'failure'];
        haptic.tap();
        set((s) =>
          s.active
            ? {
                active: mapEntry(s.active, entryId, (e) => ({
                  ...e,
                  sets: e.sets.map((x) => (x.id === setId ? { ...x, kind: order[(order.indexOf(x.kind) + 1) % order.length] } : x)),
                })),
              }
            : s,
        );
      },

      toggleSetDone: (entryId, setId, fallback) => {
        const s = get();
        if (!s.active) return;
        const entry = s.active.exercises.find((e) => e.id === entryId);
        const target = entry?.sets.find((x) => x.id === setId);
        if (!entry || !target) return;
        if (target.done) {
          get().updateSet(entryId, setId, { done: false, pr: undefined });
          return;
        }
        const filled: WorkoutSet = {
          ...target,
          weight: target.weight ?? fallback?.weight,
          reps: target.reps ?? fallback?.reps,
          seconds: target.seconds ?? fallback?.seconds,
        };
        const meta = exerciseById(s, entry.exerciseId);
        // Compare against history plus sets already completed in this workout.
        const prior = allTimeBests(entry.exerciseId, [
          { ...s.active, exercises: s.active.exercises.map((e) => ({ ...e, sets: e.sets.filter((x) => x.id !== setId) })) },
          ...s.history,
        ]);
        const pr = meta ? detectPrs({ ...filled, done: true }, prior, meta.tracking) : [];
        get().updateSet(entryId, setId, { ...filled, done: true, pr: pr.length ? pr : undefined });
        if (pr.length) haptic.success();
        else haptic.done();

        if (s.settings.autoStartRest && target.kind !== 'warmup') {
          // In a superset, only rest after the last exercise of the round.
          const list = s.active.exercises;
          const idx = list.findIndex((e) => e.id === entryId);
          const next = list[idx + 1];
          const midSuperset = entry.supersetId && next?.supersetId === entry.supersetId;
          if (!midSuperset) {
            const rest = entry.restSec ?? s.settings.defaultRestSec;
            // Label the timer with whatever comes next: this exercise's next set, or the next exercise.
            const after = get().active?.exercises ?? list;
            const from = after.findIndex((e) => e.id === entryId);
            const upcoming = [...after.slice(from), ...after.slice(0, from)].find((e) => e.sets.some((x) => !x.done));
            get().startRest(rest, upcoming ? exerciseById(s, upcoming.exerciseId)?.name : undefined);
          }
        }
      },

      startRest: (sec, label) => {
        if (sec <= 0) return;
        set({ rest: { endsAt: Date.now() + sec * 1000, durationSec: sec, label } });
        if (get().settings.restNotifications) scheduleRestDone(sec, label);
      },

      adjustRest: (delta) => {
        const { rest, settings } = get();
        if (!rest.endsAt) return;
        const endsAt = Math.max(Date.now() + 1000, rest.endsAt + delta * 1000);
        set({ rest: { ...rest, endsAt, durationSec: Math.max(1, rest.durationSec + delta) } });
        if (settings.restNotifications) scheduleRestDone((endsAt - Date.now()) / 1000, rest.label);
      },

      stopRest: () => {
        cancelRestDone();
        set((s) => ({ rest: { ...s.rest, endsAt: null } }));
      },

      createRoutine: (name, exerciseIds = []) => {
        const id = uid();
        const routine: Routine = {
          id,
          name: name ?? 'New Routine',
          exercises: exerciseIds.map((e) => rx(e, 3, 10, get().settings.defaultRestSec)),
        };
        set((s) => ({ routines: [routine, ...s.routines] }));
        return id;
      },

      saveActiveAsRoutine: () => {
        const { active, settings } = get();
        if (!active || !active.exercises.length) return null;
        const id = uid();
        const routine: Routine = {
          id,
          name: active.name,
          exercises: active.exercises.map((e) => {
            const working = e.sets.filter((x) => x.kind !== 'warmup');
            return rx(e.exerciseId, Math.max(1, working.length), working[0]?.reps ?? e.targetReps ?? 10, e.restSec ?? settings.defaultRestSec);
          }),
        };
        set((s) => ({ routines: [routine, ...s.routines] }));
        return id;
      },

      updateRoutine: (id, patch) => set((s) => ({ routines: s.routines.map((r) => (r.id === id ? { ...r, ...patch } : r)) })),
      deleteRoutine: (id) => set((s) => ({ routines: s.routines.filter((r) => r.id !== id) })),
      addToRoutine: (id, ids) =>
        set((s) => ({
          routines: s.routines.map((r) =>
            r.id === id ? { ...r, exercises: [...r.exercises, ...ids.map((e) => rx(e, 3, 10, s.settings.defaultRestSec))] } : r,
          ),
        })),
      updateRoutineExercise: (id, rowId, patch) =>
        set((s) => ({
          routines: s.routines.map((r) =>
            r.id === id ? { ...r, exercises: r.exercises.map((x) => (x.id === rowId ? { ...x, ...patch } : x)) } : r,
          ),
        })),
      removeFromRoutine: (id, rowId) =>
        set((s) => ({
          routines: s.routines.map((r) => (r.id === id ? { ...r, exercises: r.exercises.filter((x) => x.id !== rowId) } : r)),
        })),
      moveInRoutine: (id, rowId, dir) =>
        set((s) => ({ routines: s.routines.map((r) => (r.id === id ? { ...r, exercises: move(r.exercises, rowId, dir) } : r)) })),

      deleteWorkout: (id) => set((s) => ({ history: s.history.filter((w) => w.id !== id) })),

      createExercise: (e) => {
        const id = 'custom-' + uid();
        set((s) => ({ customExercises: [...s.customExercises, { ...e, id, custom: true }] }));
        return id;
      },
      deleteExercise: (id) => set((s) => ({ customExercises: s.customExercises.filter((e) => e.id !== id) })),
      setExerciseNote: (exerciseId, note) => set((s) => ({ exerciseNotes: { ...s.exerciseNotes, [exerciseId]: note } })),

      updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),
      addBodyweight: (kg) =>
        set((s) => ({ bodyweight: [{ id: uid(), date: Date.now(), kg }, ...s.bodyweight].sort((a, b) => b.date - a.date) })),
      removeBodyweight: (id) => set((s) => ({ bodyweight: s.bodyweight.filter((b) => b.id !== id) })),

      loadSampleData: () => set((s) => ({ ...generateSample(), settings: s.settings })),
      resetAll: () => {
        cancelRestDone();
        set({ ...initial, routines: STARTER_ROUTINES.map((r) => ({ ...r })) });
      },
    }),
    {
      name: 'ironfold-v1',
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
    },
  ),
);

/** All exercises (built-in + custom) as a lookup map. */
export function useExerciseMap(): Record<string, Exercise> {
  const custom = useStore((s) => s.customExercises);
  return useMemo(() => {
    const map: Record<string, Exercise> = {};
    for (const e of BUILT_IN_EXERCISES) map[e.id] = e;
    for (const e of custom) map[e.id] = e;
    return map;
  }, [custom]);
}

export function useAllExercises(): Exercise[] {
  const custom = useStore((s) => s.customExercises);
  return useMemo(() => [...custom, ...BUILT_IN_EXERCISES].sort((a, b) => a.name.localeCompare(b.name)), [custom]);
}

/* ------------------------------------------------------------------ */
/* Sample data: ~10 weeks of a PPL program with gradual progression.  */
/* ------------------------------------------------------------------ */

function generateSample(): Pick<State, 'history' | 'routines' | 'bodyweight' | 'active' | 'rest'> {
  const plan: Record<string, [string, number, number, number][]> = {
    Push: [
      ['bench-press', 70, 4, 6],
      ['overhead-press', 42.5, 3, 8],
      ['incline-dumbbell-press', 26, 3, 10],
      ['cable-lateral-raise', 7.5, 3, 15],
      ['triceps-pushdown', 30, 3, 12],
    ],
    Pull: [
      ['deadlift', 120, 3, 5],
      ['pull-up', 0, 3, 8],
      ['seated-cable-row', 60, 3, 10],
      ['face-pull', 22.5, 3, 15],
      ['hammer-curl', 14, 3, 12],
    ],
    Legs: [
      ['back-squat', 95, 4, 6],
      ['romanian-deadlift', 80, 3, 8],
      ['leg-press', 160, 3, 12],
      ['lying-leg-curl', 40, 3, 12],
      ['standing-calf-raise', 70, 4, 15],
    ],
  };
  const days = ['Push', 'Pull', 'Legs'];
  const history: Workout[] = [];
  const now = Date.now();
  let session = 0;
  for (let d = 70; d >= 1; d--) {
    if (d % 7 === 0 || d % 7 === 3 || d % 7 === 5 || (d % 7 === 1 && d % 2 === 0)) {
      const name = days[session % 3];
      const progress = Math.floor(session / 3);
      const day = new Date(now - d * 86400000);
      day.setHours(17 + (d % 3), (d * 7) % 60, 0, 0);
      const start = day.getTime();
      const exercises: WorkoutExercise[] = plan[name].map(([exerciseId, base, sets, reps]) => {
        const step = exerciseId === 'deadlift' || exerciseId === 'back-squat' || exerciseId === 'leg-press' ? 5 : 2.5;
        const weight = base ? base + Math.floor(progress / 2) * step : undefined;
        return {
          id: uid(),
          exerciseId,
          sets: Array.from({ length: sets }, (_, i) => ({
            id: uid(),
            kind: 'normal' as SetKind,
            weight,
            reps: Math.max(1, reps + (progress % 2) - (i === sets - 1 ? 1 : 0) + (base ? 0 : Math.floor(progress / 3))),
            done: true,
          })),
        };
      });
      history.push({ id: uid(), name, startedAt: start, endedAt: start + (55 + (d % 4) * 6) * 60000, exercises, routineId: `starter-${name.toLowerCase()}` });
      session++;
    }
  }
  history.sort((a, b) => b.startedAt - a.startedAt);
  // Back-fill PR flags so history shows trophies.
  const chronological = [...history].reverse();
  const seen: Workout[] = [];
  for (const w of chronological) {
    for (const ex of w.exercises) {
      const meta = BUILT_IN_EXERCISES.find((e) => e.id === ex.exerciseId);
      for (const st of ex.sets) {
        const prior = allTimeBests(ex.exerciseId, seen);
        const pr = meta ? detectPrs(st, prior, meta.tracking) : [];
        if (pr.length) st.pr = pr;
      }
    }
    seen.push(w);
  }
  const bodyweight: BodyweightEntry[] = Array.from({ length: 10 }, (_, i) => ({
    id: uid(),
    date: now - i * 7 * 86400000,
    kg: Math.round((82.5 - i * 0.35 + (i % 3) * 0.2) * 10) / 10,
  }));
  return {
    history,
    routines: STARTER_ROUTINES.map((r) => ({ ...r, lastUsedAt: history.find((h) => h.routineId === r.id)?.startedAt })),
    bodyweight,
    active: null,
    rest: { endsAt: null, durationSec: 0 },
  };
}
