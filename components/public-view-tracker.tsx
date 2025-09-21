'use client';

import { useEffect } from 'react';

export default function PublicViewTracker({ offeringId }: { offeringId: string }) {
  useEffect(() => {
    const track = async () => {
      try {
        await fetch('/api/public-views', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ offering_id: offeringId }),
          keepalive: true,
        });
      } catch {
        // ignore
      }
    };
    track();
  }, [offeringId]);

  return null;
}


