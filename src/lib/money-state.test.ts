import assert from 'node:assert/strict';
import { test } from 'node:test';
import { heldAmount, holdReason, holdReleaseDate, walletSplit } from './money-state.ts';
import type { Transaction } from './types.ts';

const payin = (over: Partial<Transaction>): Transaction =>
  ({
    id: 't1',
    type: 'PAYIN',
    status: 'COMPLETED',
    currency: 'USD',
    amount: '100.00',
    netAmount: '98.00',
    exchangeRateUsed: null,
    usdEquivalent: null,
    reference: 'CNS-0001-01-000001',
    customerName: null,
    description: null,
    createdAt: '2026-07-01T00:00:00.000Z',
    ...over,
  }) as Transaction;

test('inside the retention window the whole net is held, and it clears on afterRetentionDate', () => {
  const t = payin({
    settleStatus: 'PENDING_RELEASE',
    afterRetentionDate: '2026-07-05T00:00:00.000Z',
    reserveAmount: '4.90',
    reserveReleaseAt: '2026-08-01T00:00:00.000Z',
  });
  assert.equal(holdReason(t), 'RETENCION');
  assert.equal(heldAmount(t), 98);
  assert.equal(holdReleaseDate(t), '2026-07-05T00:00:00.000Z');
});

test('once released, only the reserve tranche is still held — not the net again', () => {
  const t = payin({
    settleStatus: 'RELEASED',
    afterRetentionDate: '2026-07-05T00:00:00.000Z',
    reserveAmount: '4.90',
    reserveReleaseAt: '2026-08-01T00:00:00.000Z',
  });
  assert.equal(holdReason(t), 'RESERVA');
  assert.equal(heldAmount(t), 4.9);
  assert.equal(holdReleaseDate(t), '2026-08-01T00:00:00.000Z');
});

test('a payout in flight is "en camino", never "retenido"', () => {
  // balance 100, available 60 → 40 looks held, but 40 of it is a payout already asked for.
  const split = walletSplit({ balance: '100.00', available: '60.00' }, [
    payin({ type: 'PAYOUT', status: 'PENDING', amount: '40.00' }),
  ]);
  assert.deepEqual(split, { available: 60, held: 0, sending: 40 });
});

test('retention and an in-flight payout coexist without double-counting', () => {
  const split = walletSplit({ balance: '100.00', available: '20.00' }, [
    payin({ type: 'PAYOUT', status: 'PENDING', amount: '30.00' }),
  ]);
  assert.deepEqual(split, { available: 20, held: 50, sending: 30 });
});

test('no wallet and no payouts is all zeros, not NaN', () => {
  assert.deepEqual(walletSplit(undefined, []), { available: 0, held: 0, sending: 0 });
});
