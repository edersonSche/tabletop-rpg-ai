# Tabletop RPG AI

[![NestJS](https://img.shields.io/badge/NestJS-11-ea2845?logo=nestjs)](https://nestjs.com/)
[![React](https://img.shields.io/badge/React-19-61dafb?logo=react)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6-646cff?logo=vite)](https://vite.dev/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-4.8-010101?logo=socket.io)](https://socket.io/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-06b6d4?logo=tailwindcss)](https://tailwindcss.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178c6?logo=typescript)](https://www.typescriptlang.org/)

AI-powered tabletop role-playing game platform with a real-time multiplayer experience. Players create or join campaign rooms and play through a medieval fantasy adventure narrated by an AI Game Master — all through a chat-like interface with a retro pixel-art dark theme.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React 19 + Vite 6)             │
│  Lobby → WaitingRoom → GameRoom                             │
│  SocketContext (Socket.IO client)                           │
└───────────────────────┬─────────────────────────────────────┘
                        │  WebSocket (Socket.IO)
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                    Backend (NestJS 11)                      │
│  RoomGateway ─── RoomService                                │
│  GameGateway ─── GameService ─── AiService ─── AI Provider  │
│  GameState (in-memory)                                      │
│  TurnManager (lock-per-room)                                │
└─────────────────────────────────────────────────────────────┘
```

Two-package monorepo with no root `package.json` — each package is independent.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | NestJS 11, Socket.IO 4.8, OpenAI SDK, TypeScript 5.7 |
| **Frontend** | React 19, Vite 6, Tailwind CSS 3.4, Socket.IO Client, pixelarticons, TypeScript 5.7 |
| **Fonts** | Press Start 2P (UI), VT323 + Space Mono (narrative) |

## Getting Started

### Prerequisites

- Node.js 20+
- npm 10+

### Install & Run

Both backend and frontend must run simultaneously.

```sh
# Terminal 1 — Backend
cd backend
npm install
npm run dev        # nest start --watch, port 3000

# Terminal 2 — Frontend
cd frontend
npm install
npm run dev        # vite, port 5173
```

Open **http://localhost:5173** in your browser.

### Build

```sh
cd backend && npm run build        # nest build → dist/
cd frontend && npm run build       # tsc && vite build (typecheck gate)
cd frontend && npm run preview     # vite preview
```

## Environment Variables

### Backend (`backend/.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `AI_PROVIDER` | `openrouter` | `openrouter` or `opencode` |
| `AI_API_KEY` | `(empty)` | API key; empty → fallback narration (no LLM call) |
| `AI_MODEL` | `deepseek/deepseek-chat` | Model identifier for the provider |
| `AI_BASE_URL` | `https://openrouter.ai/api/v1` | Base URL for the AI API |

**Repo default** points to local Opencode (`AI_PROVIDER=opencode`, `AI_API_KEY=none`, `AI_BASE_URL=http://localhost:4096`). For real AI, set `AI_PROVIDER=openrouter` with a valid key.

### Frontend (`frontend/.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_SOCKET_HOST` | `http://localhost:3000` | Overrides the WebSocket proxy target |

## WebSocket Events

### Client → Server

| Event | Handler | Payload |
|-------|---------|---------|
| `lobby:create` | `RoomGateway` | `{ name, playerName, language? }` |
| `lobby:list` | `RoomGateway` | — |
| `lobby:join` | `RoomGateway` | `{ roomId, playerName }` |
| `room:leave` | `RoomGateway` | `{ roomId, playerId }` |
| `room:join` | `GameGateway` | `{ roomId, playerName }` |
| `game:action` | `GameGateway` | `{ roomId, playerId, message }` |
| `game:roll` | `GameGateway` | `{ roomId, playerId }` |
| `game:start` | `GameGateway` | `{ roomId }` |
| `game:typing` | `GameGateway` | `{ roomId, playerId, username }` |
| `game:typing_stop` | `GameGateway` | `{ roomId, playerId }` |
| `game:get_state` | `GameGateway` | `{ roomId }` |

### Server → Client

| Event | Payload |
|-------|---------|
| `player:registered` | `{ playerId }` |
| `game:state` | `GameState` (full room state) |
| `game:narration` | `{ narration, next, state }` |
| `game:turn` | `{ currentTurn, type, target }` |
| `game:message` | `{ type, content, playerName? }` |
| `game:error` | `{ message }` |
| `game:typing` | `{ playerId, username }` |
| `game:typing_stop` | `{ playerId }` |
| `game:processing` | `{ processing: boolean }` |
| `game:disband` | `{ reason }` |

## AI Integration

The backend uses a **provider pattern**:

- **`AiService`** dispatches to the configured `AIProvider` based on `AI_PROVIDER`.
- **`OpenRouterProvider`** (default) — uses the OpenAI SDK with `response_format: { type: "json_object" }` and full conversation context (last 30 entries).
- **`OpencodeProvider`** — raw HTTP fetch to a local Opencode session; manages sessions per room.
- **Fallback** — if `AI_API_KEY` is empty, `AiService.generate()` returns a static narration without calling any provider.

The system prompt supports **English**, **Portuguese (Brazil)**, and **Spanish** narration. The AI responds in strict JSON with `narration`, optional `location`, and `next` (with `type`, `target`, `skill`, `dc`).

Invalid AI targets (`call_player`/`call_roll` pointing to missing players) are coerced to `group_action` by `GameService.validateAiResponseTarget()`.

## Project Structure

```
backend/src/
├── main.ts                  # NestJS entry point (port 3000)
├── app.module.ts            # Root module with AI provider config
├── ai/
│   ├── ai.interface.ts      # AIConfig / AIProvider interface
│   ├── ai.service.ts        # Provider dispatcher + response validation
│   ├── prompts/
│   │   └── system.prompt.ts # Multilingual system prompt builder
│   └── providers/
│       ├── openrouter.provider.ts
│       └── opencode.provider.ts
├── game/
│   ├── game.gateway.ts      # Game WebSocket handlers
│   ├── game.service.ts      # Turn orchestration + AI response processing
│   ├── game.state.ts        # In-memory GameState store
│   └── turn.manager.ts      # Lock-per-room turn gate
├── room/
│   ├── room.gateway.ts      # Lobby WebSocket handlers
│   └── room.service.ts      # In-memory Room registry
└── dto/                     # Data transfer objects

frontend/src/
├── main.tsx                 # React entry point
├── App.tsx                  # Page router (state machine via useReducer)
├── hooks/
│   ├── SocketContext.tsx    # Socket.IO context provider + state
│   ├── useSocket.ts         # Context re-export
│   └── useGameState.ts      # Stub hook (always returns canAct: true)
├── routing/
│   └── pageRouter.ts        # Page state machine (reducer + types)
├── pages/
│   ├── Lobby.tsx            # Create / join campaign
│   ├── WaitingRoom.tsx      # Pre-game lobby
│   └── GameRoom.tsx         # Main game interface
├── components/
│   ├── Chat/                # MessageList, MessageInput, DiceRollButton, TypewriterText
│   ├── GameStatus/          # LocationBadge, TurnIndicator, PlayerList, PlayerCard, TypingIndicator
│   ├── Layout/              # Header
│   └── Lobby/               # CreateRoom, RoomList
├── types/
│   └── game.types.ts        # Shared TypeScript interfaces
├── styles/
│   └── index.css            # Tailwind + custom layers (pixel fonts, colors)
└── index.css                # Entry CSS
```

## Limitations

- **No persistence** — all state is in-memory; restarting the backend wipes everything.
- **No auth** — any client can join any room. CORS origin: `*`.
- **No tests, linter, or formatter** — `npm run build` on the frontend is the only validation gate.
- **No HP or stats** — players have only `id`, `name`, and 6 attributes (all at 10).
- **Hardcoded campaign setting** — `"A medieval fantasy world..."` appears in 3 places and is not configurable.
- **Turn queue** — declared in `TurnManager` but never populated.
- **`useGameState` is a stub** — always returns `canAct: true`; real turn logic is in `GameRoom.tsx`.
