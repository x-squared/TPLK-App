import { useState } from 'react';
import { useMyWorkOpenTaskCount } from '../../app/useMyWorkOpenTaskCount';
import type { TaskBoardContextType, TaskBoardSort } from '../tasks/taskBoardTypes';

export type TaskContextFilter = TaskBoardContextType;
export type TaskAssignmentScope = 'MINE' | 'ALL';
export type TaskSortMode = TaskBoardSort | null;

export function useMyWorkTasksViewModel() {
  const [contextFilter, setContextFilter] = useState<TaskContextFilter>('ALL');
  const [assignmentScope, setAssignmentScope] = useState<TaskAssignmentScope>('MINE');
  const [sortMode, setSortMode] = useState<TaskSortMode>(null);
  const { openTaskCount } = useMyWorkOpenTaskCount(true);

  return {
    contextFilter,
    setContextFilter,
    assignmentScope,
    setAssignmentScope,
    sortMode,
    setSortMode,
    openTaskCount,
  };
}
