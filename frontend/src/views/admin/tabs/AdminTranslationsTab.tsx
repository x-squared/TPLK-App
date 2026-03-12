import { useCallback, useEffect, useMemo, useState } from 'react';

import ErrorBanner from '../../layout/ErrorBanner';
import { useAdminTranslations } from '../hooks/useAdminTranslations';
import { useI18n } from '../../../i18n/i18n';

interface TreeNode {
  key: string;
  fullPath: string;
  children: TreeNode[];
  isLeaf: boolean;
}

type TranslationFilterMode = 'keyContains' | 'keyPrefix' | 'displayTextContains';
type TranslationCompletenessMode = 'all' | 'incomplete';
type TranslationSortMode = 'none' | 'asc';

function displayTranslationKey(key: string): string {
  return key;
}

function collectBranchPaths(nodes: TreeNode[]): string[] {
  const paths: string[] = [];
  const walk = (entries: TreeNode[]) => {
    for (const node of entries) {
      if (!node.isLeaf) {
        paths.push(node.fullPath);
        walk(node.children);
      }
    }
  };
  walk(nodes);
  return paths;
}

function countLeafNodes(nodes: TreeNode[]): number {
  let count = 0;
  const walk = (entries: TreeNode[]) => {
    for (const node of entries) {
      if (node.isLeaf) count += 1;
      else walk(node.children);
    }
  };
  walk(nodes);
  return count;
}

