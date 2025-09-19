import { redirect } from 'next/navigation'
import { isAdmin } from '@/lib/admin'
import AdminDashboard from '@/components/admin/admin-dashboard'

export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  const adminStatus = await isAdmin()
  
  if (!adminStatus) {
    redirect('/auth/login?message=Admin access required')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Panel de Administrador</h1>
          <p className="mt-2 text-gray-600">
            Monitorea usuarios activos, suscripciones, uso de la plataforma y gestiona la base de datos empresarial.
          </p>
        </div>
        
        <AdminDashboard />
      </div>
    </div>
  )
}
