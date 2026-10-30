import { execFileSync } from 'node:child_process';

export interface BuildInfo {
  /** full commit hash, or null outside a git checkout */
  sha: string | null;
  /** when the content last changed: the commit date, or the build date */
  date: Date;
}

function git(...args: string[]): string | null {
  try {
    return execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim() || null;
  } catch {
    return null;
  }
}

let cached: BuildInfo | undefined;

/** The commit this build came from, for the revision cell of the title block. */
export function buildInfo(): BuildInfo {
  if (cached) return cached;
  const sha = process.env['GITHUB_SHA'] ?? git('rev-parse', 'HEAD');
  const committed = git('log', '-1', '--format=%cI');
  cached = { sha, date: committed ? new Date(committed) : new Date() };
  return cached;
}

export function monthYear(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });
}
