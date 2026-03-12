import type { Code, Task, TaskGroup } from '../../api';
import { isUrgentTask } from './taskBoardUtils';
import type { TaskBoardSort } from './taskBoardTypes';

export interface FlatTaskRow {
  type: 'task';
  group: TaskGroup;
  task: Task;
}

export function sortFlatTaskRows(
  rows: FlatTaskRow[],
  taskSort: TaskBoardSort | null,
  priorityCodes: Code[],
): FlatTaskRow[] {
  if (!taskSort) return rows;
  const rankByStatus = (task: Task): number => {
    if (isUrgentTask(task)) return 0;
    const key = (task.status?.key ?? '').toUpperCase();
    if (key === 'PENDING') return 1;
    if (key === 'IN_PROGRESS') return 2;
    if (key === 'COMPLETED') return 3;
    if (key === 'CANCELLED') return 4;
    return 5;
  };
  const priorityRankByKey = new Map(
    [...priorityCodes]
      .sort((a, b) => b.pos - a.pos)
      .map((code, index) => [code.key.toUpperCase(), index]),
  );
  const rankByPriority = (task: Task): number => {
    const key = (task.priority?.key ?? '').toUpperCase();
    if (key) {
      const mappedRank = priorityRankByKey.get(key);
      if (mappedRank != null) return mappedRank;
    }
    if (key === 'HIGH') return 0;
    if (key === 'NORMAL') return 1;
    if (key === 'LOW') return 2;
    return 3;
  };
  const dueDateValue = (iso: string | null): number => {
    if (!iso) return Number.POSITIVE_INFINITY;
    const value = new Date(iso).getTime();
    return Number.isFinite(value) ? value : Number.POSITIVE_INFINITY;
  };
  const directionFactor = taskSort.direction === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    if (taskSort.key === 'status') {
      const statusCmp = directionFactor * (rankByStatus(a.task) - rankByStatus(b.task));
      if (statusCmp !== 0) return statusCmp;
      const dueCmp = directionFactor * (dueDateValue(a.task.until) - dueDateValue(b.task.until));
      if (dueCmp !== 0) return dueCmp;
      return directionFactor * (a.task.id - b.task.id);
    }
    if (taskSort.key === 'priority') {
      const priorityCmp = directionFactor * (rankByPriority(a.task) - rankByPriority(b.task));
      if (priorityCmp !== 0) return priorityCmp;
      return a.task.id - b.task.id;
    }
    const dueCmp = directionFactor * (dueDateValue(a.task.until) - dueDateValue(b.task.until));
    if (dueCmp !== 0) return dueCmp;
    const priorityCmp = rankByPriority(a.task) - rankByPriority(b.task);
    if (priorityCmp !== 0) return priorityCmp;
    const statusCmp = rankByStatus(a.task) - rankByStatus(b.task);
    if (statusCmp !== 0) return statusCmp;
    return a.task.id - b.task.id;
  });
}

