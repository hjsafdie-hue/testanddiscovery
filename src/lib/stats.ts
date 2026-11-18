import type { Exercise, Muscle, PrKind, Unit, Workout, WorkoutExercise, WorkoutSet } from './types';
import { weightIncrementKg } from './units';

/** Epley estimated one-rep max. */
export function e1rm(weight: number, reps: number): number {
  if (!weight || !reps) return 0;
  if (reps === 1) return weight;
  return weight * (1 + reps / 30);
}

export const isWorking = (s: WorkoutSet) => s.kind !== 'warmup';

export function setVolume(s: WorkoutSet): number {
  return (s.weight ?? 0) * (s.reps ?? 0);
}

export function workoutVolume(w: Workout): number {
  let v = 0;
  for (const ex of w.exercises) for (const s of ex.sets) if (s.done && isWorking(s)) v += setVolume(s);
  return v;
}

export function workoutSetCount(w: Workout): number {
  let n = 0;
  for (const ex of w.exercises) for (const s of ex.sets) if (s.done && isWorking(s)) n++;
  return n;
}

export function workoutPrCount(w: Workout): number {
  let n = 0;
  for (const ex of w.exercises) for (const s of ex.sets) if (s.pr?.length) n++;
  return n;
}

export type Session = { workoutId: string; date: number; sets: WorkoutSet[]; entry: WorkoutExercise };

/** Completed sessions of one exercise, newest first. */
export function sessionsFor(exerciseId: string, history: Workout[]): Session[] {
  const out: Session[] = [];
  for (const w of history) {
    for (const ex of w.exercises) {
      if (ex.exerciseId !== exerciseId) continue;
      const sets = ex.sets.filter((s) => s.done);
      if (sets.length) out.push({ workoutId: w.id, date: w.startedAt, sets, entry: ex });
    }
  }
  return out.sort((a, b) => b.date - a.date);
}

export type Bests = { e1rm: number; weight: number; volume: number; reps: number };

export function bestsFrom(sets: WorkoutSet[]): Bests {
  const b: Bests = { e1rm: 0, weight: 0, volume: 0, reps: 0 };
  for (const s of sets) {
    if (!s.done || !isWorking(s)) continue;
    b.e1rm = Math.max(b.e1rm, e1rm(s.weight ?? 0, s.reps ?? 0));
    b.weight = Math.max(b.weight, s.weight ?? 0);
    b.volume = Math.max(b.volume, setVolume(s));
    b.reps = Math.max(b.reps, s.reps ?? 0);
  }
  return b;
}

export function allTimeBests(exerciseId: string, history: Workout[]): Bests {
  return bestsFrom(sessionsFor(exerciseId, history).flatMap((s) => s.sets));
}

/** Which records a freshly completed set beats. */
export function detectPrs(set: WorkoutSet, prior: Bests, tracking: Exercise['tracking']): PrKind[] {
  if (!isWorking(set)) return [];
  const prs: PrKind[] = [];
  if (tracking === 'weight_reps') {
    const w = set.weight ?? 0;
    const r = set.reps ?? 0;
    if (!w || !r) return [];
    if (prior.e1rm > 0 && e1rm(w, r) > prior.e1rm + 0.01) prs.push('e1rm');
    if (prior.weight > 0 && w > prior.weight + 0.01) prs.push('weight');
    if (prior.volume > 0 && w * r > prior.volume + 0.01) prs.push('volume');
  } else if (tracking === 'reps') {
    if (prior.reps > 0 && (set.reps ?? 0) > prior.reps) prs.push('reps');
  }
  return prs;
}

export const PR_SHORT: Record<PrKind, string> = { e1rm: '1RM', weight: 'Weight', volume: 'Volume', reps: 'Reps' };

export const PR_LABEL: Record<PrKind, string> = {
  e1rm: 'Est. 1RM',
  weight: 'Heaviest',
  volume: 'Best set volume',
  reps: 'Most reps',
};

/** Progressive-overload suggestion based on the last session. */
export function overloadHint(
  exerciseId: string,
  history: Workout[],
  unit: Unit,
  targetReps?: number,
): { weight: number; reps: number; text: string } | null {
  const last = sessionsFor(exerciseId, history)[0];
  if (!last) return null;
  const working = last.sets.filter(isWorking).filter((s) => (s.weight ?? 0) > 0 && (s.reps ?? 0) > 0);
  if (!working.length) return null;
  const topWeight = Math.max(...working.map((s) => s.weight!));
  const topSets = working.filter((s) => Math.abs((s.weight ?? 0) - topWeight) < 0.01);
  const goal = targetReps ?? Math.max(...topSets.map((s) => s.reps!));
  const hitAll = topSets.every((s) => (s.reps ?? 0) >= goal);
  if (hitAll) {
    return { weight: topWeight + weightIncrementKg(unit), reps: goal, text: 'All reps hit last time — add weight' };
  }
  return { weight: topWeight, reps: goal, text: `Stay at this weight, aim for ${goal} reps` };
}

