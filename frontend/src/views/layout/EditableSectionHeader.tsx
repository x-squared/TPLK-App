import { createElement } from 'react';

interface EditableSectionHeaderProps {
  title: string;
  level?: 2 | 3;
  editing: boolean;
  saving?: boolean;
  dirty?: boolean;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  editLabel?: string;
  saveLabel?: string;
  savingLabel?: string;
}

export default function EditableSectionHeader({
  title,
  level = 2,
  editing,
  saving = false,
  dirty,
  onEdit,
  onSave,
  onCancel,
  editLabel = 'Edit',
  saveLabel = 'Save',
  savingLabel = 'Saving...',
}: EditableSectionHeaderProps) {
  const HeadingTag = `h${level}` as 'h2' | 'h3';
  const disableSave = saving || dirty === false;

  return (
    <div className="detail-section-heading">
      {createElement(HeadingTag, null, title)}
      {!editing ? (
        <button className="edit-btn" onClick={onEdit}>
          {editLabel}
        </button>
      ) : (
        <div className="edit-actions">
          <button className="save-btn" onClick={onSave} disabled={disableSave}>
            {saving ? savingLabel : saveLabel}
          </button>
          <button className="cancel-btn" onClick={onCancel} disabled={saving}>
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
