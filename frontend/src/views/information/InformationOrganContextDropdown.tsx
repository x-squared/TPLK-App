import { useEffect, useMemo, useRef, useState } from 'react';

import type { Code } from '../../api';
import { translateCodeLabel } from '../../i18n/codeTranslations';
import { useI18n } from '../../i18n/i18n';

interface InformationOrganContextDropdownProps {
  organContexts: Code[];
  selectedContextIds: number[];
  onChange: (next: number[]) => void;
  disabled?: boolean;
}

export default function InformationOrganContextDropdown({
  organContexts,
  selectedContextIds,
  onChange,
  disabled = false,
}: InformationOrganContextDropdownProps) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target || !rootRef.current) return;
      if (!rootRef.current.contains(target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
    };
  }, [open]);

  const selectedIds = useMemo(() => new Set(selectedContextIds), [selectedContextIds]);
  const selectedContexts = useMemo(
    () => organContexts.filter((context) => selectedIds.has(context.id)),
    [organContexts, selectedIds],
  );

  const toggleId = (id: number) => {
    if (selectedIds.has(id)) {
      onChange(selectedContextIds.filter((entry) => entry !== id));
      return;
    }
    onChange([...selectedContextIds, id]);
  };

  return (
    <div className="info-context-dropdown" ref={rootRef}>
      <button
        type="button"
        className="detail-input info-context-dropdown-trigger"
        onClick={() => setOpen((prev) => !prev)}
        disabled={disabled}
        aria-expanded={open}
        aria-label={t('information.context.dropdownLabel', 'Context organs')}
      >
        {selectedContexts.length === 0 ? (
          <span className="detail-value">{t('information.context.general', 'General')}</span>
        ) : (
          <span className="person-pill-list">
            {selectedContexts.map((context) => (
              <span key={context.id} className="person-pill">
                {translateCodeLabel(t, context)}
              </span>
            ))}
          </span>
        )}
        <span className="info-context-dropdown-arrow" aria-hidden="true">{open ? '▲' : '▼'}</span>
      </button>
      {open ? (
        <div className="info-context-dropdown-menu" role="listbox" aria-multiselectable="true">
          <div className="person-pill-list info-context-dropdown-selected">
            {selectedContexts.length === 0 ? (
              <span className="detail-value">{t('information.context.general', 'General')}</span>
            ) : (
              selectedContexts.map((context) => (
                <span key={context.id} className="person-pill">
                  {translateCodeLabel(t, context)}
                </span>
              ))
            )}
          </div>
          {organContexts.map((context) => {
            const checked = selectedIds.has(context.id);
            return (
              <label key={context.id} className="info-context-dropdown-option">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleId(context.id)}
                  disabled={disabled}
                />
                <span>{translateCodeLabel(t, context)}</span>
              </label>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
