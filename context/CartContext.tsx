'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

interface CartItem {
  id: string;
  productId: string;
  productName: string;
  productSlug: string;
  price: number;
  quantity: number;
  total: number;
  image: string | null;
  inventory: number;
}

interface CartContextType {
  items: CartItem[];
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
  count: number;
  loading: boolean;
  addToCart: (productId: string, quantity: number) => Promise<void>;
  updateQuantity: (itemId: string, quantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  fetchCart: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const api = axios.create({
  baseURL: `${process.env.NEXT_PUBLIC_API_URL}/api`,
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [subtotal, setSubtotal] = useState(0);
  const [tax, setTax] = useState(0);
  const [shipping, setShipping] = useState(0);
  const [total, setTotal] = useState(0);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchCart = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }

      const response = await api.get('/cart');
      const cartData = response.data;
      
      setItems(cartData.items || []);
      setSubtotal(cartData.subtotal || 0);
      setTax(cartData.tax || 0);
      setShipping(cartData.shipping || 0);
      setTotal(cartData.total || 0);
    } catch (error) {
      console.error('Failed to fetch cart:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCartCount = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await api.get('/cart/count');
      setCount(response.data.count || 0);
    } catch (error) {
      console.error('Failed to fetch cart count:', error);
    }
  }, []);

  const addToCart = async (productId: string, quantity: number) => {
    try {
      await api.post('/cart/add', { productId, quantity });
      await fetchCart();
      await fetchCartCount();
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to add to cart');
    }
  };

  const updateQuantity = async (itemId: string, quantity: number) => {
    try {
      await api.put(`/cart/items/${itemId}`, { quantity });
      await fetchCart();
      await fetchCartCount();
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to update quantity');
    }
  };

  const removeItem = async (itemId: string) => {
    try {
      await api.delete(`/cart/items/${itemId}`);
      await fetchCart();
      await fetchCartCount();
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to remove item');
    }
  };

  const clearCart = async () => {
    try {
      await api.delete('/cart/clear');
      await fetchCart();
      await fetchCartCount();
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to clear cart');
    }
  };

  useEffect(() => {
    fetchCart();
    fetchCartCount();
  }, [fetchCart, fetchCartCount]);

  return (
    <CartContext.Provider
      value={{
        items,
        subtotal,
        tax,
        shipping,
        total,
        count,
        loading,
        addToCart,
        updateQuantity,
        removeItem,
        clearCart,
        fetchCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}