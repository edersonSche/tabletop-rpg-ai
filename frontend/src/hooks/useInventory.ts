import { useInventoryContext } from '../contexts/InventoryContext';

export function useInventory() {
  return useInventoryContext();
}
