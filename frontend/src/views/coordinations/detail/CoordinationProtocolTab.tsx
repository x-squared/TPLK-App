import { useEffect, useMemo, useState } from 'react';
import { api, type CoordinationProcurementFlex, type CoordinationProtocolStateOrgan } from '../../../api';
import { translateCodeLabel } from '../../../i18n/codeTranslations';
import { useI18n } from '../../../i18n/i18n';
import type { ProtocolOverviewEntry } from './CoordinationProtocolOverviewSection';
import CoordinationProtocolDataPanel from './CoordinationProtocolDataPanel';
import CoordinationProtocolEventLogPanel from './CoordinationProtocolEventLogPanel';
import { CoordinationProtocolStateProvider, useCoordinationProtocolState } from './CoordinationProtocolStateContext';
import CoordinationProtocolTasksPanel from './CoordinationProtocolTasksPanel';
import { TASK_CHANGED_EVENT } from '../../tasks/taskEvents';

interface ProtocolOverviewGroup {
  organ: { id: number; key?: string; name_default: string; pos?: number | null };
  entries: ProtocolOverviewEntry[];
}

interface OrganAssignmentBadge {
  key: string;
  label: string;
  state: 'complete' | 'incomplete' | 'discarded' | 'unassigned';
}

function hasValueForField(
  flex: CoordinationProcurementFlex,
  organId: number,
  fieldTemplateId: number,
) {
  const organ = flex.organs.find((entry) => entry.organ_id === organId);
  if (!organ) return null;
  for (const slot of organ.slots) {
    const found = slot.values.find((value) => value.field_template_id === fieldTemplateId);
    if (found) return found;
  }
  return null;
}

function isFieldCompletedForOrgan(
  flex: CoordinationProcurementFlex,
  organId: number,
  field: CoordinationProcurementFlex['field_templates'][number],
): boolean {
  const organ = flex.organs.find((entry) => entry.organ_id === organId);
  if (organ?.organ_rejected && organ.organ_workflow_cleared) {
    return true;
  }
  const valueRow = hasValueForField(flex, organId, field.id);
  if (field.value_mode === 'PERSON_SINGLE' || field.value_mode === 'PERSON_LIST') {
    return (valueRow?.persons?.length ?? 0) > 0;
  }
  if (field.value_mode === 'TEAM_SINGLE' || field.value_mode === 'TEAM_LIST') {
    return (valueRow?.teams?.length ?? 0) > 0;
  }
  if (field.value_mode === 'EPISODE') {
    return Boolean(valueRow?.episode_ref?.episode_id);
  }
  return (valueRow?.value ?? '').trim().length > 0;
}

interface CoordinationProtocolTabProps {
  coordinationId: number;
  groups: ProtocolOverviewGroup[];
  organRejectionsByOrganId: Record<number, { rejected: boolean; comment: string }>;
  onOpenPatientEpisode: (patientId: number, episodeId: number) => void;
  onRefreshAssignments: () => Promise<void>;
}

export default function CoordinationProtocolTab({
  coordinationId,
  groups,
  organRejectionsByOrganId,
  onOpenPatientEpisode,
  onRefreshAssignments,
}: CoordinationProtocolTabProps) {
  return (
    <CoordinationProtocolStateProvider coordinationId={coordinationId}>
      <CoordinationProtocolTabContent
        coordinationId={coordinationId}
        groups={groups}
        organRejectionsByOrganId={organRejectionsByOrganId}
        onOpenPatientEpisode={onOpenPatientEpisode}
        onRefreshAssignments={onRefreshAssignments}
      />
    </CoordinationProtocolStateProvider>
  );
}

