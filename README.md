# HA Device Manager

Ein modernes React-Dashboard zur Verwaltung von Home Assistant Geräten.

## Features

- **Geräteübersicht**: Tabellarische Darstellung aller Geräte mit Sortierung und Filterung
- **Philips Hue Verwaltung**: Spezielle Ansicht für Hue-Geräte mit Label- und Bereichszuordnung
- **Statistiken**: Interaktive Charts und Diagramme zur Geräteverteilung
- **Label-Editor**: Direktes Bearbeiten von typ_-Labels
- **Bereichs-Editor**: Zuordnung von Räumen und Bereichen über Dropdowns
- **Online/Offline Status**: Live-Status aller Geräte

## Technologie-Stack

- React 19 mit TypeScript
- Tailwind CSS 4
- HeroUI Components
- Recharts für Statistiken
- Vite als Build-Tool
- React Router für Navigation

## Setup

```bash
# Dependencies installieren
npm install

# Entwicklungsserver starten
npm run dev
```

Die Anwendung läuft auf http://localhost:5174

## Home Assistant Verbindung

1. Home Assistant URL eingeben (z.B. https://your-ha-instance.com)
2. Long-Lived Access Token erstellen:
   - Home Assistant → Profil → Sicherheit → Long-Lived Access Tokens
   - Neuen Token erstellen und kopieren
3. Token einfügen und "Verbinden" klicken

## Verwendung

### Geräteübersicht
- Filtern nach Status, Typ, Bereich und Raum
- Suche nach Name, Entity ID oder Raum
- Klick auf Device-Name zum Umbenennen
- Klick auf Entity ID zum Kopieren

### Philips Hue Tab
- Label-Dropdown zum Ändern von typ_-Labels
- Bereich/Raum-Dropdowns für Zuordnung
- Filterung nach Geräten ohne Typ-Label

### Statistiken
- Geräteverteilung nach Integration
- Online/Offline Verhältnis
- Geräte pro Typ, Bereich und Raum
- Hue-spezifische Statistiken

## Docker
```bash
services:

  ha-devices-overview:
    image: ghcr.io/uwe72/homeassistant-devices-overview:latest
    container_name: ha-devices-overview
    ports:
      - "5174:80"
    restart: unless-stopped
```
```bash
pull ghcr.io/uwe72/homeassistant-devices-overview:latest
docker compose up -d ha-devices-overview
```
