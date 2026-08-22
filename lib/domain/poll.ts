export type PollStatus =
  | 'PENDING_APPROVAL'
  | 'REJECTED'
  | 'OPEN'
  | 'LOCKED'
  | 'PENDING_RESULT'
  | 'RESOLVED_YES'
  | 'RESOLVED_NO'
  | 'VOID';

export const isResolved = (s: PollStatus) =>
  s === 'RESOLVED_YES' || s === 'RESOLVED_NO' || s === 'VOID';

export const acceptsBets = (s: PollStatus) => s === 'OPEN';

/**
 * Estado efectivo según el reloj. La UI lo usa para no mostrar OPEN una poll
 * ya vencida, pero la autoridad real sobre el cierre es el servidor (§4.2).
 */
export function effectiveStatus(
  status: PollStatus,
  bettingClosesAt: string,
  now = Date.now(),
): PollStatus {
  if (status === 'OPEN' && new Date(bettingClosesAt).getTime() <= now) {
    return 'LOCKED';
  }
  return status;
}

export const statusLabel: Record<PollStatus, string> = {
  PENDING_APPROVAL: 'Esperando aprobación',
  REJECTED: 'Rechazada',
  OPEN: 'Abierta',
  LOCKED: 'Apuestas cerradas',
  PENDING_RESULT: 'Esperando resultado',
  RESOLVED_YES: 'Terminó en SÍ',
  RESOLVED_NO: 'Terminó en NO',
  VOID: 'Anulada',
};

/**
 * Cuándo vence lo próximo que le puede pasar a una poll: mientras se pueda
 * apostar es el cierre de apuestas, y una vez cerrada es el plazo para que el
 * árbitro la resuelva. El feed ordena por esto, así arriba queda siempre lo que
 * se define primero (§7).
 */
export function nextDeadline(
  poll: { status: PollStatus; betting_closes_at: string; outcome_deadline: string },
  now = Date.now(),
): number {
  const s = effectiveStatus(poll.status, poll.betting_closes_at, now);
  const iso = s === 'OPEN' ? poll.betting_closes_at : poll.outcome_deadline;
  return new Date(iso).getTime();
}
