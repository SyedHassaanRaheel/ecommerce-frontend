'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { useCartStore } from '@/store/cartStore';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/axios';
import toast from 'react-hot-toast';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY!);

function CheckoutForm() {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const { items, subtotal, clearCart } = useCartStore();
  const user = useAuthStore((state) => state.user);
  
  const [formData, setFormData] = useState({
    customerName: user?.firstName ? `${user.firstName} ${user.lastName || ''}` : '',
    customerEmail: user?.email || '',
    customerPhone: '',
    shippingAddress: {
      line1: '',
      line2: '',
      city: '',
      state: '',
      postalCode: '',
      country: 'US'
    }
  });
  
  const validateForm = () => {
    if (!formData.customerName.trim()) {
      toast.error('Please enter your full name');
      return false;
    }
    if (!formData.customerEmail.trim() || !/\S+@\S+\.\S+/.test(formData.customerEmail)) {
      toast.error('Please enter a valid email address');
      return false;
    }
    if (!formData.shippingAddress.line1.trim()) {
      toast.error('Please enter your address');
      return false;
    }
    if (!formData.shippingAddress.city.trim()) {
      toast.error('Please enter your city');
      return false;
    }
    if (!formData.shippingAddress.state.trim()) {
      toast.error('Please enter your state');
      return false;
    }
    if (!formData.shippingAddress.postalCode.trim()) {
      toast.error('Please enter your postal code');
      return false;
    }
    return true;
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    if (!stripe || !elements) {
      toast.error('Payment system is not ready. Please try again.');
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Create order first
      const orderResponse = await api.post('/orders/create', formData);
      const { clientSecret, order } = orderResponse.data;
      
      // Confirm payment
      const { error } = await stripe.confirmPayment({
        elements,
        clientSecret,
        confirmParams: {
          return_url: `${window.location.origin}/order-confirmation?orderId=${order.id}`,
        },
      });
      
      if (error) {
        // Handle different types of Stripe errors
        let errorMessage = 'Payment failed. Please try again.';
        
        if (error.message) {
          errorMessage = error.message;
        } else if (error.type) {
          switch (error.type) {
            case 'card_error':
              errorMessage = 'Your card was declined. Please use a different card.';
              break;
            case 'validation_error':
              errorMessage = 'Please check your payment information and try again.';
              break;
            default:
              errorMessage = 'An error occurred with your payment. Please try again.';
          }
        }
        
        toast.error(errorMessage);
        setIsLoading(false);
      } else {
        // Payment successful - clear cart
        await clearCart();
        // The return_url will handle the redirect
      }
    } catch (error: any) {
      console.error('Checkout error:', error);
      
      // Handle API errors
      if (error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else if (error.message) {
        toast.error(error.message);
      } else {
        toast.error('Failed to process checkout. Please try again.');
      }
      
      setIsLoading(false);
    }
  };
  
  const tax = subtotal * 0.1;
  const shipping = subtotal > 50 ? 0 : 10;
  const total = subtotal + tax + shipping;
  
  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Contact Information */}
        <div className="space-y-4">
          <h3 className="font-semibold text-lg">Contact Information</h3>
          
          <div>
            <label className="block text-sm font-medium mb-1">Full Name *</label>
            <input
              type="text"
              required
              value={formData.customerName}
              onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Email *</label>
            <input
              type="email"
              required
              value={formData.customerEmail}
              onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Phone</label>
            <input
              type="tel"
              value={formData.customerPhone}
              onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
        
        {/* Shipping Address */}
        <div className="space-y-4">
          <h3 className="font-semibold text-lg">Shipping Address</h3>
          
          <div>
            <label className="block text-sm font-medium mb-1">Address Line 1 *</label>
            <input
              type="text"
              required
              value={formData.shippingAddress.line1}
              onChange={(e) => setFormData({
                ...formData,
                shippingAddress: { ...formData.shippingAddress, line1: e.target.value }
              })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Address Line 2</label>
            <input
              type="text"
              value={formData.shippingAddress.line2}
              onChange={(e) => setFormData({
                ...formData,
                shippingAddress: { ...formData.shippingAddress, line2: e.target.value }
              })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">City *</label>
              <input
                type="text"
                required
                value={formData.shippingAddress.city}
                onChange={(e) => setFormData({
                  ...formData,
                  shippingAddress: { ...formData.shippingAddress, city: e.target.value }
                })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">State *</label>
              <input
                type="text"
                required
                value={formData.shippingAddress.state}
                onChange={(e) => setFormData({
                  ...formData,
                  shippingAddress: { ...formData.shippingAddress, state: e.target.value }
                })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Postal Code *</label>
              <input
                type="text"
                required
                value={formData.shippingAddress.postalCode}
                onChange={(e) => setFormData({
                  ...formData,
                  shippingAddress: { ...formData.shippingAddress, postalCode: e.target.value }
                })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Country *</label>
              <select
                required
                value={formData.shippingAddress.country}
                onChange={(e) => setFormData({
                  ...formData,
                  shippingAddress: { ...formData.shippingAddress, country: e.target.value }
                })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
              >
                <option value="US">United States</option>
                <option value="CA">Canada</option>
                <option value="UK">United Kingdom</option>
              </select>
            </div>
          </div>
        </div>
      </div>
      
      {/* Payment Element */}
      <div className="border-t pt-6">
        <h3 className="font-semibold text-lg mb-4">Payment Information</h3>
        <PaymentElement />
      </div>
      
      {/* Order Summary */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="font-semibold mb-3">Order Summary</h3>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span>Subtotal ({items.length} items)</span>
            <span>${subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>Shipping</span>
            <span>{shipping === 0 ? 'Free' : `$${shipping.toFixed(2)}`}</span>
          </div>
          <div className="flex justify-between">
            <span>Tax (10%)</span>
            <span>${tax.toFixed(2)}</span>
          </div>
          <div className="border-t pt-2 mt-2">
            <div className="flex justify-between font-semibold">
              <span>Total</span>
              <span className="text-indigo-600">${total.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
      
      <button
        type="submit"
        disabled={!stripe || isLoading}
        className="w-full py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Processing...
          </span>
        ) : (
          `Pay $${total.toFixed(2)}`
        )}
      </button>
    </form>
  );
}

export default function CheckoutPage() {
  const { items, subtotal } = useCartStore();
  const router = useRouter();
  
  useEffect(() => {
    if (items.length === 0) {
      router.push('/cart');
    }
  }, [items, router]);
  
  if (items.length === 0) {
    return null;
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Checkout</h1>
      
      <Elements stripe={stripePromise}>
        <CheckoutForm />
      </Elements>
    </div>
  );
}