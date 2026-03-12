"""Core task group templates and task templates."""

CORE_CHANGED_BY_ID = 1

TASK_GROUP_TEMPLATES = [
    {
        "key": "COORD_COMPLETION_BLOCK_1",
        "name": "Coordination final processing block 1",
        "description": "Final coordination processing tasks due within one day.",
        "scope_key": "COORDINATION_PROTOCOL",
        "organ_key": None,
        "tpl_phase_key": None,
        "is_active": True,
        "sort_pos": 200,
        "changed_by_id": CORE_CHANGED_BY_ID,
    },
    {
        "key": "COORD_COMPLETION_BLOCK_2",
        "name": "Coordination final processing block 2",
        "description": "Final coordination processing tasks due within one week.",
        "scope_key": "COORDINATION_PROTOCOL",
        "organ_key": None,
        "tpl_phase_key": None,
        "is_active": True,
        "sort_pos": 210,
        "changed_by_id": CORE_CHANGED_BY_ID,
    },
]

TASK_TEMPLATES = [
    {
        "task_group_template_key": "COORD_COMPLETION_BLOCK_1",
        "description": "KISIM: Virologieblatt erstellt",
        "comment_hint": "",
        "kind_key": "TASK",
        "priority_key": "NORMAL",
        "offset_minutes_default": 1440,
        "is_active": True,
        "sort_pos": 1,
        "changed_by_id": CORE_CHANGED_BY_ID,
    },
    {
        "task_group_template_key": "COORD_COMPLETION_BLOCK_2",
        "description": "SOAS: Follow-Up durchführen",
        "comment_hint": "",
        "kind_key": "TASK",
        "priority_key": "NORMAL",
        "offset_minutes_default": 4320,
        "is_active": True,
        "sort_pos": 1,
        "changed_by_id": CORE_CHANGED_BY_ID,
    },
]

PROTOCOL_TASK_GROUP_SELECTIONS = []
