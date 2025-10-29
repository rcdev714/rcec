
'use client';

export const dynamic = "force-dynamic";

import { useState, useEffect } from 'react';
import { UserOffering } from '@/types/user-offering';
import OfferingCard from '@/components/offering-card';
import Link from 'next/link';
import { PlusIcon } from '@heroicons/react/24/outline';

export default function OfferingsPage() {
  const [offerings, setOfferings] = useState<UserOffering[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchOfferings() {
      try {
        const response = await fetch('/api/user-offerings');
        if (!response.ok) {
          throw new Error('Failed to fetch offerings');
        }
        const data = await response.json();
        setOfferings(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setLoading(false);
      }
    }

    fetchOfferings();
  }, []);

  const handleUpdateOffering = async (id: string, updates: Partial<UserOffering>) => {
    try {
      const response = await fetch('/api/user-offerings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id,
          ...updates,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update offering');
      }

      const result = await response.json();

      // Refetch all offerings to ensure we have the latest data
      const fetchResponse = await fetch('/api/user-offerings');
      if (fetchResponse.ok) {
        const updatedOfferings = await fetchResponse.json();
        setOfferings(updatedOfferings);
      } else {
        // Fallback: Update the offering in local state
        setOfferings(prevOfferings =>
          prevOfferings.map(offering =>
            offering.id === id ? result.offering : offering
          )
        );
      }
    } catch (err) {
      console.error('Error updating offering:', err);
      throw err; // Re-throw to let the component handle the error
    }
  };

  const handleDeleteOffering = async (id: string) => {
    try {
      const response = await fetch(`/api/user-offerings?id=${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete offering');
      }

      // Remove the offering from local state
      setOfferings(prevOfferings =>
        prevOfferings.filter(offering => offering.id !== id)
      );
    } catch (err) {
      console.error('Error deleting offering:', err);
      throw err; // Re-throw to let the component handle the error
    }
  };

  if (loading) {
    return (
      <div className="p-4 md:p-8">
        <div className="flex justify-center items-center min-h-[200px]">
          <div className="text-gray-500 text-xs">Cargando servicios...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 md:p-8">
        <div className="text-center text-red-600 text-xs">
          Error: {error}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <div className="mb-6 px-2 md:px-4">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight bg-gradient-to-br from-gray-900 via-gray-700 to-gray-400 bg-clip-text text-transparent">Catálogo de Servicios</h1>
            <p className="text-gray-600 text-xs md:text-sm mt-1">
              Gestiona tu portafolio con herramientas de clase mundial.
            </p>
          </div>
          <Link href="/offerings/new" passHref>
            <button className="bg-indigo-500 text-white font-medium py-2 px-4 rounded-md shadow hover:bg-indigo-600 transition-colors flex items-center text-xs">
              <PlusIcon className="h-4 w-4 mr-2" />
              Nuevo Servicio
            </button>
          </Link>
        </div>
      </div>

      {offerings.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-xs">No tienes servicios registrados aún.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 md:gap-6">
          {offerings.map((offering) => (
            <OfferingCard
              key={offering.id}
              offering={offering}
              onUpdate={handleUpdateOffering}
              onDelete={handleDeleteOffering}
            />
          ))}
        </div>
      )}
    </div>
  );
}

