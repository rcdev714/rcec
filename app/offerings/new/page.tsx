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

export default function NewOfferingPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null); // State to store user
  const [offeringName, setOfferingName] = useState("");
  const [description, setDescription] = useState("");
  const [industry, setIndustry] = useState("");
  const [pricePlans, setPricePlans] = useState("");
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
          price_plans: pricePlans ? JSON.parse(pricePlans) : undefined, // Parse JSON for backend
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
      setPricePlans("");
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
          <h1 className="text-2xl font-bold">Ofrecer Nuevo Servicio</h1>
          <p className="text-muted-foreground mt-1">Completa los detalles de tu servicio para que las empresas lo conozcan.</p>
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

            <div className="grid gap-2">
              <Label htmlFor="pricePlans">Planes de Precios (JSON)</Label>
              <Textarea
                id="pricePlans"
                placeholder={'[{"cobertura":"Básica","prima":"$100/mes"}, {"cobertura":"Completa","prima":"$250/mes"}]'}
                value={pricePlans}
                onChange={(e) => setPricePlans(e.target.value)}
                rows={3}
              />
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
