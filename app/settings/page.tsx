'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import SubscriptionStatus from '@/components/subscription-status';
import { UserSettings } from '@/types/user-profile';

export default function SettingsPage() {
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Form states
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [companyRuc, setCompanyRuc] = useState('');
  const [position, setPosition] = useState('');

  useEffect(() => {
    fetchUserSettings();
  }, []);

  const fetchUserSettings = async () => {
    try {
      const response = await fetch('/api/user-profile');
      if (response.ok) {
        const data = await response.json();
        setUserSettings(data);
        
        // Set form values
        setFirstName(data.first_name || '');
        setLastName(data.last_name || '');
        setPhone(data.phone || '');
        setCompanyName(data.company_name || '');
        setCompanyRuc(data.company_ruc || '');
        setPosition(data.position || '');
      } else {
        setError('No se pudo cargar la información del usuario');
      }
    } catch (error) {
      console.error('Error fetching user settings:', error);
      setError('Error al cargar la configuración');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');

    try {
      const response = await fetch('/api/user-profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          first_name: firstName,
          last_name: lastName,
          phone,
          company_name: companyName,
          company_ruc: companyRuc,
          position,
          user_type: userSettings?.user_type,
          enterprise_role: userSettings?.enterprise_role,
        }),
      });

      if (response.ok) {
        setMessage('Perfil actualizado exitosamente');
        // Refresh data
        fetchUserSettings();
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Error al actualizar el perfil');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      setError('Error al actualizar el perfil');
    } finally {
      setSaving(false);
    }
  };

  const handleManagePayment = async () => {
    try {
      const response = await fetch('/api/subscriptions/portal', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('No se pudo crear la sesión del portal');
      }

      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      console.error('Error creating portal session:', error);
      alert('No se pudo abrir el portal de facturación. Por favor, intenta de nuevo.');
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">Configuración</h1>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Información Personal</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="animate-pulse space-y-4">
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/3"></div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Configuración</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Personal Information */}
        <Card>
          <CardHeader>
            <CardTitle>Información Personal</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">Nombre</Label>
                  <Input
                    id="firstName"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Tu nombre"
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Apellido</Label>
                  <Input
                    id="lastName"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Tu apellido"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="email">Correo Electrónico</Label>
                <Input
                  id="email"
                  value={userSettings?.email || ''}
                  disabled
                  className="bg-gray-50"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Para cambiar tu correo, contacta soporte
                </p>
              </div>

              <div>
                <Label htmlFor="phone">Teléfono</Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+593 99 999 9999"
                />
              </div>

              <div>
                <Label htmlFor="position">Cargo/Posición</Label>
                <Input
                  id="position"
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  placeholder="Tu cargo o posición"
                />
              </div>

              {message && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                  <p className="text-sm text-green-800">{message}</p>
                </div>
              )}

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              <Button type="submit" disabled={saving} className="w-full">
                {saving ? 'Guardando...' : 'Guardar Cambios'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Company Information */}
        <Card>
          <CardHeader>
            <CardTitle>Información de Empresa</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="companyName">Nombre de la Empresa</Label>
              <Input
                id="companyName"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Nombre de tu empresa"
              />
            </div>

            <div>
              <Label htmlFor="companyRuc">RUC de la Empresa</Label>
              <Input
                id="companyRuc"
                value={companyRuc}
                onChange={(e) => setCompanyRuc(e.target.value)}
                placeholder="1234567890123"
                maxLength={13}
              />
              <p className="text-xs text-gray-500 mt-1">
                RUC de 13 dígitos de tu empresa
              </p>
            </div>

            <div className="pt-4 border-t">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Tipo de Usuario:</span>
                <Badge variant="outline">
                  {userSettings?.user_type === 'enterprise' ? 'Empresarial' : 'Individual'}
                </Badge>
              </div>
              
              {userSettings?.enterprise_role && (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Rol Empresarial:</span>
                  <Badge variant="outline">{userSettings.enterprise_role}</Badge>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Subscription Status */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Estado de Suscripción</CardTitle>
          </CardHeader>
          <CardContent>
            <SubscriptionStatus />
          </CardContent>
        </Card>

        {/* Payment Management */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Gestión de Pagos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600">
              Gestiona tu información de facturación, historial de pagos y métodos de pago.
            </p>
            
            <div className="flex gap-4">
              <Button 
                onClick={handleManagePayment}
                variant="outline"
                disabled={userSettings?.subscription_plan === 'FREE'}
              >
                Portal de Facturación
              </Button>
              
              <Button 
                onClick={() => window.location.href = '/pricing'}
                variant="default"
              >
                {userSettings?.subscription_plan === 'FREE' ? 'Actualizar Plan' : 'Cambiar Plan'}
              </Button>
            </div>
            
            {userSettings?.subscription_plan === 'FREE' && (
              <p className="text-xs text-gray-500">
                El portal de facturación está disponible solo para suscripciones de pago.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
