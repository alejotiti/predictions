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

/** Cierre en corto, como va debajo del título de una predicción: 22/8, 2:06 p. m. */
export function shortDate(iso: string): string {
  return new Date(iso).toLocaleString('es-AR', {
    day: 'numeric',
    month: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/** Fecha y hora completas para elegir el cierre de una predicción. */
export function longDateTime(date: Date): string {
  return date.toLocaleString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });
}
