import jsPDF from 'jspdf';
import type { Code, ColloqiumAgenda, PatientListItem, Task } from '../../../../api';
import { translateCodeLabel } from '../../../../i18n/codeTranslations';

export interface ProtocolAgendaDraft {
  presented_by_id: number | null;
  decision: string;
  decision_reason: string;
  comment: string;
}

interface ExportProtocolPdfInput {
  draftName: string;
  draftDate: string;
  draftParticipants: string;
  isColloqiumCompleted: boolean;
  signatoriesLine: string;
  presenterPeopleById: Record<number, string>;
  agendas: ColloqiumAgenda[];
  agendaDrafts: Record<number, ProtocolAgendaDraft>;
  patientsById: Record<number, PatientListItem>;
  tasksByAgendaId: Record<number, Task[]>;
}

function formatDate(iso: string | null): string {
  if (!iso) return '–';
  const [y, m, d] = iso.split('-');
  return `${d}.${m}.${y}`;
}

function resolvePhase(agenda: ColloqiumAgenda): { label: string; from: string | null; to: string | null } {
  const episode = agenda.episode;
  if (!episode) return { label: 'Unknown', from: null, to: null };
  if (episode.closed) return { label: 'Closed', from: episode.start, to: episode.end };
  if (episode.fup_recipient_card_date) return { label: 'Follow-Up', from: episode.fup_recipient_card_date, to: null };
  if (episode.tpl_date) return { label: 'Transplantation', from: episode.tpl_date, to: null };
  if (episode.list_start || episode.list_end) return { label: 'Listing', from: episode.list_start, to: episode.list_end };
  if (episode.eval_start || episode.eval_end) return { label: 'Evaluation', from: episode.eval_start, to: episode.eval_end };
  return { label: 'Episode', from: episode.start, to: episode.end };
}

