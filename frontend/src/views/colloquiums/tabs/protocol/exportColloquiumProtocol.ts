import { api, type ColloqiumAgenda, type PatientListItem, type Task } from '../../../../api';
import { exportProtocolPdf, type ProtocolAgendaDraft } from './exportProtocolPdf';

interface ExportColloquiumProtocolInput {
  draftName: string;
  draftDate: string;
  draftParticipants: string;
  agendas: ColloqiumAgenda[];
  agendaDrafts: Record<number, ProtocolAgendaDraft>;
  patientsById: Record<number, PatientListItem>;
}

export async function exportColloquiumProtocolPdf(input: ExportColloquiumProtocolInput): Promise<void> {
  const {
    draftName,
    draftDate,
    draftParticipants,
    agendas,
    agendaDrafts,
    patientsById,
  } = input;
  const tasksByAgendaId: Record<number, Task[]> = {};
  await Promise.all(agendas.map(async (agenda) => {
    const episode = agenda.episode;
    if (!episode) {
      tasksByAgendaId[agenda.id] = [];
      return;
    }
    const groupsInEpisode = await api.listTaskGroups({
      patient_id: episode.patient_id,
      episode_id: agenda.episode_id,
    });
    const exactGroups = groupsInEpisode.filter((group) => group.colloqium_agenda_id === agenda.id);
    const fallbackGroups = groupsInEpisode.filter((group) =>
      group.colloqium_agenda_id == null && group.task_group_template_id == null);
    const groupsForExport = exactGroups.length > 0 ? exactGroups : fallbackGroups;
    const groupedTasks = await Promise.all(
      groupsForExport.map((group) => api.listTasks({ task_group_id: group.id })),
    );
    tasksByAgendaId[agenda.id] = groupedTasks.flat().sort((a, b) => a.id - b.id);
  }));
  exportProtocolPdf({
    draftName,
    draftDate,
    draftParticipants,
    agendas,
    agendaDrafts,
    patientsById,
    tasksByAgendaId,
  });
}

