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

  const pricingTableId = process.env.NEXT_PUBLIC_STRIPE_PRICING_TABLE_ID || 'prctbl_1SIawmRdKjhyWYl47IoC0Dwh';
  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || 'pk_live_51RuCj6RdKjhyWYl4QGOH2QepQ2az9BUx6mlTlpD7mj26BJTBzDoFjtWEo3kEwAqf0rNt6ZnwqifvVJODBff16Qfp00uVCsE3pR';

  return (
    <div ref={containerRef} className="w-full">
      <div
        dangerouslySetInnerHTML={{
          __html: `
            <stripe-pricing-table 
              pricing-table-id="${pricingTableId}"
              publishable-key="${publishableKey}"
              ${customerEmail ? `customer-email="${customerEmail}"` : ''}
            >
            </stripe-pricing-table>
          `
        }}
      />
    </div>
  );
}

