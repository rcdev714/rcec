'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import PlanAndSubscriptionCard from '@/components/plan-subscription-card';
import { UserSettings } from '@/types/user-profile';
import { User, Building2, CreditCard, Settings } from 'lucide-react';
import UserAvatar from '@/components/user-avatar';
import { LogoutButton } from '@/components/logout-button';

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


  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            {/* Loading Header */}
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-2">
                <Settings className="h-6 w-6 text-gray-600" />
                <h1 className="text-3xl font-semibold text-gray-900">Configuración</h1>
              </div>
              <div className="h-4 bg-gray-200 rounded w-80 animate-pulse"></div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <User className="h-5 w-5 text-gray-600" />
                      <CardTitle>Información Personal</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="animate-pulse space-y-6">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="h-11 bg-gray-200 rounded"></div>
                        <div className="h-11 bg-gray-200 rounded"></div>
                      </div>
                      <div className="h-11 bg-gray-200 rounded"></div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="h-11 bg-gray-200 rounded"></div>
                        <div className="h-11 bg-gray-200 rounded"></div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
              <div className="lg:col-span-1 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CreditCard className="h-5 w-5 text-gray-600" />
                      Suscripción
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="animate-pulse space-y-4">
                      <div className="h-8 bg-gray-200 rounded"></div>
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto">
          {/* Page Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 mb-2">
                <Settings className="h-6 w-6 text-gray-600" />
                <h1 className="text-3xl font-semibold text-gray-900">Configuración</h1>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-900">
                    {(firstName || lastName)
                      ? `${firstName} ${lastName}`.trim()
                      : (userSettings?.email || 'Usuario')}
                  </div>
                  {userSettings?.email && (
                    <div className="text-xs text-gray-500">{userSettings.email}</div>
                  )}
                </div>
                <UserAvatar />
                <LogoutButton />
              </div>
            </div>
            <p className="text-gray-600 mt-2">Gestiona tu perfil personal, información de empresa y suscripción</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Main Content */}
            <div className="space-y-8">
              <div id="account">
              {/* Personal Information */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <User className="h-5 w-5 text-gray-600" />
                    <CardTitle>Información Personal</CardTitle>
                  </div>
                  <CardDescription>
                    Actualiza tu información personal y de contacto
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName" className="text-sm font-medium text-gray-700">Nombre</Label>
                        <Input
                          id="firstName"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          placeholder="Tu nombre"
                          className="h-11"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName" className="text-sm font-medium text-gray-700">Apellido</Label>
                        <Input
                          id="lastName"
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          placeholder="Tu apellido"
                          className="h-11"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-sm font-medium text-gray-700">Correo Electrónico</Label>
                      <Input
                        id="email"
                        value={userSettings?.email || ''}
                        disabled
                        className="bg-gray-50 h-11"
                      />
                      <p className="text-xs text-gray-500">
                        Para cambiar tu correo, contacta soporte
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="phone" className="text-sm font-medium text-gray-700">Teléfono</Label>
                        <Input
                          id="phone"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="+593 99 999 9999"
                          className="h-11"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="position" className="text-sm font-medium text-gray-700">Cargo/Posición</Label>
                        <Input
                          id="position"
                          value={position}
                          onChange={(e) => setPosition(e.target.value)}
                          placeholder="Tu cargo o posición"
                          className="h-11"
                        />
                      </div>
                    </div>

                    {/* Company Information Section */}
                    <div id="company" className="border-t pt-6">
                      <div className="flex items-center gap-2 mb-4">
                        <Building2 className="h-5 w-5 text-gray-600" />
                        <h3 className="text-lg font-semibold text-gray-900">Información de Empresa</h3>
                      </div>
                      <p className="text-sm text-gray-600 mb-4">
                        Información sobre la empresa donde trabajas
                      </p>
                      
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="companyName" className="text-sm font-medium text-gray-700">Nombre de la Empresa</Label>
                          <Input
                            id="companyName"
                            value={companyName}
                            onChange={(e) => setCompanyName(e.target.value)}
                            placeholder="Nombre de tu empresa"
                            className="h-11"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="companyRuc" className="text-sm font-medium text-gray-700">RUC de la Empresa</Label>
                          <Input
                            id="companyRuc"
                            value={companyRuc}
                            onChange={(e) => setCompanyRuc(e.target.value)}
                            placeholder="1234567890123"
                            maxLength={13}
                            className="h-11"
                          />
                          <p className="text-xs text-gray-500">
                            RUC de 13 dígitos de tu empresa
                          </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                          <div className="space-y-2">
                            <Label className="text-sm font-medium text-gray-700">Tipo de Usuario</Label>
                            <div className="h-11 px-3 flex items-center bg-gray-50 border border-gray-200 rounded-md">
                              <Badge variant="outline" className="bg-white">
                                {userSettings?.user_type === 'enterprise' ? 'Empresarial' : 'Individual'}
                              </Badge>
                            </div>
                          </div>
                          
                          {userSettings?.enterprise_role && (
                            <div className="space-y-2">
                              <Label className="text-sm font-medium text-gray-700">Rol Empresarial</Label>
                              <div className="h-11 px-3 flex items-center bg-gray-50 border border-gray-200 rounded-md">
                                <Badge variant="outline" className="bg-white">
                                  {userSettings.enterprise_role}
                                </Badge>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Messages */}
                    {message && (
                      <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                          <p className="text-sm text-green-800 font-medium">{message}</p>
                        </div>
                      </div>
                    )}

                    {error && (
                      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 bg-red-500 rounded-full"></div>
                          <p className="text-sm text-red-800 font-medium">{error}</p>
                        </div>
                      </div>
                    )}

                    {/* Submit Button */}
                    <div className="flex justify-end pt-4">
                      <Button type="submit" disabled={saving} className="px-8 h-11 bg-indigo-500">
                        {saving ? 'Guardando...' : 'Guardar Cambios'}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
              </div>
            </div>

            {/* Right column with Subscription and Billing as sections */}
            <div className="flex-1 space-y-8">
              <div id="subscription">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CreditCard className="h-5 w-5 text-gray-600" />
                      Suscripción
                    </CardTitle>
                    <CardDescription>Estado actual de tu plan</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <PlanAndSubscriptionCard />
                  </CardContent>
                </Card>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
