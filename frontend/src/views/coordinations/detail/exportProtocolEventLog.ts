import jsPDF from 'jspdf';
import type { CoordinationProtocolEventLog } from '../../../api';

export interface ProtocolEventLogExportLabels {
  title: string;
  columns: {
    time: string;
    event: string;
    task: string;
    comment: string;
    user: string;
  };
}

function formatTimeOfDay(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--:--:--';
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

export function formatProtocolEventLogDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--';
  const yyyy = String(date.getFullYear());
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${dd}.${mm}.${yyyy} ${formatTimeOfDay(value)}`;
}

function escapeCsvValue(value: string): string {
  if (value.includes('"') || value.includes(',') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function exportProtocolEventLogCsv(input: {
  entries: CoordinationProtocolEventLog[];
  coordinationId: number;
  organId: number;
  labels: ProtocolEventLogExportLabels;
}): void {
  const { entries, coordinationId, organId, labels } = input;
  const headers = [
    labels.columns.time,
    labels.columns.event,
    labels.columns.task,
    labels.columns.comment,
    labels.columns.user,
  ];
  const rows = entries.map((entry) => [
    formatProtocolEventLogDateTime(entry.time),
    entry.event || '',
    entry.task_text || '',
    entry.task_comment || '',
    entry.changed_by_user?.name || '',
  ].map((value) => escapeCsvValue(String(value))).join(','));
  const csv = [headers.map(escapeCsvValue).join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `coordination-protocol-log-${coordinationId}-${organId}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export function exportProtocolEventLogPdf(input: {
  entries: CoordinationProtocolEventLog[];
  coordinationId: number;
  organId: number;
  labels: ProtocolEventLogExportLabels;
}): void {
  const { entries, coordinationId, organId, labels } = input;
  const pdf = new jsPDF('p', 'mm', 'a4');
  const margin = 12;
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const usableWidth = pageWidth - margin * 2;
  let y = margin;
  const lineHeight = 4.8;
  const columns = [
    { label: labels.columns.time, width: 34 },
    { label: labels.columns.event, width: 52 },
    { label: labels.columns.task, width: 34 },
    { label: labels.columns.comment, width: 40 },
    { label: labels.columns.user, width: 26 },
  ] as const;

  const drawHeader = () => {
    pdf.setDrawColor(120, 128, 150);
    pdf.setLineWidth(0.7);
    pdf.line(margin, y, pageWidth - margin, y);
    y += 5;
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9);
    let x = margin;
    for (const column of columns) {
      pdf.text(column.label, x, y);
      x += column.width;
    }
    y += 2;
    pdf.setDrawColor(190, 196, 214);
    pdf.setLineWidth(0.3);
    pdf.line(margin, y, pageWidth - margin, y);
    y += 4;
  };

  const ensureSpace = (height: number, includeHeader = false) => {
    if (y + height > pageHeight - margin) {
      pdf.addPage();
      y = margin;
      if (includeHeader) {
        drawHeader();
      }
    }
  };

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(14);
  pdf.text(labels.title, margin, y);
  y += 7;
  drawHeader();

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  entries.forEach((entry) => {
    const rowValues = [
      formatProtocolEventLogDateTime(entry.time),
      entry.event || '—',
      entry.task_text || '—',
      entry.task_comment || '—',
      entry.changed_by_user?.name || '—',
    ] as const;
    const rowLines = rowValues.map((value, index) => (
      pdf.splitTextToSize(value, columns[index].width - 1.5) as string[]
    ));
    const maxLines = Math.max(...rowLines.map((lines) => Math.max(lines.length, 1)));
    const rowHeight = Math.max(7, maxLines * lineHeight + 2.5);
    ensureSpace(rowHeight + 2, true);
    const textY = y + 1.4;
    let x = margin;
    rowLines.forEach((lines, index) => {
      const text = lines.length > 0 ? lines : ['—'];
      pdf.text(text, x, textY, { lineHeightFactor: 1.15 });
      x += columns[index].width;
    });
    y += rowHeight;
    pdf.setDrawColor(215, 220, 233);
    pdf.setLineWidth(0.2);
    pdf.line(margin, y, margin + usableWidth, y);
    y += 2;
  });

  pdf.save(`coordination-protocol-log-${coordinationId}-${organId}.pdf`);
}

