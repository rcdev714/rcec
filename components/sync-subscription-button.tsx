'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

export function SyncSubscriptionButton() {
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSync = async () => {
    setSyncing(true);
    setMessage(null);

    try {
      const response = await fetch('/api/subscriptions/sync', {
        method: 'POST',
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({
          type: 'success',
          text: data.message || 'Suscripción sincronizada exitosamente'
        });
        
        // Reload the page after 1.5 seconds to show updated data
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        setMessage({
          type: 'error',
          text: data.message || 'Error al sincronizar suscripción'
        });
      }
    } catch {
      setMessage({
        type: 'error',
        text: 'Error al conectar con el servidor'
      });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-2">
      <Button
        onClick={handleSync}
        disabled={syncing}
        variant="outline"
        size="sm"
        className="w-full"
      >
        {syncing ? (
          <>
            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            Sincronizando...
          </>
        ) : (
          <>
            <RefreshCw className="w-4 h-4 mr-2" />
            Sincronizar con Stripe
          </>
        )}
      </Button>

      {message && (
        <div className={`p-2 rounded text-xs ${
          message.type === 'success' 
            ? 'bg-green-50 text-green-800 border border-green-200' 
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {message.text}
        </div>
      )}
    </div>
  );
}

