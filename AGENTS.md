# AGENTS.md

## Project overview

Two-package monorepo: `backend/` (NestJS 11, Socket.IO), `frontend/` (React 19, Vite 6, Tailwind 3.4). No root `package.json` — each package is independent. No tests, no lint, no formatter, no CI. All state is in-memory — restarting the backend wipes everything.

## Entrypoints

- **Backend**: `backend/src/main.ts` — NestJS on port 3000.
- **Frontend**: `frontend/src/main.tsx` — React app in Vite on port 5173.

Both must run simultaneously. Vite proxies `/socket.io` to `localhost:3000` (override via `VITE_SOCKET_HOST`). Lightweight state machine router in `routing/pageRouter.ts` — App.tsx uses `switch(page)` to render Lobby/WaitingRoom/GameRoom.

## Commands

```sh
cd backend && npm run dev        # nest start --watch (port 3000)
cd backend && npm run build      # nest build -> dist/
cd backend && npm run start:prod # node dist/main

cd frontend && npm run dev       # vite (port 5173)
cd frontend && npm run build     # tsc && vite build (only typecheck gate)
cd frontend && npm run preview   # vite preview
```

No workspace root scripts — always `cd` into the package.

## Architecture

**Backend modules** (`backend/src/`):
- `game/game.gateway.ts` — WebSocket events: `game:action`, `game:roll`, `game:start`, `game:typing`, `game:typing_stop`, `game:get_state`, `room:join`
- `game/game.state.ts` — In-memory room state via `Map<string, GameStateData>`
- `game/game.service.ts` — Orchestrates AI turns; validates AI responses via `validateAiResponseTarget()`
- `game/turn.manager.ts` — Lock-per-room turn gate; queues declared but never populated
- `room/room.gateway.ts` — `lobby:create`, `lobby:list`, `lobby:join`, `room:leave`
- `room/room.service.ts` — In-memory room registry (8-char IDs)
- `ai/` — Provider pattern: `AiService` dispatches to `OpenRouterProvider` (default) or `OpencodeProvider`

**Frontend modules** (`frontend/src/`):
- `hooks/SocketContext.tsx` — Socket.IO context provider; event subscriptions for all `game:*` events
- `hooks/useSocket.ts` — Thin re-export of `useSocketContext`
- `hooks/useGameState.ts` — Stub; always returns `canAct: true` (real turn logic is in `GameRoom.tsx`)
- `types/game.types.ts` — Shared TS interfaces (mirrors backend DTOs)
- `routing/pageRouter.ts` — Page type, actions, and reducer for state machine router
- `pages/` — `Lobby.tsx`, `WaitingRoom.tsx`, `GameRoom.tsx`

## WebSocket events

Client→Server handlers are in `room/room.gateway.ts` (`lobby:create`, `lobby:list`, `lobby:join`, `room:leave`) and `game/game.gateway.ts` (`game:action`, `game:roll`, `game:start`, `game:typing`, `game:typing_stop`, `game:get_state`, `room:join`). Server→Client events are subscribed in `hooks/SocketContext.tsx`.

## AI integration

Config via env vars (defaults in `app.module.ts:27-30`):

| Var | Default | Notes |
|-----|---------|-------|
| `AI_API_KEY` | `''` | Empty → fallback narration, no LLM call |
| `AI_PROVIDER` | `'openrouter'` | `'openrouter'` or `'opencode'` |
| `AI_MODEL` | `'deepseek/deepseek-chat'` | |
| `AI_BASE_URL` | `'https://openrouter.ai/api/v1'` | |

**Repo `.env` defaults** point to local Opencode (`AI_PROVIDER=opencode`, `AI_API_KEY=none`, `AI_BASE_URL=http://localhost:4096`). For real AI, set `AI_PROVIDER=openrouter` with a valid key.

The AI prompt expects `response_format: { type: "json_object" }` — the model must support it. The `AIResponse` JSON includes `narration`, optional `location`, and `next` (with `type`, optional `target`/`skill`/`dc`).

AI target validation is in `GameService.validateAiResponseTarget()`, not in `AiService`. Invalid `call_player`/`call_roll` targets get coerced to `group_action`.

## Key gotchas

- **`npm run build` in frontend is the only typecheck gate** (tsc + vite build). No test, lint, or formatter scripts exist.
- **No database** — restarting NestJS wipes everything.
- **No auth** — any client can join any room. CORS origin: `*`.
- **UI is pt-BR** (`<html lang="pt-BR">`), AI narration is English (configurable), code is English.
- **Always-dark design**: custom color tokens (`parchment`, `dungeon`, `gold`, `blood`, `magic`) and `text-pixel`/`text-mono` font utilities defined in `@layer components`/`utilities` in `index.css`. No `dark:` variants or class toggle.
- **Player model has no HP/stats** — only `id`, `name`, 6 attributes all at 10.
- **`joinGameRoom`** (emits `room:join`) exists in `SocketContext.tsx` but is never called from UI — `Lobby` uses `joinRoom` (emits `lobby:join`) which also adds the player on the server.
- **Three state slices** track overlapping data: `narrations`, `messages`, `turnUpdate`.
- **`handleAction` always calls `processTurn()`** — including `narration_only` (which nulls `currentTurn`).
- **Scene context** (replaces raw truncation): `game.service.ts` builds a structured scene from complete sentences + location + next-action via `buildSceneContext()`. Stored as `room.scene` and sent to AI on every turn.
- **History stores only narration text** (no JSON overhead) — saves ~40% tokens vs. storing full `AIResponse`.
- **Hardcoded roll**: `handleRoll()` defaults skill to `'destreza'` and DC to 10 regardless of AI response values.
- **Hardcoded campaign setting**: `'A medieval fantasy world...'` in 3 places in `game.service.ts:36,94,142` — not configurable.
- **`.env` files are in `.gitignore`** for both packages.
