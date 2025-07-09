'use client'

import { useAuth } from '../../contexts/AuthContext'
import { Dashboard } from '../../components/Dashboard'
import { AuthForm } from '../../components/AuthForm'
import { useRouter } from 'next/navigation'

export default function DashboardPage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg text-gray-600">Loading...</div>
      </div>
    )
  }

  if (!user) {
    return <AuthForm onSuccess={() => router.push('/dashboard')} />
  }

  return <Dashboard />
}
