'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useRouter } from 'next/navigation'
import axios from 'axios'

interface Chat {
  id: string
  message: string
  user: {
    id: string
    name: string
    email: string
  }
  roomId: string
  isPending?: boolean // For optimistic updates
  isError?: boolean // For failed messages
}

interface Message {
  type: 'join_room' | 'leave_room' | 'chat'
  room_id?: string
  message?: string
  temp_id?: string // For optimistic updates
}

export function ChatRoomClient({ roomSlug }: { roomSlug: string }) {
  const [messages, setMessages] = useState<Chat[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [roomId, setRoomId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [isConnected, setIsConnected] = useState(false)
  const [isJoined, setIsJoined] = useState(false)
  
  const { user, token } = useAuth()
  const router = useRouter()
  const wsRef = useRef<WebSocket | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Fetch room ID and previous messages
  useEffect(() => {
    const fetchRoomData = async () => {
      if (!token || !roomSlug) return
      
      try {
        // Get room ID by slug
        const roomResponse = await axios.get(
          `${process.env.NEXT_PUBLIC_BACKEND_HTTP_URL || 'http://localhost:3001'}/room/${roomSlug}`,
          {
            headers: { Authorization: token }
          }
        )
        
        const fetchedRoomId = roomResponse.data.roomId
        setRoomId(fetchedRoomId)
        
        // Fetch previous messages
        const messagesResponse = await axios.get(
          `${process.env.NEXT_PUBLIC_BACKEND_HTTP_URL || 'http://localhost:3001'}/chats/${fetchedRoomId}`,
          {
            headers: { Authorization: token }
          }
        )
        
        setMessages(messagesResponse.data.chats || [])
        setIsLoading(false)
      } catch (error) {
        const axiosError = error as { response?: { data?: { message?: string } } }
        setError(axiosError.response?.data?.message || 'Failed to load room')
        setIsLoading(false)
      }
    }

    fetchRoomData()
  }, [token, roomSlug])

  // WebSocket connection
  useEffect(() => {
    if (!token || !roomId) return

    let reconnectTimeout: NodeJS.Timeout
    let shouldReconnect = true

    const connectWebSocket = () => {
      // Clear any existing connection
      if (wsRef.current) {
        wsRef.current.close()
      }
      
      // Remove "Bearer " prefix from token if present
      const cleanToken = token.replace(/^Bearer\s+/, '')
      const wsUrl = `${process.env.NEXT_PUBLIC_BACKEND_WS_URL || 'ws://localhost:3002'}?token=${encodeURIComponent(cleanToken)}`
      
      console.log('Connecting to WebSocket:', wsUrl.replace(cleanToken, 'TOKEN_HIDDEN'))
      
      wsRef.current = new WebSocket(wsUrl)
      
      wsRef.current.onopen = () => {
        console.log('WebSocket connected successfully')
        setIsConnected(true)
        setError('')
        
        // Join the room
        if (wsRef.current && roomId) {
          const joinMessage: Message = {
            type: 'join_room',
            room_id: roomId
          }
          wsRef.current.send(JSON.stringify(joinMessage))
          setIsJoined(true)
        }
      }
      
      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          console.log('Received WebSocket message:', data)
          
          if (data.type === 'chat') {
            // Check if this is a confirmation of our optimistic update
            if (data.temp_id) {
              // Update the pending message with the real ID
              setMessages(prev => prev.map(msg => 
                msg.id === data.temp_id ? {
                  ...msg,
                  id: data.chat_id || Date.now().toString(),
                  isPending: false
                } : msg
              ))
            } else {
              // This is a new message from another user
              const chatMessage = {
                id: data.chat_id || Date.now().toString(),
                message: data.message,
                user: {
                  id: data.user_id,
                  name: data.user_name,
                  email: '' // Not provided by backend
                },
                roomId: data.room_id
              }
              setMessages(prev => [...prev, chatMessage])
            }
          } else if (data.type === 'error') {
            // Check if this is an error for a pending message
            if (data.temp_id) {
              // Remove the failed message
              setMessages(prev => prev.filter(msg => msg.id !== data.temp_id))
            }
            setError(data.message || 'An error occurred')
          } else if (data.type === 'join_room_success') {
            console.log('Successfully joined room:', data.room_id)
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error)
        }
      }
      
      wsRef.current.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason)
        setIsConnected(false)
        setIsJoined(false)
        
        // Only attempt to reconnect if it's not a manual close and should reconnect
        if (shouldReconnect && event.code !== 1000) {
          console.log('Attempting to reconnect in 3 seconds...')
          reconnectTimeout = setTimeout(() => {
            if (roomId && shouldReconnect) {
              connectWebSocket()
            }
          }, 3000)
        }
      }
      
      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error)
        setError('Connection error. Trying to reconnect...')
      }
    }

    connectWebSocket()

    return () => {
      shouldReconnect = false
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout)
      }
      if (wsRef.current) {
        // Leave room before closing
        if (roomId) {
          const leaveMessage: Message = {
            type: 'leave_room',
            room_id: roomId
          }
          wsRef.current.send(JSON.stringify(leaveMessage))
        }
        wsRef.current.close(1000, 'Component unmounting')
      }
    }
  }, [token, roomId])

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!newMessage.trim() || !wsRef.current || !roomId || !isConnected) return

    const messageText = newMessage.trim()
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    // Optimistically add the message to the UI
    const optimisticMessage: Chat = {
      id: tempId,
      message: messageText,
      user: {
        id: user?.id || '',
        name: user?.name || '',
        email: user?.email || ''
      },
      roomId: roomId,
      isPending: true
    }
    
    setMessages(prev => [...prev, optimisticMessage])
    setNewMessage('')

    // Send the message to the server
    const message: Message = {
      type: 'chat',
      room_id: roomId,
      message: messageText,
      temp_id: tempId
    }

    wsRef.current.send(JSON.stringify(message))
  }

  const handleLeaveRoom = () => {
    if (wsRef.current && roomId) {
      const leaveMessage: Message = {
        type: 'leave_room',
        room_id: roomId
      }
      wsRef.current.send(JSON.stringify(leaveMessage))
    }
    router.push('/dashboard')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg text-gray-600">Loading room...</div>
      </div>
    )
  }

  if (error && !roomId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 mb-4">{error}</div>
          <button
            onClick={() => router.push('/dashboard')}
            className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={handleLeaveRoom}
              className="text-gray-600 hover:text-gray-800 font-medium cursor-pointer"
            >
              ← Back
            </button>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                Room: {decodeURIComponent(roomSlug)}
              </h1>
              <div className="flex items-center space-x-4 text-sm text-gray-500">
                <span>Connected as: {user?.name}</span>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  isConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {isConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto bg-gray-50 p-4">
        <div className="max-w-4xl mx-auto space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <div className="text-red-800 text-sm">{error}</div>
            </div>
          )}
          
          {messages.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              No messages yet. Start the conversation!
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.user.id === user?.id ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg relative ${
                    message.user.id === user?.id
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white text-gray-900 shadow-sm'
                  } ${message.isPending ? 'opacity-70' : ''}`}
                >
                  <div className="text-xs opacity-75 mb-1">
                    {message.user.name}
                  </div>
                  <div className="break-words">{message.message}</div>
                  {message.isPending && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full flex items-center justify-center">
                      <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Message Input */}
      <div className="bg-white border-t">
        <div className="max-w-4xl mx-auto p-4">
          <form onSubmit={sendMessage} className="flex space-x-4">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder={
                isConnected && isJoined
                  ? 'Type your message...'
                  : 'Connecting...'
              }
              disabled={!isConnected || !isJoined}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-100 text-gray-900 placeholder-gray-500"
            />
            <button
              type="submit"
              disabled={!isConnected || !isJoined || !newMessage.trim()}
              className="bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}