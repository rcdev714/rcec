"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { User } from "@supabase/supabase-js";


interface SocialMediaLinkInput {
  platform: string;
  url: string;
}

interface DocumentationUrlInput {
  url: string;
  description: string;
}

interface PricePlanInput {
  name: string;
  price: string;
  period: string;
}

type PaymentType = 'one-time' | 'subscription';

export default function NewOfferingPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null); // State to store user
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
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (!user) {
        router.push("/auth/login");
      }
    };
    fetchUser();
  }, [router]);

  // Render nothing or a loading spinner until user is fetched
  if (user === null) {
    return <div className="min-h-screen bg-background flex justify-center items-center">Cargando...</div>; // Or a loading spinner
  }

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
      const response = await fetch('/api/user-offerings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
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
          target_company_rucs: targetCompanyRUCs.split(',').map(ruc => ruc.trim()).filter(ruc => ruc.length > 0),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create offering');
      }

      setSuccess(data.message || 'Service offering created successfully!');
      // Optionally, clear form or redirect
      setOfferingName("");
      setDescription("");
      setIndustry("");
      setPaymentType('one-time');
      setOneTimePrice('');
      setPricePlans([{ name: '', price: '', period: '' }]);
      setIndustryTargets("");
      setWebsiteUrl("");
      setSocialMediaLinks([{ platform: '', url: '' }]);
      setDocumentationUrls([{ url: '', description: '' }]);
      setTargetCompanyRUCs("");

    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex justify-center py-8">
      <div className="w-full max-w-2xl px-4">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Nuevo Servicio</h1>
          <p className="text-gray-600 mt-1">
            Crea un perfil completo de tu producto o servicio. La plataforma generará un enlace público que podrás compartir con empresas prospecto para presentar tu oferta, precios y documentación.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="offeringName">Nombre del Servicio</Label>
              <Input
                id="offeringName"
                type="text"
                placeholder="Seguros de Vida"
                value={offeringName}
                onChange={(e) => setOfferingName(e.target.value)}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Descripción del Servicio</Label>
              <Textarea
                id="description"
                placeholder="Protege tu negocio de reclamos por negligencia, errores u omisiones."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="industry">Industria del Servicio</Label>
              <Input
                id="industry"
                type="text"
                placeholder="Seguros, Legal, Fianzas"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
              />
            </div>

            {/* Payment Type Selection */}
            <div className="space-y-4">
              <Label className="text-base font-semibold">Tipo de Pago</Label>

              {/* Payment Type Radio Buttons */}
              <div className="flex gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="paymentType"
                    value="one-time"
                    checked={paymentType === 'one-time'}
                    onChange={(e) => setPaymentType(e.target.value as PaymentType)}
                    className="w-4 h-4 text-blue-600"
                  />
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <span className="text-green-600 font-bold text-sm">$</span>
                    </div>
                    <div>
                      <div className="font-medium">Pago único</div>
                      <div className="text-sm text-gray-500">Cobrar una sola vez</div>
                    </div>
                  </div>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="paymentType"
                    value="subscription"
                    checked={paymentType === 'subscription'}
                    onChange={(e) => setPaymentType(e.target.value as PaymentType)}
                    className="w-4 h-4 text-blue-600"
                  />
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 font-bold text-sm">∞</span>
                    </div>
                    <div>
                      <div className="font-medium">Suscripción</div>
                      <div className="text-sm text-gray-500">Cobros recurrentes</div>
                    </div>
                  </div>
                </label>
              </div>

              {/* One-time Payment */}
              {paymentType === 'one-time' && (
                <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <Label htmlFor="oneTimePrice" className="text-sm font-medium text-green-800">
                    Precio del Pago Único
                  </Label>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-lg font-medium">$</span>
                    <Input
                      id="oneTimePrice"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={oneTimePrice}
                      onChange={(e) => setOneTimePrice(e.target.value)}
                      className="max-w-xs border-green-300 focus:border-green-500"
                    />
                  </div>
                  <p className="text-xs text-green-600 mt-1">
                    Los clientes pagarán este monto una sola vez
                  </p>
                </div>
              )}

              {/* Subscription Plans */}
              {paymentType === 'subscription' && (
                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <Label className="text-sm font-medium text-blue-800 mb-3 block">
                    Planes de Suscripción
                  </Label>

                  <div className="space-y-3">
                    {pricePlans.map((plan, index) => (
                      <div key={index} className="flex gap-3 items-center p-3 bg-white border border-blue-200 rounded-lg">
                        <Input
                          placeholder="Nombre del plan (ej: Básico)"
                          value={plan.name}
                          onChange={(e) => handlePricePlanChange(index, 'name', e.target.value)}
                          className="flex-1 border-blue-300"
                        />
                        <div className="flex items-center gap-1">
                          <span className="text-sm font-medium">$</span>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={plan.price}
                            onChange={(e) => handlePricePlanChange(index, 'price', e.target.value)}
                            className="w-24 border-blue-300"
                          />
                        </div>
                        <span className="text-sm text-gray-500">por</span>
                        <Input
                          placeholder="mes"
                          value={plan.period}
                          onChange={(e) => handlePricePlanChange(index, 'period', e.target.value)}
                          className="w-20 border-blue-300"
                        />
                        <Button type="button" variant="outline" size="icon" onClick={() => handleRemovePricePlan(index)}>
                          -
                        </Button>
                      </div>
                    ))}
                  </div>

                  <Button type="button" variant="outline" size="sm" onClick={handleAddPricePlan} className="mt-3">
                    + Añadir Plan de Suscripción
                  </Button>

                  <p className="text-xs text-blue-600 mt-2">
                    Los clientes serán cobrados recurrentemente según el período seleccionado
                  </p>
                </div>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="industryTargets">Industrias Objetivo (separadas por comas)</Label>
              <Input
                id="industryTargets"
                type="text"
                placeholder="Tecnología, Consultoría, Marketing"
                value={industryTargets}
                onChange={(e) => setIndustryTargets(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="websiteUrl">URL del Sitio Web</Label>
              <Input
                id="websiteUrl"
                type="url"
                placeholder="https://www.segurostartup.com"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
              />
            </div>

            {/* Social Media Links */}
            <div className="space-y-3">
              <Label>Enlaces de Redes Sociales</Label>
              {socialMediaLinks.map((link, index) => (
                <div key={index} className="flex gap-2 items-center">
                  <Input
                    placeholder="LinkedIn"
                    value={link.platform}
                    onChange={(e) => handleSocialMediaChange(index, 'platform', e.target.value)}
                    className="w-1/3"
                  />
                  <Input
                    placeholder="URL"
                    type="url"
                    value={link.url}
                    onChange={(e) => handleSocialMediaChange(index, 'url', e.target.value)}
                    className="flex-grow"
                  />
                  <Button type="button" variant="outline" size="icon" onClick={() => handleRemoveSocialMedia(index)}>
                    -
                  </Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={handleAddSocialMedia}>+ Añadir Red Social</Button>
            </div>

            {/* Documentation URLs */}
            <div className="space-y-3">
              <Label>Documentación Relevante</Label>
              {documentationUrls.map((doc, index) => (
                <div key={index} className="flex gap-2 items-center">
                  <Input
                    placeholder="https://www.segurostartup.com/folleto.pdf"
                    type="url"
                    value={doc.url}
                    onChange={(e) => handleDocumentationChange(index, 'url', e.target.value)}
                    className="flex-grow"
                  />
                  <Input
                    placeholder="Folleto del producto"
                    value={doc.description}
                    onChange={(e) => handleDocumentationChange(index, 'description', e.target.value)}
                    className="w-1/3"
                  />
                  <Button type="button" variant="outline" size="icon" onClick={() => handleRemoveDocumentation(index)}>
                    -
                  </Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={handleAddDocumentation}>+ Añadir Documento</Button>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="targetCompanyRUCs">RUCs de Empresas Objetivo (separados por comas)</Label>
              <Input
                id="targetCompanyRUCs"
                type="text"
                placeholder="1790000000001, 0990000000001"
                value={targetCompanyRUCs}
                onChange={(e) => setTargetCompanyRUCs(e.target.value)}
              />
            </div>

            {error && <p className="text-destructive text-sm">{error}</p>}
            {success && <p className="text-green-500 text-sm">{success}</p>}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Enviando..." : "Crear Oferta de Servicio"}
            </Button>
          </form>
      </div>
    </div>
  );
}
