# --- All data ---
from ....enums import CoordinationStatusKey, FavoriteTypeKey, PriorityKey, TaskScopeKey, TaskStatusKey

RECORDS = []

# ---- DATATYPE ----
DATATYPE = [
    {"type": "DATATYPE", "key": "INTEGER", "pos": 1, "ext_sys": "", "ext_key": "", "name_default": "Ganzzahl"},
    {"type": "DATATYPE", "key": "DECIMAL", "pos": 2, "ext_sys": "", "ext_key": "", "name_default": "Dezimal"},
    {"type": "DATATYPE", "key": "STRING", "pos": 3, "ext_sys": "", "ext_key": "", "name_default": "String"},
    {"type": "DATATYPE", "key": "DATE", "pos": 4, "ext_sys": "", "ext_key": "", "name_default": "Datum"},
    {"type": "DATATYPE", "key": "TIMESTAMP", "pos": 5, "ext_sys": "", "ext_key": "", "name_default": "Zeitstempel"},
    {"type": "DATATYPE", "key": "BOOLEAN", "pos": 6, "ext_sys": "", "ext_key": "", "name_default": "Boolsch"},
    {"type": "DATATYPE", "key": "KG", "pos": 7, "ext_sys": "", "ext_key": "", "name_default": "Kilogramm"},
    {"type": "DATATYPE", "key": "CM", "pos": 8, "ext_sys": "", "ext_key": "", "name_default": "Zentimeter"},
    {"type": "DATATYPE", "key": "BLOOD_TYPE", "pos": 9, "ext_sys": "CODE", "ext_key": "BLOOD_TYPE", "name_default": "Blutgruppe"},
    {"type": "DATATYPE", "key": "BP", "pos": 10, "ext_sys": "", "ext_key": "", "name_default": "Blutdruck"},
    {"type": "DATATYPE", "key": "POS_NEG", "pos": 11, "ext_sys": "CODE", "ext_key": "POS_NEG", "name_default": "Positiv/Negativ"},
]

RECORDS = RECORDS + DATATYPE

# --- ROLES ----
ROLES = [
    {"type": "ROLE", "key": "KOORD", "pos": 1, "ext_sys": "", "ext_key": "", "name_default": "Koordinator"},
    {"type": "ROLE", "key": "KOORD_DONOR", "pos": 2, "ext_sys": "", "ext_key": "", "name_default": "Koordinator (Donor Edit)"},
    {"type": "ROLE", "key": "ARZT", "pos": 3, "ext_sys": "", "ext_key": "", "name_default": "Arzt"},
    {"type": "ROLE", "key": "SYSTEM", "pos": 4, "ext_sys": "", "ext_key": "", "name_default": "System"},
    {"type": "ROLE", "key": "ADMIN", "pos": 5, "ext_sys": "", "ext_key": "", "name_default": "Admin"},
    {"type": "ROLE", "key": "DEV", "pos": 6, "ext_sys": "", "ext_key": "", "name_default": "Developer"},
]

RECORDS = RECORDS + ROLES

# --- PRIORITY ----
PRIORITY = [
    {"type": "PRIORITY", "key": PriorityKey.LOW.value, "pos": 1, "ext_sys": "", "ext_key": "", "name_default": "Niedrig"},
    {"type": "PRIORITY", "key": PriorityKey.NORMAL.value, "pos": 2, "ext_sys": "", "ext_key": "", "name_default": "Normal"},
    {"type": "PRIORITY", "key": PriorityKey.HIGH.value, "pos": 3, "ext_sys": "", "ext_key": "", "name_default": "Hoch"},
]

RECORDS = RECORDS + PRIORITY

# --- TASK_STATUS ----
TASK_STATUS = [
    {"type": "TASK_STATUS", "key": TaskStatusKey.PENDING.value, "pos": 1, "ext_sys": "", "ext_key": "", "name_default": "Ausstehend"},
    {"type": "TASK_STATUS", "key": TaskStatusKey.COMPLETED.value, "pos": 3, "ext_sys": "", "ext_key": "", "name_default": "Abgeschlossen"},
    {"type": "TASK_STATUS", "key": TaskStatusKey.CANCELLED.value, "pos": 4, "ext_sys": "", "ext_key": "", "name_default": "Abgebrochen"},
]

RECORDS = RECORDS + TASK_STATUS

