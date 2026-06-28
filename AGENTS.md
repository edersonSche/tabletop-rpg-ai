# AGENTS.md

Two-package monorepo: `backend/` (NestJS 11, Socket.IO 4.8), `frontend/` (React 19, Vite 6, Tailwind 3.4). No root `package.json` — each package is independent. **No tests, no lint, no formatter, no CI.** Game state is in-memory — restarting **wipes active rooms** (but not saved campaigns). **Campaign persistence** writes to `data/campaigns.json` on every action/roll/start/disconnect/create_character — saved campaigns survive restarts and can be resumed via `lobby:resume`. Frontend only validation gate: `npm run build` (runs `tsc && vite build`).

## Commands

```sh
cd backend && npm run dev        # nest start --watch (port 3000)
cd backend && npm run build      # nest build -> dist/
cd frontend && npm run dev       # vite (port 5173)
cd frontend && npm run build     # tsc && vite build (only validation)
cd frontend && npm run preview   # vite preview
```

No workspace root scripts — always `cd` into the package. Both must run simultaneously.

## Auth & connection

**Auth is required.** Client connects → `auth:login { userId }` → `{ success: true }`. Any `userId` string works — no password/token. CORS origin: `*`. Unhandled `game:error` with `"Authentication required"` auto-logs out the client.

Frontend connects to `window.location.origin` via Socket.IO (`transports: ['websocket', 'polling']`). Vite proxies `/socket.io` to `http://localhost:3000` (override via `VITE_SOCKET_HOST`). On reconnect, `SocketContext` re-emits `auth:login` + `game:get_state`. 10-second disconnect timer before clearing state.

## Page state machine

`App.tsx` → `SocketContext` owns `useReducer` (`routing/pageRouter.ts`) over 5 pages:
```
login → lobby → character_creation → waiting_room → game_room
```
Actions: `LOGGED_IN`, `LOGGED_OUT`, `CREATED_ROOM`, `JOIN_NEEDS_CHARACTER`, `CHARACTER_CREATED`, `CHARACTER_CREATED_AND_STARTED`, `JOINED_ROOM`, `CAMPAIGN_STARTED`, `RESUMED_CAMPAIGN`, `LEFT_ROOM`, `DISBANDED`.

**Creator** = first player to create a character in the room (sets `creatorId` in both `RoomService` and `GameState`). Only the creator's `room:leave` disbands the room.

## Architecture

**Backend** (`backend/src/`):
- `auth/auth.gateway.ts` — `auth:login`, `auth:login` duplicate detection
- `auth/auth.service.ts` — `userId ↔ socketId` + `playerId ↔ socketId`
- `auth/auth.guard.ts` — `AuthWsGuard` on both `RoomGateway` and `GameGateway`
- `game/game.gateway.ts` — `game:action`, `game:roll`, `game:start`, `game:typing`, `game:typing_stop`, `game:get_state`, `room:join`
- `game/game.service.ts` — Turn orchestration; AI target validation; `buildSceneContext()` for scene truncation
- `game/game.state.ts` — `Map<string, GameStateData>` in-memory; player-by-userId tracking; `getPlayerModifier()` maps pt-BR skill names to EN attributes
- `game/turn.manager.ts` — Lock-per-room gate; `processTurn()` sets `currentTurn`, `turnType`, `turnTarget` from AI response
- `room/room.gateway.ts` — `lobby:create`, `lobby:create_character`, `lobby:list`, `lobby:join`, `lobby:list_saved`, `lobby:resume`, `lobby:delete_saved`, `room:leave`
- `room/room.service.ts` — In-memory room registry, IDs = first 8 chars of UUID v4
- `campaign/campaign.store.ts` — Persist/restore campaigns to `data/campaigns.json`; debounced write with 1s delay
- `campaign/campaign.types.ts` — `SavedCampaign`, `SavedCampaignInfo` interfaces
- `dto/` — `ai-response.dto.ts`, `game-action.dto.ts`
- `ai/` — Provider pattern: `AiService` → `OpencodeProvider` (raw HTTP). Empty `AI_API_KEY` → fallback narration, no LLM call. `onRoomReady()` lifecycle called from `RoomGateway` on char creation and campaign resume

**Frontend** (`frontend/src/`):
- `hooks/SocketContext.tsx` — Socket.IO context provider; subscribes all `game:*` events; owns page dispatches + `messages`, `gameState`, `turnUpdate`, `isAiProcessing`, `typingPlayers` states
- `hooks/useGameTurn.ts` — Derives `isMyTurn`, `isRollRequest`, `isInputDisabled`, `canAct` from `gameState` + `turnUpdate`
- `types/game.types.ts` — TypeScript interfaces mirroring backend DTOs
- `pages/` — `Login.tsx`, `Lobby.tsx`, `CharacterCreation.tsx`, `WaitingRoom.tsx`, `GameRoom.tsx`

## AI integration

| Env var | Default | Notes |
|---------|---------|-------|
| `AI_API_KEY` | `(empty)` | Empty → static fallback, no LLM call |
| `AI_MODEL` | `(empty)` | Empty string passes through; no default override |
| `AI_BASE_URL` | `http://localhost:4096` | Opencode base URL |

Repo `.env` defaults: `AI_PROVIDER=opencode`, `AI_API_KEY=none`, `AI_BASE_URL=http://localhost:4096`. `.env` files are in `.gitignore` for both packages. Config loaded in `app.module.ts:27-30`.

Opencode uses inline JSON prompt + regex extraction. Invalid `call_player`/`call_roll` targets get coerced to `group_action` by `GameService.validateAiResponseTarget()` (not in providers).

## Key gotchas

- **UI is pt-BR** (`<html lang="pt-BR">`); AI narration supports `english | portuguese | spanish`; all source code is English.
- **Always-dark design** — custom Tailwind colors (`parchment`, `dungeon`, `gold`, `blood`, `magic`), pixel/mono font utilities (`text-pixel`, `text-mono`). No `dark:` variants.
- **Backend** uses CommonJS modules (`"module": "commonjs"` in tsconfig). **Frontend** uses `"type": "module"`.
- **Roll is hardcoded** — `handleRoll()` defaults skill to `'destreza'` and DC to 10. Roll computed in `game.gateway.ts` and emits `game:player_action` *before* AI processing. No optimistic roll update in `SocketContext`. Frontend `sendRoll()` reads `turnUpdate.skill`/`dc` if `turnUpdate.type === 'call_roll'`.
- **Actions** are optimistically added for the sender (`characterName: 'You'`) and broadcast to others via `game:player_action`. **Rolls** broadcast to all with no local optimism.
- **Hardcoded campaign setting** — `CAMPAIGN_SETTING` const in `game.service.ts:7`, referenced in `game.service.ts:40,98,157` and `room.gateway.ts:77,305`.
- **Player model**: `id`, `userId`, `name`, `active` bool, 6 attributes (all at 10). No HP/stats.
- **History stores only narration text** (no JSON overhead) — saves tokens vs. storing full `AIResponse`.
- **Scene context** (`buildSceneContext()`) built from complete sentences + location + next-action. Stored as `room.scene`, sent to AI every turn.
- **Backend uses experimental decorators** (`emitDecoratorMetadata`, `experimentalDecorators` in tsconfig). Frontend uses Vite's esbuild transform (no decorators).
- **Both packages** independently list dev-only `typescript` — do not assume it's installed at root.
