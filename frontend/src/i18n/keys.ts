export const COMMON_I18N_KEYS = {
  loading: 'common.loading',
  emptySymbol: 'common.emptySymbol',
  unknown: 'common.unknown',
} as const;

export const ACTION_I18N_KEYS = {
  save: 'actions.save',
  cancel: 'actions.cancel',
  refresh: 'actions.refresh',
} as const;

export const COORDINATION_I18N_KEYS = {
  title: 'coordinations.title',
  empty: 'coordinations.empty',
  emptyFiltered: 'coordinations.emptyFiltered',
  actions: {
    add: 'coordinations.actions.add',
    openCoordination: 'coordinations.actions.openCoordination',
  },
  filters: {
    searchPlaceholder: 'coordinations.filters.searchPlaceholder',
  },
  table: {
    status: 'coordinations.table.status',
    start: 'coordinations.table.start',
    end: 'coordinations.table.end',
    donorName: 'coordinations.table.donorName',
    dateOfBirth: 'coordinations.table.dateOfBirth',
    reasonOfDeath: 'coordinations.table.reasonOfDeath',
    swtplNr: 'coordinations.table.swtplNr',
    assignedEpisodes: 'coordinations.table.assignedEpisodes',
    organ: 'coordinations.table.organ',
  },
  form: {
    donorNameRequired: 'coordinations.form.donorNameRequired',
    donorNr: 'coordinations.form.donorNr',
    reasonOfDeath: 'coordinations.form.reasonOfDeath',
    swtplNr: 'coordinations.form.swtplNr',
    nationalCoordinator: 'coordinations.form.nationalCoordinator',
    comment: 'coordinations.form.comment',
    saving: 'coordinations.form.saving',
  },
  episodes: {
    toggle: 'coordinations.episodes.toggle',
    loading: 'coordinations.episodes.loading',
    empty: 'coordinations.episodes.empty',
    assignedOrgans: 'coordinations.episodes.assignedOrgans',
  },
  completion: {
    title: 'coordinations.completion.title',
    confirmedMeta: 'coordinations.completion.confirmedMeta',
    errors: {
      confirm: 'coordinations.completion.errors.confirm',
    },
    confirmed: 'coordinations.completion.confirmed',
    notConfirmed: 'coordinations.completion.notConfirmed',
    commentPlaceholder: 'coordinations.completion.commentPlaceholder',
    confirming: 'coordinations.completion.confirming',
    confirmAction: 'coordinations.completion.confirmAction',
    allTasksTitle: 'coordinations.completion.allTasksTitle',
  },
} as const;

export const TASKBOARD_I18N_KEYS = {
  references: {
    coordination: 'taskBoard.references.coordination',
    organ: 'taskBoard.references.organ',
  },
} as const;

export const COLLOQUIUM_I18N_KEYS = {
  actions: {
    openEpisode: 'colloquiums.actions.openEpisode',
  },
} as const;

export const EPISODE_PICKER_I18N_KEYS = {
  episode: 'episodePicker.episode',
} as const;