# --- TASK_SCOPE ----
TASK_SCOPE = [
    {"type": "TASK_SCOPE", "key": TaskScopeKey.ALL.value, "pos": 1, "ext_sys": "", "ext_key": "", "name_default": "Alle"},
    {"type": "TASK_SCOPE", "key": TaskScopeKey.PATIENT.value, "pos": 2, "ext_sys": "", "ext_key": "", "name_default": "Patient"},
    {"type": "TASK_SCOPE", "key": TaskScopeKey.EPISODE.value, "pos": 3, "ext_sys": "", "ext_key": "", "name_default": "Episode"},
    {
        "type": "TASK_SCOPE",
        "key": TaskScopeKey.COORDINATION_PROTOCOL.value,
        "pos": 4,
        "ext_sys": "",
        "ext_key": "",
        "name_default": "Koordinationsprotokoll",
    },
]

RECORDS = RECORDS + TASK_SCOPE

# ---- CONTACT ----
CONTACT = [
    {"type": "CONTACT", "key": "EMAIL", "pos": 1, "ext_sys": "", "ext_key": "", "name_default": "Email"},
    {"type": "CONTACT", "key": "PHONE", "pos": 2, "ext_sys": "", "ext_key": "", "name_default": "Telefon"},
    {"type": "CONTACT", "key": "FAX", "pos": 3, "ext_sys": "", "ext_key": "", "name_default": "Fax"},
    {"type": "CONTACT", "key": "PAGER", "pos": 4, "ext_sys": "", "ext_key": "", "name_default": "Pager"},
    {"type": "CONTACT", "key": "URL", "pos": 5, "ext_sys": "", "ext_key": "", "name_default": "URL"},
    {"type": "CONTACT", "key": "SMS", "pos": 6, "ext_sys": "", "ext_key": "", "name_default": "SMS"},
    {"type": "CONTACT", "key": "SOCIAL", "pos": 7, "ext_sys": "", "ext_key": "", "name_default": "Social"},
    {"type": "CONTACT", "key": "OTHER", "pos": 8, "ext_sys": "", "ext_key": "", "name_default": "Andere"},
]

RECORDS = RECORDS + CONTACT

# ---- CONTACT_USE ----
CONTACT_USE = [
    {"type": "CONTACT_USE", "key": "WORK", "pos": 1, "ext_sys": "", "ext_key": "", "name_default": "Arbeit"},
    {"type": "CONTACT_USE", "key": "PRIVATE", "pos": 2, "ext_sys": "", "ext_key": "", "name_default": "Privat"},
    {"type": "CONTACT_USE", "key": "HOME", "pos": 3, "ext_sys": "", "ext_key": "", "name_default": "Zuhause"},
    {"type": "CONTACT_USE", "key": "TEMP", "pos": 4, "ext_sys": "", "ext_key": "", "name_default": "Temporär"},
    {"type": "CONTACT_USE", "key": "OLD", "pos": 5, "ext_sys": "", "ext_key": "", "name_default": "Alt"},
    {"type": "CONTACT_USE", "key": "HOLIDAY", "pos": 6, "ext_sys": "", "ext_key": "", "name_default": "Ferien"},
    {"type": "CONTACT_USE", "key": "MOBILE", "pos": 7, "ext_sys": "", "ext_key": "", "name_default": "Mobil"},
    {"type": "CONTACT_USE", "key": "OTHER", "pos": 8, "ext_sys": "", "ext_key": "", "name_default": "Andere"},
]

RECORDS = RECORDS + CONTACT_USE

# --- SEX ----
SEX = [
    {"type": "SEX", "key": "F", "pos": 1, "ext_sys": "", "ext_key": "", "name_default": "Female"},
    {"type": "SEX", "key": "M", "pos": 2, "ext_sys": "", "ext_key": "", "name_default": "Male"},
    {"type": "SEX", "key": "X", "pos": 3, "ext_sys": "", "ext_key": "", "name_default": "Other"},
]

RECORDS = RECORDS + SEX

# --- ORGAN ---

