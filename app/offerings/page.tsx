
'use client';

export const dynamic = "force-dynamic";

import { useState, useEffect } from 'react';
import { UserOffering } from '@/types/user-offering';
import Link from 'next/link';
import { PlusIcon, PencilIcon, TrashIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import OfferingSidePanel from '@/components/offering-side-panel';

export default function OfferingsPage() {
  const [offerings, setOfferings] = useState<UserOffering[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'active'>('all');
  const [selectedOffering, setSelectedOffering] = useState<UserOffering | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [offeringToDelete, setOfferingToDelete] = useState<UserOffering | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleRowClick = (offering: UserOffering) => {
    setSelectedOffering(offering);
    setIsPanelOpen(true);
  };

  const handleClosePanel = () => {
    setIsPanelOpen(false);
    setSelectedOffering(null);
    // Refetch offerings after panel closes
    fetchOfferings();
  };

  const handleDeleteClick = (e: React.MouseEvent, offering: UserOffering) => {
    e.stopPropagation();
    setOfferingToDelete(offering);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!offeringToDelete?.id) return;
    setIsDeleting(true);
    try {
      await handleDeleteOffering(offeringToDelete.id);
      setIsDeleteModalOpen(false);
      setOfferingToDelete(null);
    } catch (error) {
      console.error('Error deleting offering:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const fetchOfferings = async () => {
    try {
      const response = await fetch('/api/user-offerings');
      if (!response.ok) {
        throw new Error('Failed to fetch offerings');
      }
      const data = await response.json();
      setOfferings(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    }
  };

  useEffect(() => {
    fetchOfferings().finally(() => setLoading(false));
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

  const filteredOfferings = offerings.filter(offering => {
    if (activeFilter === 'active') {
      return offering.is_public === true;
    }
    return true;
  });

  const publicCount = offerings.filter(o => o.is_public === true).length;

  // Helper function to format price display
  const getPriceDisplay = (offering: UserOffering) => {
    const paymentType = (offering as any).payment_type || 'subscription';
    if (!offering.price_plans || !Array.isArray(offering.price_plans) || offering.price_plans.length === 0) {
      return '—';
    }

    if (paymentType === 'one-time' && offering.price_plans.length === 1) {
      const plan = offering.price_plans[0];
      const price = typeof plan.price === 'number' ? plan.price : parseFloat(plan.price as string);
      return isNaN(price) ? '—' : `$${price}`;
    }

    if (offering.price_plans.length === 1) {
      const plan = offering.price_plans[0];
      const price = typeof plan.price === 'number' ? plan.price : parseFloat(plan.price as string);
      const period = plan.period || 'mes';
      return isNaN(price) ? '—' : `$${price} USD/${period}`;
    }

    const validPlans = offering.price_plans.filter(plan => {
      const price = typeof plan.price === 'number' ? plan.price : parseFloat(plan.price as string);
      return !isNaN(price);
    });

    if (validPlans.length === 0) return '—';

    const cheapest = validPlans.reduce((min, plan) => {
      const minPrice = typeof min.price === 'number' ? min.price : parseFloat(min.price as string);
      const planPrice = typeof plan.price === 'number' ? plan.price : parseFloat(plan.price as string);
      return planPrice < minPrice ? plan : min;
    });

    const price = typeof cheapest.price === 'number' ? cheapest.price : parseFloat(cheapest.price as string);
    const period = cheapest.period || 'mes';
    return `Desde $${price}/${period}`;
  };

  const getFormattedDate = (dateString?: string) => {
    if (!dateString) return '—';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '—';
      return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return '—';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-center items-center min-h-[400px]">
            <div className="text-gray-500 text-sm">Cargando servicios...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-red-600 text-sm">
            Error: {error}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Catálogo de Servicios</h1>
              <p className="text-sm text-gray-600 mt-1">
                Gestiona tu portafolio con herramientas de clase mundial.
              </p>
            </div>
            <Link href="/offerings/new">
              <button className="bg-[#635BFF] text-white font-medium py-2 px-4 rounded-md shadow-sm hover:bg-[#5548E6] transition-colors flex items-center gap-2 text-sm">
                <PlusIcon className="h-4 w-4" />
                Crear producto
              </button>
            </Link>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 gap-4 mb-6 max-w-md">
            <div 
              onClick={() => setActiveFilter('all')}
              className={`cursor-pointer p-4 rounded-lg border-2 transition-all ${
                activeFilter === 'all' 
                  ? 'border-[#635BFF] bg-purple-50' 
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="text-sm font-medium text-gray-600 mb-1">Todos</div>
              <div className="text-2xl font-semibold text-gray-900">{offerings.length}</div>
            </div>
            <div 
              onClick={() => setActiveFilter('active')}
              className={`cursor-pointer p-4 rounded-lg border-2 transition-all ${
                activeFilter === 'active' 
                  ? 'border-[#635BFF] bg-purple-50' 
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="text-sm font-medium text-gray-600 mb-1">Activos</div>
              <div className="text-2xl font-semibold text-gray-900">{publicCount}</div>
            </div>
          </div>
        </div>

        {/* Content */}
        {filteredOfferings.length === 0 ? (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
              <PlusIcon className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {activeFilter === 'all' 
                ? 'No tienes servicios registrados aún' 
                : 'No hay servicios activos'}
            </h3>
            {activeFilter === 'all' && (
              <Link href="/offerings/new">
                <button className="mt-4 bg-[#635BFF] text-white font-medium py-2 px-4 rounded-md shadow-sm hover:bg-[#5548E6] transition-colors text-sm">
                  Crear tu primer servicio
                </button>
              </Link>
            )}
          </div>
        ) : (
          <>
            <div className="mb-4 text-sm text-gray-600">
              {filteredOfferings.length} {filteredOfferings.length === 1 ? 'resultado' : 'resultados'}
            </div>
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nombre
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Precio
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Creado
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredOfferings.map((offering) => {
                    const typedOffering = offering as UserOffering & { payment_type?: 'one-time' | 'subscription' | null };
                    const isActive = Boolean(typedOffering.is_public);
                    const priceDisplay = getPriceDisplay(offering);
                    const formattedDate = getFormattedDate(offering.created_at);
                    const shareUrl = isActive && typedOffering.public_slug
                      ? `${typeof window !== 'undefined' ? window.location.origin : ''}/s/${typedOffering.public_slug}`
                      : null;

                    return (
                      <tr
                        key={offering.id}
                        onClick={() => handleRowClick(offering)}
                        className="hover:bg-gray-50 cursor-pointer transition-colors"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded bg-gradient-to-br from-[#635BFF] to-[#5548E6] flex items-center justify-center flex-shrink-0">
                              <span className="text-white font-semibold text-xs">
                                {offering.offering_name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900">{offering.offering_name}</div>
                              {offering.industry && (
                                <div className="text-xs text-gray-500">{offering.industry}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{priceDisplay}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {isActive ? (
                            <Badge className="bg-green-50 text-green-700 border-green-200">
                              <div className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1"></div>
                              Activo
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-gray-600 border-gray-300">
                              Privado
                            </Badge>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formattedDate}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                            {shareUrl && (
                              <Button
                                size="sm"
                                variant="ghost"
                                asChild
                                className="h-7 px-2 text-xs text-gray-600 hover:text-gray-900"
                              >
                                <a href={shareUrl} target="_blank" rel="noopener noreferrer">
                                  <ArrowTopRightOnSquareIcon className="h-3 w-3" />
                                </a>
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleRowClick(offering)}
                              className="h-7 px-2 text-xs text-gray-600 hover:text-gray-900"
                            >
                              <PencilIcon className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => handleDeleteClick(e, offering)}
                              className="h-7 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <TrashIcon className="h-3 w-3" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Side Panel */}
        <OfferingSidePanel
          offering={selectedOffering}
          isOpen={isPanelOpen}
          onClose={handleClosePanel}
          onUpdate={handleUpdateOffering}
          onDelete={handleDeleteOffering}
        />

        {/* Delete Modal */}
        <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base font-semibold">Eliminar servicio</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-gray-700">
                ¿Estás seguro de que quieres eliminar &quot;{offeringToDelete?.offering_name}&quot;?
              </p>
              <p className="text-xs text-gray-500">
                Esta acción no se puede deshacer.
              </p>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)} disabled={isDeleting} className="text-sm">
                  Cancelar
                </Button>
                <Button variant="destructive" onClick={handleDeleteConfirm} disabled={isDeleting} className="text-sm">
                  {isDeleting ? 'Eliminando...' : 'Eliminar'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

