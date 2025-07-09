'use client'

import { useAuth } from '../../../contexts/AuthContext'
import { ChatRoomClient } from '../../../components/ChatRoomClient'
import { AuthForm } from '../../../components/AuthForm'
import { useRouter } from 'next/navigation'
import { use } from 'react'

export default function RoomPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
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
    return <AuthForm onSuccess={() => router.push(`/room/${slug}`)} />
  }

  return <ChatRoomClient roomSlug={slug} />
}