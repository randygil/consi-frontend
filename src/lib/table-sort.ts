/**
 * The comparator behind every sortable <DataTable> column.
 *
 * Lives apart from the component so it can be exercised without React —
 * see `table.test.ts`.
 */

/**
 * `numeric` so REF-10 files after REF-9 rather than after REF-1.
 * `base` so "Álvarez" files with "A" — Venezuelan names are accented.
 * Empty values sort last in *both* directions: a missing amount is not a
 * small amount, and flipping the arrow should not float the blanks to the top.
 */
export function compare(a: unknown, b: unknown): number {
  const aEmpty = a === null || a === undefined || a === '';
  const bEmpty = b === null || b === undefined || b === '';
  if (aEmpty && bEmpty) return 0;
  if (aEmpty) return 1;
  if (bEmpty) return -1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b), 'es', { numeric: true, sensitivity: 'base' });
}

/**
 * Sorts a copy — `Array.prototype.sort` mutates, and the rows belong to the
 * page that owns the state.
 */
export function sortRows<T>(rows: T[], key: (row: T) => unknown, dir: 'asc' | 'desc'): T[] {
  const sign = dir === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    const result = compare(key(a), key(b));
    // Empties stay last regardless of direction, so don't flip their verdict.
    const aEmpty = isEmpty(key(a));
    const bEmpty = isEmpty(key(b));
    if (aEmpty !== bEmpty) return result;
    return result * sign;
  });
}

function isEmpty(v: unknown): boolean {
  return v === null || v === undefined || v === '';
}
