export type Page = 'lobby' | 'waiting_room' | 'game_room';

export type PageAction =
  | { type: 'JOINED_ROOM' }
  | { type: 'CAMPAIGN_STARTED' }
  | { type: 'LEFT_ROOM' }
  | { type: 'DISBANDED' };

export function pageReducer(state: Page, action: PageAction): Page {
  switch (action.type) {
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
