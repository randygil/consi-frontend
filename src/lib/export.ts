import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { formatDate, formatMoney } from './format';
import type { Transaction } from './types';

// Helper to sum numbers of a specific currency
function sumOf(data: Transaction[], key: 'amount' | 'feeAmount' | 'netAmount', currency: string): number {
  return data
    .filter((t) => t.currency === currency)
    .reduce((acc, t) => {
      const val = t[key];
      return acc + (val ? Number(val) : 0);
    }, 0);
}

export function exportTransactionsToExcel(data: Transaction[], filename = 'transacciones_consi') {
  const formatted = data.map((t) => ({
    'Referencia': t.reference,
    'Pasarela': t.provider ?? '—',
    'Tipo': t.type === 'PAYIN' ? 'Pago Recibido' : 'Retiro',
    'Moneda': t.currency,
    'Monto Bruto': Number(t.amount),
    'Comisión': t.feeAmount ? Number(t.feeAmount) : 0,
    'Neto': t.netAmount ? Number(t.netAmount) : Number(t.amount),
    'Reembolsado': t.refundedAmount ? Number(t.refundedAmount) : 0,
    'Equivalente USD': t.usdEquivalent ? Number(t.usdEquivalent) : 0,
    'Estado': t.status === 'COMPLETED' ? 'Completado' :
             t.status === 'PENDING' ? 'Pendiente' :
             t.status === 'FAILED' ? 'Fallido' :
             t.status === 'REFUNDED' ? 'Reembolsado' :
             t.status === 'CHARGEBACK' ? 'Contracargo' :
             t.status === 'AUTHORIZED' ? 'Autorizado' : t.status,
    'Fecha': formatDate(t.createdAt),
  }));

  const worksheet = XLSX.utils.json_to_sheet(formatted);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Transacciones');
  
  // Auto-fit column widths
  const maxLens = Object.keys(formatted[0] || {}).map((key) => {
    let maxLen = key.length;
    formatted.forEach((row) => {
      const val = row[key as keyof typeof row];
      if (val !== null && val !== undefined) {
        maxLen = Math.max(maxLen, String(val).length);
      }
    });
    return { wch: maxLen + 3 };
  });
  worksheet['!cols'] = maxLens;

  XLSX.writeFile(workbook, `${filename}.xlsx`);
}

export function exportTransactionsToPdf(data: Transaction[], filename = 'transacciones_consi') {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  // Color Palette (matching Consi system)
  const primaryColor: [number, number, number] = [37, 112, 240]; // #2570f0
  
  // 1. Draw top brand banner
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 0, 297, 32, 'F');

  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text('CONSI', 15, 14);

  // Subtitle
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('Pasarela de Pagos · Reporte Oficial de Transacciones', 15, 20);

  // Summary and date metadata on the right
  const dateStr = formatDate(new Date().toISOString());
  doc.setFontSize(9);
  doc.text(`Exportado el: ${dateStr}`, 200, 12);
  doc.text(`Total Transacciones: ${data.length}`, 200, 18);

  // Calculate sums to show in banner
  const payinTotalUsd = sumOf(data, 'amount', 'USD');
  const payinTotalVes = sumOf(data, 'amount', 'VES');
  doc.setFont('helvetica', 'bold');
  doc.text(`Volumen Bruto: USD ${formatMoney(payinTotalUsd, 'USD').replace('$', '')} | VES ${formatMoney(payinTotalVes, 'VES').replace('Bs.S', '').trim()}`, 200, 24);

  // Reset text color
  doc.setTextColor(17, 21, 29); // #11151d

  // 2. Table using jspdf-autotable
  autoTable(doc, {
    startY: 38,
    head: [['Referencia', 'Pasarela', 'Monto Bruto', 'Comisión', 'Monto Neto', 'Reembolsado', 'Equiv. USD', 'Estado', 'Fecha']],
    body: data.map((t) => [
      t.reference.slice(0, 14),
      t.provider ?? '—',
      formatMoney(t.amount, t.currency),
      t.feeAmount ? formatMoney(t.feeAmount, t.currency) : '—',
      t.netAmount ? formatMoney(t.netAmount, t.currency) : '—',
      t.refundedAmount && Number(t.refundedAmount) > 0 ? formatMoney(t.refundedAmount, t.currency) : '—',
      t.usdEquivalent ? formatMoney(t.usdEquivalent, 'USD') : '—',
      t.status === 'COMPLETED' ? 'Completado' :
      t.status === 'PENDING' ? 'Pendiente' :
      t.status === 'FAILED' ? 'Fallido' :
      t.status === 'REFUNDED' ? 'Reembolsado' :
      t.status === 'CHARGEBACK' ? 'Contracargo' :
      t.status === 'AUTHORIZED' ? 'Autorizado' : t.status,
      formatDate(t.createdAt),
    ]),
    styles: {
      fontSize: 8,
      cellPadding: 2,
      valign: 'middle',
    },
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [246, 248, 251], // Ink 50 background
    },
    columnStyles: {
      0: { cellWidth: 32 }, // Reference
      1: { cellWidth: 20 }, // Provider
      2: { cellWidth: 30, halign: 'right' }, // Gross
      3: { cellWidth: 25, halign: 'right' }, // Fee
      4: { cellWidth: 30, halign: 'right' }, // Net
      5: { cellWidth: 25, halign: 'right' }, // Refunded
      6: { cellWidth: 25, halign: 'right' }, // USD Equiv
      7: { cellWidth: 25, halign: 'center' }, // Status
      8: { cellWidth: 42, halign: 'center' }, // Date
    },
  });

  doc.save(`${filename}.pdf`);
}

