# ---- KOORD ----
KOORD = [
    {"ext_id": "TKOORD", "name": "Test Koord", "first_name": "Test", "surname": "Koord", "role_key": "KOORD"},
    {
        "ext_id": "TALL",
        "name": "Test All",
        "first_name": "Test",
        "surname": "All",
        "role_keys": ["KOORD", "KOORD_DONOR", "ARZT", "SYSTEM", "ADMIN", "DEV"],
        "preferences": {
            "locale": "en",
            "start_page": "patients",
        },
    },
]

# ---- ARZT ----
ARZT = [
    {"ext_id": "TARZT", "name": "Test Arzt", "first_name": "Test", "surname": "Arzt", "role_key": "ARZT"},
]

ADMIN = [
    {"ext_id": "TADMIN", "name": "Test Admin", "first_name": "Test", "surname": "Admin", "role_key": "ADMIN"},
]

RECORDS = [*KOORD, *ARZT, *ADMIN]

