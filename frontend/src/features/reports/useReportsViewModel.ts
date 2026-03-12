import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  api,
  type ReportExecuteResponse,
  type ReportFieldOption,
  type ReportFilterInput,
  type ReportOperatorKey,
  type ReportSourceOption,
} from '../../api';
import { toUserErrorMessage } from '../../api/error';

interface FilterDraft extends ReportFilterInput {
  id: number;
}

export function useReportsViewModel() {
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');
  const [sources, setSources] = useState<ReportSourceOption[]>([]);
  const [selectedSourceKey, setSelectedSourceKey] = useState<string>('');
  const [selectedJoins, setSelectedJoins] = useState<string[]>([]);
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [filters, setFilters] = useState<FilterDraft[]>([]);
  const [result, setResult] = useState<ReportExecuteResponse | null>(null);
  const [limit, setLimit] = useState(200);

  const selectedSource = useMemo(
    () => sources.find((item) => item.key === selectedSourceKey) ?? null,
    [selectedSourceKey, sources],
  );

  const joinOptions = selectedSource?.joins ?? [];

  const sourceFields = useMemo(() => {
    if (!selectedSource) return [];
    const activeJoinFields = joinOptions
      .filter((join) => selectedJoins.includes(join.key))
      .flatMap((join) => join.fields);
    return [...selectedSource.fields, ...activeJoinFields];
  }, [joinOptions, selectedJoins, selectedSource]);

  const loadMetadata = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const metadata = await api.getReportMetadata();
      setSources(metadata.sources);
      const firstSource = metadata.sources[0] ?? null;
      if (firstSource) {
        setSelectedSourceKey(firstSource.key);
        setSelectedFields(firstSource.fields.slice(0, Math.min(5, firstSource.fields.length)).map((field) => field.key));
      }
    } catch (err) {
      setError(toUserErrorMessage(err, 'Failed to load report metadata'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMetadata();
  }, [loadMetadata]);

  useEffect(() => {
    if (!selectedSource) return;
    setSelectedJoins((prev) => prev.filter((joinKey) => selectedSource.joins.some((join) => join.key === joinKey)));
  }, [selectedSource]);

  useEffect(() => {
    if (!selectedSource) return;
    setSelectedFields((prev) => {
      const valid = prev.filter((key) => sourceFields.some((field) => field.key === key));
      if (valid.length > 0) return valid;
      return sourceFields.slice(0, Math.min(5, sourceFields.length)).map((field) => field.key);
    });
    setFilters((prev) =>
      prev.filter((item) => sourceFields.some((field) => field.key === item.field)),
    );
  }, [selectedSource, sourceFields]);

  const getField = useCallback(
    (fieldKey: string): ReportFieldOption | null => sourceFields.find((item) => item.key === fieldKey) ?? null,
    [sourceFields],
  );

  const addFilter = useCallback(() => {
    if (!selectedSource || sourceFields.length === 0) return;
    const firstField = sourceFields[0];
    const firstOp: ReportOperatorKey = firstField.operators[0] ?? 'eq';
    setFilters((prev) => [
      ...prev,
      {
        id: Date.now() + Math.floor(Math.random() * 1000),
        field: firstField.key,
        operator: firstOp,
        value: '',
      },
    ]);
  }, [selectedSource, sourceFields]);

  const updateFilter = useCallback(
    (id: number, patch: Partial<FilterDraft>) => {
      setFilters((prev) =>
        prev.map((item) => {
          if (item.id !== id) return item;
          const next = { ...item, ...patch };
          if ('field' in patch && typeof patch.field === 'string') {
            const field = getField(patch.field);
            if (field && !field.operators.includes(next.operator)) {
              next.operator = field.operators[0] ?? 'eq';
            }
          }
          return next;
        }),
      );
    },
    [getField],
  );

  const removeFilter = useCallback((id: number) => {
    setFilters((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const runReport = useCallback(async () => {
    if (!selectedSource || selectedFields.length === 0) return;
    setRunning(true);
    setError('');
    try {
      const response = await api.executeReport({
        source: selectedSource.key,
        select: selectedFields,
        joins: selectedJoins,
        filters: filters
          .filter((item) => item.value.trim().length > 0)
          .map(({ field, operator, value }) => ({ field, operator, value })),
        sort: [],
        limit,
      });
      setResult(response);
    } catch (err) {
      setError(toUserErrorMessage(err, 'Failed to execute report'));
    } finally {
      setRunning(false);
    }
  }, [filters, limit, selectedFields, selectedJoins, selectedSource]);

  return {
    loading,
    running,
    error,
    sources,
    selectedSource,
    selectedSourceKey,
    setSelectedSourceKey,
    joinOptions,
    selectedJoins,
    setSelectedJoins,
    sourceFields,
    selectedFields,
    setSelectedFields,
    filters,
    addFilter,
    updateFilter,
    removeFilter,
    limit,
    setLimit,
    result,
    runReport,
    refreshMetadata: loadMetadata,
  };
}
