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
│  Contexts: Auth, Player, Game, Trade, Inventory              │
└───────────────────────┬─────────────────────────────────────┘
                        │  WebSocket (Socket.IO)
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                    Backend (NestJS 11)                      │
│  SharedModule (@Global) — GameState, DiceService            │
│  AuthModule — AuthGateway, AuthService, AuthWsGuard         │
│  AiModule — AiService, OpencodeProvider, OpenRouterProvider, │
│    AI_CONFIG/AI_PROVIDER                                      │
│    shared/prompt-builder.ts — pure prompt/response utilities  │
│  GameModule — GameGateway, GameService, PlayerService,      │
│    MerchantService, TradeService, ConditionEngine,          │
│    LevelingService, TurnManager                             │
│  RoomModule — RoomGateway, RoomService, CampaignStore       │
│  CampaignModule — CampaignStore (persist/restore)           │
└─────────────────────────────────────────────────────────────┘
```

Two-package monorepo with no root `package.json` — each package is independent.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | NestJS 11, Socket.IO 4.8, Zod, @opencode-ai/sdk 1.18, @openrouter/sdk 1.1, TypeScript 5.7 |
| **Frontend** | React 19, Vite 6, Tailwind CSS 3.4, Socket.IO Client, pixelarticons, react-markdown 9, remark-gfm 4, TypeScript 5.7 |
| **Fonts** | Geist Pixel (self-hosted woff2) |

## Getting Started

### Prerequisites

- Node.js 20+
- npm 10+

### Install & Run

Both backend and frontend must run simultaneously.

```sh
# Terminal 1 — Backend
cd backend
cp .env.example .env   # create local env (edit if needed)
npm install
npm run dev            # nest start --watch, port 3000

# Terminal 2 — Frontend
cd frontend
cp .env.example .env   # create local env
npm install
npm run dev            # vite, port 5173
```

Open **http://localhost:5173** in your browser.

### Build

```sh
cd backend && npm run build        # nest build → dist/
cd frontend && npm run build       # tsc && vite build (typecheck gate)
cd frontend && npm run preview     # vite preview
```

## Environment Variables

Template files (`.env.example`) are committed for both packages — copy to `.env` and adjust as needed.

### Backend (`backend/.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `AI_PROVIDER` | `opencode` | AI provider identifier |
| `AI_API_KEY` | `(empty)` | API key; empty → fallback narration (provider must handle auth in `validateConfig()`) |
| `AI_MODEL` | `(empty)` | Model identifier for the provider |
| `AI_TRADE_MODEL` | `(empty)` | Optional separate model for trade phase (faster/cheaper model for merchant generation). Falls back to `AI_MODEL` if not set |
| `AI_BASE_URL` | `http://localhost:4096` | Base URL for the AI API |
| `CORS_ORIGIN` | `http://localhost:5173` | Allowed CORS origin(s); comma-separated for multiple |

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
| `lobby:create_character` | `RoomGateway` | `{ roomId, name, attributes, kitId? }` |
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

> **Note:** `game:buy_item`, `game:sell_item`, and `game:end_trade` are rejected with `game:error` (`"AI is processing an action..."`) while the AI is generating a response; `game:end_trade` is also a no-op when no trade is active.

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

### Authentication & Reconnection

`auth:login` is required for all game/room operations. The backend handles reconnection race conditions: if a new socket connects before the old one's `disconnect` fires (e.g., brief network drop), `AuthService.login()` force-logs out the old socket and registers the new one. Same-socket re-login is idempotent.

## AI Integration

The backend uses a **provider pattern** with two available providers:

