
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserOffering } from '@/types/user-offering';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { TrashIcon, PencilIcon, GlobeAltIcon, CalendarDaysIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';
import { Input } from '@/components/ui/input';

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
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [contactName, setContactName] = useState<string>(offering.public_contact_name || '');
  const [contactEmail, setContactEmail] = useState<string>(offering.public_contact_email || '');
  const [contactPhone, setContactPhone] = useState<string>(offering.public_contact_phone || '');
  const [companyName, setCompanyName] = useState<string>(offering.public_company_name || '');
  const [isPublic, setIsPublic] = useState<boolean>(Boolean(typedOffering.is_public));
  const normalizedWebsiteUrl = typedOffering.website_url
    ? (typedOffering.website_url.startsWith('http') ? typedOffering.website_url : `https://${typedOffering.website_url}`)
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

  const toggleShare = async () => {
    setIsLoading(true);
    try {
      const action = isPublic ? 'disable' : 'enable';
      const res = await fetch('/api/user-offerings/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: offering.id, action })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Share toggle failed');
      setIsPublic(!isPublic);
      if (data.shareUrl) setShareUrl(data.shareUrl);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const enableShare = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/user-offerings/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: offering.id,
          action: 'enable',
          contact: {
            public_contact_name: contactName || null,
            public_contact_email: contactEmail || null,
            public_contact_phone: contactPhone || null,
            public_company_name: companyName || null,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to enable share');
      setShareUrl(data.shareUrl);
      setIsShareModalOpen(true);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const disableShare = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/user-offerings/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: offering.id, action: 'disable' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to disable share');
      setShareUrl(null);
      setIsShareModalOpen(false);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  // rotate disabled per product decision: one link per offering

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
      <Card className="group hover:shadow-md hover:border-gray-300 transition-all duration-200 overflow-hidden border border-gray-200 bg-white">
        <CardHeader className="pb-3 px-4 pt-4">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded bg-gradient-to-br from-[#635BFF] to-[#5548E6] flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-semibold text-xs">
                    {typedOffering.offering_name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <CardTitle className="text-sm font-semibold text-gray-900 truncate leading-tight">
                  {typedOffering.offering_name}
                </CardTitle>
              </div>
              {isPublic && (
                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-50 border border-green-200">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                  <span className="text-xs text-green-700 font-medium">Activo</span>
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-3 space-y-3">
          {/* Description */}
          {typedOffering.description && (
            <p className="text-xs text-gray-600 leading-relaxed line-clamp-2">{typedOffering.description}</p>
          )}

          {/* Price Information */}
          {priceDisplay && (
            <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
              <span className="text-sm font-semibold text-gray-900">{priceDisplay}</span>
              <span className="text-xs text-gray-500">USD</span>
              <Badge variant="outline" className="text-[10px] text-gray-600 border-gray-300">
                {paymentTypeDisplay}
              </Badge>
            </div>
          )}

          {/* Meta Information */}
          <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-100">
            {formattedDate && (
              <div className="flex items-center gap-1">
                <CalendarDaysIcon className="h-3 w-3" />
                <span>{formattedDate}</span>
              </div>
            )}
            {typedOffering.industry && typedOffering.industry.trim() && (
              <Badge variant="outline" className="text-[10px] text-gray-600 border-gray-300">
                {typedOffering.industry}
              </Badge>
            )}
          </div>

          {/* Industry Targets */}
          {typedOffering.industry_targets && typedOffering.industry_targets.length > 0 && (
            <div className="pt-2 border-t border-gray-100">
              <div className="flex flex-wrap gap-1">
                {typedOffering.industry_targets.slice(0, 3).map((target) => (
                  <Badge key={target} variant="secondary" className="text-[10px] bg-gray-50 text-gray-700 border-gray-200">
                    {target}
                  </Badge>
                ))}
                {typedOffering.industry_targets.length > 3 && (
                  <Badge variant="outline" className="text-[10px] text-gray-600 border-gray-300">
                    +{typedOffering.industry_targets.length - 3}
                  </Badge>
                )}
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter className="pt-3 pb-4 px-4 border-t border-gray-100 bg-gray-50/50">
          <div className="flex w-full items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              {normalizedWebsiteUrl && (
                <Button size="sm" variant="ghost" asChild className="h-7 px-2 text-xs text-gray-600 hover:text-gray-900">
                  <a href={normalizedWebsiteUrl} target="_blank" rel="noopener noreferrer">
                    <ArrowTopRightOnSquareIcon className="h-3 w-3" />
                  </a>
                </Button>
              )}
            </div>
            
            <div className="flex items-center gap-0.5">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-gray-600 hover:text-gray-900">
                    <GlobeAltIcon className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {isPublic ? (
                    <>
                      <DropdownMenuItem onClick={() => setIsShareModalOpen(true)} className="text-xs">
                        Ver enlace público
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={toggleShare} className="text-xs">
                        Cambiar a privado
                      </DropdownMenuItem>
                    </>
                  ) : (
                    <DropdownMenuItem onClick={() => setIsShareModalOpen(true)} className="text-xs">
                      Configurar y compartir
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
              
              <Button size="sm" variant="ghost" onClick={handleEdit} className="h-7 px-2 text-xs text-gray-600 hover:text-gray-900">
                <PencilIcon className="h-3 w-3" />
              </Button>
              
              <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50">
                    <TrashIcon className="h-3 w-3" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle className="text-base font-semibold">Eliminar servicio</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <p className="text-sm text-gray-700">
                      ¿Estás seguro de que quieres eliminar &quot;{typedOffering.offering_name}&quot;?
                    </p>
                    <p className="text-xs text-gray-500">
                      Esta acción no se puede deshacer.
                    </p>
                    <div className="flex gap-2 justify-end">
                      <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)} disabled={isLoading} className="text-sm">
                        Cancelar
                      </Button>
                      <Button variant="destructive" onClick={handleDelete} disabled={isLoading} className="text-sm">
                        {isLoading ? 'Eliminando...' : 'Eliminar'}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
          
          {/* Share Modal */}
          <Dialog open={isShareModalOpen} onOpenChange={setIsShareModalOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="text-base font-semibold">Compartir servicio</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-gray-700 mb-1.5 block">Nombre de empresa</label>
                    <Input 
                      placeholder="Nombre de empresa"
                      value={companyName} 
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-700 mb-1.5 block">Nombre de contacto</label>
                    <Input 
                      placeholder="Nombre de contacto"
                      value={contactName} 
                      onChange={(e) => setContactName(e.target.value)}
                      className="text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-700 mb-1.5 block">Email de contacto</label>
                    <Input 
                      placeholder="Email de contacto"
                      value={contactEmail} 
                      onChange={(e) => setContactEmail(e.target.value)}
                      className="text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-700 mb-1.5 block">Teléfono de contacto</label>
                    <Input 
                      placeholder="Teléfono de contacto"
                      value={contactPhone} 
                      onChange={(e) => setContactPhone(e.target.value)}
                      className="text-sm"
                    />
                  </div>
                </div>
                
                {shareUrl && (
                  <div className="space-y-2 pt-2 border-t border-gray-200">
                    <label className="text-xs font-medium text-gray-700">Enlace público</label>
                    <Input 
                      readOnly 
                      value={shareUrl} 
                      onFocus={(e) => e.currentTarget.select()}
                      className="font-mono text-xs bg-gray-50"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      asChild
                      className="text-sm w-full"
                    >
                      <a href={shareUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2">
                        <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                        Ir al enlace
                      </a>
                    </Button>
                  </div>
                )}
                
                <div className="flex gap-2 justify-end pt-2">
                  {isPublic && (
                    <Button variant="outline" onClick={disableShare} disabled={isLoading} className="text-sm">
                      Desactivar
                    </Button>
                  )}
                  <Button onClick={enableShare} disabled={isLoading} className="text-sm bg-[#635BFF] hover:bg-[#5548E6] text-white">
                    {isLoading ? 'Configurando...' : (isPublic ? 'Actualizar' : 'Activar')}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </CardFooter>
      </Card>
    </>
  );
}

