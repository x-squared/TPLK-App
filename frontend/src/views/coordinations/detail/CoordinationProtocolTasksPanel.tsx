import { useEffect, useMemo, useState } from 'react';

import { api } from '../../../api';
import TaskBoard from '../../tasks/TaskBoard';
import { toUserErrorMessage } from '../../../api/error';
import { useI18n } from '../../../i18n/i18n';

interface CoordinationProtocolTasksPanelProps {
  coordinationId: number;
  organId: number;
  refreshSignal?: number;
}

export default function CoordinationProtocolTasksPanel({ coordinationId, organId, refreshSignal = 0 }: CoordinationProtocolTasksPanelProps) {
  const { t } = useI18n();
  const [selectedTaskGroupTemplateIds, setSelectedTaskGroupTemplateIds] = useState<number[]>([]);
  const [isFetchingAll, setIsFetchingAll] = useState(false);
  const [isClearingAll, setIsClearingAll] = useState(false);
  const [didFetchByOrganId, setDidFetchByOrganId] = useState<Record<number, boolean>>({});
  const [fetchInfo, setFetchInfo] = useState('');
  const [fetchError, setFetchError] = useState('');
  const [refreshToken, setRefreshToken] = useState(0);
  const [showClosedTasks, setShowClosedTasks] = useState(false);
  const didFetchAll = didFetchByOrganId[organId] === true;

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const flex = await api.getCoordinationProcurementFlex(coordinationId);
        if (cancelled) return;
        const selected = [...(flex.protocol_task_group_selections ?? [])]
          .filter((entry) => entry.organ_id == null || entry.organ_id === organId)
          .sort((a, b) => (a.pos - b.pos) || (a.id - b.id))
          .map((entry) => entry.task_group_template_id);
        setSelectedTaskGroupTemplateIds([...new Set(selected)]);
      } catch {
        if (!cancelled) {
          setSelectedTaskGroupTemplateIds([]);
        }
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [coordinationId, organId]);

  useEffect(() => {
    setIsFetchingAll(false);
    setIsClearingAll(false);
    setDidFetchByOrganId({});
    setFetchInfo('');
    setFetchError('');
  }, [coordinationId]);

  const fetchAllProtocolTasks = async () => {
    if (didFetchAll || isFetchingAll || isClearingAll) return;
    setIsFetchingAll(true);
    setFetchError('');
    setFetchInfo('');
    try {
      const result = await api.ensureCoordinationProtocolTaskGroups(coordinationId, organId);
      setDidFetchByOrganId((prev) => ({ ...prev, [organId]: true }));
      setRefreshToken((prev) => prev + 1);
      setFetchInfo(
        result.created_group_count > 0
          ? t('coordinations.protocolTasks.fetch.successCreated', 'Fetched protocol tasks.')
          : t('coordinations.protocolTasks.fetch.successNoChanges', 'Protocol tasks already fetched.'),
      );
    } catch (err) {
      setFetchError(toUserErrorMessage(err, t('coordinations.protocolTasks.fetch.error', 'Could not fetch protocol tasks.')));
    } finally {
      setIsFetchingAll(false);
    }
  };

  const clearAllProtocolTasks = async () => {
    if (isClearingAll || isFetchingAll) return;
    setIsClearingAll(true);
    setFetchError('');
    setFetchInfo('');
    try {
      const groups = await api.listTaskGroups({
        coordination_id: coordinationId,
        organ_id: organId,
        ...(selectedTaskGroupTemplateIds.length > 0 ? { task_group_template_id: selectedTaskGroupTemplateIds } : {}),
      });
      await Promise.all(groups.map((group) => api.deleteTaskGroup(group.id)));
      setDidFetchByOrganId((prev) => ({ ...prev, [organId]: false }));
      setRefreshToken((prev) => prev + 1);
      setFetchInfo(t('coordinations.protocolTasks.clear.success', 'All protocol tasks removed. You can fetch again.'));
    } catch (err) {
      setFetchError(toUserErrorMessage(err, t('coordinations.protocolTasks.clear.error', 'Could not remove protocol tasks.')));
    } finally {
      setIsClearingAll(false);
    }
  };

  const extraParams = useMemo(
    () => ({
      coordination_id: coordinationId,
      organ_id: organId,
      task_group_template_id: selectedTaskGroupTemplateIds,
      refresh_token: refreshToken,
      refresh_signal: refreshSignal,
    }),
    [coordinationId, organId, refreshSignal, refreshToken, selectedTaskGroupTemplateIds],
  );

  return (
    <section className="coord-protocol-pane">
      <TaskBoard
        declaredContextType="COORDINATION"
        title={t('coordinations.protocolTasks.title', 'Protocol Tasks')}
        headerMeta={(
          <div className="coord-protocol-tasks-header-actions">
            <button
              type="button"
              className="coord-protocol-tasks-fetch-btn"
              onClick={() => setShowClosedTasks((prev) => !prev)}
              disabled={isFetchingAll || isClearingAll}
              title={showClosedTasks
                ? t('coordinations.protocolTasks.visibility.hideClosed', 'Show only open tasks')
                : t('coordinations.protocolTasks.visibility.showClosed', 'Show also done tasks')}
              aria-label={showClosedTasks
                ? t('coordinations.protocolTasks.visibility.hideClosed', 'Show only open tasks')
                : t('coordinations.protocolTasks.visibility.showClosed', 'Show also done tasks')}
            >
              {showClosedTasks
                ? t('coordinations.protocolTasks.visibility.hideClosed', 'Show only open tasks')
                : t('coordinations.protocolTasks.visibility.showClosed', 'Show also done tasks')}
            </button>
            <button
              type="button"
              className="coord-protocol-tasks-fetch-btn"
              onClick={() => {
                void fetchAllProtocolTasks();
              }}
              disabled={didFetchAll || isFetchingAll || isClearingAll}
              title={didFetchAll
                ? t('coordinations.protocolTasks.fetch.alreadyFetched', 'Already fetched')
                : t('coordinations.protocolTasks.fetch.button', 'Fetch all tasks')}
              aria-label={t('coordinations.protocolTasks.fetch.button', 'Fetch all tasks')}
            >
              {isFetchingAll
                ? t('coordinations.protocolTasks.fetch.loading', 'Fetching...')
                : didFetchAll
                  ? t('coordinations.protocolTasks.fetch.done', 'Fetched')
                  : t('coordinations.protocolTasks.fetch.button', 'Fetch all tasks')}
            </button>
            <button
              type="button"
              className="coord-protocol-tasks-fetch-btn"
              onClick={() => {
                void clearAllProtocolTasks();
              }}
              disabled={isClearingAll || isFetchingAll}
              title={t('coordinations.protocolTasks.clear.button', 'Remove all tasks')}
              aria-label={t('coordinations.protocolTasks.clear.button', 'Remove all tasks')}
            >
              {isClearingAll
                ? t('coordinations.protocolTasks.clear.loading', 'Removing...')
                : t('coordinations.protocolTasks.clear.button', 'Remove all tasks')}
            </button>
          </div>
        )}
        hideFilters
        hideAddButton
        includeClosedTasks={showClosedTasks}
        columnVisibility={{
          reference: false,
          priority: false,
          assignedTo: false,
          comment: false,
          closedAt: false,
          closedBy: false,
        }}
        criteria={{
          extraParams,
        }}
      />
      {fetchError ? <p className="status">{fetchError}</p> : null}
      {!fetchError && fetchInfo ? <p className="status">{fetchInfo}</p> : null}
    </section>
  );
}
