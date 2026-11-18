import { useWindowDimensions } from 'react-native';

export const C = {
  bg: '#0B0D10',
  surface: '#14171C',
  surface2: '#1C2027',
  surface3: '#252A33',
  border: '#2A303A',
  text: '#F2F4F7',
  dim: '#9AA3AF',
  faint: '#5F6875',
  accent: '#C6F432',
  accentDim: '#C6F43222',
  onAccent: '#0B0D10',
  danger: '#FF5A5F',
  warn: '#FFB020',
  success: '#3DDC97',
  info: '#5AA9FF',
  purple: '#B18CFF',
  gold: '#FFD34D',
};

/** Width of the navigation rail shown on the unfolded inner display. */
export const RAIL_WIDTH = 96;

export const S = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };
export const R = { sm: 8, md: 12, lg: 18, pill: 999 };

export const MUSCLE_COLOR: Record<string, string> = {
  Chest: '#FF7A59',
  Back: '#5AA9FF',
  Shoulders: '#FFB020',
  Biceps: '#B18CFF',
  Triceps: '#E86BD0',
  Forearms: '#9C8CFF',
  Core: '#3DDC97',
  Quads: '#C6F432',
  Hamstrings: '#7BD88F',
  Glutes: '#FF8FA3',
  Calves: '#4FD1C5',
  'Full Body': '#F2F4F7',
  Cardio: '#FF5A5F',
};

/**
 * Galaxy Z Fold layout classes.
 *
 *  - cover:    outer display, a tall ~21:9 phone (≈ 410dp wide)
 *  - unfolded: inner display, near-square tablet (≈ 750–900dp wide)
 *
 * Breakpoints follow Material 3 window size classes: compact < 600dp ≤ medium < 840dp ≤ expanded.
 * The inner screen is "medium" in portrait and "expanded" in landscape, so anything ≥ 600dp gets
 * two-pane layouts and a navigation rail.
 */
export function useLayout() {
  const { width, height, fontScale } = useWindowDimensions();
  const unfolded = width >= 600;
  const expanded = width >= 840;
  const landscape = width > height;
  // The cover screen is unusually narrow & tall; tighten paddings there.
  const cover = !unfolded && height / Math.max(width, 1) > 1.9;
  return {
    width,
    height,
    fontScale,
    unfolded,
    expanded,
    landscape,
    cover,
    gutter: unfolded ? S.xl : cover ? S.md : S.lg,
    /**
     * Width of the list pane in list-detail layouts. In portrait on the inner display the
     * hinge runs vertically down the middle, so the pane divider sits right on the crease.
     */
    listPane: landscape ? Math.min(440, width * 0.42) : Math.max(280, width / 2 - RAIL_WIDTH),
    /** Grid columns for card grids. */
    cols: expanded ? 3 : unfolded ? 2 : 1,
  };
}

export type Layout = ReturnType<typeof useLayout>;