- **`AiModule`** configures `AI_CONFIG` via a factory and selects the active provider dynamically based on the `AI_PROVIDER` env var (`"opencode"` or `"openrouter"`). Invalid values cause a startup error. Exports `AiService`, `AI_PROVIDER`, and `AI_CONFIG`.
- **`AiService`** dispatches to the configured provider. Also exposes `onRoomReady()` and `onRoomEmpty()` lifecycle methods for session management. Does not inject `AI_CONFIG` — auth/config validation is each provider's responsibility. Wraps every provider call with a **30s timeout** and retries once on timeout, and validates/sanitizes every AI response against `AIResponseSchema` (Zod) via `sanitizeResponse()` — invalid responses are recovered field-by-field by `recoverResponse()` (with a `console.warn` per bad field), defaulting narration to empty, `next` to `group_action`, and `call_roll` skill/DC to `dexterity`/10.
- **`OpencodeProvider`** — `@Injectable()` class configured via `OnModuleInit()` with dynamic ESM import (`await import('@opencode-ai/sdk')`). Stateful: tracks sessions per room via `createOpencodeClient()`, incremental prompts, auto-recovers from session errors. Session priming is **deduped by a context fingerprint** (players + location + summary) — `onRoomReady()` skips re-sending the system prompt + phase contexts when unchanged, and primes with `noReply: true` so no model response is consumed. Uses `@opencode-ai/sdk` (ESM-only) with `baseUrl` and optional auth headers. Implements `validateConfig()` which requires `AI_MODEL` and `AI_BASE_URL` (does not require `AI_API_KEY`). Retries transient failures (408/429/5xx/network) up to 2 extra attempts with exponential backoff before falling back; session errors (400/404/410 or `NotFoundError`/`BadRequest` body) auto-recreate the session and resend the full prompt.
- **`OpenRouterProvider`** — `@Injectable()` class configured via `OnModuleInit()` with dynamic ESM import (`await import('@openrouter/sdk')`). Stateless: no sessions, full prompt sent per call via `buildFullPrompt()`. Uses `@openrouter/sdk` (ESM-only) with `serverURL` constructor option. Implements `validateConfig()` which requires `AI_API_KEY`, `AI_MODEL`, and `AI_BASE_URL`. If a model does not support `response_format: json_object`, the provider automatically retries without JSON mode and extracts JSON from free text via `parseResponse()`. Supports `AI_TRADE_MODEL` env var for a separate model during the trade phase. Transient failures (408/429/5xx/524/529/network) are retried up to 2 extra attempts with backoff on the primary model (429 honors `Retry-After`, capped at 5s), then a single `openrouter/free` fallback attempt.
- **Fallback** — if a provider's `generate()` still throws after timeouts/retries, `AiService` catches the error and returns a static fallback narration.

The system prompt supports **English**, **Portuguese (Brazil)**, and **Spanish** narration. The AI responds in strict JSON with `narration`, required `summary` (structured narrative memory: SCENE/EVENTS/NPCS/THREATS/STATUS), mandatory `location`, optional `conditions` (narrative conditions with effects on players), optional `merchants` (array of merchants with items/prices using unified `statValue`/`statOperation`), and `next` (with `type`, `target`, `skill`, `dc`). Responses are validated against `AIResponseSchema` (Zod) — `effects` arrays are capped at 5 and `dc` is constrained to an int 1-50. Narration supports **Markdown** formatting rendered via `react-markdown`. The `group_action`/`call_player`/`call_roll` phase prompts embed compact JSON response examples (placeholders only) to steer the output structure.

The AI has a **summary-based memory system**: every response must include a `summary` field structured as SCENE/EVENTS/NPCS/THREATS/STATUS, which replaces the entire previous summary. This summary serves as the AI's long-term context — no separate summarization step is needed. History is capped at 200 entries (oldest truncated automatically) and is limited per game phase (8 entries for group_action, 5 for call_player, 4 for call_roll, 3 for trade) to stay within token budgets.

AI context now includes a `gamePhase` field (`group_action`, `call_player`, `call_roll`, or `trade`) that controls how much history is sent and whether target player attributes are shown. The old `scene` field has been removed — `summary` replaces it. Invalid AI targets (`call_player`/`call_roll` pointing to missing **or disconnected** players) are coerced to `group_action` by `GameService.validateAiResponseTarget()`; conditions targeting disconnected players are skipped.

