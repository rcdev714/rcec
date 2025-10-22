'use client';

import { useEffect, useRef } from 'react';

interface StripePricingTableProps {
  customerEmail?: string | null;
}

export default function StripePricingTable({ customerEmail }: StripePricingTableProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Wait for Stripe script to load
    const checkStripeLoaded = setInterval(() => {
      if (customElements.get('stripe-pricing-table')) {
        clearInterval(checkStripeLoaded);
      }
    }, 100);

    return () => clearInterval(checkStripeLoaded);
  }, []);

  const pricingTableId = process.env.NEXT_PUBLIC_STRIPE_PRICING_TABLE_ID;
  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

  useEffect(() => {
    // Render Stripe Pricing Table
    // NOTE: Stripe Pricing Tables don't support client-reference-id
    // We look up users by email in the webhook instead
    if (!pricingTableId || !publishableKey) {
      return;
    }

    if (containerRef.current) {
      containerRef.current.innerHTML = `
        <stripe-pricing-table
          pricing-table-id="${pricingTableId}"
          publishable-key="${publishableKey}"
          ${customerEmail ? `customer-email="${customerEmail}"` : ''}
        >
        </stripe-pricing-table>
      `;
    }
  }, [pricingTableId, publishableKey, customerEmail]);

  // Fail gracefully if configuration is missing
  if (!pricingTableId || !publishableKey) {
    return (
      <div className="w-full p-8 text-center bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-yellow-800">
          El sistema de pagos no está configurado correctamente. Por favor, contacta a soporte.
        </p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="w-full" />
  );
}

