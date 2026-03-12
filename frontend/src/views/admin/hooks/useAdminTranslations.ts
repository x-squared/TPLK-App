import { useEffect, useMemo, useState } from 'react';

import { api } from '../../../api';
import { toUserErrorMessage } from '../../../api/error';
import { getBuiltinTranslationsForLocale, translationItemLabelsByKey } from '../../../i18n/i18n';

interface TreeNode {
  key: string;
  fullPath: string;
  children: TreeNode[];
  isLeaf: boolean;
}

interface MutableTreeNode extends TreeNode {
  childrenByKey: Record<string, MutableTreeNode>;
}

function buildTree(keys: string[]): TreeNode[] {
  const root: Record<string, MutableTreeNode> = {};
  for (const fullKey of keys) {
    const parts = fullKey.split('.');
    let level = root;
    let path = '';
    for (let i = 0; i < parts.length; i += 1) {
      const part = parts[i];
      path = path ? `${path}.${part}` : part;
      const isLeaf = i === parts.length - 1;
      if (!level[part]) {
        level[part] = {
          key: part,
          fullPath: path,
          children: [],
          isLeaf,
          childrenByKey: {},
        };
      } else if (isLeaf) {
        level[part].isLeaf = true;
      }
      level = level[part].childrenByKey;
    }
  }
  const materialize = (nodes: Record<string, MutableTreeNode>): TreeNode[] => {
    return Object.values(nodes)
      .sort((a, b) => a.key.localeCompare(b.key))
      .map((node) => {
        return {
          key: node.key,
          fullPath: node.fullPath,
          isLeaf: node.isLeaf,
          children: materialize(node.childrenByKey),
        };
      });
  };
  return materialize(root);
}

export function useAdminTranslations() {
  const [locale, setLocale] = useState('de');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [entries, setEntries] = useState<Record<string, string>>({});
  const [draft, setDraft] = useState<Record<string, string>>({});

  const builtinEntries = useMemo(() => getBuiltinTranslationsForLocale(locale), [locale]);
  const englishBuiltinEntries = useMemo(() => getBuiltinTranslationsForLocale('en'), []);
  const knownKeys = useMemo(() => {
    const keys = new Set<string>([
      ...Object.keys(translationItemLabelsByKey),
      ...Object.keys(builtinEntries),
      ...Object.keys(entries),
    ]);
    return [...keys].sort((a, b) => a.localeCompare(b));
  }, [builtinEntries, entries]);
  const tree = useMemo(() => buildTree(knownKeys), [knownKeys]);

  const load = async () => {
    setLoading(true);
    setError('');
    setStatus('');
    try {
      const payload = await api.getAdminTranslationOverrides(locale);
      setEntries(payload.entries ?? {});
      const mergedDraft: Record<string, string> = {};
      for (const key of knownKeys) {
        mergedDraft[key] = (payload.entries?.[key] ?? builtinEntries[key] ?? '').trim();
      }
      setDraft(mergedDraft);
    } catch (err) {
      setError(toUserErrorMessage(err, 'Could not load translation overrides.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [locale]);

  useEffect(() => {
    setDraft((prev) => {
      const next: Record<string, string> = {};
      for (const key of knownKeys) {
        next[key] = prev[key] ?? entries[key] ?? builtinEntries[key] ?? '';
      }
      return next;
    });
  }, [builtinEntries, entries, knownKeys]);

  const setDraftValue = (key: string, value: string) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const save = async () => {
    setSaving(true);
    setError('');
    setStatus('');
    try {
      const normalized: Record<string, string> = {};
      for (const key of knownKeys) {
        const value = (draft[key] ?? '').trim();
        if (value) normalized[key] = value;
      }
      const saved = await api.replaceAdminTranslationOverrides(locale, normalized);
      setEntries(saved.entries ?? {});
      setStatus('Translations saved.');
    } catch (err) {
      setError(toUserErrorMessage(err, 'Could not save translation overrides.'));
    } finally {
      setSaving(false);
    }
  };

  const getItemLabel = (key: string): string => {
    const labels = translationItemLabelsByKey[key] ?? {};
    return labels[locale] ?? labels.en ?? key;
  };

  const getSourceKind = (key: string): 'file' | 'code' => {
    return (key in translationItemLabelsByKey) ? 'file' : 'code';
  };

  const getEnglishReference = (key: string): string => {
    const englishText = (englishBuiltinEntries[key] ?? '').trim();
    if (englishText) return englishText;
    const labels = translationItemLabelsByKey[key] ?? {};
    return (labels.en ?? key).trim();
  };

  const getEffectiveText = (key: string): string => {
    const draftText = (draft[key] ?? '').trim();
    if (draftText) return draftText;
    const entryText = (entries[key] ?? '').trim();
    if (entryText) return entryText;
    const builtinText = (builtinEntries[key] ?? '').trim();
    if (builtinText) return builtinText;
    return getEnglishReference(key);
  };

  const isIncompleteKey = (key: string): boolean => {
    return (draft[key] ?? entries[key] ?? builtinEntries[key] ?? '').trim() === '';
  };

  return {
    locale,
    setLocale,
    loading,
    saving,
    error,
    status,
    tree,
    knownKeys,
    draft,
    setDraftValue,
    save,
    getItemLabel,
    getSourceKind,
    getEnglishReference,
    getEffectiveText,
    isIncompleteKey,
  };
}