ORGAN = [
    {"type": "ORGAN", "key": "KIDNEY", "pos": 1, "ext_sys": "", "ext_key": "", "name_default": "Niere"},
    {"type": "ORGAN", "key": "PANCREAS", "pos": 2, "ext_sys": "", "ext_key": "", "name_default": "Pankreas"},
    {"type": "ORGAN", "key": "LIVER", "pos": 3, "ext_sys": "", "ext_key": "", "name_default": "Leber"},
    {"type": "ORGAN", "key": "HEART", "pos": 4, "ext_sys": "", "ext_key": "", "name_default": "Herz"},
    {"type": "ORGAN", "key": "HEART_VALVE", "pos": 5, "ext_sys": "", "ext_key": "", "name_default": "Heart valve"},
    {"type": "ORGAN", "key": "LUNG", "pos": 6, "ext_sys": "", "ext_key": "", "name_default": "Lunge"},
    {"type": "ORGAN", "key": "ISLET", "pos": 7, "ext_sys": "", "ext_key": "", "name_default": "Inselzellen"},
    {"type": "ORGAN", "key": "VESSELS", "pos": 8, "ext_sys": "", "ext_key": "", "name_default": "Vessels"},
    {"type": "ORGAN", "key": "INTESTINE", "pos": 9, "ext_sys": "", "ext_key": "", "name_default": "Dünndarm"},
]

RECORDS = RECORDS + ORGAN

# --- LTPL_DONOR_RELATION ---
LTPL_DONOR_RELATION = [
    {
        "type": "LTPL_DONOR_RELATION",
        "key": "FIRST_DEGREE_GENETIC_RELATIVE",
        "pos": 1,
        "ext_sys": "",
        "ext_key": "",
        "name_default": "1st Degree Genetic Relative",
    },
    {
        "type": "LTPL_DONOR_RELATION",
        "key": "SECOND_DEGREE_GENETIC_RELATIVE",
        "pos": 2,
        "ext_sys": "",
        "ext_key": "",
        "name_default": "2nd Degree Genetic Relative",
    },
    {
        "type": "LTPL_DONOR_RELATION",
        "key": "OTHER_GENETIC_RELATIVE",
        "pos": 3,
        "ext_sys": "",
        "ext_key": "",
        "name_default": "Other Genetic Relative",
    },
    {
        "type": "LTPL_DONOR_RELATION",
        "key": "EMOTIONALLY_RELATED",
        "pos": 4,
        "ext_sys": "",
        "ext_key": "",
        "name_default": "Emotionally Related",
    },
    {
        "type": "LTPL_DONOR_RELATION",
        "key": "NO_RELATION",
        "pos": 5,
        "ext_sys": "",
        "ext_key": "",
        "name_default": "No Relation",
    },
]

RECORDS = RECORDS + LTPL_DONOR_RELATION

# --- LTPL_DONOR_STATUS ---
LTPL_DONOR_STATUS = [
    {"type": "LTPL_DONOR_STATUS", "key": "REGISTERED", "pos": 1, "ext_sys": "", "ext_key": "", "name_default": "Registered"},
    {"type": "LTPL_DONOR_STATUS", "key": "IN_EVALUATION", "pos": 2, "ext_sys": "", "ext_key": "", "name_default": "In Evaluation"},
    {"type": "LTPL_DONOR_STATUS", "key": "ACTIVE", "pos": 3, "ext_sys": "", "ext_key": "", "name_default": "Active"},
    {"type": "LTPL_DONOR_STATUS", "key": "DEFERRED", "pos": 4, "ext_sys": "", "ext_key": "", "name_default": "Deferred"},
    {"type": "LTPL_DONOR_STATUS", "key": "TRANSPLANTED", "pos": 5, "ext_sys": "", "ext_key": "", "name_default": "Transplanted"},
    {"type": "LTPL_DONOR_STATUS", "key": "REJECTED", "pos": 6, "ext_sys": "", "ext_key": "", "name_default": "Rejected"},
    {"type": "LTPL_DONOR_STATUS", "key": "CLOSED", "pos": 7, "ext_sys": "", "ext_key": "", "name_default": "Closed"},
]

RECORDS = RECORDS + LTPL_DONOR_STATUS

# --- TPL_PHASE ----
TPL_PHASE = [
    {"type": "TPL_PHASE", "key": "EVALUATION", "pos": 1, "ext_sys": "", "ext_key": "", "name_default": "Evaluation"},
    {"type": "TPL_PHASE", "key": "LISTING", "pos": 2, "ext_sys": "", "ext_key": "", "name_default": "Listing"},
    {"type": "TPL_PHASE", "key": "TRANSPLANTATION", "pos": 3, "ext_sys": "", "ext_key": "", "name_default": "Transplantation"},
    {"type": "TPL_PHASE", "key": "FOLLOW_UP", "pos": 4, "ext_sys": "", "ext_key": "", "name_default": "Follow-Up"},
]