function CoordinationProtocolTabContent({
  coordinationId,
  groups,
  organRejectionsByOrganId,
  onOpenPatientEpisode,
  onRefreshAssignments,
}: CoordinationProtocolTabProps) {
  const { t } = useI18n();
  const { state: protocolState, error: protocolStateError, refresh: refreshProtocolState } = useCoordinationProtocolState();
  void onOpenPatientEpisode;
  const getOrganLabel = (organ: ProtocolOverviewGroup['organ']): string => translateCodeLabel(t, {
    type: 'ORGAN',
    key: organ.key ?? '',
    name_default: organ.name_default,
  });
  const protocolOrganRows = useMemo(
    () =>
      (protocolState?.organs ?? [])
        .filter((item): item is CoordinationProtocolStateOrgan => item.organ != null)
        .map((item) => ({
          organ: {
            id: item.organ_id,
            key: item.organ?.key ?? '',
            name_default: item.organ?.name_default ?? '',
            pos: item.organ?.pos ?? Number.MAX_SAFE_INTEGER,
          },
          item,
        }))
        .sort((a, b) => {
          const ap = a.organ.pos ?? Number.MAX_SAFE_INTEGER;
          const bp = b.organ.pos ?? Number.MAX_SAFE_INTEGER;
          return ap - bp || getOrganLabel(a.organ).localeCompare(getOrganLabel(b.organ));
        }),
    [protocolState?.organs, t],
  );
  const sortedGroups = useMemo(
    () => [...groups].sort((a, b) => {
      const ap = a.organ.pos ?? Number.MAX_SAFE_INTEGER;
      const bp = b.organ.pos ?? Number.MAX_SAFE_INTEGER;
      return ap - bp || getOrganLabel(a.organ).localeCompare(getOrganLabel(b.organ));
    }),
    [groups, t],
  );
  const [activeOrganId, setActiveOrganId] = useState<number | null>(protocolOrganRows[0]?.organ.id ?? sortedGroups[0]?.organ.id ?? null);
  const [showAssignmentTable, setShowAssignmentTable] = useState(true);
  const [hasPrimaryPendingData, setHasPrimaryPendingData] = useState(false);
  const [hasSecondaryPendingData, setHasSecondaryPendingData] = useState(false);
  const [pendingDataByOrganId, setPendingDataByOrganId] = useState<Record<number, boolean>>({});
  const [hasOpenTasksByOrganId, setHasOpenTasksByOrganId] = useState<Record<number, boolean>>({});
  const [tasksPanelRefreshSignal, setTasksPanelRefreshSignal] = useState(0);

  useEffect(() => {
    const availableOrganIds = new Set([
      ...protocolOrganRows.map((row) => row.organ.id),
      ...sortedGroups.map((group) => group.organ.id),
    ]);
    if (!availableOrganIds.has(activeOrganId ?? -1)) {
      setActiveOrganId(protocolOrganRows[0]?.organ.id ?? sortedGroups[0]?.organ.id ?? null);
    }
  }, [activeOrganId, protocolOrganRows, sortedGroups]);

  if (protocolOrganRows.length === 0 && sortedGroups.length === 0) {
    return (
      <section className="detail-section ui-panel-section">
        <p className="detail-empty">{t('coordinations.protocolOverview.noOrgans', 'No organs found.')}</p>
      </section>
    );
  }

  const activeProtocolOrganRow = protocolOrganRows.find((row) => row.organ.id === activeOrganId) ?? protocolOrganRows[0];
  const activeGroup = sortedGroups.find((group) => group.organ.id === activeOrganId) ?? sortedGroups[0];
  const activeOrgan = activeProtocolOrganRow?.organ ?? activeGroup?.organ;
  const organAssignmentRows = useMemo(() => {
    const byOrganId = new Map(protocolOrganRows.map((row) => [row.organ.id, row]));
    const organById = new Map(
      (protocolOrganRows.length > 0 ? protocolOrganRows.map((row) => row.organ) : sortedGroups.map((group) => group.organ))
        .map((organ) => [organ.id, organ]),
    );
    const assignmentsByEpisodeId = new Map<number, { expectedOrgans: Set<number>; assignedOrgans: Set<number> }>();
    for (const row of protocolOrganRows) {
      for (const slot of row.item.slots) {
        if (!slot.episode_id) continue;
        const bucket = assignmentsByEpisodeId.get(slot.episode_id) ?? {
          expectedOrgans: new Set<number>(),
          assignedOrgans: new Set<number>(),
        };
        if (slot.expected_organ_ids.length > 0) {
          for (const expectedOrganId of slot.expected_organ_ids) {
            bucket.expectedOrgans.add(expectedOrganId);
          }
        } else {
          bucket.expectedOrgans.add(row.organ.id);
        }
        bucket.assignedOrgans.add(row.organ.id);
        assignmentsByEpisodeId.set(slot.episode_id, bucket);
      }
    }
    const source = protocolOrganRows.length > 0 ? protocolOrganRows.map((row) => row.organ) : sortedGroups.map((group) => group.organ);
    return source.map((organ) => {
      const badges: OrganAssignmentBadge[] = [];
      const organRejection = organRejectionsByOrganId[organ.id] ?? (byOrganId.get(organ.id)?.item
        ? {
            rejected: Boolean(byOrganId.get(organ.id)?.item.organ_rejected),
            comment: byOrganId.get(organ.id)?.item.organ_rejection_comment ?? '',
          }
        : undefined);
      if (organRejection?.rejected) {
        badges.push({
          key: `discarded-organ-${organ.id}`,
          label: t('coordinations.protocolAssignments.badge.discarded', 'Rejected'),
          state: 'discarded',
        });
        return { organ, badges };
      }
      const protocolOrgan = byOrganId.get(organ.id)?.item;
      const slotLabelByKey: Record<string, string> = {
        MAIN: t('admin.procurementConfig.slot.main', 'MAIN'),
        LEFT: t('admin.procurementConfig.slot.left', 'LEFT'),
        RIGHT: t('admin.procurementConfig.slot.right', 'RIGHT'),
      };
      const slots = protocolOrgan?.slots ?? [];
      const assignedSlots = slots.filter((slot) => !!slot.episode_id);
      const hasSideSlots = slots.some((slot) => slot.slot_key === 'LEFT' || slot.slot_key === 'RIGHT');
      const mainAssignedSlot = assignedSlots.find((slot) => slot.slot_key === 'MAIN') ?? null;
      const leftAssignedSlot = assignedSlots.find((slot) => slot.slot_key === 'LEFT') ?? null;
      const rightAssignedSlot = assignedSlots.find((slot) => slot.slot_key === 'RIGHT') ?? null;

      const pushAssignedBadge = (slot: (typeof assignedSlots)[number], withPrefix: boolean) => {
        if (!slot.episode_id) return;
        const recipientName = slot.recipient_name.trim().length > 0 ? slot.recipient_name : t('common.emptySymbol', '–');
        const assignmentState = assignmentsByEpisodeId.get(slot.episode_id);
        const expectedCount = assignmentState?.expectedOrgans.size ?? 0;
        const isComplete = assignmentState
          ? expectedCount > 0
            && [...assignmentState.expectedOrgans].every((organId) => assignmentState.assignedOrgans.has(organId))
          : true;
        const missingOrganLabels = assignmentState
          ? [...assignmentState.expectedOrgans]
            .filter((organId) => !assignmentState.assignedOrgans.has(organId))
            .map((organId) => organById.get(organId))
            .filter((entry): entry is ProtocolOverviewGroup['organ'] => !!entry)
            .map((entry) => getOrganLabel(entry))
          : [];
        const missingSuffix = missingOrganLabels.length > 0
          ? ` (${t('coordinations.protocolAssignments.badge.missingPrefix', 'missing')}: ${missingOrganLabels.join(', ')})`
          : '';
        const prefix = withPrefix ? `${slotLabelByKey[slot.slot_key] ?? slot.slot_key}: ` : '';
        badges.push({
          key: `episode-${organ.id}-${slot.slot_key}`,
          label: `${prefix}${recipientName}${missingSuffix}`,
          state: isComplete ? 'complete' : 'incomplete',
        });
      };

      if (assignedSlots.length === 0) {
        badges.push({
          key: `unassigned-${organ.id}`,
          label: t('coordinations.protocolAssignments.badge.unassigned', 'Unassigned'),
          state: 'unassigned',
        });
      } else if (mainAssignedSlot) {
        // If MAIN is assigned, show only that assignment text (without MAIN prefix).
        pushAssignedBadge(mainAssignedSlot, false);
      } else if (hasSideSlots) {
        // Side assignment mode: show LEFT/RIGHT assignments and only side-specific unassigned badges.
        if (leftAssignedSlot) {
          pushAssignedBadge(leftAssignedSlot, true);
        } else {
          badges.push({
            key: `unassigned-${organ.id}-LEFT`,
            label: `${slotLabelByKey.LEFT}: ${t('coordinations.protocolAssignments.badge.unassigned', 'Unassigned')}`,
            state: 'unassigned',
          });
        }
        if (rightAssignedSlot) {
          pushAssignedBadge(rightAssignedSlot, true);
        } else {
          badges.push({
            key: `unassigned-${organ.id}-RIGHT`,
            label: `${slotLabelByKey.RIGHT}: ${t('coordinations.protocolAssignments.badge.unassigned', 'Unassigned')}`,
            state: 'unassigned',
          });
        }
      } else {
        // Non-side organs: only MAIN-equivalent assignment text without slot prefix.
        for (const slot of assignedSlots) {
          pushAssignedBadge(slot, false);
        }
      }
      return { organ, badges };
    });
  }, [organRejectionsByOrganId, protocolOrganRows, sortedGroups, t]);
  const allOrgansAssignedOrDiscarded = useMemo(
    () => organAssignmentRows.every((row) => row.badges.every((badge) => badge.state !== 'unassigned')),
    [organAssignmentRows],
  );
  const visibleOrgans = useMemo(
    () =>
      protocolOrganRows.length > 0
        ? protocolOrganRows.map((row) => row.organ)
        : sortedGroups.map((group) => group.organ),
    [protocolOrganRows, sortedGroups],
  );
  const visibleOrganIds = useMemo(
    () => visibleOrgans.map((organ) => organ.id),
    [visibleOrgans],
  );
  const activeOrganForTasksId = activeOrgan?.id ?? activeGroup.organ.id;
  useEffect(() => {
    const hasPendingData = hasPrimaryPendingData || hasSecondaryPendingData;
    setPendingDataByOrganId((prev) => ({ ...prev, [activeOrganForTasksId]: hasPendingData }));
  }, [activeOrganForTasksId, hasPrimaryPendingData, hasSecondaryPendingData]);
  useEffect(() => {
    let cancelled = false;
    const loadPerOrganStatus = async () => {
      try {
        const [flex, allTaskGroups] = await Promise.all([
          api.getCoordinationProcurementFlex(coordinationId),
          api.listTaskGroups({
            coordination_id: coordinationId,
          }),
        ]);
        const openTasksByOrganEntries = await Promise.all(
          visibleOrganIds.map(async (organId) => {
            const taskGroups = allTaskGroups.filter((group) => group.organ_id === organId);
            if (taskGroups.length === 0) {
              return [organId, false] as const;
            }
            const taskRows = await Promise.all(
              taskGroups.map((group) =>
                api.listTasks({
                  task_group_id: group.id,
                  status_key: ['PENDING'],
                }),
              ),
            );
            return [organId, taskRows.some((entries) => entries.length > 0)] as const;
          }),
        );
        if (!cancelled) {
          const openTaskMap = Object.fromEntries(openTasksByOrganEntries);
          setHasOpenTasksByOrganId((prev) => ({ ...prev, ...openTaskMap }));
          const pendingByOrganEntries = visibleOrganIds.map((organId) => {
            const hasPending = flex.field_templates.some((field) => !isFieldCompletedForOrgan(flex, organId, field));
            return [organId, hasPending] as const;
          });
          setPendingDataByOrganId((prev) => ({ ...prev, ...Object.fromEntries(pendingByOrganEntries) }));
        }
      } catch {
        if (!cancelled) {
          const resetEntries = visibleOrganIds.map((organId) => [organId, false] as const);
          setHasOpenTasksByOrganId((prev) => ({ ...prev, ...Object.fromEntries(resetEntries) }));
        }
      }
    };
    const handleTaskChanged = () => {
      void loadPerOrganStatus();
    };
    void loadPerOrganStatus();
    window.addEventListener(TASK_CHANGED_EVENT, handleTaskChanged);
    return () => {
      cancelled = true;
      window.removeEventListener(TASK_CHANGED_EVENT, handleTaskChanged);
    };
  }, [coordinationId, tasksPanelRefreshSignal, visibleOrganIds]);
  const handleProtocolMutation = async () => {
    await onRefreshAssignments();
    await refreshProtocolState();
    setTasksPanelRefreshSignal((prev) => prev + 1);
  };

  return (
    <section className="detail-section ui-panel-section coord-protocol-shell">
      <nav className="coord-protocol-organ-tabs">
        {(protocolOrganRows.length > 0 ? protocolOrganRows.map((row) => row.organ) : sortedGroups.map((group) => group.organ)).map((organ) => (
          <button
            key={organ.id}
            type="button"
            className={`coord-protocol-organ-tab ${organ.id === activeOrgan?.id ? 'active' : ''} ${
              (pendingDataByOrganId[organ.id] ?? false) && (hasOpenTasksByOrganId[organ.id] ?? false)
                ? 'pending-with-open-tasks'
                : ''
            }`}
            onClick={() => setActiveOrganId(organ.id)}
          >
            {getOrganLabel(organ)}
          </button>
        ))}
      </nav>
      <section className="coord-protocol-pane coord-protocol-assignment-pane">
        <header className="detail-section-heading">
          <h3>{t('coordinations.protocolAssignments.title', 'Organ assignment table')}</h3>
          <button
            type="button"
            className="patients-cancel-btn"
            onClick={() => setShowAssignmentTable((prev) => !prev)}
          >
            {showAssignmentTable
              ? t('coordinations.protocolAssignments.toggle.hideTable', 'Hide table')
              : t('coordinations.protocolAssignments.toggle.showTable', 'Show table')}
          </button>
          <span
            className={`coord-protocol-assignment-summary ${allOrgansAssignedOrDiscarded ? 'complete' : 'pending'}`}
            title={allOrgansAssignedOrDiscarded
              ? t('coordinations.protocolAssignments.summary.complete', 'All organs assigned or discarded')
              : t('coordinations.protocolAssignments.summary.pending', 'Not all organs assigned or discarded')}
          >
            {allOrgansAssignedOrDiscarded
              ? t('coordinations.protocolAssignments.summary.complete', 'All organs assigned or discarded')
              : t('coordinations.protocolAssignments.summary.pending', 'Not all organs assigned or discarded')}
          </span>
        </header>
        {showAssignmentTable ? (
          <div className="ui-table-wrap">
            <table className="data-table coord-protocol-assignment-table">
              <thead>
                <tr>
                  <th>{t('coordinations.protocolAssignments.columns.organ', 'Organ')}</th>
                  <th>{t('coordinations.protocolAssignments.columns.assignment', 'Assigned recipient / status')}</th>
                </tr>
              </thead>
              <tbody>
                {organAssignmentRows.map((row) => (
                  <tr key={row.organ.id}>
                    <td>{getOrganLabel(row.organ)}</td>
                    <td>
                      <div className="coord-protocol-assignment-badges">
                        {row.badges.map((badge) => (
                          <span
                            key={badge.key}
                            className={`coord-protocol-assignment-badge ${badge.state}`}
                          >
                            {badge.label}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
      {protocolStateError ? <p className="status">{protocolStateError}</p> : null}
      <div className="coord-protocol-layout">
        <div className="coord-protocol-left">
          <CoordinationProtocolDataPanel
            coordinationId={coordinationId}
            organId={activeOrgan?.id ?? activeGroup.organ.id}
            organKey={activeOrgan?.key ?? activeGroup.organ.key ?? ''}
            groupLanes={['PRIMARY']}
            onPendingDataChange={setHasPrimaryPendingData}
            onAssignmentsChanged={handleProtocolMutation}
          />
        </div>
        <div className="coord-protocol-right">
          <CoordinationProtocolEventLogPanel
            coordinationId={coordinationId}
            organId={activeOrgan?.id ?? activeGroup.organ.id}
          />
          <CoordinationProtocolTasksPanel
            coordinationId={coordinationId}
            organId={activeOrgan?.id ?? activeGroup.organ.id}
            refreshSignal={tasksPanelRefreshSignal}
          />
        </div>
      </div>
      <section className="coord-protocol-secondary-layout">
        <CoordinationProtocolDataPanel
          coordinationId={coordinationId}
          organId={activeOrgan?.id ?? activeGroup.organ.id}
          organKey={activeOrgan?.key ?? activeGroup.organ.key ?? ''}
          groupLanes={['SECONDARY']}
          gridLayout="two-column"
          hideWhenEmpty
          onPendingDataChange={setHasSecondaryPendingData}
          onAssignmentsChanged={handleProtocolMutation}
        />
      </section>
    </section>
  );
}
