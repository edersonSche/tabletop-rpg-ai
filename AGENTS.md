# AGENTS.md

Two-package monorepo: `backend/` (NestJS 11, Socket.IO 4.8), `frontend/` (React 19, Vite 6, Tailwind 3.4, react-markdown 9, remark-gfm 4). No root `package.json` — each package is independent. **No tests, no lint, no formatter, no CI.**  

**Game state is in-memory** — restarting wipes active rooms (but not saved campaigns). **Campaign persistence** writes per-campaign files to `data/campaigns/{id}.json` (schema v2 with flattened `SavedEffect` format, atomic temp+rename writes) on every action/roll/start/disconnect/create_character/leave — `saveFromMemory()` skips if `!gameStarted`, so pre-start creates/leaves do not persist. Old v1 saves (with nested `modifiers`/`effects`) are auto-migrated to v2 on restore via `migrateV1ToV2()`. Saved campaigns survive restarts and can be resumed via `lobby:resume`.

**`.gitignore`**: root gitignores `docs` and `backend/data` (campaigns live there); each package gitignores `dist/`, `node_modules/`, `.env` independently. `npm run build` is the only validation gate (frontend: `tsc && vite build`).

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

Frontend connects to `window.location.origin` via Socket.IO (`transports: ['websocket', 'polling']`). Vite proxies `/socket.io` to `http://localhost:3000` (override via `VITE_SOCKET_HOST`). On reconnect, `AuthContext` re-emits `auth:login` and `GameContext` re-fetches `game:get_state`. 10-second disconnect timer before clearing page state.

**Reconnection resilience** — `AuthService.login()` (`auth.service.ts:16-27`) handles the race condition where a new socket connects before the old one's `disconnect` fires. If the same `userId` re-authenticates with a different socket ID, the old socket is force-logged out before registering the new one. Same-socket re-login is idempotent. This prevents `auth:login` from returning `"User already connected"` during rapid reconnects.

## Page state machine

`App.tsx` → `AppProviders` composes all context providers. `AuthContext` owns `useReducer` (`routing/pageRouter.ts`) over 5 pages:
```
login → lobby → character_creation → waiting_room → game_room
```
Actions: `LOGGED_IN`, `LOGGED_OUT`, `CREATED_ROOM`, `JOIN_NEEDS_CHARACTER`, `CHARACTER_CREATED`, `CHARACTER_CREATED_AND_STARTED`, `JOINED_ROOM`, `CAMPAIGN_STARTED`, `RESUMED_CAMPAIGN`, `LEFT_ROOM`, `DISBANDED`.

**Creator** = first player to create a character in the room. Only the creator's `room:leave` disbands the room.

## Architecture

**Backend** — all under `backend/src/`. Organized into NestJS feature modules:

### Module Structure

```
AppModule
├── SharedModule (@Global)    — GameState, DiceService (available to all modules without import)
├── AuthModule                — AuthGateway, AuthService, AuthWsGuard
├── AiModule                  — AiService, AI_CONFIG/AI_PROVIDER factories (exports all three)
├── GameModule                — imports AuthModule, AiModule
│   exports: GameGateway, GameService, PlayerService, MerchantService,
│            TradeService, ConditionEngine, LevelingService, TurnManager
├── RoomModule                — imports GameModule, AuthModule, AiModule, CampaignModule(forwardRef)
│   exports: RoomGateway, RoomService, CampaignStore
└── CampaignModule            — imports GameModule, RoomModule(forwardRef)
    exports: CampaignStore
```

