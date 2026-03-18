# Feature-of [TPLK]: Lebendspenden

## Use Case: Lebendspenden [Spec]

### Story: {data} Daten der Lebendspende [Spec]

#### Item: {data} Abbildung des Prozesses der Lebendspende [Spec]
Die Lebendspende wird durch ein Objekt "Episode Lebendspende" (Name: EPISODE_LTPL) (EN: Living Donation Episode) abgebildet. Attribute:
- Empfänger [Recipient_Episode] (Nullable): Verweis auf den für die Lebendspende vorgesehene Episode (nicht den Patienten).
- Spendeorgane [Organs] (Nullable): Verweis auf die gespendeten Organe. Nur die Werte "Niere" und "Leber" sind möglich. Beide Werte können zugleich angegeben werden.
- Start und Ende Daten: Geben die Prozessdauer an

Der Verweis auf die Spender wird separat beschrieben.

#### Item: {data} Abbildung der Spender einer Lebendspende [Spec]
Die Verbindung zwischen dem Prozess und den möglichen Spendern wird durch das Objekt EPISODE_LTPL_DONOR dargestellt. Attribute:
- Verweis auf den betroffenen Prozess in EPISODE_LTPL (Not Nullable).
- Verweis auf PATIENT als potentieller Spender (Not Nullable).
- Code-Wert für die Beziehung zwischen Empfänger und Spender (siehe separates Item).
- Code-Wert für den Status des Spenders im Prozess (siehe separates Item).

#### Item: {data} Code: Beziehung Empfänger-Spender [Spec]
Folgende Code-Werte sind zu kodieren:
- 1st Degree Genetic Relative (Eltern, Geschwister, Kinder)
- 2nd Degree Genetic Relative (Grosseltern, Onkel/Tante, Nichte, Neffe)
- Other Genetic Relative (Cousin)
- Emotionally Related (Partner, Schwiegereltern, Adoptierte, Freunde etc.)
- No Relation (Altruisten etc.)

#### Item: {data} Code: Status des Spenders im Prozess [Spec]
Folgende Code-Werte sind zu kodieren. Angegeben sind die möglichen Status-Übergänge. Diese sind sowohl in der GUI als auch im Backend zu prüfen.
- Angemeldet (-> In Abklärung, -> Zurückgestellt, -> Abgelehnt)
- In Abklärung (-> Aktiv, -> Zurückgestellt, -> Abgelehnt)
- Aktiv (-> Transplantiert)
- Zurückgestellt (-> In Abklärung, -> Aktiv)
- Transplantiert (-> Abgeschlossen)
- Abgelehnt (-> Abgeschlossen)
- Abgeschlossen

### Story: {view} Aufbau der View für Lebendspenden [Spec]
Die View für Lebendspenden besteht aus diesen Ansichten:
- Referenz auf nachfolgende Story: Übersicht über Lebendspende-Prozesse
- Referenz auf nachfolgende Story: Übersicht über einen ausgewählten Lebendspende-Prozess

#### Item: {design} Das Design folgt dem Design, wie es auch bei Empfängern verwendet wird [Spec]

### Story: {view} Übersicht über Lebendspende-Prozesse [Spec]

#### Item: {panel, design} Die Übersicht zeigt eine Tabelle, in der alle Lebendspende-Prozesse dargestellt werden [Spec]

#### Item: {panel, data} Die Tabelle zeigt den Verweis auf den Empfänger [Spec]

#### Item: {panel, data} Die Tabelle erlaubt einen Dropdown auf alle Spender des Prozesses [Spec]
Es werden folgende Werte dargestellt:
- Name und PID des Spenders
- Status des Spenders im Prozess

#### Item: {panel, function} Die Tabelle kann mit einem Textfeld frei gefiltert werden [Spec]

### Story: {view, tab} Übersicht über einen ausgewählten Lebendspende-Prozess [Spec]

#### Item: {panel, data} Abschnitt Übersicht: Der erste Abschnitt zeigt die Grunddaten des Prozesses [Spec]

#### Item: {panel, data, function} Abschnitt Übersicht: Alle Daten bis auf das Abschlussdatum sind editierbar [Spec]

