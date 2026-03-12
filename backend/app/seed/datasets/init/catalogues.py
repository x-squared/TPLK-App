# --- All data ---

RECORDS = []

# ---- KANTON ----
KANTON = [
    {"type": "KANTON", "key": "ZH", "pos": 1, "ext_sys": "", "ext_key": "", "name_default": "Zürich", "name_en": "Zurich", "name_de": "Zürich"},
    {"type": "KANTON", "key": "BE", "pos": 2, "ext_sys": "", "ext_key": "", "name_default": "Bern", "name_en": "Bern", "name_de": "Bern"},
    {"type": "KANTON", "key": "LU", "pos": 3, "ext_sys": "", "ext_key": "", "name_default": "Luzern", "name_en": "Lucerne", "name_de": "Luzern"},
]

RECORDS = RECORDS + KANTON

# ---- COUNTRY ----
COUNTRY = [
    {"type": "COUNTRY", "key": "CH", "pos": 1, "ext_sys": "", "ext_key": "", "name_default": "Schweiz", "name_en": "Switzerland", "name_de": "Schweiz"},
    {"type": "COUNTRY", "key": "DE", "pos": 2, "ext_sys": "", "ext_key": "", "name_default": "Deutschland", "name_en": "Germany", "name_de": "Deutschland"},
    {"type": "COUNTRY", "key": "AT", "pos": 3, "ext_sys": "", "ext_key": "", "name_default": "Österreich", "name_en": "Austria", "name_de": "Österreich"},
]

RECORDS = RECORDS + COUNTRY

# ---- LANGUAGE ----
LANGUAGE = [
    {"type": "LANGUAGE", "key": "DE", "pos": 1, "ext_sys": "", "ext_key": "", "name_default": "Deutsch", "name_en": "German", "name_de": "Deutsch"},
    {"type": "LANGUAGE", "key": "EN", "pos": 2, "ext_sys": "", "ext_key": "", "name_default": "Englisch", "name_en": "English", "name_de": "Englisch"},
    {"type": "LANGUAGE", "key": "FR", "pos": 3, "ext_sys": "", "ext_key": "", "name_default": "Französisch", "name_en": "French", "name_de": "Französisch"},
    {"type": "LANGUAGE", "key": "IT", "pos": 4, "ext_sys": "", "ext_key": "", "name_default": "Italienisch", "name_en": "Italian", "name_de": "Italienisch"},
    {"type": "LANGUAGE", "key": "ES", "pos": 5, "ext_sys": "", "ext_key": "", "name_default": "Spanisch", "name_en": "Spanish", "name_de": "Spanisch"},
    {"type": "LANGUAGE", "key": "PT", "pos": 6, "ext_sys": "", "ext_key": "", "name_default": "Portugiesisch", "name_en": "Portuguese", "name_de": "Portugiesisch"},
    {"type": "LANGUAGE", "key": "NL", "pos": 7, "ext_sys": "", "ext_key": "", "name_default": "Niederländisch", "name_en": "Dutch", "name_de": "Niederländisch"},
    {"type": "LANGUAGE", "key": "PL", "pos": 8, "ext_sys": "", "ext_key": "", "name_default": "Polnisch", "name_en": "Polish", "name_de": "Polnisch"},
    {"type": "LANGUAGE", "key": "RU", "pos": 9, "ext_sys": "", "ext_key": "", "name_default": "Russisch", "name_en": "Russian", "name_de": "Russisch"},
    {"type": "LANGUAGE", "key": "ZH", "pos": 10, "ext_sys": "", "ext_key": "", "name_default": "Chinesisch", "name_en": "Chinese", "name_de": "Chinesisch"},
    {"type": "LANGUAGE", "key": "JA", "pos": 11, "ext_sys": "", "ext_key": "", "name_default": "Japanisch", "name_en": "Japanese", "name_de": "Japanisch"},
    {"type": "LANGUAGE", "key": "KO", "pos": 12, "ext_sys": "", "ext_key": "", "name_default": "Koreanisch", "name_en": "Korean", "name_de": "Koreanisch"},
]

RECORDS = RECORDS + LANGUAGE

# ---- DIAGNOSIS ----
DIAGNOSIS = [
    {"type": "DIAGNOSIS", "key": "ACU", "pos": 1, "ext_sys": "", "ext_key": "ACU", "name_default": "Acute", "name_en": "Acute", "name_de": "Acute"},
    {"type": "DIAGNOSIS", "key": "ACUTOX", "pos": 2, "ext_sys": "", "ext_key": "ACUTOX", "name_default": "Acute Toxicity", "name_en": "Acute Toxicity", "name_de": "Acute Toxicity"},
    {"type": "DIAGNOSIS", "key": "ALAGS", "pos": 3, "ext_sys": "", "ext_key": "ALAGS", "name_default": "Alagille Syndrome", "name_en": "Alagille Syndrome", "name_de": "Alagille Syndrome"},
    {"type": "DIAGNOSIS", "key": "ALPHTR", "pos": 4, "ext_sys": "", "ext_key": "ALPHTR", "name_default": "Alpha-1 Antitrypsin", "name_en": "Alpha-1 Antitrypsin", "name_de": "Alpha-1 Antitrypsin"},
    {"type": "DIAGNOSIS", "key": "AMY", "pos": 5, "ext_sys": "", "ext_key": "AMY", "name_default": "Amyloidosis", "name_en": "Amyloidosis", "name_de": "Amyloidosis"},
    {"type": "DIAGNOSIS", "key": "BC", "pos": 6, "ext_sys": "", "ext_key": "BC", "name_default": "Breast Cancer", "name_en": "Breast Cancer", "name_de": "Breast Cancer"},
    {"type": "DIAGNOSIS", "key": "BYLER", "pos": 7, "ext_sys": "", "ext_key": "BYLER", "name_default": "Byler disease", "name_en": "Byler disease", "name_de": "Byler disease"},
]

RECORDS = RECORDS + DIAGNOSIS

# ---- HOSPITAL ----
HOSPITAL = [
    {"type": "HOSPITAL", "key": "USZ", "pos": 1, "ext_sys": "", "ext_key": "USZ", "name_default": "Universitätsspital Zürich", "name_en": "University Hospital Zurich", "name_de": "Universitätsspital Zürich"},
    {"type": "HOSPITAL", "key": "INSEL", "pos": 2, "ext_sys": "", "ext_key": "INSEL", "name_default": "Inselspital Bern", "name_en": "Inselspital Bern", "name_de": "Inselspital Bern"},
    {"type": "HOSPITAL", "key": "CHUV", "pos": 3, "ext_sys": "", "ext_key": "CHUV", "name_default": "CHUV Lausanne", "name_en": "CHUV Lausanne", "name_de": "CHUV Lausanne"},
    {"type": "HOSPITAL", "key": "HUG", "pos": 4, "ext_sys": "", "ext_key": "HUG", "name_default": "HUG Genève", "name_en": "HUG Geneva", "name_de": "HUG Genève"},
]

RECORDS = RECORDS + HOSPITAL
