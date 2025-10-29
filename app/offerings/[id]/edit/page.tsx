"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { GlobeAltIcon, ArrowLeftIcon } from "@heroicons/react/24/outline";
import Link from "next/link";

export const dynamic = "force-dynamic";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { UserOffering } from "@/types/user-offering";
import { User } from "@supabase/supabase-js";
// removed duplicate Input import

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

export default function EditOfferingPage() {
  const router = useRouter();
  const params = useParams();
  const offeringId = params.id as string;

  const [user, setUser] = useState<User | null>(null);
  const [offering, setOffering] = useState<UserOffering | null>(null);
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
  const [targetCompanyRUCs, setTargetCompanyRUCs] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
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
    const fetchUserAndOffering = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      if (!user) {
        router.push("/auth/login");
        return;
      }

      if (!offeringId) {
        router.push("/offerings");
        return;
      }

      try {
        const response = await fetch('/api/user-offerings');
        if (!response.ok) {
          throw new Error('Failed to fetch offerings');
        }
        const offerings: UserOffering[] = await response.json();
        const currentOffering = offerings.find(o => o.id === offeringId);

        if (!currentOffering) {
          router.push("/offerings");
          return;
        }

        setOffering(currentOffering);

        // Pre-populate form with existing data
        setOfferingName(currentOffering.offering_name);
        setDescription(currentOffering.description || '');
        setIndustry(currentOffering.industry || '');
        const typedOffering = currentOffering as UserOfferingWithPaymentType;
        setPaymentType(typedOffering.payment_type || 'one-time');

        // Handle price plans - detect payment type and convert from stored format to input format
        if (currentOffering.price_plans && Array.isArray(currentOffering.price_plans) && currentOffering.price_plans.length > 0) {
          const plans = currentOffering.price_plans;

          // Check if it's a one-time payment (has a plan named "Pago único" or period is "único")
          const hasOneTimePlan = plans.some(plan => plan.name === 'Pago único' || plan.period === 'único');

          if (hasOneTimePlan && plans.length === 1) {
            // It's a one-time payment
            setPaymentType('one-time');
            setOneTimePrice(plans[0].price?.toString() || '');
            setPricePlans([{ name: '', price: '', period: '' }]);
          } else {
            // It's a subscription
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

        setIndustryTargets(currentOffering.industry_targets?.join(', ') || '');
        setWebsiteUrl(currentOffering.website_url || '');
        setSocialMediaLinks(
          currentOffering.social_media_links && currentOffering.social_media_links.length > 0
            ? currentOffering.social_media_links
            : [{ platform: '', url: '' }]
        );
        setDocumentationUrls(
          currentOffering.documentation_urls && currentOffering.documentation_urls.length > 0
            ? currentOffering.documentation_urls
            : [{ url: '', description: '' }]
        );

        // Initialize public contact fields if present
        setPublicCompanyName(currentOffering.public_company_name || "");
        setPublicContactName(currentOffering.public_contact_name || "");
        setPublicContactEmail(currentOffering.public_contact_email || "");
        setPublicContactPhone(currentOffering.public_contact_phone || "");
        const extendedOffering = currentOffering as UserOffering & {
          is_public?: boolean;
          public_slug?: string | null;
        };
        const nowPublic = Boolean(extendedOffering.is_public);
        setIsPublic(nowPublic);
        if (nowPublic && extendedOffering.public_slug) {
          const origin = typeof window !== 'undefined' ? window.location.origin : (process.env.NEXT_PUBLIC_APP_URL || '');
          setShareUrl(`${origin}/s/${extendedOffering.public_slug}`);
        }

      } catch (err) {
        console.error('Error fetching offering:', err);
        setError('Error loading offering data');
      } finally {
        setIsLoadingData(false);
      }
    };

    fetchUserAndOffering();
  }, [router, offeringId]);

  const handleAddSocialMedia = () => {
    setSocialMediaLinks([...socialMediaLinks, { platform: '', url: '' }]);
  };

  const handleSocialMediaChange = (index: number, field: keyof SocialMediaLinkInput, value: string) => {
    const newLinks = [...socialMediaLinks];
    newLinks[index][field] = value;
    setSocialMediaLinks(newLinks);
  };

  const handleRemoveSocialMedia = (index: number) => {
    const newLinks = socialMediaLinks.filter((_, i) => i !== index);
    setSocialMediaLinks(newLinks);
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
    const newDocs = documentationUrls.filter((_, i) => i !== index);
    setDocumentationUrls(newDocs);
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
    const newPlans = pricePlans.filter((_, i) => i !== index);
    setPricePlans(newPlans);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const updateData = {
        id: offeringId,
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
      };

      const response = await fetch('/api/user-offerings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update offering');
      }

      setSuccess(data.message || 'Service offering updated successfully!');

      // Redirect back to offerings page after a short delay
      setTimeout(() => {
        router.push('/offerings');
      }, 1500);

    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  if (user === null || isLoadingData) {
    return <div className="min-h-screen bg-white text-gray-900 flex justify-center items-center">Cargando...</div>;
  }

  if (!offering) {
    return <div className="min-h-screen bg-white text-gray-900 flex justify-center items-center">Servicio no encontrado</div>;
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Link href="/offerings">
              <Button variant="ghost" size="sm" className="text-gray-600 hover:text-gray-900">
                <ArrowLeftIcon className="h-4 w-4 mr-2" />
                Volver
              </Button>
            </Link>
          </div>
          <div className="flex items-start justify-between gap-4 mb-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-semibold text-gray-900">Editar producto</h1>
                {isPublic && (
                  <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-50 border border-green-200">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                    <span className="text-xs text-green-700 font-medium">Activo</span>
                  </div>
                )}
              </div>
              <p className="text-sm text-gray-600">
                Actualiza la información, precios y documentación de tu servicio. Los cambios se reflejarán en el enlace público que compartes con empresas.
              </p>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className={`px-3 py-1.5 rounded-md text-sm border transition ${
                    isPublic
                      ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                      : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                  }`}
                  title="Visibilidad"
                >
                  <span className="inline-flex items-center gap-1.5">
                    <GlobeAltIcon className="h-4 w-4" />
                    {isPublic ? 'Público' : 'Privado'}
                  </span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {isPublic ? (
                  <DropdownMenuItem
                    onClick={async () => {
                      setIsSharing(true);
                      try {
                        const res = await fetch('/api/user-offerings/share', {
                          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: offeringId, action: 'disable' })
                        });
                        await res.json();
                        setIsPublic(false);
                        setShareUrl(null);
                      } finally { setIsSharing(false); }
                    }}
                    className="text-sm"
                  >Cambiar a Privado</DropdownMenuItem>
                ) : (
                  <DropdownMenuItem
                    onClick={async () => {
                      setIsSharing(true);
                      try {
                        const res = await fetch('/api/user-offerings/share', {
                          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: offeringId, action: 'enable' })
                        });
                        const data = await res.json();
                        if (res.ok) {
                          setIsPublic(true);
                          setShareUrl(data.shareUrl);
                        }
                      } finally { setIsSharing(false); }
                    }}
                    className="text-sm"
                  >Cambiar a Público</DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-6">
            <div className="grid gap-2">
              <Label htmlFor="offeringName" className="text-sm font-medium text-gray-700">Nombre del Servicio</Label>
              <Input
                id="offeringName"
                type="text"
                placeholder="Seguros de Vida"
                value={offeringName}
                onChange={(e) => setOfferingName(e.target.value)}
                required
                className="text-sm"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description" className="text-sm font-medium text-gray-700">Descripción del Servicio</Label>
              <Textarea
                id="description"
                placeholder="Protege tu negocio de reclamos por negligencia, errores u omisiones."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="text-sm"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="industry" className="text-sm font-medium text-gray-700">Industria del Servicio</Label>
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

          {/* Payment Type Selection */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
            <Label className="text-sm font-semibold text-gray-900">Tipo de Pago</Label>

            {/* Payment Type Radio Buttons */}
            <div className="flex gap-6">
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

            {/* One-time Payment */}
            {paymentType === 'one-time' && (
              <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
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
                <p className="text-xs text-green-700 mt-2">
                  Los clientes pagarán este monto una sola vez
                </p>
              </div>
            )}

            {/* Subscription Plans */}
            {paymentType === 'subscription' && (
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <Label className="text-sm font-medium text-blue-900 mb-3 block">
                  Planes de Suscripción
                </Label>

                <div className="space-y-3">
                  {pricePlans.map((plan, index) => (
                    <div key={index} className="flex gap-3 items-center p-3 bg-white border border-blue-200 rounded-lg">
                      <Input
                        placeholder="Nombre del plan (ej: Básico)"
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
                  + Añadir Plan de Suscripción
                </Button>

                <p className="text-xs text-blue-700 mt-2">
                  Los clientes serán cobrados recurrentemente según el período seleccionado
                </p>
              </div>
            )}
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-6">
            <div className="grid gap-2">
              <Label htmlFor="industryTargets" className="text-sm font-medium text-gray-700">Industrias Objetivo (separadas por comas)</Label>
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
              <Label htmlFor="websiteUrl" className="text-sm font-medium text-gray-700">URL del Sitio Web</Label>
              <Input
                id="websiteUrl"
                type="url"
                placeholder="https://www.segurostartup.com"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                className="text-sm"
              />
            </div>

            {/* Social Media Links */}
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
              <Button type="button" variant="outline" size="sm" onClick={handleAddSocialMedia} className="text-sm">+ Añadir Red Social</Button>
            </div>

            {/* Documentation URLs */}
            <div className="space-y-3">
              <Label className="text-sm font-medium text-gray-700">Documentación Relevante</Label>
              {documentationUrls.map((doc, index) => (
                <div key={index} className="flex gap-2 items-center">
                  <Input
                    placeholder="https://www.segurostartup.com/folleto.pdf"
                    type="url"
                    value={doc.url}
                    onChange={(e) => handleDocumentationChange(index, 'url', e.target.value)}
                    className="flex-grow text-sm"
                  />
                  <Input
                    placeholder="Folleto del producto"
                    value={doc.description}
                    onChange={(e) => handleDocumentationChange(index, 'description', e.target.value)}
                    className="w-1/3 text-sm"
                  />
                  <Button type="button" variant="outline" size="icon" onClick={() => handleRemoveDocumentation(index)} className="h-9 w-9">
                    -
                  </Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={handleAddDocumentation} className="text-sm">+ Añadir Documento</Button>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="targetCompanyRUCs" className="text-sm font-medium text-gray-700">RUCs de Empresas Objetivo (separados por comas)</Label>
              <Input
                id="targetCompanyRUCs"
                type="text"
                placeholder="1790000000001, 0990000000001"
                value={targetCompanyRUCs}
                onChange={(e) => setTargetCompanyRUCs(e.target.value)}
                className="text-sm"
              />
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

          <div className="flex gap-3 justify-end pt-4 border-t border-gray-200">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/offerings')}
              disabled={isLoading}
              className="text-sm"
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading} className="text-sm bg-[#635BFF] hover:bg-[#5548E6] text-white">
              {isLoading ? "Guardando..." : "Guardar cambios"}
            </Button>
          </div>
        </form>
        <div className="mt-8 bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-2">Enlace público</h2>
          <p className="text-sm text-gray-600 mb-6">Comparte tu servicio con empresas. Controla la información de contacto pública.</p>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label className="text-sm font-medium text-gray-700">Empresa</Label>
              <Input value={publicCompanyName} onChange={(e) => setPublicCompanyName(e.target.value)} onBlur={async () => {
                await fetch('/api/user-offerings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: offeringId, public_company_name: publicCompanyName }) });
              }} className="text-sm" />
            </div>
            <div className="grid gap-2">
              <Label className="text-sm font-medium text-gray-700">Nombre de contacto</Label>
              <Input value={publicContactName} onChange={(e) => setPublicContactName(e.target.value)} onBlur={async () => {
                await fetch('/api/user-offerings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: offeringId, public_contact_name: publicContactName }) });
              }} className="text-sm" />
            </div>
            <div className="grid gap-2">
              <Label className="text-sm font-medium text-gray-700">Email</Label>
              <Input value={publicContactEmail} onChange={(e) => setPublicContactEmail(e.target.value)} onBlur={async () => {
                await fetch('/api/user-offerings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: offeringId, public_contact_email: publicContactEmail }) });
              }} className="text-sm" />
            </div>
            <div className="grid gap-2">
              <Label className="text-sm font-medium text-gray-700">Teléfono</Label>
              <Input value={publicContactPhone} onChange={(e) => setPublicContactPhone(e.target.value)} onBlur={async () => {
                await fetch('/api/user-offerings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: offeringId, public_contact_phone: publicContactPhone }) });
              }} className="text-sm" />
            </div>
            <div className="grid gap-2">
              <Label className="text-sm font-medium text-gray-700">URL pública</Label>
              <div className="flex gap-2">
                <Input readOnly value={shareUrl || ''} placeholder="Activa el enlace para generar una URL" onFocus={(e) => e.currentTarget.select()} className="text-sm bg-gray-50 font-mono" />
                {!isPublic ? (
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={isSharing}
                    onClick={async () => {
                      setIsSharing(true);
                      try {
                        const res = await fetch('/api/user-offerings/share', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            id: offeringId,
                            action: 'enable',
                            contact: {
                              public_company_name: publicCompanyName || null,
                              public_contact_name: publicContactName || null,
                              public_contact_email: publicContactEmail || null,
                              public_contact_phone: publicContactPhone || null,
                            }
                          })
                        });
                        const data = await res.json();
                        if (!res.ok) throw new Error(data.error || 'Failed to enable share');
                        setShareUrl(data.shareUrl);
                        setIsPublic(true);
                      } finally {
                        setIsSharing(false);
                      }
                    }}
                    className="text-sm"
                  >
                    Activar
                  </Button>
                ) : (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        if (shareUrl) navigator.clipboard?.writeText(shareUrl).catch(() => {});
                      }}
                      className="text-sm"
                    >
                      Copiar
                    </Button>
                    {shareUrl && (
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
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      disabled={isSharing}
                      onClick={async () => {
                        setIsSharing(true);
                        try {
                          const res = await fetch('/api/user-offerings/share', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ id: offeringId, action: 'disable' })
                          });
                          await res.json();
                          setShareUrl(null);
                          setIsPublic(false);
                        } finally {
                          setIsSharing(false);
                        }
                      }}
                      className="text-sm"
                    >
                      Desactivar
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
