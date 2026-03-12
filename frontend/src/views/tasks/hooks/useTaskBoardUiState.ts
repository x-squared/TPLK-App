import { useState } from 'react';
import type { Task } from '../../../api';
import type { TaskCreateFormState, TaskEditFormState, TaskGroupEditFormState } from '../taskBoardTypes';

export function useTaskBoardFilters(includeClosedTasks: boolean, showGroupHeadingsDefault: boolean) {
  const [organFilterId, setOrganFilterId] = useState<number | 'ALL'>('ALL');
  const [assignedToFilterId, setAssignedToFilterId] = useState<number | 'ALL'>('ALL');
  const [dueBefore, setDueBefore] = useState('');
  const [showDoneTasks, setShowDoneTasks] = useState(includeClosedTasks);
  const [showCancelledTasks, setShowCancelledTasks] = useState(includeClosedTasks);
  const [showGroupHeadings, setShowGroupHeadings] = useState(showGroupHeadingsDefault);
  return {
    organFilterId,
    setOrganFilterId,
    assignedToFilterId,
    setAssignedToFilterId,
    dueBefore,
    setDueBefore,
    showDoneTasks,
    setShowDoneTasks,
    showCancelledTasks,
    setShowCancelledTasks,
    showGroupHeadings,
    setShowGroupHeadings,
  };
}

export function useTaskBoardActionState() {
  const [actionState, setActionState] = useState<{ task: Task; type: 'complete' | 'discard'; hint?: string } | null>(null);
  const [actionComment, setActionComment] = useState('');
  const [actionEventTime, setActionEventTime] = useState('');
  const [actionSaving, setActionSaving] = useState(false);
  return {
    actionState,
    setActionState,
    actionComment,
    setActionComment,
    actionEventTime,
    setActionEventTime,
    actionSaving,
    setActionSaving,
  };
}

export function useTaskBoardEditState() {
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<TaskEditFormState | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  return {
    editingTaskId,
    setEditingTaskId,
    editForm,
    setEditForm,
    editSaving,
    setEditSaving,
  };
}

export function useTaskBoardGroupState() {
  const [editingGroupId, setEditingGroupId] = useState<number | null>(null);
  const [groupEditForm, setGroupEditForm] = useState<TaskGroupEditFormState | null>(null);
  const [groupEditSaving, setGroupEditSaving] = useState(false);
  const [creatingGroupId, setCreatingGroupId] = useState<number | null>(null);
  const [createForm, setCreateForm] = useState<TaskCreateFormState | null>(null);
  const [createSaving, setCreateSaving] = useState(false);
  return {
    editingGroupId,
    setEditingGroupId,
    groupEditForm,
    setGroupEditForm,
    groupEditSaving,
    setGroupEditSaving,
    creatingGroupId,
    setCreatingGroupId,
    createForm,
    setCreateForm,
    createSaving,
    setCreateSaving,
  };
}
