
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

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {offerings.map((offering) => (
          <OfferingCard key={offering.id} offering={offering} />
        ))}
      </div>
    </div>
  );
}

