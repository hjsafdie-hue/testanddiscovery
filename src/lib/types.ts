export type Unit = 'kg' | 'lb';

export type Muscle =
  | 'Chest'
  | 'Back'
  | 'Shoulders'
  | 'Biceps'
  | 'Triceps'
  | 'Forearms'
  | 'Core'
  | 'Quads'
  | 'Hamstrings'
  | 'Glutes'
  | 'Calves'
  | 'Full Body'
  | 'Cardio';

export type Equipment =
  | 'Barbell'
  | 'Dumbbell'
  | 'Machine'
  | 'Cable'
  | 'Bodyweight'
  | 'Kettlebell'
  | 'Band'
  | 'Other';

/** How a set is measured. */
export type TrackingType = 'weight_reps' | 'reps' | 'time';

export type Exercise = {
  id: string;
  name: string;
  muscle: Muscle;
  secondary?: Muscle[];
  equipment: Equipment;
  tracking: TrackingType;
  custom?: boolean;
};

export type SetKind = 'normal' | 'warmup' | 'drop' | 'failure';

export type WorkoutSet = {
  id: string;
  kind: SetKind;
  /** Always stored in kilograms. */
  weight?: number;
  reps?: number;
  seconds?: number;
  rpe?: number;
  done: boolean;
  /** Set when completing this set beat a personal record. */
  pr?: PrKind[];
};

export type PrKind = 'e1rm' | 'weight' | 'volume' | 'reps';

export type WorkoutExercise = {
  id: string;
  exerciseId: string;
  sets: WorkoutSet[];
  notes?: string;
  restSec?: number;
  /** Target reps carried over from a routine, used for overload hints. */
  targetReps?: number;
  /** Exercises sharing a supersetId are performed back-to-back. */
  supersetId?: string;
};

export type Workout = {
  id: string;
  name: string;
  startedAt: number;
  endedAt?: number;
  exercises: WorkoutExercise[];
  notes?: string;
  routineId?: string;
};

export type RoutineExercise = {
  id: string;
  exerciseId: string;
  sets: number;
  reps: number;
  restSec: number;
};

export type Routine = {
  id: string;
  name: string;
  exercises: RoutineExercise[];
  notes?: string;
  lastUsedAt?: number;
};

export type Settings = {
  unit: Unit;
  defaultRestSec: number;
  autoStartRest: boolean;
  barWeightKg: number;
  haptics: boolean;
  keepAwake: boolean;
  restNotifications: boolean;
  weeklyGoal: number;
};

export type BodyweightEntry = { id: string; date: number; kg: number };

export type RestTimer = {
  /** Epoch ms when rest finishes; null when not running. */
  endsAt: number | null;
  durationSec: number;
  label?: string;
};
