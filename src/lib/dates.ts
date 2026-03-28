import type { UncertainDate } from '../types/domain';

export function yearFromDate(date?: UncertainDate): number | undefined {
  if (!date?.value) {
    return undefined;
  }

  const match = /^(\d{4})/.exec(date.value.trim());
  if (!match) {
    return undefined;
  }

  return Number(match[1]);
}

export function formatDate(date?: UncertainDate): string {
  if (!date?.value) {
    return 'Unknown';
  }

  return date.uncertain ? `ca. ${date.value}` : date.value;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}