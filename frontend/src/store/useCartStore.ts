import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { MenuItem } from '@/lib/api';

export interface CartItem {
  cartItemId: string; // unique ID for the cart item (allows same menu item with different notes)
  menuItem: MenuItem;
  quantity: number;
  notes: string;
}

interface CartState {
  items: CartItem[];
  addItem: (menuItem: MenuItem, quantity: number, notes?: string) => void;
  updateQuantity: (cartItemId: string, quantity: number) => void;
  removeItem: (cartItemId: string) => void;
  clearCart: () => void;
  getTotalItems: () => number;
  getSubtotal: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (menuItem, quantity, notes = '') => {
        set((state) => {
          // If the exact same item with the same notes exists, just increment quantity
          const existingItemIndex = state.items.findIndex(
            (i) => i.menuItem.id === menuItem.id && i.notes === notes
          );

          if (existingItemIndex > -1) {
            const newItems = [...state.items];
            newItems[existingItemIndex].quantity += quantity;
            return { items: newItems };
          }

          // Otherwise, add as a new row
          return {
            items: [
              ...state.items,
              {
                cartItemId: Math.random().toString(36).substring(7),
                menuItem,
                quantity,
                notes,
              },
            ],
          };
        });
      },
      updateQuantity: (cartItemId, quantity) => {
        set((state) => ({
          items: quantity > 0
            ? state.items.map((i) => (i.cartItemId === cartItemId ? { ...i, quantity } : i))
            : state.items.filter((i) => i.cartItemId !== cartItemId),
        }));
      },
      removeItem: (cartItemId) => {
        set((state) => ({
          items: state.items.filter((i) => i.cartItemId !== cartItemId),
        }));
      },
      clearCart: () => set({ items: [] }),
      getTotalItems: () => {
        return get().items.reduce((total, item) => total + item.quantity, 0);
      },
      getSubtotal: () => {
        return get().items.reduce((total, item) => {
          const price = parseFloat(item.menuItem.price);
          return total + price * item.quantity;
        }, 0);
      },
    }),
    {
      name: 'tawlax-cart',
    }
  )
);
