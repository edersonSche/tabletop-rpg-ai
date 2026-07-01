# AGENTS.md

Two-package monorepo: `backend/` (NestJS 11, Socket.IO 4.8), `frontend/` (React 19, Vite 6, Tailwind 3.4). No root `package.json` — each package is independent. **No tests, no lint, no formatter, no CI.**  

**Game state is in-memory** — restarting wipes active rooms (but not saved campaigns). **Campaign persistence** writes to `data/campaigns.json` on every action/roll/start/disconnect/create_character/leave — `saveFromMemory()` skips if `!gameStarted`, so pre-start creates/leaves do not persist. Saved campaigns survive restarts and can be resumed via `lobby:resume`.

**`.gitignore`**: root gitignores `docs` and `backend/data` (campaigns.json lives there); each package gitignores `dist/`, `node_modules/`, `.env` independently. `npm run build` is the only validation gate (frontend: `tsc && vite build`).

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

**Auth is required.** Client sends `auth:login { userId }` → `{ success: true }`. Any `userId` string works — no password/token. CORS origin: `*`. `AuthWsGuard` emits `game:error` with `"Authentication required"` when unauthenticated; frontend catches this and auto-logs out.

Frontend connects to `window.location.origin` via Socket.IO (`transports: ['websocket', 'polling']`). Vite proxies `/socket.io` to `http://localhost:3000` (override via `VITE_SOCKET_HOST`). On reconnect, `SocketContext` re-emits `auth:login` + `game:get_state`. 10-second disconnect timer before clearing page state.

## Page state machine

`App.tsx` → `SocketContext` owns `useReducer` (`routing/pageRouter.ts`) over 5 pages:
```
login → lobby → character_creation → waiting_room → game_room
```
Actions: `LOGGED_IN`, `LOGGED_OUT`, `CREATED_ROOM`, `JOIN_NEEDS_CHARACTER`, `CHARACTER_CREATED`, `CHARACTER_CREATED_AND_STARTED`, `JOINED_ROOM`, `CAMPAIGN_STARTED`, `RESUMED_CAMPAIGN`, `LEFT_ROOM`, `DISBANDED`.

**Creator** = first player to create a character in the room. Only the creator's `room:leave` disbands the room.

## Architecture

**Backend** — all under `backend/src/`:
- `auth/` — `AuthGateway` (auth:login, disconnect), `AuthService` (userId↔socketId + playerId↔socketId), `AuthWsGuard`
- `game/` — `GameGateway` (action/roll/start/typing/get_state/room:join), `GameService` (turn orchestration, AI target validation, `buildSceneContext()`), `GameState` (in-memory Map), `TurnManager` (lock-per-room)
- `room/` — `RoomGateway` (lobby:create/join/list/list_saved/resume/delete_saved/create_character, room:leave), `RoomService` (in-memory room registry, IDs = first 8 UUID chars)
- `campaign/` — `CampaignStore` (persist/restore to `data/campaigns.json`, 1s debounced write)
- `dto/` — `ai-response.dto.ts`, `game-action.dto.ts`
- `ai/` — Provider pattern: `AiService` → `OpencodeProvider` (raw HTTP). Empty `AI_API_KEY` → fallback narration. `onRoomReady()` lifecycle called on char creation and campaign resume

**Frontend** — under `frontend/src/`:
- `hooks/SocketContext.tsx` — Socket.IO context provider; owns all server event subscriptions, page dispatches, messages, gameState, turnUpdate, isAiProcessing, typingPlayers
- `hooks/useSocket.ts` — re-exports `useSocketContext()`
- `hooks/useGameTurn.ts` — derives `isMyTurn`, `isRollRequest`, `canAct`, etc. from `gameState` + `turnUpdate`
- `types/game.types.ts` — TS interfaces mirroring backend DTOs
- `pages/` — `Login`, `Lobby`, `CharacterCreation`, `WaitingRoom`, `GameRoom`
- `components/` — `Chat/` (MessageList, MessageInput, DiceRollButton), `GameStatus/` (LocationBadge, TurnIndicator, PlayerList, PlayerCard, CharacterSheet, TypingIndicator), `Layout/` (Header, Toast), `Lobby/` (CreateRoom, RoomList, SavedCampaigns)

## AI integration

| Env var | Default | Notes |
|---------|---------|-------|
| `AI_API_KEY` | `(empty)` | Empty → static fallback, no LLM call |
| `AI_MODEL` | `(empty)` | Passes through; no default override |
| `AI_BASE_URL` | `http://localhost:4096` | Opencode base URL |

Repo `.env` defaults: `AI_PROVIDER=opencode`, `AI_API_KEY=none`, `AI_BASE_URL=http://localhost:4096`. Config loaded in `app.module.ts:27-30` via `ConfigModule.forRoot()`.

Opencode provider uses inline JSON prompt + regex extraction. Invalid `call_player`/`call_roll` targets get coerced to `group_action` by `GameService.validateAiResponseTarget()`.

## Key gotchas

- **UI is pt-BR** (`<html lang="pt-BR">`); AI narration supports `english | portuguese | spanish`; all source code is English.
- **Always-dark design** — custom Tailwind colors (`parchment`, `dungeon`, `gold`, `blood`, `magic`), pixel/mono font utilities (`text-pixel`, `text-mono`). No `dark:` variants.
- **Backend** uses CommonJS (`"module": "commonjs"` in tsconfig + `experimentalDecorators`). **Frontend** uses `"type": "module"`.
- **Roll fallback** — `handleRoll()` defaults skill to `'destreza'` and DC to 10. Roll computed and emitted as `game:player_action` *before* AI processing. Frontend `sendRoll()` reads `turnUpdate.skill`/`dc` if `turnUpdate.type === 'call_roll'`.
- **Actions** are optimistically added for the sender (`characterName: 'You'`) and broadcast to others via `game:player_action`. **Rolls** add a placeholder `"Rolando dados..."` locally then broadcast the final result to all.
- **Hardcoded campaign setting** — `CAMPAIGN_SETTING` const in `game.service.ts:7`, used in 6+ places.
- **Player model**: `id`, `userId`, `name`, `active` bool, 6 attributes (all at 10). No HP/stats.
- **History stores only narration text** (no JSON overhead) — saves tokens vs. storing full `AIResponse`.
- **Scene context** (`buildSceneContext()`) built from complete sentences + location + next-action. Stored as `room.scene`, sent to AI every turn.
- **Cold restore** (`lobby:resume` when room not in memory) forces `gameStarted = false` — creator lands in waiting room and must click START. Warm restore (room in memory) preserves actual `gameStarted`.
