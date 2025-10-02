'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';

interface DownloadExcelButtonProps {
  searchParams: Record<string, string>;
  totalCount: number;
  className?: string;
}

interface ProgressState {
  fetched: number;
  total: number;
  isActive: boolean;
}

export function DownloadExcelButton({ searchParams, totalCount, className }: DownloadExcelButtonProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<ProgressState>({ fetched: 0, total: 0, isActive: false });

  // Check if any filters are applied
  const hasFilters = Object.values(searchParams).some(value => value && value.trim() !== '');

  // Generate a unique session ID for progress tracking
  const [sessionId] = useState(() => `export_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);

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

  const handleDownload = async () => {
    if (isDownloading) return;

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

  // Format the button text - keep it short and clean
  const getButtonText = () => {
    if (isDownloading) return 'Descargando...';
    return hasFilters ? 'Descargar Excel' : 'Descargar Todo';
  };

  // Calculate progress percentage
  const progressPercentage = progress.isActive && progress.total > 0 
    ? Math.round((progress.fetched / progress.total) * 100) 
    : 0;

  return (
    <div className={className}>
      <div className="flex flex-col gap-2">
        <Button
          onClick={handleDownload}
          disabled={isDownloading || totalCount === 0}
          variant="outline"
          size="sm"
          className="flex items-center gap-2 h-8 px-3 text-sm bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700"
        >
          {isDownloading ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Download className="h-3 w-3" />
          )}
          {getButtonText()}
        </Button>

        {/* Progress Bar */}
        {progress.isActive && (
          <div className="space-y-1">
            <div className="w-full bg-gray-200 rounded-full h-1.5">
              <div
                className="bg-indigo-600 h-1.5 rounded-full transition-all duration-300 ease-out"
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