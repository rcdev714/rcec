// Type definitions for Stripe Pricing Table custom element
// https://stripe.com/docs/payments/checkout/pricing-table

declare namespace JSX {
  interface IntrinsicElements {
    'stripe-pricing-table': React.DetailedHTMLProps<
      React.HTMLAttributes<HTMLElement>,
      HTMLElement
    > & {
      'pricing-table-id': string;
      'publishable-key': string;
      'customer-email'?: string;
      'client-reference-id'?: string;
      'customer-session-client-secret'?: string;
    };
  }
}

export {};