function TranslationTree({
  nodes,
  depth,
  draft,
  onChange,
  getSourceKind,
  getEnglishReference,
  expandedPaths,
  onTogglePath,
  onExpandBranch,
  onCollapseBranch,
  filterActive,
}: {
  nodes: TreeNode[];
  depth: number;
  draft: Record<string, string>;
  onChange: (key: string, value: string) => void;
  getSourceKind: (key: string) => 'file' | 'code';
  getEnglishReference: (key: string) => string;
  expandedPaths: Set<string>;
  onTogglePath: (path: string) => void;
  onExpandBranch: (path: string) => void;
  onCollapseBranch: (path: string) => void;
  filterActive: boolean;
}) {
  const { t } = useI18n();
  return (
    <ul className="admin-translation-tree">
      {nodes.map((node) => (
        <li key={node.fullPath} className="admin-translation-node">
          {node.isLeaf ? (
            <div className="admin-translation-leaf" style={{ marginLeft: `${depth * 12}px` }}>
              <div className="admin-translation-meta">
                <div className="admin-translation-key-row">
                  <div className="admin-translation-key">{displayTranslationKey(node.fullPath)}</div>
                  <span className={`admin-translation-source-badge admin-translation-source-${getSourceKind(node.fullPath)}`}>
                    {getSourceKind(node.fullPath) === 'file'
                      ? t('admin.translations.source.file', 'FILE')
                      : t('admin.translations.source.code', 'CODE')}
                  </span>
                </div>
              </div>
              <div className="admin-translation-english-ref">{getEnglishReference(node.fullPath)}</div>
              <input
                className="detail-input admin-translation-input"
                value={draft[node.fullPath] ?? ''}
                onChange={(event) => onChange(node.fullPath, event.target.value)}
              />
            </div>
          ) : (
            <div>
              <div className="admin-translation-group" style={{ marginLeft: `${depth * 12}px` }}>
                {filterActive ? (
                  <span className="admin-translation-toggle admin-translation-toggle-static">▼ {node.key}</span>
                ) : (
                  <>
                    <button
                      type="button"
                      className="admin-translation-toggle"
                      onClick={() => onTogglePath(node.fullPath)}
                      title={
                        expandedPaths.has(node.fullPath)
                          ? t('admin.translations.tree.collapseBranch', 'Collapse branch')
                          : t('admin.translations.tree.expandBranch', 'Expand branch')
                      }
                    >
                      {expandedPaths.has(node.fullPath) ? '▼' : '▶'} {node.key}
                    </button>
                    <div className="admin-translation-group-actions">
                      <button
                        type="button"
                        className="admin-translation-mini-btn"
                        onClick={() => onCollapseBranch(node.fullPath)}
                        title={t('admin.translations.tree.collapseBranch', 'Collapse branch')}
                      >
                        {t('admin.translations.tree.collapseAll', 'Collapse all')}
                      </button>
                      <button
                        type="button"
                        className="admin-translation-mini-btn"
                        onClick={() => onExpandBranch(node.fullPath)}
                        title={t('admin.translations.tree.expandBranch', 'Expand branch')}
                      >
                        {t('admin.translations.tree.expandAll', 'Expand all')}
                      </button>
                    </div>
                  </>
                )}
              </div>
              {expandedPaths.has(node.fullPath) ? (
                <TranslationTree
                  nodes={node.children}
                  depth={depth + 1}
                  draft={draft}
                  onChange={onChange}
                  getSourceKind={getSourceKind}
                  getEnglishReference={getEnglishReference}
                  expandedPaths={expandedPaths}
                  onTogglePath={onTogglePath}
                  onExpandBranch={onExpandBranch}
                  onCollapseBranch={onCollapseBranch}
                  filterActive={filterActive}
                />
              ) : null}
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

export default function AdminTranslationsTab() {
  const { t } = useI18n();
  const model = useAdminTranslations();
  const [filterValue, setFilterValue] = useState('');
  const [filterMode, setFilterMode] = useState<TranslationFilterMode>('keyContains');
  const [completenessMode, setCompletenessMode] = useState<TranslationCompletenessMode>('all');
  const [sortMode, setSortMode] = useState<TranslationSortMode>('none');
  const filterQuery = filterValue.trim().toLowerCase();
  const filterActive = filterQuery.length > 0;

  const filterMatches = useCallback((key: string): boolean => {
    if (!filterActive) return true;
    const keyHaystacks = [
      key.toLowerCase(),
      displayTranslationKey(key).toLowerCase(),
    ];
    if (filterMode === 'keyPrefix') {
      return keyHaystacks.some((value) => value.startsWith(filterQuery));
    }
    if (filterMode === 'keyContains') {
      return keyHaystacks.some((value) => value.includes(filterQuery));
    }
    const textHaystacks = [
      model.getEffectiveText(key).toLowerCase(),
      model.getEnglishReference(key).toLowerCase(),
    ];
    return textHaystacks.some((value) => value.includes(filterQuery));
  }, [filterActive, filterMode, filterQuery, model]);

  const filteredTree = useMemo(() => {
    if (!filterActive && completenessMode === 'all') return model.tree;
    const walk = (nodes: TreeNode[]): TreeNode[] =>
      nodes
        .map((node) => {
          if (node.isLeaf) {
            const isCompleteMatch = completenessMode === 'all' || model.isIncompleteKey(node.fullPath);
            return filterMatches(node.fullPath) && isCompleteMatch ? node : null;
          }
          const children = walk(node.children);
          if (children.length === 0) return null;
          return { ...node, children };
        })
        .filter((node): node is TreeNode => Boolean(node));
    return walk(model.tree);
  }, [completenessMode, filterActive, filterMatches, model]);

  const sortedTree = useMemo(() => {
    if (sortMode === 'none') return filteredTree;
    const sortNodes = (nodes: TreeNode[]): TreeNode[] =>
      [...nodes]
        .map((node) => (node.isLeaf ? node : { ...node, children: sortNodes(node.children) }))
        .sort((a, b) => a.key.localeCompare(b.key, undefined, { sensitivity: 'base' }));
    return sortNodes(filteredTree);
  }, [filteredTree, sortMode]);

  const branchPaths = useMemo(() => collectBranchPaths(model.tree), [model.tree]);
  const filteredBranchPaths = useMemo(() => collectBranchPaths(sortedTree), [sortedTree]);
  const leafCount = useMemo(
    () => ((filterActive || completenessMode === 'incomplete') ? countLeafNodes(filteredTree) : model.knownKeys.length),
    [completenessMode, filterActive, filteredTree, model.knownKeys.length],
  );
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(() => new Set(branchPaths));
  const [didInitExpansion, setDidInitExpansion] = useState(false);
  useEffect(() => {
    if (!didInitExpansion && branchPaths.length > 0) {
      setExpandedPaths(new Set(branchPaths));
      setDidInitExpansion(true);
      return;
    }
    setExpandedPaths((prev) => {
      const next = new Set<string>();
      const allowed = new Set(branchPaths);
      for (const path of prev) {
        if (allowed.has(path)) next.add(path);
      }
      return next;
    });
  }, [branchPaths, didInitExpansion]);

  const getDescendantBranchPaths = useCallback((rootPath: string): string[] => {
    const descendants: string[] = [];
    const walk = (nodes: TreeNode[]) => {
      for (const node of nodes) {
        if (!node.isLeaf) {
          if (node.fullPath === rootPath || node.fullPath.startsWith(`${rootPath}.`)) {
            descendants.push(node.fullPath);
          }
          walk(node.children);
        }
      }
    };
    walk(model.tree);
    return descendants;
  }, [model.tree]);

  const togglePath = useCallback((path: string) => {
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }, []);

  const collapseBranch = useCallback((path: string) => {
    const descendants = getDescendantBranchPaths(path);
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      descendants.forEach((entry) => next.delete(entry));
      return next;
    });
  }, [getDescendantBranchPaths]);

  const expandBranch = useCallback((path: string) => {
    const descendants = getDescendantBranchPaths(path);
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      descendants.forEach((entry) => next.add(entry));
      return next;
    });
  }, [getDescendantBranchPaths]);

  const collapseAll = useCallback(() => {
    setExpandedPaths(new Set());
  }, []);

  const expandAll = useCallback(() => {
    setExpandedPaths(new Set(branchPaths));
  }, [branchPaths]);

  const suggestionOptions = useMemo(() => {
    if (!filterQuery) return model.knownKeys.slice(0, 30);
    const scored = model.knownKeys
      .map((key) => {
        const keyLower = key.toLowerCase();
        const displayKeyLower = displayTranslationKey(key).toLowerCase();
        if (filterMode === 'keyPrefix') {
          const prefix = keyLower.startsWith(filterQuery) || displayKeyLower.startsWith(filterQuery);
          if (!prefix) return null;
          return { key, score: 0 };
        }
        if (filterMode === 'keyContains') {
          const contains = keyLower.includes(filterQuery) || displayKeyLower.includes(filterQuery);
          if (!contains) return null;
          const prefix = keyLower.startsWith(filterQuery) || displayKeyLower.startsWith(filterQuery);
          return { key, score: prefix ? 0 : 1 };
        }
        const effectiveLower = model.getEffectiveText(key).toLowerCase();
        const englishLower = model.getEnglishReference(key).toLowerCase();
        const textContains = effectiveLower.includes(filterQuery) || englishLower.includes(filterQuery);
        if (!textContains) return null;
        const textPrefix = effectiveLower.startsWith(filterQuery) || englishLower.startsWith(filterQuery);
        const keyPrefix = keyLower.startsWith(filterQuery) || displayKeyLower.startsWith(filterQuery);
        const score = keyPrefix ? 0 : textPrefix ? 1 : 2;
        return { key, score };
      })
      .filter((entry): entry is { key: string; score: number } => Boolean(entry))
      .sort((a, b) => a.score - b.score || a.key.localeCompare(b.key))
      .slice(0, 30)
      .map((entry) => entry.key);
    return scored;
  }, [filterMode, filterQuery, model]);

  const effectiveExpandedPaths = useMemo(
    () => (filterActive ? new Set(filteredBranchPaths) : expandedPaths),
    [expandedPaths, filterActive, filteredBranchPaths],
  );

  return (
    <section className="detail-section ui-panel-section admin-translations-tab">
      <div className="detail-section-heading">
        <h2>{t('app.admin.tabs.translations', 'Translations')}</h2>
      </div>
      <div className="admin-task-template-create admin-people-form">
        <label>
          <span>{t('admin.translations.language', 'Language')}</span>
          <select className="detail-input" value={model.locale} onChange={(e) => model.setLocale(e.target.value)}>
            <option value="de">{t('admin.translations.locale.de', 'Deutsch (de)')}</option>
            <option value="en">{t('admin.translations.locale.en', 'English (en)')}</option>
          </select>
        </label>
        <div className="admin-proc-action-cell">
          <button className="save-btn" disabled={model.saving || model.loading} onClick={() => { void model.save(); }}>
            {model.saving ? t('admin.translations.saving', 'Saving...') : t('admin.translations.save', 'Save translations')}
          </button>
        </div>
      </div>
      <p className="subtitle">
        {t('admin.translations.helpPrefix', 'Tree keys are fixed by the translation file. Admins can edit text values only. Items:')} {leafCount}
      </p>
      {!model.loading ? (
        <div className="admin-translation-tree-controls">
          <div className="admin-translation-filter-controls">
            <select
              className="detail-input admin-translation-filter-mode"
              value={filterMode}
              onChange={(event) => setFilterMode(event.target.value as TranslationFilterMode)}
              title={t('admin.translations.filter.mode', 'Filter mode')}
              aria-label={t('admin.translations.filter.mode', 'Filter mode')}
            >
              <option value="keyContains">{t('admin.translations.filter.keyContains', 'Key contains')}</option>
              <option value="keyPrefix">{t('admin.translations.filter.keyPrefix', 'Key prefix')}</option>
              <option value="displayTextContains">{t('admin.translations.filter.displayTextContains', 'Display text contains')}</option>
            </select>
            <input
              className="detail-input admin-translation-filter-input"
              value={filterValue}
              onChange={(event) => setFilterValue(event.target.value)}
              placeholder={t('admin.translations.filter.placeholder', 'Filter keys or text...')}
              list="admin-translation-filter-suggestions"
              aria-label={t('admin.translations.filter.placeholder', 'Filter keys or text...')}
            />
            <datalist id="admin-translation-filter-suggestions">
              {suggestionOptions.map((key) => (
                <option key={key} value={key} />
              ))}
            </datalist>
          </div>
          <div className="admin-translation-tree-actions">
            <button
              type="button"
              className="admin-translation-mini-btn"
              onClick={() => setCompletenessMode((prev) => (prev === 'all' ? 'incomplete' : 'all'))}
              title={t('admin.translations.tree.completenessToggle', 'Toggle all vs incomplete labels')}
            >
              {completenessMode === 'all'
                ? t('admin.translations.tree.completenessAll', 'All')
                : t('admin.translations.tree.completenessIncomplete', 'Incomplete')}
            </button>
            <button
              type="button"
              className="admin-translation-mini-btn"
              onClick={() => setSortMode((prev) => (prev === 'none' ? 'asc' : 'none'))}
              title={t('admin.translations.tree.sortToggle', 'Toggle sort order')}
            >
              {sortMode === 'none'
                ? t('admin.translations.tree.sortNone', 'No sort')
                : t('admin.translations.tree.sortAsc', 'Sort A-Z')}
            </button>
            <button type="button" className="admin-translation-mini-btn" onClick={collapseAll}>
              {t('admin.translations.tree.collapseAll', 'Collapse all')}
            </button>
            <button type="button" className="admin-translation-mini-btn" onClick={expandAll}>
              {t('admin.translations.tree.expandAll', 'Expand all')}
            </button>
          </div>
        </div>
      ) : null}
      {model.loading ? <p className="status">{t('admin.translations.loading', 'Loading translations...')}</p> : null}
      {model.error ? <ErrorBanner message={model.error} /> : null}
      {model.status ? <p className="status">{model.status}</p> : null}
      {!model.loading && (filterActive || completenessMode === 'incomplete') && leafCount === 0 ? (
        <p className="status">{t('admin.translations.filter.noMatches', 'No matching translation entries.')}</p>
      ) : null}
      {!model.loading && (
        <div className="admin-tab-content-guard admin-translation-tree-wrap">
          <TranslationTree
            nodes={sortedTree}
            depth={0}
            draft={model.draft}
            onChange={model.setDraftValue}
            getSourceKind={model.getSourceKind}
            getEnglishReference={model.getEnglishReference}
            expandedPaths={effectiveExpandedPaths}
            onTogglePath={togglePath}
            onExpandBranch={expandBranch}
            onCollapseBranch={collapseBranch}
            filterActive={filterActive}
          />
        </div>
      )}
    </section>
  );
}