RECORDS = RECORDS + TPL_PHASE

# ---- TPL_STATUS ----
TPL_STATUS = [
    {"type": "TPL_STATUS", "key": "EVALUATION", "pos": 1, "ext_sys": "", "ext_key": "", "name_default": "Abklärung"},
    {"type": "TPL_STATUS", "key": "TRANSPLANTABLE", "pos": 2, "ext_sys": "", "ext_key": "", "name_default": "Transplantabel"},
    {"type": "TPL_STATUS", "key": "ALLOCATED", "pos": 3, "ext_sys": "", "ext_key": "", "name_default": "Alloziert"},
    {"type": "TPL_STATUS", "key": "TRANSPLANTED", "pos": 4, "ext_sys": "", "ext_key": "", "name_default": "Transplantiert"},
    {"type": "TPL_STATUS", "key": "DECEASED", "pos": 5, "ext_sys": "", "ext_key": "", "name_default": "Verstorben"},
    {"type": "TPL_STATUS", "key": "REJECTED", "pos": 6, "ext_sys": "", "ext_key": "", "name_default": "Abgelehnt"},
    {"type": "TPL_STATUS", "key": "DELISTED_USZ", "pos": 7, "ext_sys": "", "ext_key": "", "name_default": "Delistung USZ"},
    {"type": "TPL_STATUS", "key": "DELISTED_PATIENT", "pos": 8, "ext_sys": "", "ext_key": "", "name_default": "Delistung Patient"},
    {"type": "TPL_STATUS", "key": "CANCELLED", "pos": 9, "ext_sys": "", "ext_key": "", "name_default": "Storniert"},
]

RECORDS = RECORDS + TPL_STATUS

# --- COORDINATION_STATUS ----
COORDINATION_STATUS = [
    {"type": "COORDINATION_STATUS", "key": CoordinationStatusKey.OPEN.value, "pos": 1, "ext_sys": "", "ext_key": "", "name_default": "Open"},
]

RECORDS = RECORDS + COORDINATION_STATUS

# --- DEATH_KIND ----
DEATH_KIND = [
    {"type": "DEATH_KIND", "key": "DCD", "pos": 1, "ext_sys": "", "ext_key": "", "name_default": "DCD"},
    {"type": "DEATH_KIND", "key": "DBD", "pos": 2, "ext_sys": "", "ext_key": "", "name_default": "DBD"},
]

RECORDS = RECORDS + DEATH_KIND

# --- BLOOD TYPE ----
BLOOD_TYPE = [
    {"type": "BLOOD_TYPE", "key": "O-", "pos": 1, "ext_sys": "", "ext_key": "", "name_default": "O-"},
    {"type": "BLOOD_TYPE", "key": "O+", "pos": 2, "ext_sys": "", "ext_key": "", "name_default": "O+"},
    {"type": "BLOOD_TYPE", "key": "A-", "pos": 3, "ext_sys": "", "ext_key": "", "name_default": "A-"},
    {"type": "BLOOD_TYPE", "key": "A+", "pos": 4, "ext_sys": "", "ext_key": "", "name_default": "A+"},
    {"type": "BLOOD_TYPE", "key": "B-", "pos": 5, "ext_sys": "", "ext_key": "", "name_default": "B-"},
    {"type": "BLOOD_TYPE", "key": "B+", "pos": 6, "ext_sys": "", "ext_key": "", "name_default": "B+"},
    {"type": "BLOOD_TYPE", "key": "AB-", "pos": 7, "ext_sys": "", "ext_key": "", "name_default": "AB-"},
    {"type": "BLOOD_TYPE", "key": "AB+", "pos": 8, "ext_sys": "", "ext_key": "", "name_default": "AB+"},
]

RECORDS = RECORDS + BLOOD_TYPE

# --- POS / NEG ----
POS_NEG = [
    {"type": "POS_NEG", "key": "POS", "pos": 1, "ext_sys": "", "ext_key": "", "name_default": "Positive"},
    {"type": "POS_NEG", "key": "NEG", "pos": 2, "ext_sys": "", "ext_key": "", "name_default": "Negative"},
    {"type": "POS_NEG", "key": "BOUNDARY", "pos": 3, "ext_sys": "", "ext_key": "", "name_default": "Grenzwertig"},
]

RECORDS = RECORDS + POS_NEG

