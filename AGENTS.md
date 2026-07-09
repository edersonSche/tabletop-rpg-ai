# AGENTS.md

Two-package monorepo: `backend/` (NestJS 11, Socket.IO 4.8), `frontend/` (React 19, Vite 6, Tailwind 3.4, react-markdown 9, remark-gfm 4). No root `package.json` — each package is independent. **No tests, no lint, no formatter, no CI.**  

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
- `game/` — `GameGateway` (action/roll/start/typing/get_state/room:join/allocate_attributes/equip/unequip/use_item/use_antidote/initiate_trade/buy_item/sell_item/end_trade, emits `game:condition_tick`, `game:antidote_result`), `GameService` (turn orchestration, AI target validation, `processConditions()`/`seedToEffect()` for AI-generated narrative conditions, `buildSceneContext()` with active conditions, `maybeSummarize()` history summarization, `initiateTrade()` AI-driven merchant generation, calls `tickEffects()` at end of `processAiResponse`), `GameState` (in-memory Map with HP/XP/level engine, XP thresholds, ASI levels, `activeConditions`, `Effect` engine for stat modifiers/hp changes, condition lifecycle: `applyConditionToPlayer`/`removeConditionFromPlayer`/`tickEffects`, `recomputePlayer` for AC recalculation from equipment+conditions, inventory/coins/equipment system, merchant/trade state, antidote system: `useAntidote()` cures/suppresses conditions via items with `antidoteFor`; `useItem` handles immediate/temporary/permanent effects; `equipItem` auto-unequips existing slot items and calls `recomputePlayer`), `TurnManager` (lock-per-room, stores `turnSkill`/`turnDc`, blocks actions during active trade)
- `room/` — `RoomGateway` (lobby:create/join/list/list_saved/resume/delete_saved/create_character, room:leave), `RoomService` (in-memory room registry, IDs = first 8 UUID chars, tracks `creatorId`)
- `campaign/` — `CampaignStore` (persist/restore to `data/campaigns.json`, 1s debounced write; stores HP/XP/level/summary/campaignTheme/inventory/coins/equipment/merchants/trade state)
- `dto/` — `ai-response.dto.ts` (incl. `MerchantSeed`/`MerchantSeedItem`/`ConditionSeed`/`ConditionEffectSeed` with unified `statValue`/`statOperation`), `game-action.dto.ts` (incl. `InitiateTradeDto`, `BuyItemDto`, `SellItemDto`, `EndTradeDto`, `UseAntidoteDto`)
- `ai/` — Provider pattern: `AiService` → `OpencodeProvider` (raw HTTP with per-room sessions). `summarizeHistory()` for long-term memory. Empty `AI_API_KEY` → fallback narration. `onRoomReady()`/`onRoomEmpty()` lifecycle for session create/delete

**Frontend** — under `frontend/src/`:
- `hooks/SocketContext.tsx` — Socket.IO context provider; owns all server event subscriptions, page dispatches, messages, gameState, turnUpdate, isAiProcessing, typingPlayers, emitUseAntidote
- `hooks/useSocket.ts` — re-exports `useSocketContext()`
- `hooks/useGameTurn.ts` — derives `isMyTurn`, `isRollRequest`, `canAct`, etc. from `gameState` + `turnUpdate`
- `types/game.types.ts` — TS interfaces mirroring backend DTOs
- `pages/` — `Login`, `Lobby`, `CharacterCreation`, `WaitingRoom`, `GameRoom`
- `components/` — `Chat/` (MessageList, MessageInput, DiceRollButton), `GameStatus/` (LocationBadge, TurnIndicator, PlayerList, PlayerCard, CharacterSheet with active conditions + EffectRow, TypingIndicator, CampaignStatusBar, MyCharacterStatus with condition indicators, PlayerCircles, AttributeAllocationModal, CharacterListModal, OptionsModal), `Trade/` (TradeModal uses EffectRow from CharacterSheet + antidoteFor display), `Layout/` (Header, Toast), `Lobby/` (CreateRoom, RoomList, SavedCampaigns)

