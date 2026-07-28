/**
 * The two pieces of <DataTable> that are logic rather than markup: the sort
 * comparator and the CSV writer. Everything else is rendering.
 *
 *   pnpm test
 *
 * Node strips the types natively — no runner, no config, no dependency.
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { toCsv, type ExportColumn } from './table-export.ts';
import { compare, sortRows } from './table-sort.ts';

test('numbers compare numerically, not lexically', () => {
  assert.ok(compare(9, 10) < 0);
  assert.ok(compare(1000, 999) > 0);
  assert.equal(compare(5, 5), 0);
});

test('references with embedded numbers sort in human order', () => {
  assert.ok(compare('REF-9', 'REF-10') < 0);
});

test('accented Spanish names file with their unaccented letter', () => {
  assert.ok(compare('Álvarez', 'Blanco') < 0);
  assert.ok(compare('Núñez', 'Marín') > 0);
});

test('ISO dates sort chronologically as plain strings', () => {
  assert.ok(compare('2026-01-09T00:00:00Z', '2026-01-10T00:00:00Z') < 0);
});

test('empty values sort last in BOTH directions', () => {
  const rows = [{ v: 3 }, { v: null }, { v: 1 }];
  const key = (r: { v: number | null }) => r.v;

  assert.deepEqual(
    sortRows(rows, key, 'asc').map((r) => r.v),
    [1, 3, null],
  );
  // The blank must not float to the top when the arrow flips.
  assert.deepEqual(
    sortRows(rows, key, 'desc').map((r) => r.v),
    [3, 1, null],
  );
});

test('sortRows does not mutate the caller’s array', () => {
  const rows = [{ v: 2 }, { v: 1 }];
  sortRows(rows, (r) => r.v, 'asc');
  assert.deepEqual(
    rows.map((r) => r.v),
    [2, 1],
  );
});

type Row = { name: string; amount: number; note: string | null };

const COLUMNS: ExportColumn<Row>[] = [
  { id: 'name', header: 'Nombre', value: (r) => r.name },
  { id: 'amount', header: 'Monto', value: (r) => r.amount, text: (r) => `$${r.amount.toFixed(2)}` },
  { id: 'note', header: 'Nota', value: (r) => r.note },
  { id: 'secret', header: 'Interno', value: () => 'x', exportable: false },
];

test('CSV quotes separators, quotes and newlines', () => {
  const csv = toCsv(
    [{ name: 'Pérez, Ana', amount: 12.5, note: 'dijo "hola"' }],
    COLUMNS,
  );
  const [, row] = csv.split('\r\n');
  assert.equal(row, '"Pérez, Ana",$12.50,"dijo ""hola"""');
});

test('CSV omits non-exportable columns and em-dashes blanks', () => {
  const csv = toCsv([{ name: 'Ana', amount: 1, note: null }], COLUMNS);
  const [header, row] = csv.split('\r\n');
  assert.equal(header.replace('﻿', ''), 'Nombre,Monto,Nota');
  assert.equal(row, 'Ana,$1.00,—');
});

test('CSV opens with a BOM so Excel reads the accents', () => {
  assert.ok(toCsv([], COLUMNS).startsWith('﻿'));
});