# ---- DIAGNOSIS_DONOR ----
DIAGNOSIS_DONOR = [
    {"type": "DIAGNOSIS_DONOR", "key": "DCD", "pos": 1, "ext_sys": "", "ext_key": "DCD", "name_default": "DCD"},
    {"type": "DIAGNOSIS_DONOR", "key": "CTR", "pos": 2, "ext_sys": "", "ext_key": "CTR", "name_default": "CTR"},
    {"type": "DIAGNOSIS_DONOR", "key": "CHE", "pos": 3, "ext_sys": "", "ext_key": "CHE", "name_default": "CHE"},
]

RECORDS = RECORDS + DIAGNOSIS_DONOR

# ---- PROCUREMENT_EFFECT ----
PROCUREMENT_EFFECT = [
    {"type": "PROCUREMENT_EFFECT", "key": "1", "pos": 1, "ext_sys": "", "ext_key": "1", "name_default": "Procured and transplanted"},
    {"type": "PROCUREMENT_EFFECT", "key": "2", "pos": 2, "ext_sys": "", "ext_key": "2", "name_default": "Procured, not transplanted"},
    {"type": "PROCUREMENT_EFFECT", "key": "3", "pos": 3, "ext_sys": "", "ext_key": "3", "name_default": "Not procured"},
]

RECORDS = RECORDS + PROCUREMENT_EFFECT

# ---- ORGAN_REJECTION_SEQUEL ----
ORGAN_REJECTION_SEQUEL = [
    {"type": "ORGAN_REJECTION_SEQUEL", "key": "DISCARDED", "pos": 1, "ext_sys": "", "ext_key": "DISCARDED", "name_default": "Discarded"},
    {"type": "ORGAN_REJECTION_SEQUEL", "key": "RESEARCH", "pos": 2, "ext_sys": "", "ext_key": "RESEARCH", "name_default": "Used for research"},
    {"type": "ORGAN_REJECTION_SEQUEL", "key": "TRAINING", "pos": 3, "ext_sys": "", "ext_key": "TRAINING", "name_default": "Used for training"},
]

RECORDS = RECORDS + ORGAN_REJECTION_SEQUEL

# ---- COLLOQUIUM_DECISION ----
COLLOQUIUM_DECISION = [
    {"type": "COLLOQUIUM_DECISION", "key": "APPROVED", "pos": 1, "ext_sys": "", "ext_key": "", "name_default": "Approved"},
    {"type": "COLLOQUIUM_DECISION", "key": "REJECTED", "pos": 2, "ext_sys": "", "ext_key": "", "name_default": "Rejected"},
    {"type": "COLLOQUIUM_DECISION", "key": "DEFERRED", "pos": 3, "ext_sys": "", "ext_key": "", "name_default": "Deferred"},
]

RECORDS = RECORDS + COLLOQUIUM_DECISION

# --- FAVORITE_TYPE ----
FAVORITE_TYPE = [
    {"type": "FAVORITE_TYPE", "key": FavoriteTypeKey.PATIENT.value, "pos": 1, "ext_sys": "", "ext_key": "", "name_default": "Patient"},
    {"type": "FAVORITE_TYPE", "key": FavoriteTypeKey.EPISODE.value, "pos": 2, "ext_sys": "", "ext_key": "", "name_default": "Episode"},
    {"type": "FAVORITE_TYPE", "key": FavoriteTypeKey.COLLOQUIUM.value, "pos": 3, "ext_sys": "", "ext_key": "", "name_default": "Colloquium"},
    {"type": "FAVORITE_TYPE", "key": FavoriteTypeKey.COORDINATION.value, "pos": 4, "ext_sys": "", "ext_key": "", "name_default": "Coordination"},
]

RECORDS = RECORDS + FAVORITE_TYPE

# --- INFORMATION_AREA ----
INFORMATION_AREA = [
    {"type": "INFORMATION_AREA", "key": "GENERAL", "pos": 1, "ext_sys": "", "ext_key": "", "name_default": "Allgemein"},
    {"type": "INFORMATION_AREA", "key": "COORDINATION", "pos": 2, "ext_sys": "", "ext_key": "", "name_default": "Koordination"},
    {"type": "INFORMATION_AREA", "key": "ORGAN", "pos": 3, "ext_sys": "", "ext_key": "", "name_default": "Organ"},
]

RECORDS = RECORDS + INFORMATION_AREA

