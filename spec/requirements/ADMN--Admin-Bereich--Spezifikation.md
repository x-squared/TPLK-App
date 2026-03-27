# Feature-of [TPLK]: Admin-Bereich

## Use Case: Admin-Bereich strukturiert bereitstellen [Spec]

### Story: {view, structure} Admin-View ist als tab-basierte Verwaltungsoberfläche aufgebaut [Spec]

#### Item: {view} Der Einstieg in den Admin-Bereich zeigt eine eigene View mit Titel "Admin". [Spec]

#### Item: {tab} Die Admin-View bietet die Tabs `Overview`, `Access Rules`, `People & Teams`, `Catalogues`, `Task Templates`, `Protocol Config`, `Scheduler`, `Translations`. [Spec]

#### Item: {tab, function} Pro Tab wird genau ein fachlicher Abschnitt gerendert; ein Tabwechsel schaltet den sichtbaren Abschnitt ohne Seitenwechsel um. [Spec]

#### Item: {architecture} Fachlogik und Datenzugriff liegen in dedizierten ViewModel-/Hook-Modulen je Tab; die Top-Level-View bleibt orchestrierend. [Spec]

## Use Case: Admin-Zugriff absichern [Spec]

### Story: {architecture, quality} Admin-Funktionen sind serverseitig auf Admin-Rollen begrenzt [Spec]

#### Item: {architecture} Alle Admin-Endpunkte werden serverseitig mit `require_admin` geschützt. [Spec]

#### Item: {quality} Nicht autorisierte Aufrufe liefern einen klaren HTTP-Fehler und werden nicht nur im Frontend ausgeblendet. [Spec]

#### Item: {quality} Fehler aus Admin-Requests werden im jeweiligen Tab als nutzerlesbare Fehlermeldung dargestellt. [Spec]

## Use Case: Zugriffsmatrix pflegen [Spec]

### Story: {data, function} Rollenrechte können im Tab "Access Rules" gelesen und aktualisiert werden [Spec]

#### Item: {data} Die Zugriffsmatrix wird über `GET /api/admin/access/matrix` geladen. [Spec]

#### Item: {function} Rollenrechte werden über `PUT /api/admin/access/roles/{role_key}` gespeichert. [Spec]

#### Item: {quality} Änderungen sind als "dirty" erkennbar; Speichern zeigt Status/Fehler nachvollziehbar an. [Spec]

## Use Case: Personen und Teams verwalten [Spec]

### Story: {data, function} Stammdaten für Personen und Teams sind im Tab "People & Teams" editierbar [Spec]

#### Item: {data} Personen können gelistet, erstellt, aktualisiert und gelöscht werden (`/api/admin/people`). [Spec]

#### Item: {data} Teams können gelistet, erstellt, umbenannt, gelöscht und in der Mitgliedschaft gepflegt werden (`/api/admin/people/teams`). [Spec]

#### Item: {quality} Schreiboperationen verwenden explizite Nutzerzuordnung (`changed_by`) für Nachvollziehbarkeit. [Spec]

## Use Case: Kataloge verwalten [Spec]

### Story: {data, function} Katalogeinträge können typbezogen bearbeitet werden [Spec]

#### Item: {data} Verfügbare Katalogtypen werden über `GET /api/admin/catalogues/types` geladen. [Spec]

#### Item: {data} Katalogeinträge werden typgefiltert über `GET /api/admin/catalogues?type=...` geladen. [Spec]

#### Item: {function} Änderungen an Katalogeinträgen erfolgen über `PATCH /api/admin/catalogues/{catalogue_id}`. [Spec]

## Use Case: Task-Templates und Protokoll-Konfiguration verwalten [Spec]

### Story: {data, function} Vorlagen und Beschaffungsprotokoll-Konfiguration sind administrierbar [Spec]

#### Item: {tab} Der Tab "Task Templates" verwaltet Gruppen- und Aufgabenvorlagen inkl. Reihenfolge. [Spec]

#### Item: {tab} Der Tab "Protocol Config" verwaltet Gruppen, Felder, Scopes und Protokoll-Task-Group-Zuordnungen. [Spec]

#### Item: {quality} Geschützte Operationen liefern klare Fehlermeldungen (z. B. Löschen geschützter Feld-Templates mit `422`). [Spec]

## Use Case: Scheduler und Übersetzungen verwalten [Spec]

### Story: {function, data} Betriebsnahe Administration erfolgt über Scheduler- und Translation-Tab [Spec]

#### Item: {data} Scheduler-Jobs und Runs sind einsehbar; Jobs können getriggert und aktiviert/deaktiviert werden (`/api/admin/scheduler/...`). [Spec]

#### Item: {data} Übersetzungs-Overrides werden lokalitätsbezogen geladen und ersetzt (`GET/PUT /api/admin/translations`). [Spec]

#### Item: {quality} Trigger- und Speichervorgänge zeigen Erfolg/Fehler pro Aktion transparent an. [Spec]
