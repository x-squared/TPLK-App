import { request, type AppUser, type Code } from './core';

export type TaskKindKey = 'TASK' | 'EVENT';

export interface TaskGroup {
  id: number;
  patient_id: number | null;
  task_group_template_id: number | null;
  name: string;
  episode_id: number | null;
  colloqium_agenda_id: number | null;
  coordination_id: number | null;
  organ_id: number | null;
  organ: Code | null;
  tpl_phase_id: number | null;
  tpl_phase: Code | null;
  changed_by_id: number | null;
  changed_by_user: AppUser | null;
  created_at: string;
  updated_at: string | null;
}

export interface TaskGroupTemplate {
  id: number;
  key: string;
  name: string;
  description: string;
  scope_id: number;
  scope: Code | null;
  organ_id: number | null;
  organ: Code | null;
  tpl_phase_id: number | null;
  tpl_phase: Code | null;
  is_active: boolean;
  sort_pos: number;
  changed_by_id: number | null;
  changed_by_user: AppUser | null;
  created_at: string;
  updated_at: string | null;
}

export interface TaskTemplate {
  id: number;
  task_group_template_id: number;
  task_group_template: TaskGroupTemplate | null;
  description: string;
  comment_hint: string;
  kind_key: TaskKindKey;
  priority_id: number | null;
  priority: Code | null;
  offset_minutes_default: number | null;
  is_active: boolean;
  sort_pos: number;
  changed_by_id: number | null;
  changed_by_user: AppUser | null;
  created_at: string;
  updated_at: string | null;
}

export interface Task {
  id: number;
  task_group_id: number;
  description: string;
  comment_hint: string;
  kind_key: TaskKindKey;
  priority_id: number | null;
  priority: Code | null;
  assigned_to_id: number | null;
  assigned_to: AppUser | null;
  until: string | null;
  event_time: string | null;
  status_id: number | null;
  status: Code | null;
  closed_at: string | null;
  closed_by_id: number | null;
  closed_by: AppUser | null;
  comment: string;
  changed_by_id: number | null;
  changed_by_user: AppUser | null;
  closed: boolean;
  created_at: string;
  updated_at: string | null;
}

export interface TaskUpdate {
  task_group_id?: number;
  description?: string;
  comment_hint?: string;
  kind_key?: TaskKindKey;
  priority_id?: number | null;
  assigned_to_id?: number | null;
  until?: string;
  event_time?: string | null;
  status_id?: number | null;
  comment?: string;
}

export interface TaskCreate {
  task_group_id: number;
  description?: string;
  comment_hint?: string;
  kind_key?: TaskKindKey;
  priority_id?: number | null;
  assigned_to_id?: number | null;
  until: string;
  event_time?: string | null;
  status_id?: number | null;
  comment?: string;
}

export interface TaskGroupListParams {
  patient_id?: number;
  episode_id?: number;
  colloqium_agenda_id?: number;
  coordination_id?: number;
  organ_id?: number;
  task_group_template_id?: number[];
}

export interface TaskGroupCreate {
  patient_id?: number | null;
  task_group_template_id?: number | null;
  name?: string;
  episode_id?: number | null;
  colloqium_agenda_id?: number | null;
  coordination_id?: number | null;
  organ_id?: number | null;
  tpl_phase_id?: number | null;
}

export interface TaskGroupUpdate {
  patient_id?: number | null;
  task_group_template_id?: number | null;
  name?: string;
  episode_id?: number | null;
  colloqium_agenda_id?: number | null;
  coordination_id?: number | null;
  organ_id?: number | null;
  tpl_phase_id?: number | null;
}

export interface TaskGroupTemplateCreate {
  key: string;
  name: string;
  description?: string;
  scope_id: number;
  organ_id?: number | null;
  tpl_phase_id?: number | null;
  is_active?: boolean;
  sort_pos?: number;
}

export interface TaskGroupTemplateUpdate {
  key?: string;
  name?: string;
  description?: string;
  scope_id?: number;
  organ_id?: number | null;
  tpl_phase_id?: number | null;
  is_active?: boolean;
  sort_pos?: number;
}

export interface TaskListParams {
  task_group_id?: number;
  assigned_to_id?: number;
  status_key?: string[];
}

export interface TaskTemplateListParams {
  task_group_template_id?: number;
  is_active?: boolean;
}

