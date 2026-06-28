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
│  Login → Lobby → CharacterCreation → WaitingRoom → GameRoom │
│  SocketContext (Socket.IO client)                           │
└───────────────────────┬─────────────────────────────────────┘
                        │  WebSocket (Socket.IO)
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                    Backend (NestJS 11)                      │
│  AuthGateway/AuthGuard ─── AuthService                      │
│  RoomGateway ─────────────── RoomService                    │
│  GameGateway ─── GameService ─── AiService ─── AI Provider  │
│  GameState (in-memory)                                      │
│  CampaignStore (persistence to data/campaigns.json)         │
│  TurnManager (lock-per-room)                                │
└─────────────────────────────────────────────────────────────┘
```

Two-package monorepo with no root `package.json` — each package is independent.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | NestJS 11, Socket.IO 4.8, TypeScript 5.7 |
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
| `AI_PROVIDER` | `opencode` | AI provider identifier |
| `AI_API_KEY` | `(empty)` | API key; empty → fallback narration (no LLM call) |
| `AI_MODEL` | `(empty)` | Model identifier for the provider |
| `AI_BASE_URL` | `http://localhost:4096` | Base URL for the AI API |

**Repo default** points to local Opencode (`AI_PROVIDER=opencode`, `AI_API_KEY=none`, `AI_BASE_URL=http://localhost:4096`).

### Frontend (`frontend/.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_SOCKET_HOST` | `http://localhost:3000` | Overrides the WebSocket proxy target |

## WebSocket Events

### Client → Server

| Event | Handler | Payload |
|-------|---------|---------|
| `auth:login` | `AuthGateway` | `{ userId }` |
| `lobby:create` | `RoomGateway` | `{ name, language? }` |
| `lobby:create_character` | `RoomGateway` | `{ roomId, name, attributes? }` |
| `lobby:list` | `RoomGateway` | — |
| `lobby:join` | `RoomGateway` | `{ roomId }` |
| `lobby:list_saved` | `RoomGateway` | — |
| `lobby:resume` | `RoomGateway` | `{ campaignId }` |
| `lobby:delete_saved` | `RoomGateway` | `{ campaignId }` |
| `room:leave` | `RoomGateway` | `{ roomId, playerId }` |
| `room:join` | `GameGateway` | `{ roomId }` |
| `game:action` | `GameGateway` | `{ roomId, playerId, message }` |
| `game:roll` | `GameGateway` | `{ roomId, playerId, skill?, dc? }` |
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
| `game:player_action` | `{ type, playerId, characterName, message }` |
| `game:turn` | `{ currentTurn, type, target }` |
| `game:message` | `{ type, content, characterName? }` |
| `game:error` | `{ message }` |
| `game:typing` | `{ playerId, username }` |
| `game:typing_stop` | `{ playerId }` |
| `game:processing` | `{ processing: boolean }` |
| `game:disband` | `{ reason }` |

## AI Integration

The backend uses a **provider pattern**:

- **`AiService`** dispatches to `OpencodeProvider`.
- **`OpencodeProvider`** — raw HTTP fetch to a local Opencode session; manages sessions per room.
- **Fallback** — if `AI_API_KEY` is empty, `AiService.generate()` returns a static narration without calling any provider.

The system prompt supports **English**, **Portuguese (Brazil)**, and **Spanish** narration. The AI responds in strict JSON with `narration`, optional `location`, and `next` (with `type`, `target`, `skill`, `dc`).

Invalid AI targets (`call_player`/`call_roll` pointing to missing players) are coerced to `group_action` by `GameService.validateAiResponseTarget()`.

## Project Structure

```
backend/src/
├── main.ts                  # NestJS entry point (port 3000)
├── app.module.ts            # Root module with AI provider config
├── auth/
│   ├── auth.module.ts       # Auth module
│   ├── auth.gateway.ts      # auth:login handler
│   ├── auth.service.ts      # userId/socketId + playerId/socketId mapping
│   └── auth.guard.ts        # AuthWsGuard
├── ai/
│   ├── ai.interface.ts      # AIConfig / AIProvider interface
│   ├── ai.service.ts        # Provider dispatcher + response validation
│   ├── prompts/
│   │   └── system.prompt.ts # Multilingual system prompt builder
│   └── providers/
│       └── opencode.provider.ts
├── campaign/
│   ├── campaign.store.ts    # Persist/restore to data/campaigns.json
│   └── campaign.types.ts    # SavedCampaign, SavedCampaignInfo
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
├── index.css                # Tailwind + custom layers (pixel fonts, colors)
├── hooks/
│   ├── SocketContext.tsx    # Socket.IO context provider + state
│   ├── useSocket.ts         # Context re-export
│   └── useGameTurn.ts       # Turn logic hook (isMyTurn, isRollRequest, etc.)
├── routing/
│   └── pageRouter.ts        # Page state machine (reducer + types)
├── pages/
│   ├── Login.tsx            # Auth screen
│   ├── Lobby.tsx            # Create / join / resume campaign
│   ├── CharacterCreation.tsx # Character creation with point-buy stats
│   ├── WaitingRoom.tsx      # Pre-game lobby
│   └── GameRoom.tsx         # Main game interface
├── components/
│   ├── Chat/
│   │   ├── MessageList.tsx
│   │   ├── MessageInput.tsx
│   │   └── DiceRollButton.tsx
│   ├── GameStatus/
│   │   ├── LocationBadge.tsx
│   │   ├── TurnIndicator.tsx
│   │   ├── PlayerList.tsx
│   │   ├── PlayerCard.tsx
│   │   ├── CharacterSheet.tsx
│   │   └── TypingIndicator.tsx
│   ├── Layout/
│   │   ├── Header.tsx
│   │   └── Toast.tsx
│   └── Lobby/
│       ├── CreateRoom.tsx
│       ├── RoomList.tsx
│       └── SavedCampaigns.tsx
└── types/
    └── game.types.ts        # Shared TypeScript interfaces
```

## Limitations

- **Active rooms are in-memory** — restarting the backend wipes active rooms, but saved campaigns persist in `data/campaigns.json` and can be resumed.
- **No HP or stats** — players have only `id`, `name`, and 6 attributes (all at 10).
- **Hardcoded campaign setting** — `"A medieval fantasy world..."` is defined in `game.service.ts` and referenced in 6+ places; not configurable at runtime.
