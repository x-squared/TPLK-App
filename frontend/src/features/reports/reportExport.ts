import type { ReportExecuteResponse } from '../../api';

function escapeCsvValue(value: string): string {
  if (value.includes('"') || value.includes(',') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function exportReportResultAsCsv(result: ReportExecuteResponse): void {
  const headers = result.columns.map((col) => escapeCsvValue(col.label)).join(',');
  const rows = result.rows.map((row) =>
    result.columns
      .map((col) => escapeCsvValue(String(row[col.key] ?? '')))
      .join(','));
  const csv = [headers, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `report-${result.source.toLowerCase()}-${timestamp}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
