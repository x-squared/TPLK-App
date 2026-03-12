import type { AccessControlMatrix } from '../../../api';
import { translateCodeLabel } from '../../../i18n/codeTranslations';
import ErrorBanner from '../../layout/ErrorBanner';
import { useI18n } from '../../../i18n/i18n';

interface AdminAccessRulesTabProps {
  matrix: AccessControlMatrix | null;
  selectedRoleKey: string;
  selectedPermissionKeys: string[];
  loading: boolean;
  saving: boolean;
  error: string;
  status: string;
  dirty: boolean;
  onSelectRole: (roleKey: string) => void;
  onTogglePermission: (permissionKey: string) => void;
  onSave: () => Promise<void>;
}

export default function AdminAccessRulesTab({
  matrix,
  selectedRoleKey,
  selectedPermissionKeys,
  loading,
  saving,
  error,
  status,
  dirty,
  onSelectRole,
  onTogglePermission,
  onSave,
}: AdminAccessRulesTabProps) {
  const { t } = useI18n();
  return (
    <section className="detail-section ui-panel-section">
      <div className="detail-section-heading">
        <h2>{t('app.admin.tabs.accessRules', 'Access Rules')}</h2>
      </div>
      {loading && <p className="status">{t('admin.accessRules.loading', 'Loading access matrix...')}</p>}
      {error && <ErrorBanner message={error} />}
      {status && <p className="status">{status}</p>}

      {!loading && matrix && (
        <div className="admin-people-card">
          <div className="admin-access-controls">
            <label className="admin-access-role-field">
              <span>{t('admin.accessRules.role', 'Role')}</span>
              <select
                className="detail-input"
                value={selectedRoleKey}
                onChange={(e) => onSelectRole(e.target.value)}
              >
                {matrix.roles.map((role) => (
                  <option key={role.key} value={role.key}>
                    {translateCodeLabel(t, { type: 'ROLE', key: role.key, name_default: role.name_default })}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="patients-save-btn"
              onClick={() => {
                void onSave();
              }}
              disabled={!dirty || saving || !selectedRoleKey}
            >
              {saving ? t('admin.accessRules.saving', 'Saving...') : t('actions.save', 'Save')}
            </button>
          </div>

          <div className="patients-table-wrap ui-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t('admin.accessRules.permission', 'Permission')}</th>
                  <th>{t('admin.accessRules.allowed', 'Allowed')}</th>
                </tr>
              </thead>
              <tbody>
                {matrix.permissions.map((permission) => (
                  <tr key={permission.key}>
                    <td>
                      <span className="admin-access-permission-line">
                        <strong>{permission.name_default}</strong>
                        <span className="admin-access-permission-key">{permission.key}</span>
                      </span>
                    </td>
                    <td className="admin-access-allowed-cell">
                      <label className="admin-access-checkbox-wrap">
                        <input
                          type="checkbox"
                          checked={selectedPermissionKeys.includes(permission.key)}
                          onChange={() => onTogglePermission(permission.key)}
                          aria-label={`${t('admin.accessRules.toggle', 'Toggle')} ${permission.key}`}
                        />
                      </label>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