export function exportPayoutsToExcel(data: Transaction[], filename = 'retiros_consi') {
  const formatted = data.map((t) => ({
    'Referencia': t.reference,
    'Moneda': t.currency,
    'Monto Bruto': Number(t.amount),
    'Comisión': t.feeAmount ? Number(t.feeAmount) : 0,
    'Neto Transferido': t.netAmount ? Number(t.netAmount) : Number(t.amount),
    'Detalle / Destino': t.description ?? 'Retiro directo a cuenta',
    'Estado': t.status === 'COMPLETED' ? 'Completado' :
             t.status === 'PENDING' ? 'Pendiente' :
             t.status === 'FAILED' ? 'Fallido' : t.status,
    'Fecha': formatDate(t.createdAt),
  }));

  const worksheet = XLSX.utils.json_to_sheet(formatted);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Retiros');
  
  // Auto-fit column widths
  const maxLens = Object.keys(formatted[0] || {}).map((key) => {
    let maxLen = key.length;
    formatted.forEach((row) => {
      const val = row[key as keyof typeof row];
      if (val !== null && val !== undefined) {
        maxLen = Math.max(maxLen, String(val).length);
      }
    });
    return { wch: maxLen + 3 };
  });
  worksheet['!cols'] = maxLens;

  XLSX.writeFile(workbook, `${filename}.xlsx`);
}

export function exportPayoutsToPdf(data: Transaction[], filename = 'retiros_consi') {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const primaryColor: [number, number, number] = [37, 112, 240]; // #2570f0
  
  // 1. Draw top brand banner
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 0, 297, 32, 'F');

  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text('CONSI', 15, 14);

  // Subtitle
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('Pasarela de Pagos · Reporte Oficial de Retiros y Liquidaciones', 15, 20);

  // Summary and date metadata on the right
  const dateStr = formatDate(new Date().toISOString());
  doc.setFontSize(9);
  doc.text(`Exportado el: ${dateStr}`, 200, 12);
  doc.text(`Total Retiros: ${data.length}`, 200, 18);

  // Calculate sums to show in banner
  const payoutTotalUsd = sumOf(data, 'amount', 'USD');
  const payoutTotalVes = sumOf(data, 'amount', 'VES');
  doc.setFont('helvetica', 'bold');
  doc.text(`Total Retirado: USD ${formatMoney(payoutTotalUsd, 'USD').replace('$', '')} | VES ${formatMoney(payoutTotalVes, 'VES').replace('Bs.S', '').trim()}`, 200, 24);

  // Reset text color
  doc.setTextColor(17, 21, 29);

  // 2. Table
  autoTable(doc, {
    startY: 38,
    head: [['Referencia', 'Monto Bruto', 'Comisión', 'Monto Neto', 'Destino / Descripción', 'Estado', 'Fecha']],
    body: data.map((t) => [
      t.reference.slice(0, 14),
      formatMoney(t.amount, t.currency),
      t.feeAmount ? formatMoney(t.feeAmount, t.currency) : '—',
      t.netAmount ? formatMoney(t.netAmount, t.currency) : '—',
      t.description ?? 'Retiro directo',
      t.status === 'COMPLETED' ? 'Completado' :
      t.status === 'PENDING' ? 'Pendiente' :
      t.status === 'FAILED' ? 'Fallido' : t.status,
      formatDate(t.createdAt),
    ]),
    styles: {
      fontSize: 9,
      cellPadding: 3,
      valign: 'middle',
    },
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [246, 248, 251], // Ink 50 background
    },
    columnStyles: {
      0: { cellWidth: 40 }, // Reference
      1: { cellWidth: 35, halign: 'right' }, // Gross
      2: { cellWidth: 30, halign: 'right' }, // Fee
      3: { cellWidth: 35, halign: 'right' }, // Net
      4: { cellWidth: 60 }, // Description
      5: { cellWidth: 30, halign: 'center' }, // Status
      6: { cellWidth: 45, halign: 'center' }, // Date
    },
  });

  doc.save(`${filename}.pdf`);
}
