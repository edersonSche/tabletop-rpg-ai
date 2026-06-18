export type Page = 'login' | 'lobby' | 'character_creation' | 'waiting_room' | 'game_room';

export type PageAction =
  | { type: 'LOGGED_IN' }
  | { type: 'LOGGED_OUT' }
  | { type: 'CREATED_ROOM' }
  | { type: 'JOIN_NEEDS_CHARACTER' }
  | { type: 'CHARACTER_CREATED' }
  | { type: 'CHARACTER_CREATED_AND_STARTED' }
  | { type: 'JOINED_ROOM' }
  | { type: 'CAMPAIGN_STARTED' }
  | { type: 'LEFT_ROOM' }
  | { type: 'DISBANDED' };

export function pageReducer(state: Page, action: PageAction): Page {
  switch (action.type) {
    case 'LOGGED_IN':
      if (state === 'login') return 'lobby';
      return state;
    case 'LOGGED_OUT':
      return 'login';
    case 'CREATED_ROOM':
      if (state === 'lobby') return 'character_creation';
      return state;
    case 'JOIN_NEEDS_CHARACTER':
      if (state === 'lobby') return 'character_creation';
      return state;
    case 'CHARACTER_CREATED':
      if (state === 'character_creation') return 'waiting_room';
      return state;
    case 'CHARACTER_CREATED_AND_STARTED':
      if (state === 'character_creation' || state === 'lobby') return 'game_room';
      return state;
    case 'JOINED_ROOM':
      if (state === 'lobby') return 'waiting_room';
      return state;
    case 'CAMPAIGN_STARTED':
      if (state === 'waiting_room') return 'game_room';
      return state;
    case 'LEFT_ROOM':
    case 'DISBANDED':
      return 'lobby';
    default:
      return state;
  }
}
