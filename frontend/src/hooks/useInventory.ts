import { emitEquip, emitUnequip, emitUseItem, emitUseAntidote } from '../stores/inventory';

const inventoryApi = { emitEquip, emitUnequip, emitUseItem, emitUseAntidote };

export function useInventory() {
  return inventoryApi;
}
