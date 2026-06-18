# AGENTS.md

## Project overview

Two-package monorepo: `backend/` (NestJS 11, Socket.IO 4.8), `frontend/` (React 19, Vite 6, Tailwind 3.4). No root `package.json` — each package is independent. No tests, no lint, no formatter, no CI. All state is in-memory — restarting the backend wipes everything.

## Commands

```sh
cd backend && npm run dev        # nest start --watch (port 3000)
cd backend && npm run build      # nest build -> dist/
cd frontend && npm run dev       # vite (port 5173)
cd frontend && npm run build     # tsc && vite build (only validation gate)
cd frontend && npm run preview   # vite preview
```

No workspace root scripts — always `cd` into the package. Both must run simultaneously.

Frontend has `"type": "module"` in `package.json`.

## Entrypoints

- Backend: `backend/src/main.ts` (NestJS, port 3000)
- Frontend: `frontend/src/main.tsx` (React, Vite, port 5173)

Vite proxies `/socket.io` to `localhost:3000` (override via `VITE_SOCKET_HOST`).

## Page flow

`App.tsx` uses a `useReducer`-based state machine (`routing/pageRouter.ts`) over 5 pages:

```
login → lobby → character_creation → waiting_room → game_room
```

Actions: `LOGGED_IN`, `CREATED_ROOM`, `JOIN_NEEDS_CHARACTER`, `CHARACTER_CREATED`, `CHARACTER_CREATED_AND_STARTED`, `JOINED_ROOM`, `CAMPAIGN_STARTED`, `LEFT_ROOM`, `DISBANDED`.

Creator = first player to create a character in the room (sets `creatorId`). Only the creator can start the campaign (`game:start`).

## WebSocket auth

**Auth is required.** `@UseGuards(AuthWsGuard)` on both `RoomGateway` and `GameGateway`. Flow:

1. Client connects → sends `auth:login { userId }` → receives `{ success: true }`
2. All subsequent handlers check `AuthService.isAuthenticated(client.id)`

Any `userId` string works — there is no real authentication. CORS origin: `*`.

Unhandled `game:error` with message `"Authentication required"` auto-logs out the client.

## Architecture

**Backend** (`backend/src/`):
- `auth/auth.gateway.ts` — `auth:login` handler, disconnect cleanup
- `auth/auth.service.ts` — Tracks `userId ↔ socketId` + `playerId ↔ socketId` mappings
- `auth/auth.guard.ts` — `AuthWsGuard` applied to both gateways
- `game/game.gateway.ts` — WebSocket handlers for `game:action`, `game:roll`, `game:start`, `game:typing`, `game:typing_stop`, `game:get_state`, `room:join`
- `game/game.service.ts` — Orchestrates AI turns; validates AI response targets
- `game/game.state.ts` — In-memory room state via `Map<string, GameStateData>`; player-by-userId tracking
- `game/turn.manager.ts` — Lock-per-room turn gate
- `room/room.gateway.ts` — `lobby:create`, `lobby:create_character`, `lobby:list`, `lobby:join`, `room:leave`
- `room/room.service.ts` — In-memory room registry (8-char IDs)
- `ai/` — Provider pattern: `AiService` dispatches to `OpenRouterProvider` (default) or `OpencodeProvider`

**Frontend** (`frontend/src/`):
- `hooks/SocketContext.tsx` — Socket.IO context provider; subscribes to all `game:*` events; owns page state
- `hooks/useSocket.ts` — Re-exports `useSocketContext`
- `hooks/useGameTurn.ts` — Derives `isMyTurn`, `isRollRequest`, `isInputDisabled` from state
- `types/game.types.ts` — TS interfaces (mirrors backend DTOs)
- `pages/` — `Login.tsx`, `Lobby.tsx`, `CharacterCreation.tsx`, `WaitingRoom.tsx`, `GameRoom.tsx`

## WebSocket events

