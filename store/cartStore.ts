import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '@/lib/axios';
import toast from 'react-hot-toast';

interface CartItem {
  id: string;
  productId: string;
  productName: string;
  productSlug: string;
  price: number;
  quantity: number;
  total: number;
  image: string | null;
}

interface CartResponse {
  items: CartItem[];
  subtotal: number;
  totalItems: number;
  sessionId?: string;
}

interface CartStore {
  items: CartItem[];
  subtotal: number;
  totalItems: number;
  isLoading: boolean;
  fetchCart: () => Promise<void>;
  addToCart: (productId: string, quantity: number, variantId?: string) => Promise<void>;
  updateQuantity: (itemId: string, quantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  clearCart: () => Promise<void>;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      subtotal: 0,
      totalItems: 0,
      isLoading: false,
      
      fetchCart: async () => {
        set({ isLoading: true });
        try {
          const response = await api.get<CartResponse>('/cart');
          set({
            items: response.data.items,
            subtotal: response.data.subtotal,
            totalItems: response.data.totalItems,
            isLoading: false
          });
          
          if (response.data.sessionId) {
            localStorage.setItem('cart_session_id', response.data.sessionId);
          }
        } catch (error: any) {
          set({ isLoading: false });
          
          // Handle network errors specifically
          if (error.code === 'ERR_NETWORK') {
            console.error('Cannot connect to server. Please check if backend is running.');
            toast.error('Cannot connect to server. Please try again later.');
          } else {
            console.error('Failed to fetch cart:', error);
            toast.error('Failed to load cart');
          }
        }
      },
      
      addToCart: async (productId: string, quantity: number, variantId?: string) => {
        set({ isLoading: true });
        try {
          const response = await api.post<CartResponse>('/cart/add', {
            productId,
            quantity,
            variantId
          });
          
          set({
            items: response.data.items,
            subtotal: response.data.subtotal,
            totalItems: response.data.totalItems,
            isLoading: false
          });
          
          if (response.data.sessionId) {
            localStorage.setItem('cart_session_id', response.data.sessionId);
          }
          
          toast.success('Added to cart');
        } catch (error: any) {
          set({ isLoading: false });
          
          if (error.code === 'ERR_NETWORK') {
            toast.error('Cannot connect to server. Please check your connection.');
          } else {
            toast.error(error.response?.data?.message || 'Failed to add item to cart');
          }
          throw error;
        }
      },
      
      updateQuantity: async (itemId: string, quantity: number) => {
        set({ isLoading: true });
        try {
          const response = await api.put<CartResponse>(`/cart/item/${itemId}`, { quantity });
          set({
            items: response.data.items,
            subtotal: response.data.subtotal,
            totalItems: response.data.totalItems,
            isLoading: false
          });
        } catch (error: any) {
          set({ isLoading: false });
          
          if (error.code === 'ERR_NETWORK') {
            toast.error('Network error. Please check your connection.');
          } else {
            toast.error('Failed to update quantity');
          }
          throw error;
        }
      },
      
      removeItem: async (itemId: string) => {
        set({ isLoading: true });
        try {
          const response = await api.delete<CartResponse>(`/cart/item/${itemId}`);
          set({
            items: response.data.items,
            subtotal: response.data.subtotal,
            totalItems: response.data.totalItems,
            isLoading: false
          });
          toast.success('Item removed');
        } catch (error: any) {
          set({ isLoading: false });
          
          if (error.code === 'ERR_NETWORK') {
            toast.error('Network error. Please check your connection.');
          } else {
            toast.error('Failed to remove item');
          }
          throw error;
        }
      },
      
      clearCart: async () => {
        set({ isLoading: true });
        try {
          await api.delete('/cart/clear');
          set({
            items: [],
            subtotal: 0,
            totalItems: 0,
            isLoading: false
          });
        } catch (error: any) {
          set({ isLoading: false });
          
          if (error.code === 'ERR_NETWORK') {
            toast.error('Network error. Please check your connection.');
          } else {
            toast.error('Failed to clear cart');
          }
          throw error;
        }
      }
    }),
    {
      name: 'cart-storage',
      partialize: (state: CartStore) => ({ 
        items: state.items, 
        subtotal: state.subtotal, 
        totalItems: state.totalItems 
      })
    }
  )
);