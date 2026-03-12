import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, type CoordinationProtocolState } from '../../../api';
import { toUserErrorMessage } from '../../../api/error';
import { useI18n } from '../../../i18n/i18n';

interface CoordinationProtocolStateContextValue {
  state: CoordinationProtocolState | null;
  loading: boolean;
  error: string;
  refresh: () => Promise<void>;
}

const CoordinationProtocolStateContext = createContext<CoordinationProtocolStateContextValue | null>(null);

export function CoordinationProtocolStateProvider({
  coordinationId,
  children,
}: {
  coordinationId: number;
  children: ReactNode;
}) {
  const { t } = useI18n();
  const [state, setState] = useState<CoordinationProtocolState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setError('');
      const next = await api.getCoordinationProtocolState(coordinationId);
      setState(next);
    } catch (err) {
      setError(toUserErrorMessage(err, t('coordinations.protocolData.errors.load', 'Failed to load grouped procurement values.')));
    } finally {
      setLoading(false);
    }
  }, [coordinationId, t]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({ state, loading, error, refresh }),
    [state, loading, error, refresh],
  );

  return (
    <CoordinationProtocolStateContext.Provider value={value}>
      {children}
    </CoordinationProtocolStateContext.Provider>
  );
}

export function useCoordinationProtocolState() {
  const context = useContext(CoordinationProtocolStateContext);
  if (!context) {
    throw new Error('useCoordinationProtocolState must be used inside CoordinationProtocolStateProvider');
  }
  return context;
}