**Disconnect vs in-flight AI** — `handleDisconnect` is fully synchronous and lock-free by design: it never blocks or steals an in-flight AI lock, and its trade branch (`removeFromTrade`) requires `isTradeLocked`, which can never be true while the turn lock is held across an `await`. The real race — a disconnect setting `active = false` while the AI holds a stale snapshot — is handled at apply time: `validateAiResponseTarget()` coerces `call_player`/`call_roll` targets pointing to inactive players to `group_action`, `processConditions()` skips inactive targets, and `TurnManager.canPlayerAct()` treats a turn whose target is inactive or missing as open. As a final safety net, `handleDisconnect` resets the turn state (`currentTurn`/`turnTarget`/`turnType`/`turnSkill`/`turnDc`) when it points at the departing player — so a disconnect during `await aiService.generate()` can never freeze the room.

When a player initiates trade via `game:initiate_trade`, the AI generates merchant data in the `merchants` field of the response. Each merchant includes an inventory of 3-8 items with prices and effects (stat modifiers and/or hp formulas). Location must be known — `"unknown location"` disables trading. The `gamePhase` is set to `trade` during trade prompts, limiting history to 3 recent entries. Narration language is enforced globally by the system prompt — the trade prompt no longer repeats per-language instructions (removed as redundant token waste). It requires that weapons, armor, shields, potions, and antidotes always include mechanical effects — other item types may have empty effects.

The **OpenCode provider** manages **per-room sessions**: created when a character is made or campaign is resumed (`onRoomReady()`), and deleted when the last player leaves or the campaign is deleted (`onRoomEmpty()`). 404/410 errors auto-recreate sessions. Incremental prompts use `buildTargetPlayerContext()` to show target player attributes when in `call_player`/`call_roll` phase. `onRoomReady()` re-primes a session only when the context fingerprint (players + location + summary) changed — unchanged rooms skip re-sending the full context. The OpenRouter provider is stateless and skips these lifecycle hooks.

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

