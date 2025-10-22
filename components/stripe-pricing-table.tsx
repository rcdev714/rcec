'use client';

import { useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';

interface StripePricingTableProps {
  customerEmail?: string | null;
}

export default function StripePricingTable({ customerEmail }: StripePricingTableProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();
  const userIdRef = useRef<string | null>(null);

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
    // Resolve current user ID to pass as client-reference-id to Stripe Pricing Table
    // Only proceed if configuration is available
    if (!pricingTableId || !publishableKey) {
      return;
    }

    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        userIdRef.current = user?.id || null;
        if (containerRef.current) {
          containerRef.current.innerHTML = `
            <stripe-pricing-table
              pricing-table-id="${pricingTableId}"
              publishable-key="${publishableKey}"
              ${customerEmail ? `customer-email="${customerEmail}"` : ''}
              ${userIdRef.current ? `client-reference-id="${userIdRef.current}"` : ''}
            >
            </stripe-pricing-table>
          `;
        }
      } catch {
        // noop
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pricingTableId, publishableKey]);

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

