RECORDS = [
    {"field_key": "COLD_PERFUSION", "organ_key": "HEART", "slot_key": "MAIN"},
    {"field_key": "COLD_PERFUSION_ABDOMINAL", "organ_key": "LIVER", "slot_key": "MAIN"},
    {"field_key": "NMP_USED", "organ_key": "HEART", "slot_key": "MAIN"},
    {"field_key": "NMP_USED", "organ_key": "LIVER", "slot_key": "MAIN"},
    {"field_key": "EVLP_USED", "organ_key": "HEART", "slot_key": "MAIN"},
    {"field_key": "EVLP_USED", "organ_key": "LUNG", "slot_key": "LEFT"},
    {"field_key": "EVLP_USED", "organ_key": "LUNG", "slot_key": "RIGHT"},
    {"field_key": "HOPE_USED", "organ_key": "LIVER", "slot_key": "MAIN"},
    {"field_key": "LIFEPORT_USED", "organ_key": "KIDNEY", "slot_key": "LEFT"},
    {"field_key": "LIFEPORT_USED", "organ_key": "KIDNEY", "slot_key": "RIGHT"},
    {"field_key": "EHB_BOX_NR", "organ_key": "HEART_VALVE", "slot_key": "MAIN"},
    {"field_key": "EHB_NR", "organ_key": "HEART_VALVE", "slot_key": "MAIN"},
    {"field_key": "ON_SITE_COORDINATORS", "organ_key": "HEART", "slot_key": "MAIN"},
    {"field_key": "ON_SITE_COORDINATORS", "organ_key": "LIVER", "slot_key": "MAIN"},
    {"field_key": "ON_SITE_COORDINATORS", "organ_key": "KIDNEY", "slot_key": "MAIN"},
    {"field_key": "ON_SITE_COORDINATORS", "organ_key": "LUNG", "slot_key": "MAIN"},
]

ORGANS = [
    "KIDNEY",
    "PANCREAS",
    "LIVER",
    "HEART",
    "HEART_VALVE",
    "LUNG",
    "ISLET",
    "VESSELS",
    "INTESTINE",
]

MAIN_SCOPE_FIELDS = [
    "ARRIVAL_TIME",
    "ARZT_RESPONSIBLE",
    "CARDIAC_ARREST_TIME",
    "CHIRURG_RESPONSIBLE",
    "CROSS_CLAMP_TIME",
    "DEPARTURE_DONOR_TIME",
    "IMPLANT_TEAM",
    "INCISION_DONOR_TIME",
    "INCISION_TIME",
    "PROCUREMENT_TEAM_DEPARTURE_TIME",
    "PROCUREMENT_TEAM_INT",
    "PROCURMENT_TEAM",
    "RECIPIENT",
]

RECORDS += [
    {"field_key": field_key, "organ_key": organ_key, "slot_key": "MAIN"}
    for field_key in MAIN_SCOPE_FIELDS
    for organ_key in ORGANS
]
