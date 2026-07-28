/**
 * The three states a merchant's money can be in, and the arithmetic that splits a
 * wallet between them. Pure so it can be tested and so both pages agree on the
 * numbers — they used to disagree, which is what made "retención" and "retiro"
 * read as the same thing.
 *
 *   RETENIDO   tuyo, congelado por riesgo. Se libera solo, por fecha.
 *   DISPONIBLE tuyo y retirable ahora.
 *   EN CAMINO  ya lo pediste; viaja al banco.
 */
import type { Transaction, Wallet } from './types';

/** Why a payin's money is still held. Each holds a different slice of the same payin. */
export type HoldReason = 'RETENCION' | 'RESERVA';

export const holdReason = (t: Transaction): HoldReason =>
  t.settleStatus === 'PENDING_RELEASE' ? 'RETENCION' : 'RESERVA';

/**
 * Held amount: the whole net while the retention window runs, and only the reserve
 * tranche after it — the reserve is a slice OF that net, so adding both double-counts.
 */
export const heldAmount = (t: Transaction): number =>
  holdReason(t) === 'RETENCION'
    ? Number(t.netAmount ?? t.amount)
    : Number(t.reserveAmount ?? 0);

/** The date that slice clears. Each reason has its own clock. */
export const holdReleaseDate = (t: Transaction): string | null =>
  (holdReason(t) === 'RETENCION' ? t.afterRetentionDate : t.reserveReleaseAt) ?? null;

/**
 * Split one wallet into the three states.
 *
 * A requested payout decrements `available` immediately but `balance` only when it
 * settles, so `balance - available` still carries it. Subtracting the in-flight sum is
 * what stops a retiro you just asked for from displaying as "en retención".
 */
export function walletSplit(
  wallet: Pick<Wallet, 'balance' | 'available'> | undefined,
  pendingPayouts: Transaction[],
): { available: number; held: number; sending: number } {
  const available = Number(wallet?.available ?? 0);
  const sending = pendingPayouts.reduce((s, t) => s + Number(t.amount || 0), 0);
  return {
    available,
    // Clamped: a rounding drift must never render a negative "retenido".
    held: Math.max(0, Number(wallet?.balance ?? 0) - available - sending),
    sending,
  };
}
