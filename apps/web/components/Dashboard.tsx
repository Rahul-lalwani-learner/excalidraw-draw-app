'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import axios from 'axios'
import { useRouter } from 'next/navigation'

interface Room {
  id: string
  slug: string
  adminId: string
  isAdmin: boolean
}

export function Dashboard() {
  const [rooms, setRooms] = useState<Room[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [showJoinForm, setShowJoinForm] = useState(false)
  const [roomSlug, setRoomSlug] = useState('')
  const [joinRoomSlug, setJoinRoomSlug] = useState('')
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const { user, token, logout } = useAuth()
  const router = useRouter()

  const fetchUserRooms = useCallback(async () => {
    if (!token) return
    
    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_BACKEND_HTTP_URL || 'http://localhost:3001'}/user/rooms`,
        {
          headers: {
            Authorization: token
          }
        }
      )
      
      if (response.data.rooms) {
        setRooms(response.data.rooms)
      }
    } catch (error) {
      console.error('Error fetching rooms:', error)
      // If endpoint doesn't exist yet, set empty array
      setRooms([])
    } finally {
      setIsLoading(false)
    }
  }, [token])

  useEffect(() => {
    fetchUserRooms()
  }, [token, fetchUserRooms])

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token || !roomSlug.trim()) return

    setIsSubmitting(true)
    setMessage('')

    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_BACKEND_HTTP_URL || 'http://localhost:3001'}/room`,
        { name: roomSlug.trim() },
        {
          headers: {
            Authorization: token
          }
        }
      )

      if (response.data.roomId) {
        setMessage('Room created successfully!')
        setRoomSlug('')
        setShowCreateForm(false)
        // Refresh the rooms list
        fetchUserRooms()
      }
    } catch (error) {
      const axiosError = error as { response?: { data?: { message?: string } } }
      setMessage(axiosError.response?.data?.message || 'Failed to create room')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token || !joinRoomSlug.trim()) return

    setIsSubmitting(true)
    setMessage('')

    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_BACKEND_HTTP_URL || 'http://localhost:3001'}/room/${joinRoomSlug.trim()}`,
        {
          headers: {
            Authorization: token
          }
        }
      )

      if (response.data.roomId) {
        router.push(`/room/${joinRoomSlug.trim()}`)
      }
    } catch (error) {
      const axiosError = error as { response?: { data?: { message?: string } } }
      setMessage(axiosError.response?.data?.message || 'Room not found')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteRoom = async (roomId: string, slug: string) => {
    if (!token || !confirm(`Are you sure you want to delete room "${slug}"?`)) return

    try {
      await axios.delete(
        `${process.env.NEXT_PUBLIC_BACKEND_HTTP_URL || 'http://localhost:3001'}/room`,
        {
          data: { name: slug },
          headers: {
            Authorization: token
          }
        }
      )

      setMessage('Room deleted successfully!')
      // Refresh the rooms list
      fetchUserRooms()
    } catch (error) {
      const axiosError = error as { response?: { data?: { message?: string } } }
      setMessage(axiosError.response?.data?.message || 'Failed to delete room')
    }
  }

  const handleEnterRoom = (slug: string) => {
    router.push(`/room/${slug}`)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg text-gray-600">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Chat Rooms</h1>
              <p className="mt-2 text-sm text-gray-600">
                Welcome back, {user?.name}!
              </p>
            </div>
            <button
              onClick={logout}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {message && (
            <div className={`mb-4 p-4 rounded-md ${
              message.includes('success') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
            }`}>
              {message}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Room</h3>
                {!showCreateForm ? (
                  <button
                    onClick={() => setShowCreateForm(true)}
                    className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Create Room
                  </button>
                ) : (
                  <form onSubmit={handleCreateRoom} className="space-y-4">
                    <input
                      type="text"
                      value={roomSlug}
                      onChange={(e) => setRoomSlug(e.target.value)}
                      placeholder="Room name/slug"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 placeholder-gray-500"
                      required
                    />
                    <div className="flex space-x-2">
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 disabled:opacity-50"
                      >
                        {isSubmitting ? 'Creating...' : 'Create'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowCreateForm(false)
                          setRoomSlug('')
                        }}
                        className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Join Room</h3>
                {!showJoinForm ? (
                  <button
                    onClick={() => setShowJoinForm(true)}
                    className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                  >
                    Join Room
                  </button>
                ) : (
                  <form onSubmit={handleJoinRoom} className="space-y-4">
                    <input
                      type="text"
                      value={joinRoomSlug}
                      onChange={(e) => setJoinRoomSlug(e.target.value)}
                      placeholder="Room slug to join"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 placeholder-gray-500"
                      required
                    />
                    <div className="flex space-x-2">
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="flex-1 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50"
                      >
                        {isSubmitting ? 'Joining...' : 'Join'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowJoinForm(false)
                          setJoinRoomSlug('')
                        }}
                        className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg font-medium text-gray-900">Your Rooms</h3>
              <p className="mt-1 text-sm text-gray-500">
                Rooms you&apos;ve created and manage
              </p>
            </div>
            <div className="border-t border-gray-200">
              {rooms.length === 0 ? (
                <div className="px-4 py-5 sm:px-6 text-center text-gray-500">
                  You haven&apos;t created any rooms yet.
                </div>
              ) : (
                <ul className="divide-y divide-gray-200">
                  {rooms.map((room) => (
                    <li key={room.id} className="px-4 py-4 flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <div className="h-10 w-10 bg-indigo-100 rounded-full flex items-center justify-center">
                            <span className="text-indigo-600 font-medium">
                              {room.slug.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {room.slug}
                          </div>
                          <div className="text-sm text-gray-500">
                            {room.isAdmin ? 'Admin' : 'Member'}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleEnterRoom(room.slug)}
                          className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                          Enter
                        </button>
                        {room.isAdmin && (
                          <button
                            onClick={() => handleDeleteRoom(room.id, room.slug)}
                            className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
