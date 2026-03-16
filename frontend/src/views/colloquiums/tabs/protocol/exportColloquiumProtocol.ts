import { api, type ColloqiumAgenda, type PatientListItem, type Person, type Task } from '../../../../api';
import { exportProtocolPdf, type ProtocolAgendaDraft } from './exportProtocolPdf';

interface ExportColloquiumProtocolInput {
  draftName: string;
  draftDate: string;
  draftParticipants: string;
  signatoriesPeople: Person[];
  isColloqiumCompleted: boolean;
  presenterPeople: Person[];
  agendas: ColloqiumAgenda[];
  agendaDrafts: Record<number, ProtocolAgendaDraft>;
  patientsById: Record<number, PatientListItem>;
}

export async function exportColloquiumProtocolPdf(input: ExportColloquiumProtocolInput): Promise<void> {
  const {
    draftName,
    draftDate,
    draftParticipants,
    signatoriesPeople,
    isColloqiumCompleted,
    presenterPeople,
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
    isColloqiumCompleted,
    signatoriesLine: signatoriesPeople.length > 0
      ? signatoriesPeople.map((person) => `${person.first_name} ${person.surname}`.trim()).join(', ')
      : '',
    presenterPeopleById: Object.fromEntries(
      presenterPeople.map((person) => [person.id, `${person.first_name} ${person.surname}`.trim()]),
    ),
    agendas,
    agendaDrafts,
    patientsById,
    tasksByAgendaId,
  });
}

