# AGENTS.md

## Project overview

Two-package monorepo: `backend/` (NestJS 11, Socket.IO), `frontend/` (React 19, Vite 6, Tailwind 3.4). No tests, no lint, no formatter, no CI. All state is in-memory — restarting the backend wipes everything.

## Entrypoints

- **Backend**: `backend/src/main.ts` — NestJS on port 3000. Run via `nest start` (dev: `nest start --watch`).
- **Frontend**: `frontend/src/main.tsx` — React app in Vite on port 5173.

Both must run simultaneously. Vite proxies `/socket.io` to `localhost:3000`.

## Commands

```sh
# Backend
cd backend && npm run dev        # nest start --watch (port 3000)
cd backend && npm run build      # nest build -> dist/
cd backend && npm run start:prod # node dist/main

# Frontend
cd frontend && npm run dev       # vite (port 5173)
cd frontend && npm run build     # tsc && vite build
cd frontend && npm run preview   # vite preview
```

No workspace root scripts — always `cd` into the package.

## Architecture

```
Browser -> Vite (port 5173, dev proxy /socket.io) -> NestJS (port 3000)
             WebSocket (Socket.IO)                     |
                                                   OpenAI SDK -> OpenRouter API
```

**Backend modules** (all in `backend/src/`):
- `game/game.gateway.ts` — WebSocket events: `game:action`, `game:roll`, `game:start`, `game:typing`, `game:get_state`, `room:join`
- `game/game.state.ts` — In-memory room state (Maps), creates players with 6 attributes at 10
- `game/game.service.ts` — Orchestrates AI turns; validates AI responses via `validateAiResponseTarget()` (coerces `call_player`/`call_roll` with missing/invalid target to `group_action`)
- `game/turn.manager.ts` — Lock-per-room turn gate; 4 turn types: `group_action`, `call_player`, `call_roll`, `narration_only`
- `room/room.gateway.ts` — `lobby:create`, `lobby:list`, `lobby:join`
- `room/room.service.ts` — In-memory room registry (8-char UUID IDs)
- `ai/` — Provider pattern: `AiService` -> `OpenRouterProvider` (OpenAI SDK), system prompt in `prompts/system.prompt.ts`

**Frontend modules** (all in `frontend/src/`):
- `hooks/SocketContext.tsx` — Socket.IO context provider; event listeners for `game:state`, `game:narration`, `game:turn`, etc.
- `hooks/useSocket.ts` — Thin re-export of `useSocketContext`
- `hooks/useGameState.ts` — Lightweight helper (currently always returns `canAct: true`)
- `types/game.types.ts` — Shared TS interfaces (Player, GameState, AIResponse, etc.)

## AI integration

Config via env vars (defaults in `app.module.ts`):
- `AI_API_KEY` — (required for real AI, fallback if empty)
- `AI_PROVIDER` — `openrouter` (default) or `opencode`
- `AI_MODEL` — `deepseek/deepseek-chat` (default)
- `AI_BASE_URL` — `https://openrouter.ai/api/v1` (default)

Without `AI_API_KEY`, the backend returns a fallback narration and never calls an LLM. The AI prompt expects JSON responses; model must support `response_format: { type: "json_object" }`.

## Key gotchas

- **No tests, no lint, no typecheck scripts** configured. The frontend build runs `tsc && vite build`, so `npm run build` is the only typecheck gate.
- **No database** — restarting NestJS loses all rooms, players, and game state.
- **No auth** — any client can join any room.
- **Language mix**: UI is in pt-BR (`index.html`), AI narration is in English, technical code in English.
- **Dark mode** uses Tailwind `class` strategy — toggle the `dark` class on `<html>`.
- **Custom Tailwind colors**: `parchment`, `dungeon`, `gold`, `blood`, `magic`.
- **Custom font classes**: `text-pixel` (Press Start 2P), `text-mono` (VT323 / Space Mono).
- **Player model has no HP/stats** — only `id`, `name`, and `attributes` (strength, dexterity, constitution, intelligence, wisdom, charisma — all defaulting to 10). No `playerStates` record.
- **AI target validation** is in `GameService.validateAiResponseTarget()`, not in `AiService`. If the AI returns `call_player`/`call_roll` with a missing or non-existent player ID, it's coerced to `group_action` with a warning.
- **`handleAction` always calls `processTurn()`** — including `narration_only` (which nulls out `currentTurn`). No redundant lock/unlock.
