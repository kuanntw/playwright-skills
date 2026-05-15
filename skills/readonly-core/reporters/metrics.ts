import type { ReadOnlyViolation } from '../guards/networkGuard';

export type ReadOnlyMetrics = {
  commit?: string;
  adapter: string;
  generatedAt: string;
  blockedWrites: ReadOnlyViolation[];
};

export function buildMetrics(adapter: string, blockedWrites: ReadOnlyViolation[], commit?: string): ReadOnlyMetrics {
  return {
    commit,
    adapter,
    generatedAt: new Date().toISOString(),
    blockedWrites,
  };
}
