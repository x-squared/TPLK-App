import { useEffect, useMemo, useState } from 'react';

import { api, type AccessControlMatrix } from '../../../api';
import { toUserErrorMessage } from '../../../api/error';

export function useAdminAccessRules() {
  const [matrix, setMatrix] = useState<AccessControlMatrix | null>(null);
  const [selectedRoleKey, setSelectedRoleKey] = useState('');
  const [selectedPermissionKeys, setSelectedPermissionKeys] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError('');
    api.getAccessControlMatrix()
      .then((payload) => {
        if (!mounted) {
          return;
        }
        setMatrix(payload);
        const firstRole = payload.roles[0]?.key ?? '';
        setSelectedRoleKey(firstRole);
      })
      .catch((err: unknown) => {
        if (!mounted) {
          return;
        }
        setError(toUserErrorMessage(err, 'Could not load access matrix.'));
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!matrix || !selectedRoleKey) {
      setSelectedPermissionKeys([]);
      return;
    }
    setSelectedPermissionKeys(matrix.role_permissions[selectedRoleKey] ?? []);
  }, [matrix, selectedRoleKey]);

  const dirty = useMemo(() => {
    if (!matrix || !selectedRoleKey) {
      return false;
    }
    const original = matrix.role_permissions[selectedRoleKey] ?? [];
    const currentSorted = [...selectedPermissionKeys].sort();
    const originalSorted = [...original].sort();
    return JSON.stringify(currentSorted) !== JSON.stringify(originalSorted);
  }, [matrix, selectedRoleKey, selectedPermissionKeys]);

  const togglePermission = (permissionKey: string) => {
    setSelectedPermissionKeys((prev) => (
      prev.includes(permissionKey)
        ? prev.filter((key) => key !== permissionKey)
        : [...prev, permissionKey]
    ));
  };

  const selectRole = (roleKey: string) => {
    setSelectedRoleKey(roleKey);
    setStatus('');
    setError('');
  };

  const savePermissions = async () => {
    if (!selectedRoleKey || !matrix) {
      return;
    }
    setSaving(true);
    setError('');
    setStatus('');
    try {
      const payload = await api.updateRolePermissions(selectedRoleKey, selectedPermissionKeys);
      setMatrix(payload);
      setStatus(`Saved access rules for ${selectedRoleKey}.`);
      window.dispatchEvent(new CustomEvent('tpl:permissions-updated'));
    } catch (err: unknown) {
      setError(toUserErrorMessage(err, 'Could not save access rules.'));
    } finally {
      setSaving(false);
    }
  };

  return {
    matrix,
    selectedRoleKey,
    selectedPermissionKeys,
    loading,
    saving,
    error,
    status,
    dirty,
    selectRole,
    togglePermission,
    savePermissions,
  };
}
