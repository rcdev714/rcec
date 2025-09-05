
'use client';

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
          <div className="text-gray-500">Cargando servicios...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 md:p-8">
        <div className="text-center text-red-600">
          Error: {error}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold px-4">Mis Servicios</h1>
        <Link href="/offerings/new" passHref>
          <button className="bg-white hover:bg-gray-100 text-gray-800 font-semibold py-2 px-4 border border-gray-400 rounded-full shadow flex items-center text-sm">
            <PlusIcon className="h-4 w-4 mr-2" />
            Añadir Servicio
          </button>
        </Link>
      </div>

      {offerings.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">No tienes servicios registrados aún.</p>
          <Link href="/offerings/new" passHref>
            <button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-full shadow">
              Crear tu primer servicio
            </button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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