- **Initiate trade** — `game:initiate_trade` sends a request to the AI, which generates 1–10 merchants depending on location type (cities have many, wilderness has few). Each merchant has a unique name, specialty, greeting, coins, and 3–8 items. Weapons, armor, shields, potions, and antidotes always include mechanical effects (`stat` or `hpChange`); other types may have empty effects. All dialogue, names, and descriptions follow the campaign language. Trade mutations on the active-turn path (`lockTrade`/`unlockTrade`/`markDone`) are guarded by the owner-aware `TurnManager` per-room lock (`acquire`/`release` with an owner token — double-acquire rejected, non-owner release a no-op); `removeFromTrade` on disconnect runs lock-free (synchronous — never blocks or steals the turn lock).
- **Location‑gated** — if the current location is `"unknown location"`, no merchants are available. Changing locations clears the merchant state.
- **Price adjustments** — prices are modified per player by Charisma modifier (±5% per mod point). Each player sees their own adjusted prices via `game:trade_state`.
- **Buying** — `game:buy_item` deducts coins and adds the item to the player's inventory. Merchant stock decreases.
- **Selling** — `game:sell_item` removes the item from inventory and adds coins. Merchants have a coin pool that limits buybacks.
- **Ending trade** — `game:end_trade` marks that player as done. When all participants are done, the trade lock is released and normal actions resume. Trading blocks all other player actions (`isTradeLocked`).
- **AI-flight guards** — `game:buy_item`/`game:sell_item`/`game:end_trade` early-return with `game:error` `"AI is processing an action..."` while the AI is generating (`turnManager.isLocked()`), and `game:end_trade` is a no-op when the trade isn't locked — preventing the release of an in-flight turn lock. The per-room lock is **owner-aware** (`acquire`/`release` with an owner token): double-acquire is rejected and a non-owner release is a no-op, so no handler can steal or release an in-flight AI lock. `game:initiate_trade` returns `TradeInitResult.merchantsReady` so the trade is only locked / broadcast when merchants were actually generated.
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
├── main.ts                  # NestJS entry point (port from PORT env var, default 3000) + global CORS via CorsIoAdapter
├── utils/
│   └── is-unknown-location.ts  # Shared utility: checks if location is "unknown location"
├── app.module.ts            # Root module (imports only — all providers moved to feature modules)
├── shared/
│   └── shared.module.ts     # @Global module — exports GameState, DiceService
├── auth/
│   ├── auth.module.ts       # Auth module (exports AuthService, AuthWsGuard)
│   ├── auth.gateway.ts      # auth:login handler
│   ├── auth.service.ts      # userId/socketId + playerId/socketId mapping
│   └── auth.guard.ts        # AuthWsGuard
├── ai/
│   ├── ai.module.ts         # AiModule (providers: AiService, OpencodeProvider, OpenRouterProvider, AI_CONFIG factory, AI_PROVIDER dynamic selection via useFactory)
│   ├── ai.interface.ts      # AIConfig / AIProvider interface, GamePhase type, AIContext (gamePhase replaces scene)
│   ├── ai.service.ts        # Provider dispatcher + 30s timeout w/ single retry + sanitizeResponse() (Zod AIResponseSchema, field-by-field recoverResponse()) + ensureSummaryQuality() + onRoomReady/onRoomEmpty lifecycle (no AI_CONFIG injection)
│   ├── prompts/
│   │   ├── system.prompt.ts       # Multilingual system prompt (summary-based memory, required fields, compressed output rules)
│   │   ├── group-action.prompt.ts # Phase prompt: any player acts (includes all players)
│   │   ├── call-player.prompt.ts  # Phase prompt: AI calls a specific player
│   │   ├── call-roll.prompt.ts    # Phase prompt: AI requests a skill check
│   │   └── trade.prompt.ts        # Phase prompt: merchant generation
│   ├── shared/
│   │   ├── prompt-builder.ts # Pure functions: getPhasePrompt, formatHistoryEntries, buildActionLines, buildPhaseContexts, buildTargetPlayerContext, buildFullPrompt, parseResponse
│   │   └── retry.ts          # retryWithBackoff() helper (exponential backoff, per-error decide, Retry-After support) for transient 429/5xx/network retries
│   └── providers/
│       ├── opencode.provider.ts  # @Injectable provider — @opencode-ai/sdk (ESM dynamic import), per-room sessions, incremental prompts, session-error recovery, sendMessageWithRetry
│       └── openrouter.provider.ts # @Injectable provider — stateless, @openrouter/sdk (ESM dynamic import), full prompt per call, JSON mode fallback, validateConfig (apiKey+model+baseUrl required), callModelWithRetry + openrouter/free fallback
├── game/
│   ├── game.module.ts       # GameModule (imports AuthModule, AiModule — exports all game services)
│   ├── game.gateway.ts      # Game WebSocket handlers (thin delegation layer, no GameState injection)
│   ├── game.service.ts      # Turn orchestration (single-pass processTurn, no narration_only loop, no separate summarization) + AI response processing (extracts summary, injects gamePhase) + initiateTrade critical section (canInitiateTrade + acquire + lockTrade, returns TradeInitResult) + data-access methods for gateways
│   ├── game.state.ts        # Data layer: rooms Map, types/interfaces, recomputePlayer, addHistory (MAX_HISTORY_LENGTH=200 cap) + setTurn, no scene/lastSummarizedAt (services only)
│   ├── dice.service.ts      # Dice rolling (rollDice, rollDiceFormula)
│   ├── condition.engine.ts  # Condition/effect lifecycle: apply/remove/tick, getPlayerModifier
│   ├── player.service.ts    # Player CRUD, inventory, equipment, coins, useItem, useAntidote
│   ├── merchant.service.ts  # Merchant pricing, buy/sell, clearMerchants
│   ├── trade.service.ts     # Trade lock/unlock state management (lockTrade, unlockTrade, markDone, removeFromTrade)
│   ├── leveling.service.ts  # XP thresholds, awardXp, allocateAttributes
│   └── turn.manager.ts      # Owner-aware per-room lock (acquire/release with owner token — double-acquire rejected, non-owner release a no-op), stores turnSkill/turnDc, no narration_only
├── room/
│   ├── room.module.ts       # RoomModule (imports GameModule, AuthModule, AiModule, CampaignModule)
│   ├── room.gateway.ts      # Lobby WebSocket handlers (no GameState injection)
│   └── room.service.ts      # In-memory Room registry + removeRoom()
├── campaign/
│   ├── campaign.module.ts   # CampaignModule (imports GameModule, RoomModule — exports CampaignStore)
│   ├── campaign.store.ts    # Persist/restore to data/campaigns/{id}.json (OnModuleInit async load, OnModuleDestroy flush, atomic writes)
│   └── campaign.types.ts    # SavedCampaign, SavedCampaignInfo (schemaVersion=3, SavedEffect, no scene/lastSummarizedAt)
├── pipes/
│   └── zod-validation.pipe.ts  # Global Zod validation pipe (safeParse → BadRequestException)
└── dto/
    ├── schemas.ts            # Zod schemas for all WebSocket handlers (24 schemas with inferred types)
    └── ai-response.dto.ts    # AI response Zod schemas (AIResponseSchema/NextSchema/MerchantSeedSchema/ConditionSeedSchema with statValue/statOperation) + TradeInitResult type

