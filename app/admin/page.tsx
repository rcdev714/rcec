import { redirect } from 'next/navigation'
import { isAdmin, isAdminPasswordVerified } from '@/lib/admin'
import AdminDashboard from '@/components/admin/admin-dashboard'

export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  const adminStatus = await isAdmin()
  const passwordVerified = await isAdminPasswordVerified()

  if (!adminStatus) {
    redirect('/auth/login?message=Admin access required')
  }

  if (!passwordVerified) {
    redirect('/dashboard?message=Se requiere contraseña de administrador')
  }

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Panel de Administrador</h1>
              <p className="mt-1 text-sm text-gray-500">
                Visión general del rendimiento y gestión de la plataforma
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                Sistema Operativo
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AdminDashboard />
      </div>
    </div>
  )
}
