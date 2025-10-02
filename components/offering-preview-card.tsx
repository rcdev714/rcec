"use client";

import { useEffect, useState } from "react";
import { UserOffering } from "@/types/user-offering";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, Package } from "lucide-react";
import Link from "next/link";

interface OfferingPreviewCardProps {
  offeringId: string;
}

export default function OfferingPreviewCard({ offeringId }: OfferingPreviewCardProps) {
  const [offering, setOffering] = useState<UserOffering | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOffering = async () => {
      try {
        const response = await fetch(`/api/user-offerings/public/${offeringId}`);
        if (response.ok) {
          const data = await response.json();
          setOffering(data);
        }
      } catch (err) {
        console.error("Error fetching offering:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchOffering();
  }, [offeringId]);

  if (loading) {
    return (
      <div className="p-4 border border-gray-200 rounded-lg bg-gray-50 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
        <div className="h-3 bg-gray-200 rounded w-full"></div>
      </div>
    );
  }

  if (!offering) {
    return null;
  }

  const shareUrl = offering.is_public && offering.public_slug
    ? `/s/${offering.public_slug}`
    : null;

  return (
    <Card className="mt-3 border-gray-300 bg-gradient-to-br from-gray-50 to-white">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2 flex-1 min-w-0">
            <Package className="h-5 w-5 text-gray-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base truncate">{offering.offering_name}</CardTitle>
              {offering.industry && (
                <Badge variant="outline" className="text-xs mt-1">
                  {offering.industry}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {offering.description && (
          <p className="text-sm text-gray-700 line-clamp-3">{offering.description}</p>
        )}
        
        {offering.price_plans && offering.price_plans.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-green-700">
              {typeof offering.price_plans[0].price === 'number' 
                ? `$${offering.price_plans[0].price}` 
                : offering.price_plans[0].price}
              {offering.price_plans[0].period && `/${offering.price_plans[0].period}`}
            </span>
          </div>
        )}

        <div className="flex gap-2">
          {shareUrl && (
            <Link href={shareUrl}>
              <Button size="sm" variant="outline" className="text-xs">
                <ExternalLink className="h-3 w-3 mr-1" />
                Ver detalles
              </Button>
            </Link>
          )}
          {offering.website_url && (
            <a 
              href={offering.website_url.startsWith('http') 
                ? offering.website_url 
                : `https://${offering.website_url}`
              }
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button size="sm" variant="outline" className="text-xs">
                <ExternalLink className="h-3 w-3 mr-1" />
                Sitio web
              </Button>
            </a>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