export function exportProtocolPdf({
  draftName,
  draftDate,
  draftParticipants,
  isColloqiumCompleted,
  signatoriesLine,
  presenterPeopleById,
  agendas,
  agendaDrafts,
  patientsById,
  tasksByAgendaId,
}: ExportProtocolPdfInput): void {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 16;
  const footerSpace = 12;
  const contentWidth = pageWidth - margin * 2;
  const lineHeight = 5;
  const sectionGap = 4;
  const generatedOn = formatDate(new Date().toISOString().slice(0, 10));
  const safeValue = (value: string | null | undefined) => (value && value.trim() ? value.trim() : '–');
  const documentTitle = isColloqiumCompleted ? 'Colloquium Protocol' : 'Colloquium Agenda';
  const filePrefix = isColloqiumCompleted ? 'colloquium-protocol' : 'colloquium-agenda';
  const translateCodeForPdf = (
    code: {
      type?: string | null;
      key?: string | null;
      name_default?: string | null;
    } | null | undefined,
  ): string => translateCodeLabel(
    (_key, englishDefault) => englishDefault,
    code
      ? {
        type: code.type ?? '',
        key: code.key ?? '',
        name_default: code.name_default ?? '',
      } satisfies Pick<Code, 'type' | 'key' | 'name_default'>
      : null,
  );
  let y = margin;

  const ensureSpace = (heightNeeded: number) => {
    if (y + heightNeeded > pageHeight - margin - footerSpace) {
      pdf.addPage();
      y = margin;
    }
  };

  const writeWrapped = (
    text: string,
    options: { size?: number; style?: 'normal' | 'bold'; indent?: number; spacingAfter?: number } = {},
  ) => {
    const { size = 11, style = 'normal', indent = 0, spacingAfter = 0 } = options;
    const maxWidth = contentWidth - indent;
    const lines = pdf.splitTextToSize(text, maxWidth) as string[];
    pdf.setFont('helvetica', style);
    pdf.setFontSize(size);
    lines.forEach((line) => {
      ensureSpace(lineHeight);
      pdf.text(line, margin + indent, y);
      y += lineHeight;
    });
    y += spacingAfter;
  };

  const estimateLineCount = (text: string, indent = 0): number => {
    const maxWidth = contentWidth - indent;
    return (pdf.splitTextToSize(text, maxWidth) as string[]).length;
  };

  const estimateSectionHeight = (lines: Array<{ text: string; indent?: number; spacingAfter?: number }>): number =>
    lines.reduce((sum, entry) => {
      const wrappedLines = estimateLineCount(entry.text, entry.indent ?? 0);
      return sum + wrappedLines * lineHeight + (entry.spacingAfter ?? 0);
    }, 0);

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(16);
  pdf.text(documentTitle, margin, y);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.text(`Report date: ${generatedOn}`, pageWidth - margin, y, { align: 'right' });
  y += 7;
  pdf.setDrawColor(190, 197, 214);
  pdf.line(margin, y, pageWidth - margin, y);
  y += 6;

  writeWrapped('General Information', { size: 12, style: 'bold', spacingAfter: 1 });
  writeWrapped(`Name: ${safeValue(draftName)}`, { size: 11 });
  writeWrapped(`Colloquium date: ${draftDate ? formatDate(draftDate) : '–'}`, { size: 11 });
  writeWrapped(`Participants: ${safeValue(draftParticipants)}`, { size: 11, spacingAfter: 2 });
  if (isColloqiumCompleted) {
    writeWrapped('Protocol Sign-Off', { size: 12, style: 'bold', spacingAfter: 1 });
    writeWrapped(`Signatories: ${safeValue(signatoriesLine)}`, { size: 11, spacingAfter: 2 });
  }

  pdf.setDrawColor(212, 217, 230);
  pdf.line(margin, y, pageWidth - margin, y);
  y += 6;

  if (agendas.length === 0) {
    writeWrapped('No agenda entries.', { size: 11 });
  } else {
    writeWrapped('Agenda Items', { size: 12, style: 'bold', spacingAfter: 2 });
    agendas.forEach((agenda, index) => {
      const draft = agendaDrafts[agenda.id] ?? { presented_by_id: null, decision: '', decision_reason: '', comment: '' };
      const patient = agenda.episode ? patientsById[agenda.episode.patient_id] : undefined;
      const phase = resolvePhase(agenda);
      const patientLabel = patient
        ? `${patient.name}, ${patient.first_name} (${patient.pid})`
        : `Unknown patient (Episode ${agenda.episode?.fall_nr || `#${agenda.episode_id}`})`;
      const episodeLabel = agenda.episode?.fall_nr || `#${agenda.episode_id}`;
      const statusLabel = translateCodeForPdf(agenda.episode?.status);
      const phaseLabel = `${phase.label} (${formatDate(phase.from)} – ${formatDate(phase.to)})`;

      const presenterLabel = draft.presented_by_id != null
        ? (
          presenterPeopleById[draft.presented_by_id]
            ?? (
              agenda.presented_by_person && agenda.presented_by_person.id === draft.presented_by_id
                ? `${agenda.presented_by_person.first_name} ${agenda.presented_by_person.surname}`.trim()
                : 'Person'
            )
        )
        : '–';

      const sectionEntries = [
        { text: `${index + 1}. ${patientLabel}` },
        { text: `Episode: ${episodeLabel}`, indent: 2 },
        { text: `Status: ${statusLabel}`, indent: 2 },
        { text: `Phase: ${phaseLabel}`, indent: 2, spacingAfter: 1 },
        { text: `Presented by: ${safeValue(presenterLabel)}`, spacingAfter: 1 },
        { text: `Decision: ${safeValue(draft.decision)}`, spacingAfter: 1 },
        { text: `Decision reason: ${safeValue(draft.decision_reason)}`, spacingAfter: 1 },
        { text: `Comment: ${safeValue(draft.comment)}`, spacingAfter: 1 },
      ];
      const tasks = tasksByAgendaId[agenda.id] ?? [];
      const taskSummaryLines = tasks.length === 0
        ? [{ text: 'Tasks: none', indent: 2, spacingAfter: sectionGap }]
        : [
          { text: `Tasks (${tasks.length}):`, indent: 2, spacingAfter: 1 },
          ...tasks.map((task) => {
            const status = translateCodeForPdf(task.status);
            const assignee = task.assigned_to?.name ?? 'Unassigned';
            const due = task.until ? formatDate(task.until) : '–';
            const comment = task.comment?.trim() ? ` | ${task.comment.trim()}` : '';
            return {
              text: `- [${status}] ${task.description || 'Task'} (Due: ${due}, Assigned: ${assignee})${comment}`,
              indent: 4,
              spacingAfter: 1,
            };
          }),
          { text: '', spacingAfter: sectionGap - 1 },
        ];
      const sectionHeight = 5 + estimateSectionHeight([...sectionEntries, ...taskSummaryLines]);
      ensureSpace(sectionHeight);

      pdf.setDrawColor(212, 217, 230);
      pdf.line(margin, y, pageWidth - margin, y);
      y += 5;

      writeWrapped(`${index + 1}. ${patientLabel}`, { size: 12, style: 'bold' });
      writeWrapped(`Episode: ${episodeLabel}`, { size: 10, indent: 2 });
      writeWrapped(`Status: ${statusLabel}`, { size: 10, indent: 2 });
      writeWrapped(`Phase: ${phaseLabel}`, { size: 10, indent: 2, spacingAfter: 1 });
      writeWrapped(`Presented by: ${safeValue(presenterLabel)}`, { size: 11, spacingAfter: 1 });
      writeWrapped(`Decision: ${safeValue(draft.decision)}`, { size: 11, spacingAfter: 1 });
      writeWrapped(`Decision reason: ${safeValue(draft.decision_reason)}`, { size: 11, spacingAfter: 1 });
      writeWrapped(`Comment: ${safeValue(draft.comment)}`, { size: 11, spacingAfter: 1 });
      if (tasks.length === 0) {
        writeWrapped('Tasks: none', { size: 10, indent: 2, spacingAfter: sectionGap });
      } else {
        writeWrapped(`Tasks (${tasks.length}):`, { size: 10, indent: 2, style: 'bold', spacingAfter: 1 });
        tasks.forEach((task) => {
          const status = translateCodeForPdf(task.status);
          const assignee = task.assigned_to?.name ?? 'Unassigned';
          const due = task.until ? formatDate(task.until) : '–';
          const comment = task.comment?.trim() ? ` | ${task.comment.trim()}` : '';
          writeWrapped(
            `- [${status}] ${task.description || 'Task'} (Due: ${due}, Assigned: ${assignee})${comment}`,
            { size: 10, indent: 4, spacingAfter: 1 },
          );
        });
        y += sectionGap - 1;
      }
    });
  }

  const pageCount = pdf.getNumberOfPages();
  for (let pageNo = 1; pageNo <= pageCount; pageNo += 1) {
    pdf.setPage(pageNo);
    pdf.setDrawColor(220, 224, 234);
    pdf.line(margin, pageHeight - footerSpace, pageWidth - margin, pageHeight - footerSpace);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.text(`Generated on ${generatedOn}`, margin, pageHeight - 7);
    pdf.text(`Page ${pageNo} of ${pageCount}`, pageWidth - margin, pageHeight - 7, { align: 'right' });
  }

  const datePart = draftDate || new Date().toISOString().slice(0, 10);
  pdf.save(`${filePrefix}-${datePart}.pdf`);
}
