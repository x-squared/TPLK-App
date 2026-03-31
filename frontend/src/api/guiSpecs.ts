import { getToken } from './core';
import { ApiError } from './error';

const APP_SPEC_API_BASE = (import.meta.env.VITE_APPSPEC_API_BASE_URL as string | undefined)?.trim() || '';
let integrationUserId: number | null = null;
let integrationRoleKeys: string[] = [];

export function setGuiSpecsIntegrationContext(next: { userId?: number | null; roleKeys?: string[] | null }): void {
  // TPLK host adapter -> AppSpec integration contract headers.
  integrationUserId = typeof next.userId === 'number' && Number.isFinite(next.userId) && next.userId > 0 ? next.userId : null;
  integrationRoleKeys = Array.isArray(next.roleKeys)
    ? Array.from(new Set(next.roleKeys.map((value) => String(value).trim().toUpperCase()).filter((value) => value.length > 0)))
    : [];
}

function buildUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  if (!APP_SPEC_API_BASE) return `/api${normalizedPath}`;
  return `${APP_SPEC_API_BASE.replace(/\/$/, '')}/api${normalizedPath}`;
}

async function requestAppSpec<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  // AppSpec does not own user/permission data. Send host-resolved identity.
  if (integrationUserId !== null) headers['X-AppSpec-User-Id'] = String(integrationUserId);
  if (integrationRoleKeys.length > 0) headers['X-AppSpec-Roles'] = integrationRoleKeys.join(',');
  const res = await fetch(buildUrl(path), { headers, ...init });
  if (!res.ok) {
    const contentType = res.headers.get('content-type') ?? '';
    let detail: unknown = null;
    if (contentType.includes('application/json')) {
      try { detail = await res.json(); } catch { detail = null; }
    } else {
      detail = await res.text();
    }
    const message = typeof detail === 'string' && detail.trim() ? detail : `Request failed with status ${res.status}`;
    throw new ApiError(res.status, detail, message);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export type GuiSpecViewTypeKey = 'SCRATCH_VIEW';
export type GuiSpecRegionTypeKey = 'EXISTING_PART' | 'NEW_PART';
export type GuiSpecRegionStatusKey = 'OPEN' | 'IN_PROGRESS' | 'DONE';

export interface GuiSpecViewListItem { id: number; name: string; view_type: GuiSpecViewTypeKey | string; open_regions_count: number; done_regions_count: number; created_at: string; updated_at: string | null; }
export interface GuiSpecView { id: number; created_by_id: number; name: string; description: string; view_type: GuiSpecViewTypeKey | string; capture_url: string; capture_gui_part: string; capture_state_json: string; created_at: string; updated_at: string | null; }
export interface GuiSpecRegionGeometry { left_pct: number; top_pct: number; width_pct: number; height_pct: number; }
export interface GuiSpecNote { id: number; rich_text_html: string; created_at: string; updated_at: string | null; }
export interface GuiSpecImplLink { id: number; repo_key: string; module_path: string; file_path: string; symbol: string; commit_hash: string; note: string; created_at: string; updated_at: string | null; }
export interface GuiSpecRegion {
  id: number; view_id: number; region_type: GuiSpecRegionTypeKey | string; label: string;
  anchor_selector: string; anchor_id: string; anchor_class_name: string; anchor_tag: string; anchor_text_sample: string;
  left_pct: number; top_pct: number; width_pct: number; height_pct: number; z_index: number; status: GuiSpecRegionStatusKey | string;
  note: GuiSpecNote | null; impl_link: GuiSpecImplLink | null; created_at: string; updated_at: string | null;
}
export interface GuiSpecViewCreate { name: string; description?: string; view_type?: GuiSpecViewTypeKey; capture_url?: string; capture_gui_part?: string; capture_state_json?: string; }
export interface GuiSpecRegionCreate {
  view_id?: number; region_type: GuiSpecRegionTypeKey; label?: string; anchor_selector?: string; anchor_id?: string; anchor_class_name?: string; anchor_tag?: string; anchor_text_sample?: string;
  geometry: GuiSpecRegionGeometry; z_index?: number | null; status?: GuiSpecRegionStatusKey;
}
export interface GuiSpecNoteUpdate { rich_text_html?: string; }
export interface GuiSpecRegionStatusUpdate { status: GuiSpecRegionStatusKey; }
export interface GuiSpecImplLinkUpsert { repo_key?: string; module_path?: string; file_path?: string; symbol?: string; commit_hash?: string; note?: string; }

export const guiSpecsApi = {
  listGuiSpecViews: (opts?: { include_done?: boolean }) =>
    requestAppSpec<GuiSpecViewListItem[]>(`/gui-specs/views?include_done=${opts?.include_done ? 'true' : 'false'}`),
  createGuiSpecView: (data: GuiSpecViewCreate) =>
    requestAppSpec<GuiSpecView>('/gui-specs/views', { method: 'POST', body: JSON.stringify(data) }),
  getGuiSpecView: (viewId: number) => requestAppSpec<GuiSpecView>(`/gui-specs/views/${viewId}`),
  listGuiSpecRegions: (viewId: number, opts?: { include_done?: boolean }) =>
    requestAppSpec<GuiSpecRegion[]>(`/gui-specs/views/${viewId}/regions?include_done=${opts?.include_done ? 'true' : 'false'}`),
  createGuiSpecRegion: (viewId: number, data: Omit<GuiSpecRegionCreate, 'view_id'>) =>
    requestAppSpec<GuiSpecRegion>(`/gui-specs/views/${viewId}/regions`, { method: 'POST', body: JSON.stringify(data) }),
  setGuiSpecRegionNote: (regionId: number, data: GuiSpecNoteUpdate) =>
    requestAppSpec<GuiSpecNote>(`/gui-specs/regions/${regionId}/note`, { method: 'PATCH', body: JSON.stringify(data) }),
  setGuiSpecRegionStatus: (regionId: number, data: GuiSpecRegionStatusUpdate) =>
    requestAppSpec<GuiSpecRegion>(`/gui-specs/regions/${regionId}/status`, { method: 'PATCH', body: JSON.stringify(data) }),
  upsertGuiSpecImplLink: (regionId: number, data: GuiSpecImplLinkUpsert) =>
    requestAppSpec<GuiSpecImplLink>(`/gui-specs/regions/${regionId}/impl-link`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteGuiSpecRegion: (regionId: number) =>
    requestAppSpec<void>(`/gui-specs/regions/${regionId}`, { method: 'DELETE' }),
};