frontend/src/
├── main.tsx                 # React entry point
├── App.tsx                  # Page router (AppProviders wrapper)
├── index.css                # Tailwind + custom layers (pixel fonts, colors)
├── contexts/
│   ├── AppProviders.tsx     # Composes all providers (single wrapper)
│   ├── SocketContext.tsx    # Socket.IO connection + event routing (internal)
│   ├── AuthContext.tsx       # userId, page (useReducer), connected, error
│   ├── PlayerContext.tsx     # player identity + room lobby operations
│   ├── GameContext.tsx       # gameState, messages, turnUpdate, typingPlayers, isAiProcessing (resets isAiProcessing on connect/disconnect/reset)
│   ├── TradeContext.tsx      # tradeState, isTradeLocked + trade actions
│   └── InventoryContext.tsx  # equip/unequip/useItem/antidote actions
├── hooks/
│   ├── useAuth.ts           # useAuth() — AuthContext consumer
│   ├── usePlayer.ts         # usePlayer() — PlayerContext consumer
│   ├── useGame.ts           # useGame() — GameContext consumer
│   ├── useTrade.ts          # useTrade() — TradeContext consumer
│   ├── useInventory.ts      # useInventory() — InventoryContext consumer
│   └── useGameTurn.ts       # Turn logic hook (isMyTurn, isRollRequest, isCallPhase, actionsLocked, etc.)
├── routing/
│   └── pageRouter.ts        # Page state machine (reducer + types)
├── pages/
│   ├── Login.tsx            # Auth screen
│   ├── Lobby.tsx            # Create / join / resume campaign
│   ├── CharacterCreation.tsx # Character creation with point-buy stats
│   ├── WaitingRoom.tsx      # Pre-game lobby
│   └── GameRoom.tsx         # Main game interface
├── components/
│   ├── ui/              # Design system: 22 reusable primitives
│   │   ├── Button.tsx   # 5 variants, 4 sizes
│   │   ├── Modal.tsx    # 4 maxWidths + ModalTitle
│   │   ├── Card.tsx     # 3 padding sizes
│   │   ├── Badge.tsx    # 5 variants
│   │   ├── IconButton.tsx, TextButton.tsx, NavButton.tsx
│   │   ├── ProgressBar.tsx, TextField.tsx
│   │   ├── PanelTitle.tsx, SectionTitle.tsx
│   │   ├── ItemRow.tsx, PlayerRow.tsx, StatRow.tsx
│   │   ├── EmptyState.tsx, LoadingOverlay.tsx, ThinkingDots.tsx
│   │   ├── Divider.tsx, EquipmentSlot.tsx
│   │   ├── ErrorText.tsx, StatusDot.tsx, PageShell.tsx
│   │   └── index.ts     # Barrel export
│   ├── Chat/
│   │   ├── MessageList.tsx
│   │   ├── MessageInput.tsx
│   │   ├── RollRequestModal.tsx   # Skill-check modal (narration + skill + DC + ROLL THE DICE), replaces the old DiceRollButton
│   │   └── UseItemButton.tsx  # Consumable dropdown + shared ConfirmUseModal
│   ├── GameStatus/
│   │   ├── LocationBadge.tsx
│   │   ├── TurnIndicator.tsx
│   │   ├── PlayerList.tsx
│   │   ├── PlayerCard.tsx
│   │   ├── CharacterSheet.tsx   # Attributes + Inventory tabs, equip/unequip UI, active conditions section with antidote button, EffectRow (exported); uses shared HoverPopup/ConfirmUseModal
│   │   ├── TypingIndicator.tsx
│   │   ├── CampaignStatusBar.tsx
│   │   ├── MyCharacterStatus.tsx   # HP/XP bars + condition indicators with hover tooltip (uses shared CONDITION_ICONS)
│   │   ├── PlayerCircles.tsx
│   │   ├── AttributeAllocationModal.tsx  # ASI point allocation (uses shared ATTRIBUTE_ICONS/ATTRIB_KEYS)
│   │   ├── CharacterListModal.tsx
│   │   └── OptionsModal.tsx
│   ├── Trade/
│   │   └── TradeModal.tsx  # Merchant trading UI (uses shared HoverPopup, ITEM_TYPE_ICONS)
│   ├── Layout/
│   │   ├── Header.tsx
│   │   ├── Toast.tsx
│   │   └── ErrorBoundary.tsx  # React error boundary with retry/lobby fallback
│   ├── Lobby/
│   │   ├── CreateRoom.tsx
│   │   ├── RoomList.tsx
│   │   └── SavedCampaigns.tsx
│   └── shared/
│       ├── constants.ts      # Shared icon maps: CONDITION_ICONS, ITEM_TYPE_ICONS, ATTRIBUTE_ICONS, ATTRIB_KEYS
│       ├── HoverPopup.tsx    # Generic render-prop hover popup (portal + boundary clamping + mouse-leave detection)
│       ├── ConfirmUseModal.tsx  # Unified fullscreen item confirmation modal
│       └── NarrationMarkdown.tsx  # Shared Markdown renderer for AI narration (react-markdown + remark-gfm), used by MessageList and RollRequestModal
└── types/
    └── game.types.ts        # Shared TypeScript interfaces (Message, Player incl. activeConditions, Effect, inventory/coins/equipment, UseAntidoteResult, ConditionTickPayload, Merchant, plus typed socket response interfaces: LoginResponse, CreateRoomResponse, JoinRoomResponse, etc.)