export function startOfWeek(ts: number): number {
  const d = new Date(ts);
  const day = (d.getDay() + 6) % 7; // Monday = 0
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - day);
  return d.getTime();
}

export type WeekStat = { weekStart: number; workouts: number; volume: number; sets: number };

export function weeklyStats(history: Workout[], weeks = 8, now = Date.now()): WeekStat[] {
  const thisWeek = startOfWeek(now);
  const out: WeekStat[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const ws = new Date(thisWeek);
    ws.setDate(ws.getDate() - i * 7);
    out.push({ weekStart: ws.getTime(), workouts: 0, volume: 0, sets: 0 });
  }
  for (const w of history) {
    const ws = startOfWeek(w.startedAt);
    const bucket = out.find((b) => b.weekStart === ws);
    if (!bucket) continue;
    bucket.workouts++;
    bucket.volume += workoutVolume(w);
    bucket.sets += workoutSetCount(w);
  }
  return out;
}

/** Consecutive weeks (ending this week or last) that met the weekly goal. */
export function weekStreak(history: Workout[], goal: number, now = Date.now()): number {
  const stats = weeklyStats(history, 104, now);
  let i = stats.length - 1;
  if (stats[i].workouts < goal) i--; // current week still in progress
  let streak = 0;
  for (; i >= 0 && stats[i].workouts >= goal; i--) streak++;
  return streak;
}

export type Recovery = { muscle: Muscle; hoursSince: number | null; pct: number; sets: number };

/** Simple muscle freshness model: ~72h to fully recover, scaled by recent set count. */
export function muscleRecovery(history: Workout[], exercises: Record<string, Exercise>, muscles: Muscle[], now = Date.now()): Recovery[] {
  return muscles.map((muscle) => {
    let last: number | null = null;
    let sets = 0;
    for (const w of history) {
      const ts = w.endedAt ?? w.startedAt;
      if (now - ts > 7 * 86400000) continue;
      for (const ex of w.exercises) {
        const meta = exercises[ex.exerciseId];
        if (!meta) continue;
        const primary = meta.muscle === muscle;
        const secondary = meta.secondary?.includes(muscle);
        if (!primary && !secondary) continue;
        const done = ex.sets.filter((s) => s.done && isWorking(s)).length;
        if (!done) continue;
        if (now - ts < 72 * 3600000) sets += primary ? done : done / 2;
        if (last == null || ts > last) last = ts;
      }
    }
    const hoursSince = last == null ? null : (now - last) / 3600000;
    const needed = 36 + Math.min(sets, 20) * 2; // more sets, longer recovery
    const pct = hoursSince == null ? 100 : Math.min(100, Math.round((hoursSince / needed) * 100));
    return { muscle, hoursSince, pct, sets: Math.round(sets) };
  });
}

export const PLATES_KG = [25, 20, 15, 10, 5, 2.5, 1.25];
export const PLATES_LB = [45, 35, 25, 10, 5, 2.5];

/** Plates per side (in display units) for a target load. */
export function platesPerSide(target: number, bar: number, unit: Unit): { plates: number[]; remainder: number } {
  const set = unit === 'kg' ? PLATES_KG : PLATES_LB;
  let side = (target - bar) / 2;
  const plates: number[] = [];
  if (side <= 0) return { plates, remainder: 0 };
  for (const p of set) {
    while (side >= p - 1e-6) {
      plates.push(p);
      side -= p;
    }
  }
  return { plates, remainder: Math.round(side * 2 * 100) / 100 };
}

/** Standard warm-up ramp for a working weight (kg). */
export function warmupRamp(workingKg: number, barKg: number): { weight: number; reps: number }[] {
  if (workingKg <= barKg * 1.2) return [];
  const steps: [number, number][] = [
    [0, 10],
    [0.4, 5],
    [0.6, 3],
    [0.8, 2],
  ];
  const round = (v: number) => Math.round(v / 2.5) * 2.5;
  const out: { weight: number; reps: number }[] = [];
  for (const [pct, reps] of steps) {
    const w = pct === 0 ? barKg : Math.max(barKg, round(workingKg * pct));
    if (out.length && out[out.length - 1].weight >= w) continue;
    if (w >= workingKg) break;
    out.push({ weight: w, reps });
  }
  return out;
}
