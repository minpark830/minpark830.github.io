/** A jerk limit to three significant figures, optionally padded to a width. */
export function formatJerk(j: number, width = 0): string {
  const s = j < 10 ? j.toFixed(2) : j < 100 ? j.toFixed(1) : j.toFixed(0);
  return s.padStart(width);
}