RoomModule ↔ CampaignModule circular dependency is resolved via `forwardRef()` on both sides. `AiService` encapsulates AI provider lifecycle (`onRoomReady`/`onRoomEmpty`) — gateways no longer inject `AI_PROVIDER` directly.
- `auth/` — `AuthGateway` (auth:login, disconnect), `AuthService` (userId↔socketId + playerId↔socketId), `AuthWsGuard`
- `game/` — `GameState` (`game.state.ts`) — Data layer: in-memory `rooms` Map, `playerByUserId` Map, `createRoom`/`getRoom`/`removeRoom`/`restoreCampaign`, `addHistory`/`setTurn`, shared `recomputePlayer()` for AC recalculation, all type definitions (`Player`, `Effect`, `Condition`, `ActiveCondition`, `InventoryItem`, `Merchant`, `MerchantItem`, `GameStateData`, `TickResult`, etc.)
  - `GameGateway` (`game.gateway.ts`) — Thin delegation layer: validates input, delegates to services, emits results. Four emission helpers (`emitGameState`, `emitNarration`, `emitNarrationText`, `emitTradeStateToAll`, `emitTradeUnlock`) eliminate duplicated broadcast patterns across 16 handlers. All `game:state` emissions flow through `GameService.getState()` as the single source of truth. **Does not inject `GameState`** — all room data access goes through `GameService` methods (`getRoomContext`, `findPlayer`, `findPlayerWithItem`, `getTurnContext`, `getTradeEmitData`, `getRoomAiContext`, `hasMerchantsAtLocation`, `hasMerchants`, `isTradeLocked`)
  - `GameService` (`game.service.ts`) — Turn orchestration, AI target validation, `processConditions()`/`seedToEffect()` for AI-generated narrative conditions, `buildSceneContext()` with active conditions, `maybeSummarize()` history summarization, `initiateTrade()` AI-driven merchant generation, calls `ConditionEngine.tickEffects()` at end of `processAiResponse`. `getState()` returns the complete `GameState` payload (all fields including `creatorId` and `history`). Also exposes data-access methods for gateways: `getRoomContext`, `findPlayer`, `findPlayerWithItem`, `getTurnContext`, `getTradeEmitData`, `getRoomAiContext`, `hasMerchantsAtLocation`, `hasMerchants`, `isTradeLocked`, `setCreatorId`, `setGameStarted`
  - `ConditionEngine` (`condition.engine.ts`) — Condition/effect lifecycle: `applyConditionToPlayer`/`removeConditionFromPlayer`/`tickEffects`, `applyEffectToPlayer`/`applyHpChange`, `getPlayerModifier` (skill modifier with condition stat overrides). Depends on `DiceService` + `GameState.recomputePlayer`
  - `PlayerService` (`player.service.ts`) — Player CRUD (`addPlayer`/`findPlayerByUserId`/`disconnectPlayer`/`reactivatePlayer`/`removePlayer`), inventory (`addItem`/`removeItem`), equipment (`equipItem`/`unequipItem`), economy (`addCoins`/`removeCoins`), `useItem` (immediate/temporary/permanent effects via `ConditionEngine`), `useAntidote` (removes conditions via `ConditionEngine`). Depends on `GameState` + `ConditionEngine`
  - `MerchantService` (`merchant.service.ts`) — Merchant pricing (`adjustMerchantPrices`), `buyFromMerchant`/`sellToMerchant`, `clearMerchants`, `getMerchant`. Depends on `GameState`
  - `TradeService` (`trade.service.ts`) — Trade session state: `lockTrade`/`unlockTrade`/`markDone`/`removeFromTrade`. Pure state management, no `Server` dependency. Depends on `GameState`
  - `LevelingService` (`leveling.service.ts`) — XP thresholds, `awardXp` (level-up with ASI), `allocateAttributes`. Depends on `GameState`
  - `DiceService` (`dice.service.ts`) — Pure functions: `rollDice`, `rollDiceFormula`. No dependencies
  - `TurnManager` (`turn.manager.ts`) — Lock-per-room, stores `turnSkill`/`turnDc`, blocks actions during active trade. **Also guards trade state mutations** — `handleDisconnect`/`handleEndTrade`/`handleInitiateTrade` in `GameGateway` acquire the lock before calling `TradeService.removeFromTrade`/`markDone`/`lockTrade` to prevent races on `tradeParticipants`/`tradeDone`/`isTradeLocked`.
- `room/` — `RoomGateway` (lobby:create/join/list/list_saved/resume/delete_saved/create_character, room:leave) with three emission helpers (`emitGameStateToClient`, `emitGameStateToRoom`, `emitGameStateToOthers`), `RoomService` (in-memory room registry, IDs = first 8 UUID chars, tracks `creatorId`). Uses `GameService.getState()` for consistent `game:state` emissions. **`RoomGateway` does not inject `GameState`** — room data access goes through `GameService` and `RoomService` methods
- `campaign/` — `CampaignStore` (persist/restore per-campaign files in `data/campaigns/{id}.json`, schema v2 with flattened `SavedEffect` format, 1s debounced write with atomic temp+rename; OnModuleInit async load, OnModuleDestroy flush; stores HP/XP/level/summary/campaignTheme/inventory/coins/equipment/merchants/trade state; `migrateV1ToV2()` auto-converts old saves)
- `dto/` — `schemas.ts` (24 Zod schemas for all WebSocket handlers with `.strict()` mode and inferred types; replaces old class-based DTOs), `ai-response.dto.ts` (incl. `MerchantSeed`/`MerchantSeedItem`/`ConditionSeed`/`ConditionEffectSeed` with unified `statValue`/`statOperation`)
- `pipes/` — `zod-validation.pipe.ts` (global NestJS pipe: `safeParse` → `BadRequestException` on failure, no-op when no schema attached)
- `ai/` — Provider pattern: `AiService` → `OpencodeProvider` (raw HTTP with per-room sessions). `AiService` implements `OnModuleDestroy` — calls `provider.destroy()` to clean up all active AI sessions on shutdown. `summarizeHistory()` for long-term memory. Empty `AI_API_KEY` → fallback narration. `onRoomReady()`/`onRoomEmpty()` lifecycle for session create/delete. `OpencodeProvider` has private helpers: `createSession()` (shared session creation), `formatHistoryEntries()` (history formatting), `buildTradePrompt()` (verbose/condensed trade prompt), `buildActionLines()` (action rendering + roll DC hint). `buildIncrementalPrompt()` and `buildPrompt()` use these shared helpers to avoid duplication.

