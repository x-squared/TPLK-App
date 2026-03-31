import { useEffect, useMemo, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import type { GuiSpecNoteUpdate, GuiSpecRegion, GuiSpecRegionCreate, GuiSpecRegionStatusUpdate } from '../../api';
import { useI18n } from '../../i18n/i18n';
import RichTextEditor from '../../views/layout/RichTextEditor';
import type { GuiSpecsOverlayMode } from './useGuiSpecsViewModel';
import './GuiSpecsOverlay.css';

function buildSelector(element: HTMLElement): string {
  if (element.id) return `#${CSS.escape(element.id)}`;
  const chain: string[] = [];
  let current: HTMLElement | null = element;
  let depth = 0;
  while (current && current.tagName.toLowerCase() !== 'body' && depth < 6) {
    const tag = current.tagName.toLowerCase();
    const parentElement: HTMLElement | null = current.parentElement;
    if (!parentElement) break;
    const siblings = Array.from(parentElement.children).filter((entry): entry is Element => entry instanceof Element && entry.tagName === current!.tagName);
    const index = siblings.indexOf(current) + 1;
    chain.unshift(`${tag}:nth-of-type(${Math.max(index, 1)})`);
    current = parentElement;
    depth += 1;
  }
  return chain.length > 0 ? chain.join(' > ') : element.tagName.toLowerCase();
}

function chooseCaptureElement(start: HTMLElement): HTMLElement | null {
  const vw = window.innerWidth || 1;
  const vh = window.innerHeight || 1;
  const maxArea = vw * vh * 0.9;
  let current: HTMLElement | null = start;
  let best: HTMLElement | null = null;
  let depth = 0;

  while (current && depth < 8) {
    const tag = current.tagName.toLowerCase();
    if (tag === 'html' || tag === 'body') break;
    const rect = current.getBoundingClientRect();
    const area = Math.max(0, rect.width) * Math.max(0, rect.height);
    const hasSemanticHint = Boolean(
      current.id
      || current.getAttribute('role')
      || current.getAttribute('aria-label')
      || (current.className && String(current.className).trim().length > 0),
    );
    if (rect.width >= 8 && rect.height >= 8 && area <= maxArea && hasSemanticHint) {
      best = current;
      break;
    }
    if (rect.width >= 8 && rect.height >= 8 && area <= maxArea && best === null) {
      best = current;
    }
    current = current.parentElement;
    depth += 1;
  }
  return best;
}

function geometryFromViewportRect(rect: DOMRect): GuiSpecRegionCreate['geometry'] {
  const vw = window.innerWidth || 1;
  const vh = window.innerHeight || 1;
  return {
    left_pct: Math.max(0, Math.round((rect.left / vw) * 1000)),
    top_pct: Math.max(0, Math.round((rect.top / vh) * 1000)),
    width_pct: Math.max(1, Math.round((rect.width / vw) * 1000)),
    height_pct: Math.max(1, Math.round((rect.height / vh) * 1000)),
  };
}

function rectToBoxStyle(region: GuiSpecRegion) {
  const leftPx = (region.left_pct / 1000) * window.innerWidth;
  const topPx = (region.top_pct / 1000) * window.innerHeight;
  const widthPx = (region.width_pct / 1000) * window.innerWidth;
  const heightPx = (region.height_pct / 1000) * window.innerHeight;
  return { left: `${leftPx}px`, top: `${topPx}px`, width: `${widthPx}px`, height: `${heightPx}px`, zIndex: region.z_index } as const;
}

interface GuiSpecsOverlayProps {
  regions: GuiSpecRegion[];
  selectedRegionId: number | null;
  setSelectedRegionId: (id: number | null) => void;
  overlayMode: GuiSpecsOverlayMode;
  setOverlayMode: (mode: GuiSpecsOverlayMode) => void;
  overlayActive: boolean;
  exitOverlay: () => void;
  createRegion: (payload: Omit<GuiSpecRegionCreate, 'view_id'>) => Promise<GuiSpecRegion | null>;
  setRegionNote: (regionId: number, payload: GuiSpecNoteUpdate) => Promise<void>;
  setRegionStatus: (regionId: number, payload: GuiSpecRegionStatusUpdate) => Promise<void>;
}

export default function GuiSpecsOverlay({
  regions, selectedRegionId, setSelectedRegionId, overlayMode, setOverlayMode, overlayActive, exitOverlay, createRegion, setRegionNote, setRegionStatus,
}: GuiSpecsOverlayProps) {
  const { t } = useI18n();
  const selectedRegion = useMemo(() => regions.find((r) => r.id === selectedRegionId) ?? null, [regions, selectedRegionId]);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const editorDebounceRef = useRef<number | null>(null);
  const hoverCandidateRef = useRef<{ rect: DOMRect; label: string } | null>(null);
  const [noteDraft, setNoteDraft] = useState('');
  const [drawingStart, setDrawingStart] = useState<{ x: number; y: number } | null>(null);
  const [drawingRect, setDrawingRect] = useState<{ left: number; top: number; width: number; height: number } | null>(null);
  const [pendingNewLabel, setPendingNewLabel] = useState('');
  const [pendingGeometry, setPendingGeometry] = useState<GuiSpecRegionCreate['geometry'] | null>(null);
  const [hoverCandidate, setHoverCandidate] = useState<{ rect: DOMRect; label: string } | null>(null);
  const showBackdropPointerEvents = overlayMode !== 'pickingExistingPart';

  useEffect(() => { setNoteDraft(selectedRegion?.note?.rich_text_html ?? ''); }, [selectedRegion?.id]);
  useEffect(() => {
    if (!selectedRegion) return;
    const original = selectedRegion.note?.rich_text_html ?? '';
    if (original === noteDraft) return;
    if (editorDebounceRef.current) window.clearTimeout(editorDebounceRef.current);
    editorDebounceRef.current = window.setTimeout(async () => { await setRegionNote(selectedRegion.id, { rich_text_html: noteDraft }); }, 450);
    return () => { if (editorDebounceRef.current) window.clearTimeout(editorDebounceRef.current); };
  }, [noteDraft, selectedRegion?.id, selectedRegion?.note?.rich_text_html, setRegionNote]);

  useEffect(() => {
    if (!overlayActive || overlayMode !== 'pickingExistingPart') return;
    const resolveCandidate = (clientX: number, clientY: number) => {
      const target = document.elementFromPoint(clientX, clientY);
      if (!(target instanceof HTMLElement)) return null;
      if (target.closest('.gui-specs-exit-btn, .gui-specs-note-popover, .gui-specs-naming-card, .gui-specs-region-box')) return null;
      const captureTarget = chooseCaptureElement(target);
      if (!captureTarget) return null;
      const rect = captureTarget.getBoundingClientRect();
      if (rect.width < 8 || rect.height < 8) return null;
      const label = (captureTarget.id ? `#${captureTarget.id}` : '').trim() || (captureTarget.textContent || '').trim().slice(0, 32) || captureTarget.tagName.toLowerCase();
      return { target: captureTarget, rect, label };
    };

    const captureCandidate = async (candidate: { target: HTMLElement; rect: DOMRect; label: string }) => {
      const created = await createRegion({
        region_type: 'EXISTING_PART',
        label: candidate.label,
        anchor_selector: buildSelector(candidate.target),
        anchor_id: candidate.target.id || '',
        anchor_class_name: candidate.target.className ? String(candidate.target.className) : '',
        anchor_tag: candidate.target.tagName.toLowerCase(),
        anchor_text_sample: (candidate.target.textContent || '').trim().slice(0, 120),
        geometry: geometryFromViewportRect(candidate.rect),
        status: 'OPEN',
      });
      if (created) setSelectedRegionId(created.id);
      setOverlayMode('idle');
      setHoverCandidate(null);
    };

    const onPointerMove = (event: PointerEvent) => {
      const candidate = resolveCandidate(event.clientX, event.clientY);
      if (!candidate) {
        setHoverCandidate(null);
        return;
      }
      const next = { rect: candidate.rect, label: candidate.label };
      hoverCandidateRef.current = next;
      setHoverCandidate(next);
    };

    const onPointerDown = async (event: PointerEvent) => {
      if (event.target instanceof HTMLElement) {
        const clickedOverlayControl = event.target.closest(
          '.gui-specs-exit-btn, .gui-specs-note-popover, .gui-specs-naming-card, .gui-specs-region-box',
        );
        if (clickedOverlayControl) return;
      }
      event.preventDefault();
      event.stopPropagation();
      const candidate = resolveCandidate(event.clientX, event.clientY);
      if (!candidate) return;
      await captureCandidate(candidate);
    };

    const onKeyDown = async (event: KeyboardEvent) => {
      if (event.key !== 'Enter') return;
      if (overlayMode !== 'pickingExistingPart') return;
      const current = hoverCandidateRef.current;
      if (!current) return;
      event.preventDefault();
      const candidate = resolveCandidate(current.rect.left + 2, current.rect.top + 2);
      if (!candidate) return;
      await captureCandidate(candidate);
    };

    document.addEventListener('pointermove', onPointerMove, true);
    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('pointermove', onPointerMove, true);
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('keydown', onKeyDown, true);
      hoverCandidateRef.current = null;
      setHoverCandidate(null);
    };
  }, [createRegion, overlayActive, overlayMode, setOverlayMode, setSelectedRegionId, t]);

  const isDrawing = overlayMode === 'drawingNewPart' && drawingStart !== null;
  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (overlayMode !== 'drawingNewPart' || event.button !== 0) return;
    event.preventDefault();
    setDrawingStart({ x: event.clientX, y: event.clientY });
    setDrawingRect({ left: event.clientX, top: event.clientY, width: 0, height: 0 });
    setPendingGeometry(null);
    setPendingNewLabel('');
  };
  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!isDrawing || !drawingStart || overlayMode !== 'drawingNewPart') return;
    event.preventDefault();
    setDrawingRect({
      left: Math.min(drawingStart.x, event.clientX),
      top: Math.min(drawingStart.y, event.clientY),
      width: Math.abs(event.clientX - drawingStart.x),
      height: Math.abs(event.clientY - drawingStart.y),
    });
  };
  const handlePointerUp = async () => {
    if (!isDrawing || !drawingStart || !drawingRect) return;
    if (drawingRect.width < 8 || drawingRect.height < 8) { setDrawingStart(null); setDrawingRect(null); return; }
    setPendingGeometry(geometryFromViewportRect(new DOMRect(drawingRect.left, drawingRect.top, drawingRect.width, drawingRect.height)));
    setPendingNewLabel('');
    setDrawingStart(null);
    setDrawingRect(null);
  };

  if (!overlayActive) return null;
  return (
    <div ref={overlayRef} className="gui-specs-overlay-root" aria-label="GUI specs overlay">
      <div className="gui-specs-overlay-backdrop" style={{ pointerEvents: showBackdropPointerEvents ? 'auto' : 'none' }} onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={() => void handlePointerUp()} />
      <button type="button" className="gui-specs-exit-btn" onClick={exitOverlay}>{t('guiSpecs.overlay.exit', 'Exit')}</button>
      {overlayMode === 'pickingExistingPart' && hoverCandidate ? (
        <div
          className="gui-specs-hover-candidate"
          style={{
            left: `${hoverCandidate.rect.left}px`,
            top: `${hoverCandidate.rect.top}px`,
            width: `${hoverCandidate.rect.width}px`,
            height: `${hoverCandidate.rect.height}px`,
            zIndex: 100000,
          }}
        >
          <div className="gui-specs-hover-candidate-label">
            {hoverCandidate.label} ({t('guiSpecs.overlay.pressEnterToCapture', 'Press Enter to capture')})
          </div>
        </div>
      ) : null}
      {overlayMode === 'drawingNewPart' && drawingRect ? <div className="gui-specs-drawing-rect" style={{ left: `${drawingRect.left}px`, top: `${drawingRect.top}px`, width: `${drawingRect.width}px`, height: `${drawingRect.height}px`, zIndex: 100000 }} /> : null}
      {pendingGeometry ? (
        <div className="gui-specs-naming-card" style={{ left: `${(pendingGeometry.left_pct / 1000) * window.innerWidth}px`, top: `${(pendingGeometry.top_pct / 1000) * window.innerHeight}px`, zIndex: 100001 }}>
          <div className="gui-specs-naming-title">{t('guiSpecs.overlay.nameThisPart', 'Name this part')}</div>
          <input className="gui-specs-naming-input" type="text" value={pendingNewLabel} onChange={(e) => setPendingNewLabel(e.target.value)} placeholder={t('guiSpecs.overlay.newPartPlaceholder', 'New part')} />
          <div className="gui-specs-naming-actions">
            <button type="button" className="gui-specs-naming-create" onClick={async () => {
              const created = await createRegion({ region_type: 'NEW_PART', label: (pendingNewLabel || '').trim() || t('guiSpecs.overlay.newPartLabel', 'New part'), geometry: pendingGeometry, status: 'OPEN' });
              if (created) setSelectedRegionId(created.id);
              setPendingGeometry(null);
              setPendingNewLabel('');
              setOverlayMode('idle');
            }}>{t('common.create', 'Create')}</button>
            <button type="button" className="gui-specs-naming-cancel" onClick={() => { setPendingGeometry(null); setPendingNewLabel(''); setOverlayMode('idle'); }}>{t('common.cancel', 'Cancel')}</button>
          </div>
        </div>
      ) : null}
      <div className="gui-specs-region-layer">
        {regions.map((region) => (
          <div key={region.id} className={`gui-specs-region-box ${region.id === selectedRegionId ? 'selected' : ''}`} style={rectToBoxStyle(region)} role="button" tabIndex={0} onClick={(e) => { e.preventDefault(); e.stopPropagation(); setSelectedRegionId(region.id); }}>
            <div className="gui-specs-region-badge">{region.label ? region.label : region.region_type}</div>
          </div>
        ))}
      </div>
      {selectedRegion ? (
        <div className="gui-specs-note-popover" style={{ left: `${((selectedRegion.left_pct / 1000) * window.innerWidth) + 4}px`, top: `${(selectedRegion.top_pct / 1000) * window.innerHeight + 4}px`, zIndex: Math.max(...regions.map((r) => r.z_index), 0) + 2 }}>
          <div className="gui-specs-note-header">
            <div className="gui-specs-note-title">{selectedRegion.label || t('guiSpecs.overlay.regionNoteTitle', 'Region note')}</div>
            <div className="gui-specs-note-actions">
              {selectedRegion.status === 'DONE'
                ? <button type="button" className="gui-specs-note-action" onClick={async () => { await setRegionStatus(selectedRegion.id, { status: 'OPEN' }); }}>{t('guiSpecs.overlay.reopen', 'Reopen')}</button>
                : <button type="button" className="gui-specs-note-action" onClick={async () => { await setRegionStatus(selectedRegion.id, { status: 'DONE' }); }}>{t('guiSpecs.overlay.done', 'Done')}</button>}
            </div>
          </div>
          <RichTextEditor value={noteDraft} onChange={(next) => setNoteDraft(next)} ariaLabel="Region note editor" minHeightRem={4.8} />
        </div>
      ) : null}
    </div>
  );
}

