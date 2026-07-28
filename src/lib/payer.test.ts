import assert from 'node:assert/strict';
import { test } from 'node:test';
import { resolveCustomer } from './payer.ts';

const FULL = { firstName: 'Ana', lastName: 'Pérez', email: 'a@b.com', cedula: 'V-123' };
const EMPTY = { firstName: '', lastName: '', email: '', cedula: '' };

test('a VES rail demands the cédula even when the link is priced in USD', () => {
  const r = resolveCustomer({ ...FULL, cedula: '  ' }, 'PAGO_MOVIL');
  assert.ok('error' in r);
  assert.equal(r.error.field, 'cedula');
});

test('card settles in VES, so it demands the cédula too', () => {
  const r = resolveCustomer({ ...FULL, cedula: '' }, 'CARD');
  assert.ok('error' in r);
});

test('USD rails accept a payer with no cédula', () => {
  const r = resolveCustomer({ ...FULL, cedula: '' }, 'ZELLE');
  assert.ok('customer' in r);
  assert.equal(r.customer?.cedula, undefined);
});

test('a partially filled optional form is sent as no payer at all', () => {
  const r = resolveCustomer({ ...EMPTY, firstName: 'Ana' }, 'USDT');
  assert.ok('customer' in r);
  assert.equal(r.customer, undefined);
});

test('a complete payer passes on a VES rail', () => {
  const r = resolveCustomer(FULL, 'C2P');
  assert.ok('customer' in r);
  assert.equal(r.customer?.cedula, 'V-123');
});