**Frontend** — under `frontend/src/`:
- `contexts/AppProviders.tsx` — Composes all providers in a single wrapper (Socket → Auth → Player → Game → Trade → Inventory)
- `contexts/SocketContext.tsx` — Socket.IO connection + event routing via `on`/`off`/`emit` (internal, not consumed by components)
- `contexts/AuthContext.tsx` — `userId`, `page` (useReducer), `connected`, `error`, `login`, `logout`. Listens: `connect` (re-auth), `disconnect` (10s timer), `game:error` (auth required)
- `contexts/PlayerContext.tsx` — `player` identity + room lobby ops (`createRoom`, `joinRoom`, `leaveRoom`, `backToLobby`, `createCharacter`, `allocateAttributes`, `fetchKits`, `resumeCampaign`, `listSavedCampaigns`, `deleteSavedCampaign`). Listens: `player:registered`, `disconnect`
- `contexts/GameContext.tsx` — `gameState`, `messages`, `turnUpdate`, `typingPlayers`, `isAiProcessing` + game actions (`sendAction`, `sendRoll`, `startCampaign`, `emitTyping`, `emitTypingStop`, `refetchGameState`). `refetchGameState()` re-emits `game:get_state` and navigates to lobby if room not found. Listens: `game:state`, `game:narration`, `game:turn`, `game:message`, `game:player_action`, `game:processing`, `game:typing`, `game:typing_stop`, `game:condition_tick`, `game:level_up`, `game:antidote_result`, `game:disband`
- `contexts/TradeContext.tsx` — `tradeState`, `isTradeLocked` + trade actions (`initiateTrade`, `buyItem`, `sellItem`, `endTrade`). Listens: `game:trade_state`
- `contexts/InventoryContext.tsx` — equip/unequip/useItem/antidote actions (`emitEquip`, `emitUnequip`, `emitUseItem`, `emitUseAntidote`). No listeners.
- `hooks/useAuth.ts`, `usePlayer.ts`, `useGame.ts`, `useTrade.ts`, `useInventory.ts` — Thin re-exports of `useContext` for each context
- `hooks/useGameTurn.ts` — derives `isMyTurn`, `isRollRequest`, `canAct`, etc. from `gameState` + `turnUpdate` (pure, no context dependency)
- `types/game.types.ts` — TS interfaces mirroring backend DTOs (includes `Message` with 4 types: system/action/narration/roll). Also includes typed response interfaces (`LoginResponse`, `CreateRoomResponse`, etc.) for all socket emit callbacks — no `any` typed responses remain. `Room` type was removed as unused (room listing not exposed in UI).
- `pages/` — `Login`, `Lobby`, `CharacterCreation`, `WaitingRoom`, `GameRoom`
- `components/` — `Chat/` (MessageList, MessageInput, DiceRollButton, UseItemButton uses shared ConfirmUseModal), `GameStatus/` (CharacterSheet with active conditions + EffectRow + shared HoverPopup/ConfirmUseModal, MyCharacterStatus with condition indicators + shared CONDITION_ICONS, AttributeAllocationModal uses shared ATTRIBUTE_ICONS/ATTRIB_KEYS, and more), `Trade/` (TradeModal uses shared HoverPopup + ITEM_TYPE_ICONS), `Layout/` (Header, Toast, ErrorBoundary), `Lobby/` (CreateRoom, RoomList, SavedCampaigns), `shared/` (constants.ts with 4 icon maps, HoverPopup.tsx generic render-prop popup, ConfirmUseModal.tsx unified item confirmation)

## AI integration

| Env var | Default | Notes |
|---------|---------|-------|
| `AI_API_KEY` | `(empty)` | Empty → static fallback, no LLM call |
| `AI_MODEL` | `(empty)` | Passes through; no default override |
| `AI_BASE_URL` | `http://localhost:4096` | Opencode base URL |

