import { useEffect, useMemo, useRef, type Dispatch, type SetStateAction } from 'react';
import type { AgendaDraft } from '../../tabs/protocol/ColloquiumProtocolTab';
import type { ProtocolDraftPayload } from '../colloquiumDetailViewModelTypes';

const PROTOCOL_SYNC_CHANNEL = 'tpl-colloqium-protocol-sync';
const PROTOCOL_SYNC_KEY_PREFIX = 'tpl.colloqium.protocol.';

interface Params {
  colloqiumId: number;
  enabled: boolean;
  draftName: string;
  draftDate: string;
  draftParticipants: string;
  agendaDrafts: Record<number, AgendaDraft>;
  setDraftName: (value: string) => void;
  setDraftDate: (value: string) => void;
  setDraftParticipants: (value: string) => void;
  setAgendaDrafts: Dispatch<SetStateAction<Record<number, AgendaDraft>>>;
}

export function useColloquiumProtocolDraftSync({
  colloqiumId,
  enabled,
  draftName,
  draftDate,
  draftParticipants,
  agendaDrafts,
  setDraftName,
  setDraftDate,
  setDraftParticipants,
  setAgendaDrafts,
}: Params) {
  const sourceIdRef = useRef(`protocol-${Math.random().toString(36).slice(2)}-${Date.now()}`);
  const lastSyncTsRef = useRef(0);
  const syncStorageKey = `${PROTOCOL_SYNC_KEY_PREFIX}${colloqiumId}`;
  const channel = useMemo(
    () => (typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(PROTOCOL_SYNC_CHANNEL) : null),
    [],
  );

  useEffect(() => {
    const raw = localStorage.getItem(syncStorageKey);
    if (!raw) return;
    try {
      const cached = JSON.parse(raw) as ProtocolDraftPayload;
      if (cached.colloqiumId !== colloqiumId) return;
      lastSyncTsRef.current = cached.updatedAt;
      setDraftName(cached.draftName);
      setDraftDate(cached.draftDate);
      setDraftParticipants(cached.draftParticipants);
      setAgendaDrafts(cached.agendaDrafts ?? {});
    } catch {
      // Ignore malformed cache entries.
    }
  }, [colloqiumId, setAgendaDrafts, setDraftDate, setDraftName, setDraftParticipants, syncStorageKey]);

  useEffect(() => {
    if (!channel) return;
    const onMessage = (event: MessageEvent<ProtocolDraftPayload>) => {
      const payload = event.data;
      if (!payload || payload.colloqiumId !== colloqiumId) return;
      if (payload.sourceId === sourceIdRef.current) return;
      if (payload.updatedAt <= lastSyncTsRef.current) return;
      lastSyncTsRef.current = payload.updatedAt;
      setDraftName(payload.draftName);
      setDraftDate(payload.draftDate);
      setDraftParticipants(payload.draftParticipants);
      setAgendaDrafts(payload.agendaDrafts ?? {});
    };
    channel.addEventListener('message', onMessage);
    return () => {
      channel.removeEventListener('message', onMessage);
    };
  }, [channel, colloqiumId, setAgendaDrafts, setDraftDate, setDraftName, setDraftParticipants]);

  useEffect(() => {
    if (!enabled) return;
    const payload: ProtocolDraftPayload = {
      colloqiumId,
      draftName,
      draftDate,
      draftParticipants,
      agendaDrafts,
      updatedAt: Date.now(),
      sourceId: sourceIdRef.current,
    };
    lastSyncTsRef.current = payload.updatedAt;
    localStorage.setItem(syncStorageKey, JSON.stringify(payload));
    if (channel) {
      try {
        channel.postMessage(payload);
      } catch (error) {
        if (!(error instanceof DOMException) || error.name !== 'InvalidStateError') {
          throw error;
        }
      }
    }
  }, [agendaDrafts, channel, colloqiumId, draftDate, draftName, draftParticipants, enabled, syncStorageKey]);
}
