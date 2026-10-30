/** Every diagram a project card or sheet can show. index.ts maps each to its component. */
export const figureIds = [
  'ohm-path',
  'fotomagic-arch',
  'fotomagic-pipeline',
  'riscv-pipeline',
  'underwater-chain',
  'servo-loop',
  'swarm-system',
  'motion-profile',
] as const;

export type FigureId = (typeof figureIds)[number];