```

### Error Boundaries & Loading States

Two-layer error boundary system prevents white-screen crashes:

- **Root `ErrorBoundary`** (`App.tsx`) — wraps `RoomRouter` + `Toast`. Catches render errors across all pages. Shows a styled fallback with "GO TO LOBBY" button that dispatches `LEFT_ROOM` to navigate back to the lobby.
- **GameRoom `ErrorBoundary`** (`GameRoom.tsx`) — isolates game room render errors. Adds a "RETRY" button that calls `GameContext.refetchGameState()` to re-emit `game:get_state` and recover game state without leaving the room. "GO TO LOBBY" dispatches `LEFT_ROOM`.
- **Loading overlay** — while `gameState` is null (during `game:get_state` initial fetch or reconnection), `GameRoom.tsx` renders a full-screen loading overlay with an animated crystal pulse and "SUMMONING THE REALM..." text, matching the `WaitingRoom` AI processing pattern. Once state arrives, the chat layout renders normally.
- **Error reporting** — all caught errors are logged to console via `componentDidCatch`.
- The `ErrorBoundary` class component is in `components/Layout/ErrorBoundary.tsx`. Props: `onRetry?` (reset + retry), `onGoToLobby?` (navigate to lobby).

### UI Component Library

`src/components/ui/` contains 22 reusable design-system primitives extracted from repeated UI patterns. All components:

- Are wrapped with `React.memo` for render performance
- Accept a `className` prop appended to the root element for customization
- Use explicit prop interfaces (not `React.PropsWithChildren`)
- Are exported via a barrel `index.ts` as `from "../ui"`
- Follow consistent patterns: `variant` for style (Button, IconButton, Badge, Divider), `size` for sizing (Button, ProgressBar, PanelTitle)

**Catalog:**

| Component | Props | Description |
|-----------|-------|-------------|
| `Button` | `variant` (primary/secondary/danger/gold/cyan), `size` (xs/sm/md/lg) | Styled action button |
| `Modal` | `maxWidth` (xs/sm/xl/3xl), `maxHeight`, `onClose` | Overlay modal with backdrop click |
| `ModalTitle` | — | Gold-accented modal header |
| `Card` | `padding` (sm/md/lg), `center` | Stone-themed container panel |
| `PanelTitle` | `size` (sm/md/lg) | Section header with gold underline |
| `SectionTitle` | — | Bronze subsection header |
| `ProgressBar` | `color` (green/gold/red), `size` (sm/md) | Pixel-segmented progress bar |
| `TextField` | `label`, `error`, full HTMLInputElement | Labeled text input |
| `IconButton` | `variant` (close/gold/bronze/ghost) | Icon-only button |
| `TextButton` | `color` (gold/red/muted) | Text-only clickable action |
| `Badge` | `variant` (condition/magic/damage/gold/neutral) | Inline status badge |
| `ItemRow` | — | Inventory item line with icon/name/quantity/actions |
| `PlayerRow` | — | Player info row with status dot |
| `EmptyState` | — | Centered "nothing here" message |
| `LoadingOverlay` | — | Full-screen loading spinner |
| `ThinkingDots` | — | Animated "thinking..." indicator |
| `StatRow` | — | Attribute row (label + value + mod) |
| `Divider` | `variant` (gold/stone/subtle) | Horizontal divider line |
| `NavButton` | — | Sidebar navigation tab button |
| `EquipmentSlot` | — | Equipment slot with label + item |
| `ErrorText` | — | Red error message text |
| `StatusDot` | — | Colored online/offline indicator |
| `PageShell` | — | Full-page layout wrapper |

**Convention:** Create new UI primitives in `ui/` with `React.memo`, add to `index.ts`, and import via `from "../ui"`.

### Frontend Performance

All 22 `ui/` components plus 9 leaf components are wrapped with `React.memo` to prevent unnecessary re-renders from Socket-driven context updates:

- **Context consumers** — `Header`, `Toast` (decoupled from parent page re-renders)
- **Pure props** — `LocationBadge`, `PlayerCard`, `TypingIndicator` (primitive or stable reference props)
- **Array props** — `CampaignStatusBar`, `TurnIndicator`, `PlayerCircles`, `PlayerList` (stable references via `gameState?.players ?? []` — the array reference only changes when `gameState` actually updates, not on unrelated context changes like `messages`/`typingPlayers`/`isAiProcessing`)

No custom comparators needed — default shallow comparison is sufficient. New pure leaf components should follow this pattern.

### Design System

The UI uses a dark panel-based design with pixel-art font styling:

- **Fonts** — `Geist Pixel` (self-hosted woff2 in `src/fonts/`) is the sole pixel font used across all UI text. The older Google Fonts (`Press Start 2P`, `VT323`, `Space Mono`) have been removed.
- **Color palettes** — `panel` (dark neutral grays for backgrounds), `bronze` (warm browns for accent buttons), plus existing `navy`, `gold`, `blood`, `magic`, `forest`, `stone`, `wood`.
- **Component classes** — `pixel-border-ornate` (prominent ornamental border), `panel-header` (decorative gold gradient dividers), `bar-segmented` (segmented HP/XP bar effect). Buttons use the `Button` component instead of raw `btn-rpg`/`btn-secondary`/`btn-danger` CSS classes.
- **Background** — All full-screen pages use flat `bg-panel-950`. The `bg-starfield` class and `bg-gradient-navy` overlays have been removed.

## Limitations

- **Active rooms are in-memory** — restarting the backend wipes active rooms, but saved campaigns persist as individual files in `data/campaigns/{id}.json` (schema v3, atomic temp+rename writes) and can be resumed. v3 removed `scene`/`lastSummarizedAt` fields. Old v1 saves (with nested `modifiers`/`effects`) are auto-migrated to v2 on restore via `migrateV1ToV2()`.
- **XP gain not yet wired** — the HP/XP/leveling engine is structurally complete (levels 1-20, D&D 5e SRD XP thresholds, ASI at levels 4/8/12/16/19), but no server-side game action triggers XP gain yet. `game:level_up` is frontend-ready but not emitted by the backend.
