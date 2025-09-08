'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { motion } from 'framer-motion'

interface LogoutButtonProps {
  variant?: 'icon' | 'text' | 'full'
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export default function LogoutButton({ 
  variant = 'full', 
  size = 'md', 
  className = '' 
}: LogoutButtonProps) {
  const router = useRouter()
  const [showConfirm, setShowConfirm] = useState(false)

  const handleLogout = () => {
    // Clear authentication data
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    
    // Show success message
    toast.success('Logged out successfully!')
    
    // Redirect to home page
    router.push('/')
  }

  const sizeClasses = {
    sm: 'p-1 text-xs',
    md: 'p-2 text-sm',
    lg: 'p-3 text-base'
  }

  const iconSizes = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6'
  }

  if (variant === 'icon') {
    return (
      <>
        <button
          onClick={() => setShowConfirm(true)}
          className={`${sizeClasses[size]} rounded-lg hover:bg-red-50 hover:text-red-600 transition-colors group ${className}`}
          title="Logout"
        >
          <LogOut className={`${iconSizes[size]} text-gray-600 group-hover:text-red-600`} />
        </button>
        {showConfirm && <ConfirmModal onConfirm={handleLogout} onCancel={() => setShowConfirm(false)} />}
      </>
    )
  }

  if (variant === 'text') {
    return (
      <>
        <button
          onClick={() => setShowConfirm(true)}
          className={`${sizeClasses[size]} rounded-lg hover:bg-red-50 hover:text-red-600 transition-colors text-gray-600 ${className}`}
        >
          Logout
        </button>
        {showConfirm && <ConfirmModal onConfirm={handleLogout} onCancel={() => setShowConfirm(false)} />}
      </>
    )
  }

  return (
    <>
      <button
        onClick={() => setShowConfirm(true)}
        className={`flex items-center space-x-2 ${sizeClasses[size]} rounded-lg hover:bg-red-50 hover:text-red-600 transition-colors group ${className}`}
        title="Logout"
      >
        <LogOut className={`${iconSizes[size]} text-gray-600 group-hover:text-red-600`} />
        <span className="text-gray-600 group-hover:text-red-600">Logout</span>
      </button>
      {showConfirm && <ConfirmModal onConfirm={handleLogout} onCancel={() => setShowConfirm(false)} />}
    </>
  )
}

function ConfirmModal({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-lg p-6 max-w-sm mx-4 shadow-xl"
      >
        <div className="flex items-center justify-center mb-4">
          <div className="bg-red-100 rounded-full p-3">
            <LogOut className="h-6 w-6 text-red-600" />
          </div>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2 text-center">Confirm Logout</h3>
        <p className="text-gray-600 mb-6 text-center">Are you sure you want to log out of your account?</p>
        <div className="flex space-x-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center space-x-2"
          >
            <LogOut className="h-4 w-4" />
            <span>Logout</span>
          </button>
        </div>
      </motion.div>
    </div>
  )
} 