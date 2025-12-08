'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';

type Plan = {
  id: 'PRO' | 'ENTERPRISE';
  name: string;
  price: number;
  features: string[];
};

const plans: Plan[] = [
  {
    id: 'PRO',
    name: 'Pro',
    price: 20,
    features: [
      '4x mayor límite de uso en Agentes',
      'Búsqueda de empresas ilimitada',
      'Búsqueda en LinkedIn',
      'Modelo de razonamiento avanzado',
      'Métricas de uso',
    ],
  },
  {
    id: 'ENTERPRISE',
    name: 'Empresarial',
    price: 200,
    features: [
      '10x más uso de agentes que en Pro',
      'Soporte prioritario',
      'Búsqueda de empresas ilimitada',
      'Búsqueda en LinkedIn',
      'Modelo de razonamiento avanzado disponible',
      'Métricas de uso',
      'Acceso anticipado a funciones avanzadas',
    ],
  },
];

export default function PricingUpsell() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
      {plans.map((plan) => (
        <Card
          key={plan.id}
          className="border border-gray-200 shadow-sm bg-white flex flex-col"
        >
          <CardHeader className="pb-1 pt-3 px-4">
            <CardTitle className="text-sm font-semibold text-gray-900 flex items-center justify-between">
              <span>{plan.name}</span>
              <span className="text-base font-semibold text-gray-900">${plan.price}<span className="text-[11px] text-gray-500">/mes</span></span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-1 pb-3 px-4 flex flex-col flex-1">
            <ul className="space-y-1.5 mb-3">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-start gap-2 text-[11px] text-gray-700">
                  <Check className="w-3 h-3 text-indigo-500 mt-0.5" />
                  <span className="leading-snug">{feature}</span>
                </li>
              ))}
            </ul>
            <div className="flex justify-start mt-auto pt-1">
              <Button
                asChild
                className="h-7 px-3 text-[11px] font-medium bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                <Link href="/pricing" aria-label={`Ver el plan ${plan.name} en la página de precios`}>
                  Actualizar plan
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

