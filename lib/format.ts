export function points(n: number): string {
  return Math.round(n).toLocaleString('es-AR');
}

export function percent(fraction: number): string {
  return `${Math.round(fraction * 100)}%`;
}

/** Tiempo restante legible. Devuelve null si ya venció. */
export function timeLeft(iso: string, now = Date.now()): string | null {
  const ms = new Date(iso).getTime() - now;
  if (ms <= 0) return null;
  const min = Math.floor(ms / 60000);
  if (min < 60) return `${min} min`;
  const hours = Math.floor(min / 60);
  if (hours < 24) return `${hours} h`;
  const days = Math.floor(hours / 24);
  return `${days} d`;
}

export function shortDate(iso: string): string {
  return new Date(iso).toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}