## AI integration

| Env var | Default | Notes |
|---------|---------|-------|
| `AI_API_KEY` | `(empty)` | Empty → static fallback, no LLM call |
| `AI_MODEL` | `(empty)` | Passes through; no default override |
| `AI_BASE_URL` | `http://localhost:4096` | Opencode base URL |

Repo `.env` defaults: `AI_PROVIDER=opencode`, `AI_API_KEY=none`, `AI_BASE_URL=http://localhost:4096`. Config loaded in `app.module.ts:27-30` via `ConfigModule.forRoot()`.

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
- **Inventory & Equipment** — Players start with a dagger, 2 healing potions, and 50 coins. Items have types, slots, and `effects: Effect[]` (unified stat modifiers + hp changes). Equipment slots: body, mainHand, offHand. `game:equip` auto-unequips existing slot items and recalculates AC/effects via `recomputePlayer`; `game:unequip` also triggers recalculation. Two-handed weapons block off-hand slot. `game:use_item` processes all effect types (immediate heal/damage, temporary→synthetic condition, permanent→temporary fallback). `game:use_antidote` removes a condition by name (matched via `item.antidoteFor`) and consumes the item. Items with `antidoteFor` in their definition (catalog or AI-generated merchant) work as condition cures. Inventory/coins/equipment are persisted in saved campaigns.
- **AI sessions** — `OpencodeProvider` creates a dedicated AI session per room on `onRoomReady()` (character creation / campaign resume). Session deleted on `onRoomEmpty()` (last leave / disband / delete_saved). 404/410 errors auto-recreate the session.
- **History summarization** — `maybeSummarize()` triggers every 50 history entries. Uses a temporary AI session to merge new entries into `room.summary`. Guarded by a per-room `isSummarizing` Set to prevent concurrency. Summary is persisted in saved campaigns.
- **GameRoom layout** — Left sidebar (48px) with `MyCharacterStatus` (HP/XP bars, name, level, condition indicators) + modal navigation buttons (Sheet, Characters, Options, Leave). Main area has `CampaignStatusBar` at top, Chat in center, TypingIndicator + MessageInput + DiceRollButton at bottom. All panels (CharacterSheet with ActiveConditionsSection, CharacterList, Options, AttributeAllocation) are modals.
- **Campaign themes** — 18 preset themes (Medieval Fantasy, Lovecraftian Horror, Cyberpunk, Dark Souls, Pirate, Steampunk, Sci-Fi, Weird West, Post-Apocalyptic, Norse, Arabian Nights, Wuxia, Superhero, Arthurian, Zombie, Japanese Folklore, Space Horror, Post-Magic Apocalypse) + Custom free-form text. Set at room creation via `lobby:create { campaignTheme }`.
- **Markdown narration** — AI narration rendered with `react-markdown` + `remark-gfm`. Bold, blockquotes, code, lists, tables, horizontal rules supported.
- **Trade system** — `game:initiate_trade` triggers AI to generate merchants with 3-8 items each (items use unified `Effect[]`). Merchants are locked per location; moving clears them. Charisma modifier adjusts prices (±5% per mod point). `game:buy_item`/`game:sell_item` handle transactions; `game:end_trade` finalizes when all participants agree. Trading blocks all other actions via `isTradeLocked`.
- **Location field now mandatory** — AI must always include a `location` in responses. `"unknown location"` disables trading entirely (no merchants).
- **TradeModal** — `TradeModal` component renders merchant list, per-player price adjustments based on charisma, and buy/sell/end-trade controls. Participants and completion status are synced via `game:trade_state`.
- **DOT/HOT Tick** — `tickEffects()` runs at the end of every `processAiResponse` (each narration step). Decrements condition durations, applies damage/healing from `hpChange` formulas, removes expired conditions, and recalculates AC via `recomputePlayer()`. Results are emitted as `game:condition_tick` and update all clients' HP/AC/activeConditions. Suppressed conditions skip DOT/HOT and auto-unsuppress when `suppressRemaining` hits 0.
