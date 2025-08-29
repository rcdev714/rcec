import { redirect } from 'next/navigation'
import { isAdmin } from '@/lib/admin'
import AdminDashboard from '@/components/admin/admin-dashboard'

export default async function AdminPage() {
  const adminStatus = await isAdmin()
  
  if (!adminStatus) {
    redirect('/auth/login?message=Admin access required')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="mt-2 text-gray-600">
            Monitoring and management for Acquira B2B platform
          </p>
        </div>
        
        <AdminDashboard />
      </div>
    </div>
  )
}