Repo `.env` defaults: `AI_PROVIDER=opencode`, `AI_API_KEY=none`, `AI_BASE_URL=http://localhost:4096`. Config loaded in `ai.module.ts` via `ConfigService` factories.

Opencode provider uses inline JSON prompt + regex extraction. Invalid `call_player`/`call_roll` targets get coerced to `group_action` by `GameService.validateAiResponseTarget()` (also warns on invalid `conditions[].targetPlayerId`).

System prompt (`system.prompt.ts`) documents: Markdown narration, two-tier memory (history + summary), player levels, location/target rules, and out-of-game question handling.

## Key gotchas

- **UI is English** (`<html lang="en">`); AI narration supports `english | portuguese | spanish`; all source code is English.
- **Always-dark design** — custom Tailwind colors (`parchment`, `dungeon`, `gold`, `blood`, `magic`), pixel/mono font utilities (`text-pixel`, `text-mono`). No `dark:` variants.
- **Backend** uses CommonJS (`"module": "commonjs"` in tsconfig + `experimentalDecorators`). **Frontend** uses `"type": "module"`.
- **Roll fallback** — `handleRoll()` defaults skill to `'dexterity'` and DC to 10. Roll computed and emitted as `game:player_action` *before* AI processing. Frontend `sendRoll()` reads `turnUpdate.skill`/`dc` if `turnUpdate.type === 'call_roll'`.
- **Actions** are optimistically added for the sender (`characterName: 'You'`) and broadcast to others via `game:player_action`. **Rolls** add a placeholder `"Rolling dice..."` locally then broadcast the final result to all.
- **Campaign theme** — `campaignTheme` (free-form setting description) is a per-room param set at creation, persisted in saved campaigns, and injected into the system prompt.
- **Player model**: `id`, `userId`, `name`, `active` bool, 6 attributes, HP/XP/level, `activeConditions`, inventory (items with `effects: Effect[]`), coins, and equipment (body/mainHand/offHand slots).
- **History stores only narration text** (no JSON overhead) — saves tokens vs. storing full `AIResponse`.
- **Scene context** (`buildSceneContext()`) built from complete sentences + location + next-action + active conditions. Stored as `room.scene`, sent to AI every turn.
- **Cold restore** (`lobby:resume` when room not in memory) forces `gameStarted = false` — creator lands in waiting room and must click START. Warm restore (room in memory) preserves actual `gameStarted`.
- **Never use emoji/unicode characters to represent icons** — always use pixelarticons React components (`pixelarticons/react`) instead of characters like ▶, ✓, ✕, ⏳, etc.
- **HP/XP/Leveling** — Player model includes `hp`, `maxHp`, `level` (1-20), `xp`, `maxXp`, `pendingAttributePoints`. HP = `10 + CON mod`. XP thresholds from D&D 5e SRD. ASI levels (4/8/12/16/19) grant +2 attribute points. Backend engine is complete; XP gain is not yet triggered by game actions (no server-side `game:level_up` emit).
- **Attribute point-buy** — Character creation: 27-point pool, attributes range 8-15 (cost: 1pt for 8-12, 2pt for 13-14). Max attribute is 20.
- **Inventory & Equipment** — Players start with a dagger, 2 healing potions, and 50 coins. Items have types, slots, and `effects: Effect[]` (unified stat modifiers + hp changes). Equipment slots: body, mainHand, offHand. `PlayerService.equipItem` auto-unequips existing slot items and recalculates AC/effects via `GameState.recomputePlayer`; `PlayerService.unequipItem` also triggers recalculation. Two-handed weapons block off-hand slot. `PlayerService.useItem` processes all effect types (immediate heal/damage via `ConditionEngine.applyHpChange`, temporary→synthetic condition via `ConditionEngine.applyConditionToPlayer`, permanent→temporary fallback). `PlayerService.useAntidote` removes a condition by name (matched via `item.antidoteFor`) via `ConditionEngine.removeConditionFromPlayer` and consumes the item. Items with `antidoteFor` in their definition (catalog or AI-generated merchant) work as condition cures. Inventory/coins/equipment are persisted in saved campaigns.
- **AI sessions** — `AiService.onRoomReady()`/`onRoomEmpty()` delegate to `OpencodeProvider` for session lifecycle. Called by gateways via `AiService` (no direct `AI_PROVIDER` injection). Created on character creation / campaign resume; deleted on last leave / disband / delete_saved. 404/410 errors auto-recreate sessions.
- **History summarization** — `maybeSummarize()` triggers every 50 history entries. Uses a temporary AI session to merge new entries into `room.summary`. Guarded by a per-room `isSummarizing` Set to prevent concurrency. Summary is persisted in saved campaigns.
- **GameRoom layout** — Left sidebar (48px) with `MyCharacterStatus` (HP/XP bars, name, level, condition indicators) + modal navigation buttons (Sheet, Characters, Options, Leave). Main area has `CampaignStatusBar` at top, Chat in center, TypingIndicator + MessageInput + DiceRollButton at bottom. All panels (CharacterSheet with ActiveConditionsSection, CharacterList, Options, AttributeAllocation) are modals.
- **Campaign themes** — 18 preset themes (Medieval Fantasy, Lovecraftian Horror, Cyberpunk, Dark Souls, Pirate, Steampunk, Sci-Fi, Weird West, Post-Apocalyptic, Norse, Arabian Nights, Wuxia, Superhero, Arthurian, Zombie, Japanese Folklore, Space Horror, Post-Magic Apocalypse) + Custom free-form text. Set at room creation via `lobby:create { campaignTheme }`.
- **Markdown narration** — AI narration rendered with `react-markdown` + `remark-gfm`. Bold, blockquotes, code, lists, tables, horizontal rules supported.
- **Trade system** — `TradeService` manages trade session state (lock/unlock/markDone/removeFromTrade). `GameGateway` delegates to `TradeService` for all trade state mutations and uses `emitTradeStateToAll()` to broadcast per-player charisma-adjusted prices. `game:initiate_trade` triggers AI to generate merchants with 3-8 items each (items use unified `Effect[]`). Merchants are locked per location; moving clears them. Charisma modifier adjusts prices (±5% per mod point). `game:buy_item`/`game:sell_item` handle transactions; `game:end_trade` finalizes when all participants agree. Trading blocks all other actions via `isTradeLocked`. All trade state mutations (`lockTrade`/`unlockTrade`/`markDone`/`removeFromTrade`) are guarded by the `TurnManager` per-room lock to prevent races between concurrent disconnect, buy/sell, and end-trade operations.
- **Location field now mandatory** — AI must always include a `location` in responses. `"unknown location"` disables trading entirely (no merchants).
- **TradeModal** — `TradeModal` component renders merchant list, per-player price adjustments based on charisma, and buy/sell/end-trade controls. Participants and completion status are synced via `game:trade_state`.
- **DOT/HOT Tick** — `ConditionEngine.tickEffects()` runs at the end of every `processAiResponse` (each narration step). Decrements condition durations, applies damage/healing from `hpChange` formulas, removes expired conditions, and recalculates AC via `GameState.recomputePlayer()`. Results are emitted as `game:condition_tick` and update all clients' HP/AC/activeConditions. Suppressed conditions skip DOT/HOT and auto-unsuppress when `suppressRemaining` hits 0.
- **Input validation** — All WebSocket handlers use Zod schemas (`dto/schemas.ts`) with a global `ZodValidationPipe` registered in `main.ts`. Each handler applies `@UsePipes(new ZodValidationPipe(Schema))` with `.strict()` mode (rejects unknown keys). Invalid input throws `BadRequestException` with formatted field-level error messages. `@MessageBody()` types are `unknown` — the pipe guarantees the validated type at runtime.
- **Gateways never inject `GameState`** — `GameGateway` and `RoomGateway` access room data exclusively through `GameService` and `RoomService` methods. `GameState` is only injected in services (`GameService`, `PlayerService`, `MerchantService`, `TradeService`, `ConditionEngine`, `TurnManager`, `LevelingService`, `RoomService`, `CampaignStore`). This enforces a clean service-layer abstraction.
- **Error boundaries** — Two-layer `ErrorBoundary` system (root `App.tsx` + isolated `GameRoom.tsx`). Root catches render errors across all pages with "GO TO LOBBY" fallback. GameRoom adds "RETRY" that calls `refetchGameState()` to recover state via `game:get_state` re-emission. Errors are logged to console via `componentDidCatch`. Class component at `components/Layout/ErrorBoundary.tsx`.
- **React.memo convention** — 9 leaf components are wrapped with `React.memo` to prevent unnecessary re-renders from Socket-driven context updates: `Header`, `Toast`, `LocationBadge`, `PlayerCard`, `TypingIndicator`, `CampaignStatusBar`, `TurnIndicator`, `PlayerCircles`, `PlayerList`. All use default shallow comparison (no custom comparators). Stable refs like `gameState?.players ?? []` keep array props from changing on unrelated updates. New pure leaf components should also be wrapped with `memo()`.
