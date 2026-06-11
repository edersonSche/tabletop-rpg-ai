# AGENTS.md

## Project overview

Two-package monorepo: `backend/` (NestJS 11, Socket.IO), `frontend/` (React 19, Vite 6, Tailwind 3.4). No tests, no lint, no formatter, no CI. All state is in-memory — restarting the backend wipes everything.

## Entrypoints

- **Backend**: `backend/src/main.ts` — NestJS on port 3000.
- **Frontend**: `frontend/src/main.tsx` — React app in Vite on port 5173.

Both must run simultaneously. Vite proxies `/socket.io` to `localhost:3000` (override via `VITE_SOCKET_HOST`).

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

```
Browser -> Vite (port 5173, proxy /socket.io) -> NestJS (port 3000)
             WebSocket (Socket.IO)                |
                                              OpenAI SDK -> OpenRouter API
```

**Backend modules** (`backend/src/`):
- `game/game.gateway.ts` — WebSocket events: `game:action`, `game:roll`, `game:start`, `game:typing`, `game:get_state`, `room:join`
- `game/game.state.ts` — In-memory room state via `Map<string, GameStateData>`. State shape includes `currentLocation`, `currentTurn`, `turnType`, `turnTarget`, `scene`, `history`
- `game/game.service.ts` — Orchestrates AI turns; validates AI responses via `validateAiResponseTarget()` (coerces `call_player`/`call_roll` with bad target to `group_action`)
- `game/turn.manager.ts` — Lock-per-room turn gate
- `room/room.gateway.ts` — `lobby:create`, `lobby:list`, `lobby:join`
- `room/room.service.ts` — In-memory room registry (8-char IDs)
- `ai/` — Provider pattern: `AiService` dispatches to `OpenRouterProvider` (default) or `OpencodeProvider`

**Frontend modules** (`frontend/src/`):
- `hooks/SocketContext.tsx` — Socket.IO context provider; event subscriptions for all `game:*` events
- `hooks/useSocket.ts` — Thin re-export of `useSocketContext`
- `hooks/useGameState.ts` — Stub; always returns `canAct: true` (real turn logic is in `GameRoom.tsx`)
- `types/game.types.ts` — Shared TS interfaces (mirrors backend DTOs)

## AI integration

Config via env vars (defaults in `app.module.ts:27-30`):
- `AI_API_KEY` — required for real AI; empty = fallback narration, no LLM call
- `AI_PROVIDER` — `openrouter` (default) or `opencode`
- `AI_MODEL` — `deepseek/deepseek-chat` (default)
- `AI_BASE_URL` — `https://openrouter.ai/api/v1` (default)

The AI prompt expects `response_format: { type: "json_object" }` — the model must support it. The `AIResponse` JSON includes `narration`, optional `location`, and `next` (with `type`, optional `target`/`skill`/`dc`).

## Key gotchas

- **No tests, lint, or typecheck scripts**. `npm run build` in frontend is the only typecheck gate (tsc + vite build).
- **No database** — restarting NestJS loses everything.
- **No auth** — any client can join any room.
- **Language mix**: UI is pt-BR (`<html lang="pt-BR">`), AI narration is English, code is English.
- **Dark mode** uses Tailwind `class` strategy — toggle `dark` class on `<html>`.
- **Custom Tailwind tokens**: colors `parchment`, `dungeon`, `gold`, `blood`, `magic`; font classes `text-pixel` (Press Start 2P) and `text-mono` (VT323 / Space Mono).
- **Player model has no HP/stats** — only `id`, `name`, 6 attributes at 10 (strength, dexterity, constitution, intelligence, wisdom, charisma).
- **Queues in `TurnManager`** are declared but never populated — no queue processing exists.
- **Frontend `joinGameRoom`** (emits `room:join`) is never called from UI — `Lobby` uses `joinRoom` (emits `lobby:join`) which also adds the player on the server.
- **Three separate state slices** track overlapping data on the frontend: `narrations`, `messages`, `turnUpdate`.
- **AI target validation** is in `GameService.validateAiResponseTarget()`, not in `AiService`. Invalid/call_player`call_roll` targets get coerced to `group_action`.
- **`handleAction` always calls `processTurn()`** — including `narration_only` (which nulls `currentTurn`).
- **Scene truncation**: only first 200 chars of `response.narration` are stored as `room.scene`.