**Client→Server** — handlers in `auth/auth.gateway.ts` (`auth:login`), `room/room.gateway.ts` (`lobby:create`, `lobby:create_character`, `lobby:list`, `lobby:join`, `room:leave`), and `game/game.gateway.ts` (`game:action`, `game:roll`, `game:start`, `game:typing`, `game:typing_stop`, `game:get_state`, `room:join`).

**Server→Client** events subscribed in `hooks/SocketContext.tsx`:
- `player:registered` — on connect/join
- `game:state` — full state + history (on reconnect or join)
- `game:narration` — AI narration + next action + state
- `game:turn` — turn info (`currentTurn`, `type`, `target`)
- `game:player_action` — broadcasts player actions/rolls to others (`type: 'action' | 'roll'`, `playerId`, `characterName`, `message`)
- `game:message` — system messages (join/leave)
- `game:error`, `game:typing`, `game:typing_stop`, `game:processing`, `game:disband`

## AI integration

| Env var | Default | Notes |
|---------|---------|-------|
| `AI_API_KEY` | `(empty)` | Empty → fallback narration, no LLM call |
| `AI_PROVIDER` | `openrouter` | `openrouter` or `opencode` |
| `AI_MODEL` | `deepseek/deepseek-chat` | |
| `AI_BASE_URL` | `https://openrouter.ai/api/v1` | |

Repo `.env` defaults point to local Opencode (`AI_PROVIDER=opencode`, `AI_API_KEY=none`, `AI_BASE_URL=http://localhost:4096`). For real AI, use `AI_PROVIDER=openrouter` with a valid key. Config loaded in `app.module.ts:27-30`. Model empty string in `.env` → empty string passed through; `AiService.validateResponse` does not set a default.

AI prompt uses `response_format: { type: "json_object" }` — model must support JSON mode. AI target validation (`validateAiResponseTarget`) is in `GameService`, not in providers. Invalid `call_player`/`call_roll` targets get coerced to `group_action`.

## Key gotchas

- **`npm run build` in frontend is the only validation gate** — `tsc && vite build`. No tests, lint, or formatter.
- **No database** — restarting NestJS wipes all rooms, players, and history.
- **Auth is trivial** — any `userId` string works; there is no password or token.
- **UI is pt-BR** (`<html lang="pt-BR">`); AI narration supports `english`, `portuguese`, `spanish` (configurable via `language`); code is English.
- **Always-dark design** — custom Tailwind colors (`parchment`, `dungeon`, `gold`, `blood`, `magic`), pixel/mono font utilities (`text-pixel`, `text-mono`). No `dark:` variants.
- **Player model** has `id`, `userId`, `name`, `active` bool, and 6 attributes (all at 10). No HP/stats.
- **`NarrativeLanguage`** = `'english' | 'portuguese' | 'spanish'`.
- **Three state slices** track overlapping data in SocketContext: `narrations`, `messages`, `turnUpdate`.
- **Scene context** (in `game.service.ts` `buildSceneContext()`) replaces raw truncation — built from complete sentences + location + next-action. Stored as `room.scene` and sent to AI every turn.
- **History stores only narration text** (no JSON overhead) — saves tokens vs. storing full `AIResponse`.
- **Roll is hardcoded** — `handleRoll()` defaults skill to `'destreza'` and DC to 10 regardless of AI response. The roll computation happens in `game.gateway.ts` and emits `game:player_action` before AI processing.
- **Hardcoded campaign setting** — `'A medieval fantasy world...'` in 3 places in `game.service.ts:36,94,142`; not configurable.
- **`handleAction` always calls `processTurn()`** — including `narration_only` (which nulls `currentTurn`).
- **Actions** are optimistically added for the sender (`characterName: 'You'`) and broadcast to others via `game:player_action`. **Rolls** have no optimistic update — broadcast to all via `game:player_action`.
- **`.env` files are in `.gitignore`** for both packages.
- **Socket reconnection** — on reconnect, SocketContext re-emits `auth:login` and `game:get_state` automatically. 10-second disconnect timer before clearing state.
