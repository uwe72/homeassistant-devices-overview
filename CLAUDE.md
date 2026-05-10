# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start dev server on http://localhost:5174
npm run build     # TypeScript compile + Vite bundle (output: dist/)
npm run lint      # ESLint with strict config (max-warnings: 0)
npm run preview   # Preview production build locally
```

There is no test runner configured.

## Architecture

React 19 + TypeScript SPA that connects to a Home Assistant instance via WebSocket and provides a device management UI.

**Data flow:**
1. User enters HA URL + Long-Lived Access Token in `ConfigPanel`
2. `HAClient` (`src/api/haClient.ts`) establishes a WebSocket connection to `[HA_URL]/api/websocket`
3. After auth, it fetches entity registry, device registry, areas, floors, and entity states
4. `HAContext` (`src/context/HAContext.tsx`) aggregates this data into `EntityData[]` objects and exposes them via the `useHA()` hook
5. Page components consume `useHA()` and render tables/charts

**Key files:**
- `src/api/haClient.ts` — WebSocket client; all HA API commands go through here
- `src/context/HAContext.tsx` — global state, data join logic, label/area update handlers
- `src/types/index.ts` — all TypeScript interfaces (`HAEntity`, `HADevice`, `HAArea`, `HAFloor`, `HAState`, `EntityData`, etc.)
- `src/components/HueTable.tsx` — most complex component; manages Hue-specific label and area/floor assignments
- `src/components/Statistics.tsx` — Recharts-based charts; uses `useMemo` for aggregations

**Routing** (React Router v6):
- `/` → Devices page (all entities)
- `/hue` → Hue devices page
- `/statistics` → Statistics/charts page

## Label System

Devices use `typ_` prefixed labels for categorization (e.g. `typ_licht`, `typ_sensor`, `typ_schalter`, `typ_bewegungsmelder`, `typ_ignore`). The Hue table drives label assignment and tracks "configuration completeness" (type + area + floor all set).

## Tech Stack

- **UI:** React 19, Tailwind CSS 4, HeroUI 3
- **Charts:** Recharts 3
- **Build:** Vite 5, `@tailwindcss/vite` plugin
- **Linting:** ESLint 8 + typescript-eslint (zero warnings policy)
- **Persistence:** Credentials stored in `localStorage`; auto-reconnects on reload

## Language

UI text and documentation are in German.
