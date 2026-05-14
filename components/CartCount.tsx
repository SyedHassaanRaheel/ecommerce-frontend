'use client';

import { useCart } from '../context/CartContext';
import Link from 'next/link';

export default function CartCount() {
  const { count, loading } = useCart();

  if (loading) {
    return (
      <Link href="/cart" className="relative">
        <span className="text-gray-700">🛒</span>
      </Link>
    );
  }

  return (
    <Link href="/cart" className="relative">
      <span className="text-gray-700">🛒</span>
      {count > 0 && (
        <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
          {count}
        </span>
      )}
    </Link>
  );
}