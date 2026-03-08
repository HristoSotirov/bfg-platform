/**
 * Color constants for BFG Platform
 * These colors should be used consistently across the application
 */
export const COLORS = {
  WHITE: '#FFFFFF',
  BFG_BLUE: '#6185A8',
  BFG_TEAL: '#488E99',
} as const;

export type ColorKey = keyof typeof COLORS;