export interface TaskTemplateCreate {
  task_group_template_id: number;
  description: string;
  comment_hint?: string;
  kind_key?: TaskKindKey;
  priority_id?: number | null;
  offset_minutes_default?: number | null;
  is_active?: boolean;
  sort_pos?: number;
}

export interface TaskTemplateUpdate {
  task_group_template_id?: number;
  description?: string;
  comment_hint?: string;
  kind_key?: TaskKindKey;
  priority_id?: number | null;
  offset_minutes_default?: number | null;
  is_active?: boolean;
  sort_pos?: number;
}

export interface EnsureCoordinationProtocolTaskGroupsResponse {
  created_group_count: number;
}

export const tasksApi = {
  listTaskGroupTemplates: () => request<TaskGroupTemplate[]>('/task-group-templates/'),
  createTaskGroupTemplate: (data: TaskGroupTemplateCreate) =>
    request<TaskGroupTemplate>('/task-group-templates/', { method: 'POST', body: JSON.stringify(data) }),
  updateTaskGroupTemplate: (taskGroupTemplateId: number, data: TaskGroupTemplateUpdate) =>
    request<TaskGroupTemplate>(`/task-group-templates/${taskGroupTemplateId}`, { method: 'PATCH', body: JSON.stringify(data) }),
  listTaskTemplates: (params?: TaskTemplateListParams) => {
    const query = new URLSearchParams();
    if (params?.task_group_template_id !== undefined) query.set('task_group_template_id', String(params.task_group_template_id));
    if (params?.is_active !== undefined) query.set('is_active', params.is_active ? 'true' : 'false');
    return request<TaskTemplate[]>(`/task-templates/${query.toString() ? `?${query.toString()}` : ''}`);
  },
  createTaskTemplate: (data: TaskTemplateCreate) =>
    request<TaskTemplate>('/task-templates/', { method: 'POST', body: JSON.stringify(data) }),
  updateTaskTemplate: (taskTemplateId: number, data: TaskTemplateUpdate) =>
    request<TaskTemplate>(`/task-templates/${taskTemplateId}`, { method: 'PATCH', body: JSON.stringify(data) }),
  listTaskGroups: (params?: TaskGroupListParams) => {
    const query = new URLSearchParams();
    if (params?.patient_id !== undefined) query.set('patient_id', String(params.patient_id));
    if (params?.episode_id !== undefined) query.set('episode_id', String(params.episode_id));
    if (params?.colloqium_agenda_id !== undefined) query.set('colloqium_agenda_id', String(params.colloqium_agenda_id));
    if (params?.coordination_id !== undefined) query.set('coordination_id', String(params.coordination_id));
    if (params?.organ_id !== undefined) query.set('organ_id', String(params.organ_id));
    (params?.task_group_template_id ?? []).forEach((value) => query.append('task_group_template_id', String(value)));
    return request<TaskGroup[]>(`/task-groups/${query.toString() ? `?${query.toString()}` : ''}`);
  },
  createTaskGroup: (data: TaskGroupCreate) =>
    request<TaskGroup>('/task-groups/', { method: 'POST', body: JSON.stringify(data) }),
  ensureCoordinationProtocolTaskGroups: (coordinationId: number, organId?: number) =>
    request<EnsureCoordinationProtocolTaskGroupsResponse>(
      `/task-groups/coordination/${coordinationId}/ensure-protocol${typeof organId === 'number' ? `?organ_id=${organId}` : ''}`,
      { method: 'POST' },
    ),
  updateTaskGroup: (taskGroupId: number, data: TaskGroupUpdate) =>
    request<TaskGroup>(`/task-groups/${taskGroupId}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteTaskGroup: (taskGroupId: number) =>
    request<void>(`/task-groups/${taskGroupId}`, { method: 'DELETE' }),
  listTasks: (params?: TaskListParams) => {
    const query = new URLSearchParams();
    if (params?.task_group_id !== undefined) query.set('task_group_id', String(params.task_group_id));
    if (params?.assigned_to_id !== undefined) query.set('assigned_to_id', String(params.assigned_to_id));
    (params?.status_key ?? []).forEach((value) => query.append('status_key', value));
    return request<Task[]>(`/tasks/${query.toString() ? `?${query.toString()}` : ''}`);
  },
  createTask: (data: TaskCreate) =>
    request<Task>('/tasks/', { method: 'POST', body: JSON.stringify(data) }),
  updateTask: (taskId: number, data: TaskUpdate) =>
    request<Task>(`/tasks/${taskId}`, { method: 'PATCH', body: JSON.stringify(data) }),
};
