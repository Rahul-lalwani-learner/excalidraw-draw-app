'use client'

import { AuthForm } from '../../components/AuthForm'
import { useRouter } from 'next/navigation'

export default function AuthPage() {
  const router = useRouter()

  return (
    <AuthForm onSuccess={() => router.push('/dashboard')} />
  )
}
