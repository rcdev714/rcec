'use client';

import { useState, useEffect } from 'react';
import { UserOffering } from '@/types/user-offering';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { XMarkIcon, GlobeAltIcon } from '@heroicons/react/24/outline';
import { Badge } from '@/components/ui/badge';

interface SocialMediaLinkInput {
  platform: string;
  url: string;
}

interface DocumentationUrlInput {
  url: string;
  description?: string;
}

interface PricePlanInput {
  name: string;
  price: string;
  period: string;
}

type PaymentType = 'one-time' | 'subscription';

interface UserOfferingWithPaymentType extends UserOffering {
  payment_type?: 'one-time' | 'subscription' | null;
}

interface OfferingSidePanelProps {
  offering: UserOffering | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (id: string, updates: Partial<UserOffering>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export default function OfferingSidePanel({ offering, isOpen, onClose, onUpdate, onDelete: _onDelete }: OfferingSidePanelProps) {
  const [offeringName, setOfferingName] = useState("");
  const [description, setDescription] = useState("");
  const [industry, setIndustry] = useState("");
  const [paymentType, setPaymentType] = useState<PaymentType>('one-time');
  const [oneTimePrice, setOneTimePrice] = useState('');
  const [pricePlans, setPricePlans] = useState<PricePlanInput[]>([{ name: '', price: '', period: '' }]);
  const [industryTargets, setIndustryTargets] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [socialMediaLinks, setSocialMediaLinks] = useState<SocialMediaLinkInput[]>([{ platform: '', url: '' }]);
  const [documentationUrls, setDocumentationUrls] = useState<DocumentationUrlInput[]>([{ url: '', description: '' }]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [publicCompanyName, setPublicCompanyName] = useState("");
  const [publicContactName, setPublicContactName] = useState("");
  const [publicContactEmail, setPublicContactEmail] = useState("");
  const [publicContactPhone, setPublicContactPhone] = useState("");
  const [isPublic, setIsPublic] = useState<boolean>(false);

  useEffect(() => {
    if (offering) {
      const typedOffering = offering as UserOfferingWithPaymentType;
      setOfferingName(offering.offering_name);
      setDescription(offering.description || '');
      setIndustry(offering.industry || '');
      setPaymentType(typedOffering.payment_type || 'one-time');

      if (offering.price_plans && Array.isArray(offering.price_plans) && offering.price_plans.length > 0) {
        const plans = offering.price_plans;
        const hasOneTimePlan = plans.some(plan => plan.name === 'Pago único' || plan.period === 'único');
        if (hasOneTimePlan && plans.length === 1) {
          setPaymentType('one-time');
          setOneTimePrice(plans[0].price?.toString() || '');
          setPricePlans([{ name: '', price: '', period: '' }]);
        } else {
          setPaymentType('subscription');
          setOneTimePrice('');
          const formattedPlans = plans.map(plan => ({
            name: plan.name || '',
            price: plan.price?.toString() || '',
            period: plan.period || ''
          }));
          setPricePlans(formattedPlans);
        }
      } else {
        setPaymentType('one-time');
        setOneTimePrice('');
        setPricePlans([{ name: '', price: '', period: '' }]);
      }

      setIndustryTargets(offering.industry_targets?.join(', ') || '');
      setWebsiteUrl(offering.website_url || '');
      setSocialMediaLinks(
        offering.social_media_links && offering.social_media_links.length > 0
          ? offering.social_media_links
          : [{ platform: '', url: '' }]
      );
      setDocumentationUrls(
        offering.documentation_urls && offering.documentation_urls.length > 0
          ? offering.documentation_urls
          : [{ url: '', description: '' }]
      );
      setPublicCompanyName(offering.public_company_name || "");
      setPublicContactName(offering.public_contact_name || "");
      setPublicContactEmail(offering.public_contact_email || "");
      setPublicContactPhone(offering.public_contact_phone || "");
      const extendedOffering = offering as UserOffering & {
        is_public?: boolean;
        public_slug?: string | null;
      };
      setIsPublic(Boolean(extendedOffering.is_public));
      if (extendedOffering.is_public && extendedOffering.public_slug) {
        const origin = typeof window !== 'undefined' ? window.location.origin : '';
        setShareUrl(`${origin}/s/${extendedOffering.public_slug}`);
      } else {
        setShareUrl(null);
      }
    }
  }, [offering]);

  const handleAddSocialMedia = () => {
    setSocialMediaLinks([...socialMediaLinks, { platform: '', url: '' }]);
  };

  const handleSocialMediaChange = (index: number, field: keyof SocialMediaLinkInput, value: string) => {
    const newLinks = [...socialMediaLinks];
    newLinks[index][field] = value;
    setSocialMediaLinks(newLinks);
  };

  const handleRemoveSocialMedia = (index: number) => {
    setSocialMediaLinks(socialMediaLinks.filter((_, i) => i !== index));
  };

  const handleAddDocumentation = () => {
    setDocumentationUrls([...documentationUrls, { url: '', description: '' }]);
  };

  const handleDocumentationChange = (index: number, field: keyof DocumentationUrlInput, value: string) => {
    const newDocs = [...documentationUrls];
    newDocs[index][field] = value;
    setDocumentationUrls(newDocs);
  };

  const handleRemoveDocumentation = (index: number) => {
    setDocumentationUrls(documentationUrls.filter((_, i) => i !== index));
  };

  const handleAddPricePlan = () => {
    setPricePlans([...pricePlans, { name: '', price: '', period: '' }]);
  };

  const handlePricePlanChange = (index: number, field: keyof PricePlanInput, value: string) => {
    const newPlans = [...pricePlans];
    newPlans[index][field] = value;
    setPricePlans(newPlans);
  };

  const handleRemovePricePlan = (index: number) => {
    setPricePlans(pricePlans.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!offering?.id) return;

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await onUpdate(offering.id, {
        offering_name: offeringName,
        description,
        industry,
        payment_type: paymentType,
        price_plans: paymentType === 'one-time'
          ? (oneTimePrice.trim() ? [{ name: 'Pago único', price: parseFloat(oneTimePrice) || 0, period: 'único' }] : undefined)
          : (pricePlans.filter(plan => plan.name.trim() || plan.price.trim() || plan.period.trim()).length > 0
              ? pricePlans.filter(plan => plan.name.trim() || plan.price.trim() || plan.period.trim()).map(plan => ({
                  name: plan.name.trim(),
                  price: parseFloat(plan.price) || 0,
                  period: plan.period.trim()
                }))
              : undefined),
        industry_targets: industryTargets.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0),
        website_url: websiteUrl,
        social_media_links: socialMediaLinks.filter(link => link.url.length > 0),
        documentation_urls: documentationUrls.filter(doc => doc.url.length > 0),
      });

      setSuccess('Servicio actualizado exitosamente');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleShareToggle = async () => {
    if (!offering?.id) return;
    setIsSharing(true);
    try {
      const action = isPublic ? 'disable' : 'enable';
      const res = await fetch('/api/user-offerings/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: offering.id,
          action,
          contact: action === 'enable' ? {
            public_company_name: publicCompanyName || null,
            public_contact_name: publicContactName || null,
            public_contact_email: publicContactEmail || null,
            public_contact_phone: publicContactPhone || null,
          } : undefined
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Share toggle failed');
      setIsPublic(!isPublic);
      if (data.shareUrl) {
        setShareUrl(data.shareUrl);
      } else {
        setShareUrl(null);
      }
      // Update the offering in parent
      if (offering.id) {
        await onUpdate(offering.id, {
          is_public: !isPublic,
          public_slug: data.shareUrl ? data.shareUrl.split('/s/')[1] : null
        } as Partial<UserOffering>);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSharing(false);
    }
  };

  if (!offering) return null;

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-40 transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Side Panel */}
      <div
        className={`fixed top-0 right-0 h-full w-full max-w-2xl bg-white shadow-xl z-50 transform transition-transform duration-300 ease-in-out overflow-y-auto ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-gray-900">Actualizar producto</h2>
            {isPublic && (
              <Badge className="bg-green-50 text-green-700 border-green-200">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1"></div>
                Activo
              </Badge>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-md transition-colors"
          >
            <XMarkIcon className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="offeringName" className="text-sm font-medium text-gray-700">
                Nombre del producto o servicio, visible para los clientes
              </Label>
              <Input
                id="offeringName"
                type="text"
                placeholder="Pro"
                value={offeringName}
                onChange={(e) => setOfferingName(e.target.value)}
                required
                className="text-sm"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description" className="text-sm font-medium text-gray-700">
                Aparece en checkout, portal del cliente y cotizaciones
              </Label>
              <Textarea
                id="description"
                placeholder="Descripción del servicio..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="text-sm"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="industry" className="text-sm font-medium text-gray-700">
                Industria
              </Label>
              <Input
                id="industry"
                type="text"
                placeholder="Seguros, Legal, Fianzas"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                className="text-sm"
              />
            </div>
          </div>

          {/* Payment Type */}
          <div className="space-y-4">
            <Label className="text-sm font-semibold text-gray-900">Tipo de Pago</Label>
            <div className="flex gap-4">
              <label className={`flex items-center gap-3 cursor-pointer p-4 border-2 rounded-lg transition-all flex-1 hover:border-gray-300 ${
                paymentType === 'one-time' ? 'border-[#635BFF] bg-purple-50' : 'border-gray-200'
              }`}>
                <input
                  type="radio"
                  name="paymentType"
                  value="one-time"
                  checked={paymentType === 'one-time'}
                  onChange={(e) => setPaymentType(e.target.value as PaymentType)}
                  className="w-4 h-4 text-[#635BFF] focus:ring-[#635BFF]"
                />
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <span className="text-green-600 font-bold text-base">$</span>
                  </div>
                  <div>
                    <div className="font-medium text-sm text-gray-900">Pago único</div>
                    <div className="text-xs text-gray-500">Cobrar una sola vez</div>
                  </div>
                </div>
              </label>

              <label className={`flex items-center gap-3 cursor-pointer p-4 border-2 rounded-lg transition-all flex-1 hover:border-gray-300 ${
                paymentType === 'subscription' ? 'border-[#635BFF] bg-purple-50' : 'border-gray-200'
              }`}>
                <input
                  type="radio"
                  name="paymentType"
                  value="subscription"
                  checked={paymentType === 'subscription'}
                  onChange={(e) => setPaymentType(e.target.value as PaymentType)}
                  className="w-4 h-4 text-[#635BFF] focus:ring-[#635BFF]"
                />
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <span className="text-blue-600 font-bold text-base">∞</span>
                  </div>
                  <div>
                    <div className="font-medium text-sm text-gray-900">Suscripción</div>
                    <div className="text-xs text-gray-500">Cobros recurrentes</div>
                  </div>
                </div>
              </label>
            </div>

            {paymentType === 'one-time' && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <Label htmlFor="oneTimePrice" className="text-sm font-medium text-green-900">
                  Precio del Pago Único
                </Label>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-base font-medium text-gray-700">$</span>
                  <Input
                    id="oneTimePrice"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={oneTimePrice}
                    onChange={(e) => setOneTimePrice(e.target.value)}
                    className="max-w-xs text-sm border-green-300 focus:border-green-500"
                  />
                  <span className="text-sm text-gray-600">USD</span>
                </div>
              </div>
            )}

            {paymentType === 'subscription' && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <Label className="text-sm font-medium text-blue-900 mb-3 block">
                  Planes de Suscripción
                </Label>
                <div className="space-y-3">
                  {pricePlans.map((plan, index) => (
                    <div key={index} className="flex gap-3 items-center p-3 bg-white border border-blue-200 rounded-lg">
                      <Input
                        placeholder="Nombre del plan"
                        value={plan.name}
                        onChange={(e) => handlePricePlanChange(index, 'name', e.target.value)}
                        className="flex-1 text-sm border-blue-300"
                      />
                      <div className="flex items-center gap-1">
                        <span className="text-sm font-medium text-gray-700">$</span>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={plan.price}
                          onChange={(e) => handlePricePlanChange(index, 'price', e.target.value)}
                          className="w-24 text-sm border-blue-300"
                        />
                      </div>
                      <span className="text-sm text-gray-600">por</span>
                      <Input
                        placeholder="mes"
                        value={plan.period}
                        onChange={(e) => handlePricePlanChange(index, 'period', e.target.value)}
                        className="w-20 text-sm border-blue-300"
                      />
                      <Button type="button" variant="outline" size="icon" onClick={() => handleRemovePricePlan(index)} className="h-8 w-8">
                        -
                      </Button>
                    </div>
                  ))}
                </div>
                <Button type="button" variant="outline" size="sm" onClick={handleAddPricePlan} className="mt-3 text-sm">
                  + Añadir otro precio
                </Button>
              </div>
            )}
          </div>

          {/* Additional Info */}
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="industryTargets" className="text-sm font-medium text-gray-700">
                Industrias Objetivo (separadas por comas)
              </Label>
              <Input
                id="industryTargets"
                type="text"
                placeholder="Tecnología, Consultoría, Marketing"
                value={industryTargets}
                onChange={(e) => setIndustryTargets(e.target.value)}
                className="text-sm"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="websiteUrl" className="text-sm font-medium text-gray-700">
                URL del Sitio Web
              </Label>
              <Input
                id="websiteUrl"
                type="url"
                placeholder="https://www.ejemplo.com"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                className="text-sm"
              />
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium text-gray-700">Enlaces de Redes Sociales</Label>
              {socialMediaLinks.map((link, index) => (
                <div key={index} className="flex gap-2 items-center">
                  <Input
                    placeholder="LinkedIn"
                    value={link.platform}
                    onChange={(e) => handleSocialMediaChange(index, 'platform', e.target.value)}
                    className="w-1/3 text-sm"
                  />
                  <Input
                    placeholder="URL"
                    type="url"
                    value={link.url}
                    onChange={(e) => handleSocialMediaChange(index, 'url', e.target.value)}
                    className="flex-grow text-sm"
                  />
                  <Button type="button" variant="outline" size="icon" onClick={() => handleRemoveSocialMedia(index)} className="h-9 w-9">
                    -
                  </Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={handleAddSocialMedia} className="text-sm">
                + Añadir Red Social
              </Button>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium text-gray-700">Documentación Relevante</Label>
              {documentationUrls.map((doc, index) => (
                <div key={index} className="flex gap-2 items-center">
                  <Input
                    placeholder="https://ejemplo.com/doc.pdf"
                    type="url"
                    value={doc.url}
                    onChange={(e) => handleDocumentationChange(index, 'url', e.target.value)}
                    className="flex-grow text-sm"
                  />
                  <Input
                    placeholder="Descripción"
                    value={doc.description}
                    onChange={(e) => handleDocumentationChange(index, 'description', e.target.value)}
                    className="w-1/3 text-sm"
                  />
                  <Button type="button" variant="outline" size="icon" onClick={() => handleRemoveDocumentation(index)} className="h-9 w-9">
                    -
                  </Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={handleAddDocumentation} className="text-sm">
                + Añadir Documento
              </Button>
            </div>
          </div>

          {/* Public Link Section */}
          <div className="border-t border-gray-200 pt-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Enlace público</h3>
                <p className="text-xs text-gray-600 mt-1">
                  Comparte tu servicio con empresas. Controla la información de contacto pública.
                </p>
              </div>
              <button
                type="button"
                onClick={handleShareToggle}
                disabled={isSharing}
                className={`px-3 py-1.5 rounded-md text-sm border transition ${
                  isPublic
                    ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                    : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                }`}
              >
                <span className="inline-flex items-center gap-1.5">
                  <GlobeAltIcon className="h-4 w-4" />
                  {isPublic ? 'Público' : 'Privado'}
                </span>
              </button>
            </div>

            {shareUrl && (
              <div className="space-y-2">
                <Label className="text-xs font-medium text-gray-700">URL pública</Label>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={shareUrl}
                    onFocus={(e) => e.currentTarget.select()}
                    className="text-sm bg-gray-50 font-mono"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    asChild
                    className="text-sm"
                  >
                    <a href={shareUrl} target="_blank" rel="noopener noreferrer">
                      Ir al enlace
                    </a>
                  </Button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label className="text-xs font-medium text-gray-700">Empresa</Label>
                <Input
                  value={publicCompanyName}
                  onChange={(e) => setPublicCompanyName(e.target.value)}
                  onBlur={async () => {
                    if (offering?.id) {
                      await fetch('/api/user-offerings', {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ id: offering.id, public_company_name: publicCompanyName })
                      });
                    }
                  }}
                  className="text-sm"
                />
              </div>
              <div className="grid gap-2">
                <Label className="text-xs font-medium text-gray-700">Nombre de contacto</Label>
                <Input
                  value={publicContactName}
                  onChange={(e) => setPublicContactName(e.target.value)}
                  onBlur={async () => {
                    if (offering?.id) {
                      await fetch('/api/user-offerings', {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ id: offering.id, public_contact_name: publicContactName })
                      });
                    }
                  }}
                  className="text-sm"
                />
              </div>
              <div className="grid gap-2">
                <Label className="text-xs font-medium text-gray-700">Email</Label>
                <Input
                  value={publicContactEmail}
                  onChange={(e) => setPublicContactEmail(e.target.value)}
                  onBlur={async () => {
                    if (offering?.id) {
                      await fetch('/api/user-offerings', {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ id: offering.id, public_contact_email: publicContactEmail })
                      });
                    }
                  }}
                  className="text-sm"
                />
              </div>
              <div className="grid gap-2">
                <Label className="text-xs font-medium text-gray-700">Teléfono</Label>
                <Input
                  value={publicContactPhone}
                  onChange={(e) => setPublicContactPhone(e.target.value)}
                  onBlur={async () => {
                    if (offering?.id) {
                      await fetch('/api/user-offerings', {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ id: offering.id, public_contact_phone: publicContactPhone })
                      });
                    }
                  }}
                  className="text-sm"
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}
          {success && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-800">{success}</p>
            </div>
          )}

          <div className="flex gap-3 justify-end pt-4 border-t border-gray-200 sticky bottom-0 bg-white pb-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
              className="text-sm"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="text-sm bg-[#635BFF] hover:bg-[#5548E6] text-white"
            >
              {isLoading ? "Guardando..." : "Actualizar producto"}
            </Button>
          </div>
        </form>
      </div>
    </>
  );
}

