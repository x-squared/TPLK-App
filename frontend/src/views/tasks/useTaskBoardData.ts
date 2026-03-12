import { useCallback, useEffect, useState } from 'react';
import { api, type Code, type ColloqiumAgenda, type Episode, type Patient, type Task, type TaskGroup } from '../../api';
import { toUserErrorMessage } from '../../api/error';
import { formatCoordinationReferenceName } from '../layout/episodeDisplay';
import type { TaskBoardCriteria } from './taskBoardTypes';

interface TaskBoardDataState {
  loading: boolean;
  error: string;
  taskGroups: TaskGroup[];
  tasksByGroup: Record<number, Task[]>;
  patientsById: Record<number, Patient>;
  episodesById: Record<number, Episode>;
  organCodes: Code[];
  priorityCodes: Code[];
  taskStatusByKey: Record<string, Code>;
  allUsers: Record<number, string>;
  colloqiumAgendasById: Record<number, ColloqiumAgenda>;
  coordinationLabelsById: Record<number, string>;
  currentUserId: number | null;
}

const initialState: TaskBoardDataState = {
  loading: true,
  error: '',
  taskGroups: [],
  tasksByGroup: {},
  patientsById: {},
  episodesById: {},
  organCodes: [],
  priorityCodes: [],
  taskStatusByKey: {},
  allUsers: {},
  colloqiumAgendasById: {},
  coordinationLabelsById: {},
  currentUserId: null,
};

export default function useTaskBoardData(criteria: TaskBoardCriteria, statusKeysToLoad: string[]) {
  const [state, setState] = useState<TaskBoardDataState>(initialState);
  const [reloadToken, setReloadToken] = useState(0);

  const reload = useCallback(() => {
    setReloadToken((prev) => prev + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      setState((prev) => ({ ...prev, loading: true, error: '' }));
      try {
        const extraTaskGroupParams = criteria.extraParams ?? {};
        const groupParams = {
          patient_id: criteria.patientId,
          episode_id: criteria.episodeId ?? undefined,
          ...(typeof extraTaskGroupParams.coordination_id === 'number'
            ? { coordination_id: extraTaskGroupParams.coordination_id }
            : {}),
          ...(typeof extraTaskGroupParams.organ_id === 'number'
            ? { organ_id: extraTaskGroupParams.organ_id }
            : {}),
          ...(Array.isArray(extraTaskGroupParams.task_group_template_id)
            ? { task_group_template_id: extraTaskGroupParams.task_group_template_id.filter((entry): entry is number => typeof entry === 'number') }
            : {}),
        };
        const groups = await api.listTaskGroups(groupParams);
        const [me, users, organs, priorities, taskStatuses] = await Promise.all([
          api.getMe(),
          api.listUsers(),
          api.listCodes('ORGAN'),
          api.listCodes('PRIORITY'),
          api.listCodes('TASK_STATUS'),
        ]);

        const groupsWithPhase = criteria.tplPhaseId == null
          ? groups
          : groups.filter((group) => group.tpl_phase_id === criteria.tplPhaseId);
        const groupsWithContext = (() => {
          if (criteria.colloqiumAgendaId == null) return groupsWithPhase;
          const exact = groupsWithPhase.filter((group) => group.colloqium_agenda_id === criteria.colloqiumAgendaId);
          if (exact.length > 0) return exact;
          // Legacy fallback: tasks created before proper colloquium agenda linking.
          return groupsWithPhase.filter((group) =>
            group.colloqium_agenda_id == null && group.task_group_template_id == null);
        })();

        const patientIds = [...new Set(
          groupsWithContext
            .map((group) => group.patient_id)
            .filter((id): id is number => id != null),
        )];
        const patientDetails = await Promise.all(patientIds.map((id) => api.getPatient(id)));
        const coordinationIds = [...new Set(
          groupsWithContext
            .map((group) => group.coordination_id)
            .filter((id): id is number => id != null),
        )];
        const coordinationLabelEntries = await Promise.all(
          coordinationIds.map(async (coordinationId) => {
            try {
              const [coordination, donor] = await Promise.all([
                api.getCoordination(coordinationId),
                api.getCoordinationDonor(coordinationId).catch(() => null),
              ]);
              const donorName = donor?.full_name?.trim();
              const label = formatCoordinationReferenceName({
                coordinationId,
                donorFullName: donorName || null,
                swtplNumber: coordination.swtpl_nr || null,
                emptySymbol: '–',
              });
              return [coordinationId, label] as const;
            } catch {
              return [coordinationId, formatCoordinationReferenceName({
                coordinationId,
                donorFullName: null,
                swtplNumber: null,
                emptySymbol: '–',
              })] as const;
            }
          }),
        );

        const tasksPerGroup = await Promise.all(
          groupsWithContext.map(async (group) => ({
            groupId: group.id,
            tasks: await api.listTasks({
              task_group_id: group.id,
              assigned_to_id: criteria.assignedToId ?? undefined,
              status_key: statusKeysToLoad,
            }),
          })),
        );
        const needsAgendas = groupsWithContext.some((group) => group.colloqium_agenda_id != null);
        const agendas = needsAgendas ? await api.listColloqiumAgendas() : [];

        if (cancelled) return;

        const nextTasksByGroup: Record<number, Task[]> = {};
        tasksPerGroup.forEach(({ groupId, tasks }) => {
          nextTasksByGroup[groupId] = tasks;
        });

        const nextPatientsById: Record<number, Patient> = {};
        patientDetails.forEach((patient) => {
          nextPatientsById[patient.id] = patient;
        });

        const nextEpisodesById: Record<number, Episode> = {};
        patientDetails.forEach((patient) => {
          (patient.episodes ?? []).forEach((ep) => {
            nextEpisodesById[ep.id] = ep;
          });
        });

        const nextUsers: Record<number, string> = {};
        users.forEach((user) => {
          nextUsers[user.id] = user.name;
        });

        const nextTaskStatusByKey: Record<string, Code> = {};
        taskStatuses.forEach((status) => {
          nextTaskStatusByKey[status.key] = status;
        });
        const nextColloqiumAgendasById: Record<number, ColloqiumAgenda> = {};
        agendas.forEach((agenda) => {
          nextColloqiumAgendasById[agenda.id] = agenda;
        });
        const nextCoordinationLabelsById: Record<number, string> = {};
        coordinationLabelEntries.forEach(([coordinationId, label]) => {
          nextCoordinationLabelsById[coordinationId] = label;
        });

        setState({
          loading: false,
          error: '',
          taskGroups: groupsWithContext,
          tasksByGroup: nextTasksByGroup,
          patientsById: nextPatientsById,
          episodesById: nextEpisodesById,
          organCodes: organs,
          priorityCodes: priorities,
          taskStatusByKey: nextTaskStatusByKey,
          allUsers: nextUsers,
          colloqiumAgendasById: nextColloqiumAgendasById,
          coordinationLabelsById: nextCoordinationLabelsById,
          currentUserId: me.id,
        });
      } catch (err) {
        if (cancelled) return;
        setState((prev) => ({
          ...prev,
          loading: false,
          error: toUserErrorMessage(err, 'Could not load tasks.'),
        }));
      }
    };

    loadData();
    return () => {
      cancelled = true;
    };
  }, [
    criteria.patientId,
    criteria.episodeId,
    criteria.colloqiumAgendaId,
    criteria.tplPhaseId,
    criteria.assignedToId,
    criteria.extraParams,
    statusKeysToLoad,
    reloadToken,
  ]);

  return {
    ...state,
    reload,
  };
}
