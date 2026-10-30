import type { FigureId } from './ids';
import OhmPath from './OhmPath.astro';
import FotoMagicArch from './FotoMagicArch.astro';
import FotoMagicPipeline from './FotoMagicPipeline.astro';
import RiscvPipeline from './RiscvPipeline.astro';
import UnderwaterChain from './UnderwaterChain.astro';
import ServoLoop from './ServoLoop.astro';
import SwarmSystem from './SwarmSystem.astro';

/** Diagram components by id. Each takes the id of the caption that names it. */
export const figures = {
  'ohm-path': OhmPath,
  'fotomagic-arch': FotoMagicArch,
  'fotomagic-pipeline': FotoMagicPipeline,
  'riscv-pipeline': RiscvPipeline,
  'underwater-chain': UnderwaterChain,
  'servo-loop': ServoLoop,
  'swarm-system': SwarmSystem,
} satisfies Record<FigureId, unknown>;
