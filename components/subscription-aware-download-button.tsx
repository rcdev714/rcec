'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Loader2, Lock } from 'lucide-react';
import { getUserSubscriptionClient, getSubscriptionStatus, canAccessFeature } from '@/lib/subscription';
import { UserSubscription } from '@/types/subscription';

interface SubscriptionAwareDownloadButtonProps {
  searchParams: Record<string, string>;
  totalCount: number;
  className?: string;
}

interface ProgressState {
  fetched: number;
  total: number;
  isActive: boolean;
}

export function SubscriptionAwareDownloadButton({ 
  searchParams, 
  totalCount, 
  className 
}: SubscriptionAwareDownloadButtonProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<ProgressState>({ fetched: 0, total: 0, isActive: false });
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [loadingSubscription, setLoadingSubscription] = useState(true);

  // Check if any filters are applied
  const hasFilters = Object.values(searchParams).some(value => value && value.trim() !== '');

  // Generate a unique session ID for progress tracking
  const [sessionId] = useState(() => `export_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);

  // Load subscription data
  useEffect(() => {
    async function loadSubscription() {
      try {
        const userSubscription = await getUserSubscriptionClient();
        setSubscription(userSubscription);
      } catch (error) {
        console.error('Error loading subscription:', error);
      } finally {
        setLoadingSubscription(false);
      }
    }

    loadSubscription();
  }, []);

  // Poll for progress updates
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isDownloading && totalCount > 1000) {
      setProgress({ fetched: 0, total: totalCount, isActive: true });
      
      interval = setInterval(async () => {
        try {
          const response = await fetch(`/api/companies/export/progress?sessionId=${sessionId}`);
          if (response.ok) {
            const data = await response.json();
            setProgress(prev => ({ ...prev, fetched: data.fetched || prev.fetched }));
          }
        } catch {
          // Silently continue if progress check fails
        }
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isDownloading, sessionId, totalCount]);

  const subscriptionStatus = getSubscriptionStatus(subscription);
  const canExport = canAccessFeature(subscriptionStatus.plan, 'export_data');

  const handleDownload = async () => {
    if (isDownloading || !canExport) return;

    setIsDownloading(true);
    setError(null);
    setProgress({ fetched: 0, total: totalCount, isActive: totalCount > 1000 });

    try {
      // Use API route for download (more reliable for binary data)
      const queryString = new URLSearchParams(
        Object.fromEntries(
          Object.entries(searchParams).filter(([, value]) => value && value.trim() !== '')
        )
      ).toString();
      
      const downloadUrl = `/api/companies/export${queryString ? `?${queryString}&sessionId=${sessionId}` : `?sessionId=${sessionId}`}`;
      
      // Fetch the file
      const response = await fetch(downloadUrl);
      
      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('No tienes permisos para exportar datos. Actualiza tu plan.');
        }
        throw new Error(`Download failed: ${response.status} ${response.statusText}`);
      }
      
      // Get the filename from the response headers
      const contentDisposition = response.headers.get('Content-Disposition');
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
      const filename = filenameMatch ? filenameMatch[1] : 'empresas-export.xlsx';
      
      // Create blob and download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);

    } catch (err) {
      console.error('Download failed:', err);
      setError(err instanceof Error ? err.message : 'Error al descargar el archivo');
    } finally {
      setIsDownloading(false);
      setProgress(prev => ({ ...prev, isActive: false }));
    }
  };

  const handleUpgradeClick = () => {
    window.location.href = '/pricing?upgrade=required';
  };

  // Format the button text - keep it short and clean
  const getButtonText = () => {
    if (loadingSubscription) return 'Cargando...';
    if (!canExport) return 'Actualizar Plan';
    if (isDownloading) return 'Descargando...';
    return hasFilters ? 'Descargar Excel' : 'Descargar Todo';
  };

  const getButtonIcon = () => {
    if (loadingSubscription || isDownloading) {
      return <Loader2 className="h-3 w-3 animate-spin" />;
    }
    if (!canExport) {
      return <Lock className="h-3 w-3" />;
    }
    return <Download className="h-3 w-3" />;
  };

  // Calculate progress percentage
  const progressPercentage = progress.isActive && progress.total > 0 
    ? Math.round((progress.fetched / progress.total) * 100) 
    : 0;

  const isButtonDisabled = loadingSubscription || isDownloading || totalCount === 0;

  return (
    <div className={className}>
      <div className="flex flex-col gap-2">
        <Button
          onClick={canExport ? handleDownload : handleUpgradeClick}
          disabled={isButtonDisabled}
          variant={canExport ? "outline" : "default"}
          size="sm"
          className={`flex items-center gap-2 h-8 px-3 text-sm ${
            !canExport ? 'bg-blue-600 hover:bg-blue-700 text-white' : ''
          }`}
        >
          {getButtonIcon()}
          {getButtonText()}
        </Button>

        {/* Subscription Warning */}
        {!loadingSubscription && !canExport && (
          <div className="text-xs text-yellow-600 bg-yellow-50 p-2 rounded border">
            <p>
              La exportación está disponible con el plan Pro o superior.
              <br />
              <span className="font-medium">Plan actual: {subscriptionStatus.plan}</span>
            </p>
          </div>
        )}

        {/* Progress Bar */}
        {progress.isActive && (
          <div className="space-y-1">
            <div className="w-full bg-gray-200 rounded-full h-1.5">
              <div 
                className="bg-blue-600 h-1.5 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{progress.fetched.toLocaleString()} / {progress.total.toLocaleString()}</span>
              <span>{progressPercentage}%</span>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <p className="text-xs text-destructive">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
