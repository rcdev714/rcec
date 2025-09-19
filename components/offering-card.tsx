
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserOffering } from '@/types/user-offering';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { TrashIcon, PencilIcon, GlobeAltIcon, DocumentIcon, ChatBubbleLeftRightIcon, CalendarDaysIcon, BanknotesIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';

interface OfferingCardProps {
  offering: UserOffering;
  onUpdate: (id: string, updates: Partial<UserOffering>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

interface UserOfferingWithPaymentType extends UserOffering {
  payment_type?: 'one-time' | 'subscription' | null;
}

export default function OfferingCard({ offering, onUpdate: _onUpdate, onDelete }: OfferingCardProps) {
  const typedOffering = offering as UserOfferingWithPaymentType;
  const router = useRouter();
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const normalizedWebsiteUrl = typedOffering.website_url
    ? (typedOffering.website_url.startsWith('http') ? typedOffering.website_url : `https://${typedOffering.website_url}`)
    : undefined;
  const firstSocialUrl = typedOffering.social_media_links && typedOffering.social_media_links.length > 0
    ? typedOffering.social_media_links[0]?.url
    : undefined;
  const firstDocUrl = typedOffering.documentation_urls && typedOffering.documentation_urls.length > 0
    ? typedOffering.documentation_urls[0]?.url
    : undefined;

  const handleEdit = () => {
    router.push(`/offerings/${offering.id}/edit`);
  };

  const handleDelete = async () => {
    setIsLoading(true);
    try {
      await onDelete(offering.id!);
      setIsDeleteModalOpen(false);
    } catch (error) {
      console.error('Error deleting offering:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to format price display
  const getPriceDisplay = () => {
    const paymentType = typedOffering.payment_type || 'subscription';

    if (!typedOffering.price_plans || !Array.isArray(typedOffering.price_plans) || typedOffering.price_plans.length === 0) {
      return null;
    }

    if (paymentType === 'one-time' && typedOffering.price_plans.length === 1) {
      const plan = typedOffering.price_plans[0];
      const price = typeof plan.price === 'number' ? plan.price : parseFloat(plan.price);

      if (isNaN(price)) {
        return null;
      }

      return `$${price}`;
    }

    if (typedOffering.price_plans.length === 1) {
      const plan = typedOffering.price_plans[0];
      const price = typeof plan.price === 'number' ? plan.price : parseFloat(plan.price);
      const period = plan.period || 'mes';

      if (isNaN(price)) {
        return null;
      }

      return `$${price}/${period}`;
    }

    // Find the cheapest plan for subscriptions
    const validPlans = typedOffering.price_plans.filter(plan => {
      const price = typeof plan.price === 'number' ? plan.price : parseFloat(plan.price);
      return !isNaN(price);
    });

    if (validPlans.length === 0) {
      return null;
    }

    const cheapest = validPlans.reduce((min, plan) => {
      const minPrice = typeof min.price === 'number' ? min.price : parseFloat(min.price);
      const planPrice = typeof plan.price === 'number' ? plan.price : parseFloat(plan.price);
      return planPrice < minPrice ? plan : min;
    });

    const price = typeof cheapest.price === 'number' ? cheapest.price : parseFloat(cheapest.price);
    const period = cheapest.period || 'mes';
    return `Desde $${price}/${period}`;
  };

  // Helper function to get payment type display
  const getPaymentTypeDisplay = () => {
    const paymentType = typedOffering.payment_type || 'subscription';
    return paymentType === 'one-time' ? 'Pago único' : 'Suscripción';
  };

  // Helper function to format date
  const getFormattedDate = () => {
    if (!typedOffering.created_at) return null;

    try {
      const date = new Date(typedOffering.created_at);
      // Check if date is valid
      if (isNaN(date.getTime())) {
        console.warn('Invalid date:', typedOffering.created_at);
        return null;
      }

      // If date is in the future, it might be wrong format
      if (date > new Date()) {
        console.warn('Future date detected:', typedOffering.created_at);
        return null;
      }

      return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      console.error('Error parsing date:', typedOffering.created_at, error);
      return null;
    }
  };

  const priceDisplay = getPriceDisplay();
  const formattedDate = getFormattedDate();
  const paymentTypeDisplay = getPaymentTypeDisplay();

  return (
    <>
      <Card className="group bg-white text-gray-900 hover:shadow-lg hover:border-gray-300 transition-all duration-200 overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-lg mb-1 truncate">{typedOffering.offering_name}</CardTitle>
              {typedOffering.industry && typedOffering.industry.trim() && (
                <Badge variant="light-outline" className="text-[10px]">{typedOffering.industry}</Badge>
              )}
            </div>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                size="sm"
                variant="ghost"
                onClick={handleEdit}
                className="h-8 w-8 p-0"
                title="Editar servicio"
              >
                <PencilIcon className="h-4 w-4" />
              </Button>

              <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
                <DialogTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                    title="Eliminar servicio"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Eliminar Servicio</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <p className="text-sm text-gray-700">
                      ¿Estás seguro de que quieres eliminar el servicio &quot;{typedOffering.offering_name}&quot;?
                    </p>
                    <p className="text-xs text-gray-500">
                      Esta acción no se puede deshacer.
                    </p>
                    <div className="flex gap-2 justify-end">
                      <Button
                        variant="outline"
                        onClick={() => setIsDeleteModalOpen(false)}
                        disabled={isLoading}
                      >
                        Cancelar
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={handleDelete}
                        disabled={isLoading}
                      >
                        {isLoading ? 'Eliminando...' : 'Eliminar'}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Description */}
          {typedOffering.description && (
            <p className="text-sm text-gray-600 leading-relaxed">{typedOffering.description}</p>
          )}

          {/* Price Information */}
          {priceDisplay && (
            <div className="flex items-center gap-2">
              <BanknotesIcon className="h-4 w-4 text-green-600" />
              <span className="text-sm font-semibold text-green-700">{priceDisplay}</span>
              <Badge variant="light-outline" className="text-[10px]">{paymentTypeDisplay}</Badge>
            </div>
          )}

          {/* Contact & Resources Info */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            {normalizedWebsiteUrl && (
              <a
                href={normalizedWebsiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 hover:underline"
                aria-label="Abrir sitio web"
              >
                <GlobeAltIcon className="h-3 w-3 text-blue-500" />
                <span className="text-gray-600">Sitio web</span>
                <ArrowTopRightOnSquareIcon className="h-3 w-3 text-gray-400" />
              </a>
            )}

            {typedOffering.social_media_links && typedOffering.social_media_links.length > 0 && (
              <a
                href={firstSocialUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 hover:underline"
                aria-label="Abrir redes sociales"
              >
                <ChatBubbleLeftRightIcon className="h-3 w-3 text-purple-500" />
                <span className="text-gray-600">{typedOffering.social_media_links.length} redes</span>
                <ArrowTopRightOnSquareIcon className="h-3 w-3 text-gray-400" />
              </a>
            )}

            {typedOffering.documentation_urls && typedOffering.documentation_urls.length > 0 && (
              <a
                href={firstDocUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 hover:underline"
                aria-label="Abrir documentación"
              >
                <DocumentIcon className="h-3 w-3 text-orange-500" />
                <span className="text-gray-600">{typedOffering.documentation_urls.length} docs</span>
                <ArrowTopRightOnSquareIcon className="h-3 w-3 text-gray-400" />
              </a>
            )}

            {formattedDate && (
              <div className="flex items-center gap-1">
                <CalendarDaysIcon className="h-3 w-3 text-gray-500" />
                <span className="text-gray-600">{formattedDate}</span>
              </div>
            )}
          </div>

          {/* Industry Targets */}
          {typedOffering.industry_targets && typedOffering.industry_targets.length > 0 && (
            <div className="pt-3 border-t border-gray-100">
              <div className="bg-white border border-gray-200 rounded-lg p-3">
                <p className="text-xs font-medium text-gray-700 mb-2">Industria de Servicio</p>
                <div className="flex flex-wrap gap-1">
                  {typedOffering.industry_targets.slice(0, 3).map((target) => (
                    <Badge key={target} variant="secondary" className="text-xs">
                      {target}
                    </Badge>
                  ))}
                  {typedOffering.industry_targets.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{typedOffering.industry_targets.length - 3} más
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter className="pt-0">
          <div className="flex w-full flex-col sm:flex-row sm:items-center sm:justify-between gap-2 min-w-0">
            <div className="flex gap-2 flex-wrap">
              {normalizedWebsiteUrl && (
                <Button size="sm" variant="secondary" asChild>
                  <a href={normalizedWebsiteUrl} target="_blank" rel="noopener noreferrer">
                    <GlobeAltIcon className="h-4 w-4" />
                    Visitar sitio
                  </a>
                </Button>
              )}
            </div>
            <div className="flex gap-2 flex-wrap sm:justify-end">
              <Button size="sm" variant="outline" onClick={handleEdit} title="Editar servicio">
                <PencilIcon className="h-4 w-4" />
                Editar
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => setIsDeleteModalOpen(true)}
                title="Eliminar servicio"
              >
                <TrashIcon className="h-4 w-4" />
                Eliminar
              </Button>
            </div>
          </div>
        </CardFooter>
      </Card>
    </>
  );
}

