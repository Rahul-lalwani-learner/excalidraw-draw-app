'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import axios from 'axios'

interface User {
  id: string
  name: string
  email: string
}

interface AuthContextType {
  user: User | null
  token: string | null
  login: (email: string, password: string) => Promise<{ success: boolean; message: string }>
  signup: (name: string, email: string, password: string) => Promise<{ success: boolean; message: string }>
  logout: () => void
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check if user is logged in on page load
    const savedToken = localStorage.getItem('token')
    const savedUser = localStorage.getItem('user')
    
    if (savedToken && savedUser) {
      setToken(savedToken)
      setUser(JSON.parse(savedUser))
    }
    setIsLoading(false)
  }, [])

  const login = async (email: string, password: string): Promise<{ success: boolean; message: string }> => {
    try {
      const response = await axios.post(`${process.env.NEXT_PUBLIC_BACKEND_HTTP_URL || 'http://localhost:3001'}/signin`, {
        email,
        password
      })

      if (response.data.token && response.data.user) {
        const { token, user } = response.data
        setToken(token)
        setUser(user)
        localStorage.setItem('token', token)
        localStorage.setItem('user', JSON.stringify(user))
        return { success: true, message: 'Login successful!' }
      }

      return { success: false, message: 'Invalid response from server' }
    } catch (error) {
      const axiosError = error as { response?: { data?: { message?: string } } }
      return { 
        success: false, 
        message: axiosError.response?.data?.message || 'Login failed. Please try again.' 
      }
    }
  }

  const signup = async (name: string, email: string, password: string): Promise<{ success: boolean; message: string }> => {
    try {
      const response = await axios.post(`${process.env.NEXT_PUBLIC_BACKEND_HTTP_URL || 'http://localhost:3001'}/signup`, {
        name,
        email,
        password
      })

      if (response.data.message === 'Signup Successful!!') {
        return { success: true, message: 'Signup successful! You can now login.' }
      }

      return { success: false, message: 'Signup failed. Please try again.' }
    } catch (error) {
      const axiosError = error as { response?: { data?: { message?: string } } }
      return { 
        success: false, 
        message: axiosError.response?.data?.message || 'Signup failed. Please try again.' 
      }
    }
  }

  const logout = () => {
    setUser(null)
    setToken(null)
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }

  return (
    <AuthContext.Provider value={{
      user,
      token,
      login,
      signup,
      logout,
      isLoading
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
