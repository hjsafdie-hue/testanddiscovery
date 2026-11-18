import type { Equipment, Exercise, Muscle, TrackingType } from './types';

type Row = [name: string, muscle: Muscle, equipment: Equipment, secondary?: Muscle[], tracking?: TrackingType];

const rows: Row[] = [
  // Chest
  ['Bench Press', 'Chest', 'Barbell', ['Triceps', 'Shoulders']],
  ['Incline Bench Press', 'Chest', 'Barbell', ['Shoulders', 'Triceps']],
  ['Decline Bench Press', 'Chest', 'Barbell', ['Triceps']],
  ['Dumbbell Bench Press', 'Chest', 'Dumbbell', ['Triceps', 'Shoulders']],
  ['Incline Dumbbell Press', 'Chest', 'Dumbbell', ['Shoulders', 'Triceps']],
  ['Dumbbell Fly', 'Chest', 'Dumbbell'],
  ['Cable Crossover', 'Chest', 'Cable'],
  ['Pec Deck', 'Chest', 'Machine'],
  ['Chest Press Machine', 'Chest', 'Machine', ['Triceps']],
  ['Push-Up', 'Chest', 'Bodyweight', ['Triceps', 'Shoulders'], 'reps'],
  ['Chest Dip', 'Chest', 'Bodyweight', ['Triceps'], 'reps'],
  // Back
  ['Deadlift', 'Back', 'Barbell', ['Hamstrings', 'Glutes', 'Forearms']],
  ['Barbell Row', 'Back', 'Barbell', ['Biceps']],
  ['Pendlay Row', 'Back', 'Barbell', ['Biceps']],
  ['Dumbbell Row', 'Back', 'Dumbbell', ['Biceps']],
  ['Pull-Up', 'Back', 'Bodyweight', ['Biceps'], 'reps'],
  ['Chin-Up', 'Back', 'Bodyweight', ['Biceps'], 'reps'],
  ['Weighted Pull-Up', 'Back', 'Bodyweight', ['Biceps']],
  ['Lat Pulldown', 'Back', 'Cable', ['Biceps']],
  ['Seated Cable Row', 'Back', 'Cable', ['Biceps']],
  ['T-Bar Row', 'Back', 'Barbell', ['Biceps']],
  ['Chest-Supported Row', 'Back', 'Machine', ['Biceps']],
  ['Straight-Arm Pulldown', 'Back', 'Cable'],
  ['Barbell Shrug', 'Back', 'Barbell', ['Forearms']],
  ['Dumbbell Shrug', 'Back', 'Dumbbell', ['Forearms']],
  ['Back Extension', 'Back', 'Bodyweight', ['Glutes', 'Hamstrings'], 'reps'],
  // Shoulders
  ['Overhead Press', 'Shoulders', 'Barbell', ['Triceps']],
  ['Seated Dumbbell Press', 'Shoulders', 'Dumbbell', ['Triceps']],
  ['Arnold Press', 'Shoulders', 'Dumbbell', ['Triceps']],
  ['Lateral Raise', 'Shoulders', 'Dumbbell'],
  ['Cable Lateral Raise', 'Shoulders', 'Cable'],
  ['Front Raise', 'Shoulders', 'Dumbbell'],
  ['Rear Delt Fly', 'Shoulders', 'Dumbbell', ['Back']],
  ['Face Pull', 'Shoulders', 'Cable', ['Back']],
  ['Shoulder Press Machine', 'Shoulders', 'Machine', ['Triceps']],
  ['Upright Row', 'Shoulders', 'Barbell', ['Back']],
  // Biceps
  ['Barbell Curl', 'Biceps', 'Barbell', ['Forearms']],
  ['EZ-Bar Curl', 'Biceps', 'Barbell', ['Forearms']],
  ['Dumbbell Curl', 'Biceps', 'Dumbbell', ['Forearms']],
  ['Hammer Curl', 'Biceps', 'Dumbbell', ['Forearms']],
  ['Incline Dumbbell Curl', 'Biceps', 'Dumbbell'],
  ['Preacher Curl', 'Biceps', 'Barbell'],
  ['Cable Curl', 'Biceps', 'Cable'],
  ['Concentration Curl', 'Biceps', 'Dumbbell'],
  // Triceps
  ['Close-Grip Bench Press', 'Triceps', 'Barbell', ['Chest']],
  ['Triceps Pushdown', 'Triceps', 'Cable'],
  ['Overhead Triceps Extension', 'Triceps', 'Cable'],
  ['Skull Crusher', 'Triceps', 'Barbell'],
  ['Dumbbell Kickback', 'Triceps', 'Dumbbell'],
  ['Triceps Dip', 'Triceps', 'Bodyweight', ['Chest'], 'reps'],
  // Forearms
  ['Wrist Curl', 'Forearms', 'Dumbbell'],
  ['Reverse Curl', 'Forearms', 'Barbell', ['Biceps']],
  ["Farmer's Carry", 'Forearms', 'Dumbbell', ['Back', 'Core'], 'time'],
  ['Dead Hang', 'Forearms', 'Bodyweight', ['Back'], 'time'],
  // Core
  ['Plank', 'Core', 'Bodyweight', [], 'time'],
  ['Side Plank', 'Core', 'Bodyweight', [], 'time'],
  ['Hanging Leg Raise', 'Core', 'Bodyweight', [], 'reps'],
  ['Cable Crunch', 'Core', 'Cable'],
  ['Crunch', 'Core', 'Bodyweight', [], 'reps'],
  ['Ab Wheel Rollout', 'Core', 'Other', [], 'reps'],
  ['Russian Twist', 'Core', 'Bodyweight', [], 'reps'],
  ['Pallof Press', 'Core', 'Cable'],
  // Quads
  ['Back Squat', 'Quads', 'Barbell', ['Glutes', 'Hamstrings']],
  ['Front Squat', 'Quads', 'Barbell', ['Glutes', 'Core']],
  ['Goblet Squat', 'Quads', 'Dumbbell', ['Glutes']],
  ['Hack Squat', 'Quads', 'Machine', ['Glutes']],
  ['Leg Press', 'Quads', 'Machine', ['Glutes']],
  ['Leg Extension', 'Quads', 'Machine'],
  ['Bulgarian Split Squat', 'Quads', 'Dumbbell', ['Glutes']],
  ['Walking Lunge', 'Quads', 'Dumbbell', ['Glutes']],
  ['Step-Up', 'Quads', 'Dumbbell', ['Glutes']],
  // Hamstrings
  ['Romanian Deadlift', 'Hamstrings', 'Barbell', ['Glutes', 'Back']],
  ['Dumbbell Romanian Deadlift', 'Hamstrings', 'Dumbbell', ['Glutes']],
  ['Lying Leg Curl', 'Hamstrings', 'Machine'],
  ['Seated Leg Curl', 'Hamstrings', 'Machine'],
  ['Good Morning', 'Hamstrings', 'Barbell', ['Back', 'Glutes']],
  ['Nordic Curl', 'Hamstrings', 'Bodyweight', [], 'reps'],
  // Glutes
  ['Hip Thrust', 'Glutes', 'Barbell', ['Hamstrings']],
  ['Glute Bridge', 'Glutes', 'Bodyweight', ['Hamstrings'], 'reps'],
  ['Cable Kickback', 'Glutes', 'Cable'],
  ['Hip Abduction', 'Glutes', 'Machine'],
  ['Sumo Deadlift', 'Glutes', 'Barbell', ['Quads', 'Back', 'Hamstrings']],
  // Calves
  ['Standing Calf Raise', 'Calves', 'Machine'],
  ['Seated Calf Raise', 'Calves', 'Machine'],
  ['Single-Leg Calf Raise', 'Calves', 'Dumbbell'],
  // Full body
  ['Power Clean', 'Full Body', 'Barbell', ['Back', 'Quads', 'Shoulders']],
  ['Kettlebell Swing', 'Full Body', 'Kettlebell', ['Glutes', 'Hamstrings']],
  ['Thruster', 'Full Body', 'Barbell', ['Quads', 'Shoulders']],
  ['Burpee', 'Full Body', 'Bodyweight', [], 'reps'],
  // Cardio
  ['Treadmill Run', 'Cardio', 'Machine', [], 'time'],
  ['Rowing Machine', 'Cardio', 'Machine', ['Back'], 'time'],
  ['Stationary Bike', 'Cardio', 'Machine', ['Quads'], 'time'],
  ['Stair Climber', 'Cardio', 'Machine', ['Glutes'], 'time'],
  ['Jump Rope', 'Cardio', 'Other', ['Calves'], 'time'],
];

function slug(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export const BUILT_IN_EXERCISES: Exercise[] = rows.map(([name, muscle, equipment, secondary, tracking]) => ({
  id: slug(name),
  name,
  muscle,
  equipment,
  secondary: secondary ?? [],
  tracking: tracking ?? 'weight_reps',
}));

export const MUSCLES: Muscle[] = [
  'Chest',
  'Back',
  'Shoulders',
  'Biceps',
  'Triceps',
  'Forearms',
  'Core',
  'Quads',
  'Hamstrings',
  'Glutes',
  'Calves',
  'Full Body',
  'Cardio',
];

export const EQUIPMENT: Equipment[] = [
  'Barbell',
  'Dumbbell',
  'Machine',
  'Cable',
  'Bodyweight',
  'Kettlebell',
  'Band',
  'Other',
];
