/**
 * Column-driven exporters shared by every <DataTable>.
 *
 * One contract for three formats: whatever columns the table declares are the
 * columns that leave the building. Hidden columns are already filtered out by
 * the caller, so what you export is what you see.
 *
 * `xlsx` + `jspdf` + `jspdf-autotable` are ~1 MB combined. Both entry points
 * import them dynamically, so a route that renders a table but never exports
 * never downloads them.
 */

export type ExportFormat = 'csv' | 'xlsx' | 'pdf';

export interface ExportColumn<T> {
  id: string;
  header: string;
  /** Sortable/searchable primitive. Numbers stay numbers so a sheet can sum them. */
  value?: (row: T) => string | number | null | undefined;
  /** Human string for CSV and PDF. Defaults to `value`. */
  text?: (row: T) => string;
  exportable?: boolean;
  align?: 'left' | 'right' | 'center';
}

export interface ExportOptions {
  /** Base filename, no extension. A date stamp is appended. */
  filename: string;
  /** Sheet name and PDF headline. */
  title: string;
  /** Optional lines printed in the PDF banner (totals, active filters). */
  summary?: string[];
}

/**
 * The PDF is drawn by jsPDF, which cannot read CSS custom properties — these
 * are the sRGB renderings of `--color-accent`, `--color-ink` and
 * `--color-paper-3` from the light theme. If those tokens change in
 * `tokens.css`, change them here too; this is the only place they are duplicated.
 */
const PRINT = {
  accent: [0, 91, 209] as [number, number, number],
  ink: [31, 37, 48] as [number, number, number],
  zebra: [244, 246, 250] as [number, number, number],
  onAccent: [255, 255, 255] as [number, number, number],
};

function stamped(filename: string): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${filename}_${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function visible<T>(columns: ExportColumn<T>[]): ExportColumn<T>[] {
  return columns.filter((c) => c.exportable !== false);
}

/** Raw primitive — what a spreadsheet cell should hold. */
function raw<T>(col: ExportColumn<T>, row: T): string | number {
  const v = col.value?.(row);
  return v === null || v === undefined ? '' : v;
}

/** Human string — what a CSV or a PDF cell should read. */
function label<T>(col: ExportColumn<T>, row: T): string {
  if (col.text) return col.text(row);
  const v = col.value?.(row);
  return v === null || v === undefined || v === '' ? '—' : String(v);
}

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * RFC 4180 comma-delimited, UTF-8 with a BOM so accented Spanish survives.
 * CSV stays standards-compliant for tooling; humans on a Spanish-locale Excel
 * should take the .xlsx, which has no delimiter ambiguity at all.
 */
export function toCsv<T>(rows: T[], columns: ExportColumn<T>[]): string {
  const cols = visible(columns);
  const cell = (v: string) => (/["\n\r,]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const lines = [cols.map((c) => cell(c.header)).join(',')];
  for (const row of rows) lines.push(cols.map((c) => cell(label(c, row))).join(','));
  return `﻿${lines.join('\r\n')}`;
}

async function exportCsv<T>(rows: T[], columns: ExportColumn<T>[], opts: ExportOptions) {
  const blob = new Blob([toCsv(rows, columns)], { type: 'text/csv;charset=utf-8' });
  download(blob, `${stamped(opts.filename)}.csv`);
}

async function exportXlsx<T>(rows: T[], columns: ExportColumn<T>[], opts: ExportOptions) {
  const XLSX = await import('xlsx');
  const cols = visible(columns);

  const aoa: (string | number)[][] = [cols.map((c) => c.header)];
  for (const row of rows) aoa.push(cols.map((c) => raw(c, row)));

  const sheet = XLSX.utils.aoa_to_sheet(aoa);
  // Widen each column to its longest cell so nothing lands as ####.
  sheet['!cols'] = cols.map((c, i) => ({
    wch: aoa.reduce((max, r) => Math.max(max, String(r[i] ?? '').length), c.header.length) + 3,
  }));
  sheet['!freeze'] = { xSplit: '0', ySplit: '1' };

  const book = XLSX.utils.book_new();
  // Excel rejects sheet names over 31 chars or containing []:*?/\
  XLSX.utils.book_append_sheet(book, sheet, opts.title.replace(/[[\]:*?/\\]/g, '').slice(0, 31));
  XLSX.writeFile(book, `${stamped(opts.filename)}.xlsx`);
}

async function exportPdf<T>(rows: T[], columns: ExportColumn<T>[], opts: ExportOptions) {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);
  const cols = visible(columns);

  // Past six columns a portrait page crushes the text columns to nothing.
  const landscape = cols.length > 6;
  const doc = new jsPDF({
    orientation: landscape ? 'landscape' : 'portrait',
    unit: 'mm',
    format: 'a4',
  });
  const pageW = landscape ? 297 : 210;
  const bannerH = 30;

  doc.setFillColor(...PRINT.accent);
  doc.rect(0, 0, pageW, bannerH, 'F');

  doc.setTextColor(...PRINT.onAccent);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('CONSI', 14, 13);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.text(opts.title, 14, 20);

  const meta = [
    new Intl.DateTimeFormat('es-VE', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date()),
    `${rows.length} ${rows.length === 1 ? 'registro' : 'registros'}`,
    ...(opts.summary ?? []),
  ];
  doc.setFontSize(8);
  meta.forEach((line, i) => doc.text(line, pageW - 14, 10 + i * 4.5, { align: 'right' }));

  doc.setTextColor(...PRINT.ink);

  autoTable(doc, {
    startY: bannerH + 6,
    head: [cols.map((c) => c.header)],
    body: rows.map((row) => cols.map((c) => label(c, row))),
    styles: { fontSize: 8, cellPadding: 2, valign: 'middle', overflow: 'linebreak' },
    headStyles: { fillColor: PRINT.accent, textColor: PRINT.onAccent, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: PRINT.zebra },
    columnStyles: Object.fromEntries(
      cols.map((c, i) => [i, { halign: c.align ?? 'left' }]),
    ) as Record<number, { halign: 'left' | 'right' | 'center' }>,
    margin: { left: 14, right: 14 },
  });

  doc.save(`${stamped(opts.filename)}.pdf`);
}

export async function exportRows<T>(
  format: ExportFormat,
  rows: T[],
  columns: ExportColumn<T>[],
  opts: ExportOptions,
): Promise<void> {
  if (format === 'csv') return exportCsv(rows, columns, opts);
  if (format === 'xlsx') return exportXlsx(rows, columns, opts);
  return exportPdf(rows, columns, opts);
}

export const EXPORT_LABEL: Record<ExportFormat, string> = {
  csv: 'CSV',
  xlsx: 'Excel',
  pdf: 'PDF',
};
