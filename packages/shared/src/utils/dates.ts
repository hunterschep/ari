export function nowIso(): string {
  return new Date().toISOString();
}

export function addHoursIso(hours: number, from = new Date()): string {
  const next = new Date(from);
  next.setHours(next.getHours() + hours);
  return next.toISOString();
}

export function addDaysIso(days: number, from = new Date()): string {
  const next = new Date(from);
  next.setDate(next.getDate() + days);
  return next.toISOString();
}

export function hoursSince(iso: string, from = new Date()): number {
  return (from.getTime() - new Date(iso).getTime()) / 36e5;
}
