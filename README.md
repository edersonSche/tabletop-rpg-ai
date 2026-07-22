# Tabletop RPG AI

[![NestJS](https://img.shields.io/badge/NestJS-11-ea2845?logo=nestjs)](https://nestjs.com/)
[![React](https://img.shields.io/badge/React-19-61dafb?logo=react)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6-646cff?logo=vite)](https://vite.dev/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-4.8-010101?logo=socket.io)](https://socket.io/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-06b6d4?logo=tailwindcss)](https://tailwindcss.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178c6?logo=typescript)](https://www.typescriptlang.org/)

AI-powered tabletop role-playing game platform with a real-time multiplayer experience. Players create or join campaign rooms with customizable themes (Medieval Fantasy, Cyberpunk, Dark Souls, etc.) and play through adventures narrated by an AI Game Master — all through a chat-like interface with a retro pixel-art dark theme.

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
│  ConditionEngine ─── DiceService                            │
│  PlayerService ─── MerchantService ─── TradeService         │
│  LevelingService                                           │
│  GameState (in-memory data layer + recomputePlayer)         │
│  CampaignStore (persistence to data/campaigns.json)         │
│  TurnManager (lock-per-room)                                │
└─────────────────────────────────────────────────────────────┘
```

Two-package monorepo with no root `package.json` — each package is independent.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | NestJS 11, Socket.IO 4.8, TypeScript 5.7 |
| **Frontend** | React 19, Vite 6, Tailwind CSS 3.4, Socket.IO Client, pixelarticons, react-markdown 9, remark-gfm 4, TypeScript 5.7 |
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
| `lobby:create` | `RoomGateway` | `{ name, language?, campaignTheme? }` |
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
| `game:allocate_attributes` | `GameGateway` | `{ roomId, playerId, allocations }` |
| `game:equip` | `GameGateway` | `{ roomId, playerId, itemId, slot }` |
| `game:unequip` | `GameGateway` | `{ roomId, playerId, slot }` |
| `game:use_item` | `GameGateway` | `{ roomId, playerId, itemId }` |
| `game:initiate_trade` | `GameGateway` | `{ roomId, playerId }` |
| `game:buy_item` | `GameGateway` | `{ roomId, playerId, merchantId, merchantItemId, quantity? }` |
| `game:sell_item` | `GameGateway` | `{ roomId, playerId, merchantId, itemId, quantity? }` |
| `game:end_trade` | `GameGateway` | `{ roomId, playerId }` |
| `game:use_antidote` | `GameGateway` | `{ roomId, playerId, itemId, targetConditionName? }` |

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
| `game:level_up` | `{ playerId, newLevel, gainedPoints }` (frontend-ready, server not yet emitting) |
| `game:trade_state` | `{ locked, merchants, tradeParticipants, tradeDone }` |
| `game:condition_tick` | `{ players: [{ id, hp, maxHp, ac, activeConditions, tickResult }] }` |
| `game:antidote_result` | `{ success, conditionRemoved? }` |

## AI Integration

The backend uses a **provider pattern**:

- **`AiService`** dispatches to `OpencodeProvider`.
- **`OpencodeProvider`** — raw HTTP fetch to a local Opencode session; manages sessions per room.
- **Fallback** — if `AI_API_KEY` is empty, `AiService.generate()` returns a static narration without calling any provider.

The system prompt supports **English**, **Portuguese (Brazil)**, and **Spanish** narration. The AI responds in strict JSON with `narration`, mandatory `location`, optional `conditions` (narrative conditions with effects on players), optional `merchants` (array of merchants with items/prices using unified `statValue`/`statOperation`), and `next` (with `type`, `target`, `skill`, `dc`). Narration supports **Markdown** formatting rendered via `react-markdown`.

The AI has a **two-tier memory system**: a running history of narration text (for immediate context) and a periodic **summarization** that condenses old entries into a persistent summary every 50 actions — saving tokens vs. storing full history.

Invalid AI targets (`call_player`/`call_roll` pointing to missing players) are coerced to `group_action` by `GameService.validateAiResponseTarget()`.

When a player initiates trade via `game:initiate_trade`, the AI generates merchant data in the `merchants` field of the response. Each merchant includes an inventory of 3-8 items with prices and effects (stat modifiers and/or hp formulas). Location must be known — `"unknown location"` disables trading.

The provider manages **per-room sessions**: created when a character is made or campaign is resumed (`onRoomReady()`), and deleted when the last player leaves or the campaign is deleted (`onRoomEmpty()`). 404/410 errors auto-recreate sessions.

## Character Creation

Players build characters using a **point-buy system**:

- **27-point pool** to distribute across 6 attributes
- Attributes range from **8 (min) to 15 (max)**
- Cost: **1 point** per point from 8-12, **2 points** per point at 13-14
- Default: all attributes start at 8
- Maximum attribute cap is **20** (reachable via ASI level-ups)
- **ASI levels** (4, 8, 12, 16, 19) grant +2 attribute points on level-up

## Inventory & Equipment

Players start each campaign with basic equipment:

- **Dagger** (hand slot, +1 damage permanent effect)
- **2 Healing Potions** (immediate heal effect: `2d4+2`)
- **50 coins**

Items have **types** (`weapon`, `armor`, `potion`, `scroll`, `key_item`, `misc`), **slots** (`body`, `hand`, `two-handed`), and **`effects: Effect[]`** (unified stat modifiers and hp changes per item). Each player has three equipment slots:

| Slot | Accepts |
|------|---------|
| `body` | Items with `body` slot (armor) |
| `mainHand` | Items with `hand` or `two-handed` slot |
| `offHand` | Items with `hand` slot |

Two-handed weapons block the off-hand slot when equipped. `game:equip` auto-unequips any existing item in the target slot and recalculates AC/effects via `recomputePlayer()`. `game:unequip` also triggers recalculation. `game:use_item` handles all effect types — `immediate` (heal/damage via `applyHpChange`), `temporary` (synthetic `Condition` via `applyConditionToPlayer`), and `permanent` (fallback as temporary with duration 1). Equipment and items are persisted in saved campaigns.

## Trading

Players can trade with AI-generated merchants at known locations:

- **Initiate trade** — `game:initiate_trade` sends a request to the AI, which generates 1–10 merchants depending on location type (cities have many, wilderness has few). Each merchant has a unique name, specialty, greeting, coins, and 3–8 items.
- **Location‑gated** — if the current location is `"unknown location"`, no merchants are available. Changing locations clears the merchant state.
- **Price adjustments** — prices are modified per player by Charisma modifier (±5% per mod point). Each player sees their own adjusted prices via `game:trade_state`.
- **Buying** — `game:buy_item` deducts coins and adds the item to the player's inventory. Merchant stock decreases.
- **Selling** — `game:sell_item` removes the item from inventory and adds coins. Merchants have a coin pool that limits buybacks.
- **Ending trade** — `game:end_trade` marks that player as done. When all participants are done, the trade lock is released and normal actions resume. Trading blocks all other player actions (`isTradeLocked`).
- **Merchant persistence** — merchant state (inventory, coins, location) is saved in campaign data and survives restarts.

## Campaign Themes

18 preset campaign themes plus a **Custom** free-form option:

| Theme | Description |
|-------|-------------|
| Medieval Fantasy | Classic swords & sorcery |
| Lovecraftian Horror | Cosmic horror & madness |
| Cyberpunk | High-tech low-life |
| Dark Souls | Gothic dark fantasy |
| Pirate Adventure | High seas & treasure |
| Steampunk | Victorian steam-powered |
| Sci-Fi / Space Opera | Starships & aliens |
| Weird West | Supernatural frontier |
| Post-Apocalyptic | Wasteland survival |
| Norse Mythology | Viking sagas |
| Arabian Nights | Desert adventures |
| Wuxia / Martial Arts | Chinese martial arts epic |
| Superhero | Modern supers |
| Arthurian Legend | Knights & chivalry |
| Zombie Survival | Undead apocalypse |
| Japanese Folklore | Yokai & spirits |
| Space Horror | Cosmic isolation |
| Post-Magic Apocalypse | Magic shattered world |

Set at room creation via `lobby:create { campaignTheme }`. The theme is injected into the AI system prompt and persisted in saved campaigns.

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
│   ├── ai.interface.ts      # AIConfig / AIProvider interface (includes summarize)
│   ├── ai.service.ts        # Provider dispatcher + response validation + summarizeHistory()
│   ├── prompts/
│   │   └── system.prompt.ts # Multilingual system prompt builder (memory, markdown, levels, conditions, merchants with effects)
│   └── providers/
│       └── opencode.provider.ts  # Per-room sessions, summarization, error recovery
├── campaign/
│   ├── campaign.store.ts    # Persist/restore to data/campaigns.json (schema v2, flattened SavedEffect format, auto-migrates v1 saves)
│   └── campaign.types.ts    # SavedCampaign, SavedCampaignInfo (schemaVersion, SavedEffect, SavedMerchantItem)
├── game/
│   ├── game.gateway.ts      # Game WebSocket handlers (thin delegation layer with emission helpers)
│   ├── game.service.ts      # Turn orchestration + AI response processing + maybeSummarize()
│   ├── game.state.ts        # Data layer: rooms Map, types/interfaces, recomputePlayer, addHistory, setTurn
│   ├── dice.service.ts      # Dice rolling (rollDice, rollDiceFormula)
│   ├── condition.engine.ts  # Condition/effect lifecycle: apply/remove/tick, getPlayerModifier
│   ├── player.service.ts    # Player CRUD, inventory, equipment, coins, useItem, useAntidote
│   ├── merchant.service.ts  # Merchant pricing, buy/sell, clearMerchants
│   ├── trade.service.ts     # Trade lock/unlock state management (lockTrade, unlockTrade, markDone, removeFromTrade)
│   ├── leveling.service.ts  # XP thresholds, awardXp, allocateAttributes
│   └── turn.manager.ts      # Lock-per-room turn gate (stores turnSkill/turnDc)
├── room/
│   ├── room.gateway.ts      # Lobby WebSocket handlers
│   └── room.service.ts      # In-memory Room registry
└── dto/                     # Data transfer objects (unified ConditionEffectSeed/MerchantSeedItem effects with statValue/statOperation)

frontend/src/
├── main.tsx                 # React entry point
├── App.tsx                  # Page router (state machine via useReducer)
├── index.css                # Tailwind + custom layers (pixel fonts, colors)
├── hooks/
│   ├── SocketContext.tsx    # Socket.IO context provider + state (incl. emitEquip, emitUnequip, emitUseAntidote, game:condition_tick, game:antidote_result)
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
│   │   ├── CharacterSheet.tsx   # Attributes + Inventory tabs, equip/unequip UI, active conditions section with antidote button, EffectRow (exported)
│   │   ├── TypingIndicator.tsx
│   │   ├── CampaignStatusBar.tsx
│   │   ├── MyCharacterStatus.tsx   # HP/XP bars + condition indicators with hover tooltip
│   │   ├── PlayerCircles.tsx
│   │   ├── AttributeAllocationModal.tsx
│   │   ├── CharacterListModal.tsx
│   │   └── OptionsModal.tsx
│   ├── Trade/
│   │   └── TradeModal.tsx
│   ├── Layout/
│   │   ├── Header.tsx
│   │   └── Toast.tsx
│   └── Lobby/
│       ├── CreateRoom.tsx
│       ├── RoomList.tsx
│       └── SavedCampaigns.tsx
└── types/
    └── game.types.ts        # Shared TypeScript interfaces (Player incl. activeConditions, Effect, inventory/coins/equipment, UseAntidoteResult, ConditionTickPayload)
```

## Limitations

- **Active rooms are in-memory** — restarting the backend wipes active rooms, but saved campaigns persist in `data/campaigns.json` (schema v2) and can be resumed. Old v1 saves (with nested `modifiers`/`effects`) are auto-migrated to v2 on restore via `migrateV1ToV2()`.
- **XP gain not yet wired** — the HP/XP/leveling engine is structurally complete (levels 1-20, D&D 5e SRD XP thresholds, ASI at levels 4/8/12/16/19), but no server-side game action triggers XP gain yet. `game:level_up` is frontend-ready but not emitted by the backend.
