'use client'

import { motion } from 'framer-motion'
import { Brain, Upload, FileText, Headphones, BarChart3, Settings, User, ChevronDown, Trash2, AlertCircle, X, Play, Download, ExternalLink } from 'lucide-react'
import { useState, useEffect } from 'react'
import LogoutButton from '@/components/ui/LogoutButton'
import FileUpload from '@/components/dashboard/FileUpload'
import InteractiveGraph from '@/components/InteractiveGraph'
import { documentsAPI, summariesAPI } from '@/lib/api'
import toast from 'react-hot-toast'
import { useRouter } from 'next/navigation'

interface Document {
  doc_id: string
  doc_name: string
  upload_time: string
  summary_text?: string
  summary_audio_url?: string
  summary_graph_data?: any
}

interface User {
  id: string
  first_name: string
  last_name: string
  email: string
  created_at: string
}

export default function DashboardPage() {
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null)
  const [showSummaryModal, setShowSummaryModal] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [userLoading, setUserLoading] = useState(true)
  const router = useRouter()

  const [scriptData, setScriptData] = useState<{
    raw_script: string
    formatted_script: string
    estimated_duration: number
  } | null>(null)
  const [loadingScript, setLoadingScript] = useState(false)
  const [activeTab, setActiveTab] = useState('summary') // 'summary', 'script', 'audio'

  // Load user data and documents on component mount
  useEffect(() => {
    loadUserData()
    loadDocuments()
  }, [])

  const loadUserData = () => {
    try {
      const userData = localStorage.getItem('user')
      if (userData) {
        const parsedUser = JSON.parse(userData)
        // Validate that the user object has required fields
        if (parsedUser && parsedUser.email) {
          setUser(parsedUser)
          setUserLoading(false)
          console.log('User data loaded:', parsedUser)
        } else {
          console.warn('Invalid user data structure:', parsedUser)
          handleInvalidUserData()
        }
      } else {
        console.log('No user data found in localStorage')
        handleMissingUserData()
      }
    } catch (error) {
      console.error('Error parsing user data:', error)
      handleInvalidUserData()
    }
  }

  const handleMissingUserData = () => {
    // For now, we'll show a default state instead of redirecting
    // This allows the app to work even if user data is missing
    setUser({
      id: 'unknown',
      first_name: 'User',
      last_name: '',
      email: 'user@example.com',
      created_at: new Date().toISOString()
    })
    setUserLoading(false)
  }

  const handleInvalidUserData = () => {
    // Clear invalid user data and show default
    localStorage.removeItem('user')
    handleMissingUserData()
    toast.error('Session data was corrupted. Please log in again for full functionality.')
  }

  // Add focus event listener to reload documents when page comes back into focus
  useEffect(() => {
    const handleFocus = () => {
      console.log('👀 Page focused, reloading documents...')
      loadDocuments()
    }

    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [])

  // Hard refresh function to bypass all caching
  const hardRefreshDocuments = async () => {
    console.log('🔥 Hard refresh triggered - bypassing all caches')
    
    // Clear any localStorage caches
    localStorage.removeItem('documents_cache')
    
    // Force reload with timestamp
    try {
      setLoading(true)
      const timestamp = Date.now()
      console.log('⏰ Hard refresh timestamp:', timestamp)
      
      const response = await documentsAPI.getAll()
      console.log('🚀 Hard refresh result:', response.documents)
      setDocuments(response.documents)
    } catch (error) {
      console.error('💥 Hard refresh failed:', error)
    } finally {
      setLoading(false)
    }
  }

  // Add keyboard shortcut for hard refresh (Ctrl+Shift+R or Cmd+Shift+R)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'R') {
        e.preventDefault()
        hardRefreshDocuments()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const loadDocuments = async () => {
    try {
      console.log('🔄 Loading documents...')
      console.log('🕐 Current time:', new Date().toISOString())
      
      const response = await documentsAPI.getAll()
      
      console.log('📋 Documents loaded:', response.documents)
      console.log('📊 Document count:', response.documents.length)
      console.log('🔢 Document IDs:', response.documents.map(doc => doc.doc_id))
      
      setDocuments(response.documents)
    } catch (error) {
      console.error('❌ Failed to load documents:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleUploadSuccess = (document: Document) => {
    // Add the new document to the list immediately for instant feedback
    setDocuments(prev => [document, ...prev])
    
    // Refresh the full list to ensure data consistency
    setTimeout(() => {
      loadDocuments()
    }, 1000) // Small delay to allow server processing
  }

  const handleDeleteDocument = async (docId: string) => {
    if (deleting === docId) return // Prevent multiple delete attempts for the same document
    
    setDeleting(docId)
    
    try {
      console.log('Deleting document:', docId)
      await documentsAPI.delete(docId)
      console.log('Document deleted successfully')
      
      // Update local state immediately
      setDocuments(prev => {
        const filtered = prev.filter(doc => doc.doc_id !== docId)
        console.log('Updated local state, documents now:', filtered.length)
        return filtered
      })
      
      toast.success('Document deleted successfully')
      setDeleteConfirm(null)
      
      // Force a fresh reload after successful deletion to ensure consistency
      setTimeout(async () => {
        try {
          console.log('Forcing document reload after successful deletion...')
          const response = await documentsAPI.getAll()
          console.log('Reloaded documents after deletion:', response.documents)
          setDocuments(response.documents)
        } catch (reloadError) {
          console.error('Failed to reload documents after successful delete:', reloadError)
        }
      }, 1000) // Wait 1 second before reloading
      
    } catch (error: any) {
      console.error('Failed to delete document:', error)
      
      // Check if it's a 404 error (document already deleted)
      if (error.response?.status === 404) {
        console.log('Document was already deleted, updating local state')
        // Update local state to remove the document since it's already gone
        setDocuments(prev => prev.filter(doc => doc.doc_id !== docId))
        toast.success('Document deleted successfully')
        setDeleteConfirm(null)
      } else {
        toast.error('Failed to delete document. Please try again.')
        
        // Reload documents from server to get current state
        setTimeout(async () => {
          try {
            const response = await documentsAPI.getAll()
            setDocuments(response.documents)
          } catch (reloadError) {
            console.error('Failed to reload documents after failed delete:', reloadError)
          }
        }, 500)
      }
    } finally {
      setDeleting(null)
    }
  }

  const confirmDelete = (docId: string) => {
    setDeleteConfirm(docId)
  }

  const cancelDelete = () => {
    setDeleteConfirm(null)
  }

  const getAbsoluteAudioUrl = (audioUrl: string | undefined) => {
    if (!audioUrl) return undefined
    if (audioUrl.startsWith('http')) return audioUrl  // Already absolute
    return `http://localhost:8000${audioUrl}`  // Convert relative to absolute
  }

  const openSummaryModal = (document: Document) => {
    setSelectedDocument(document)
    setShowSummaryModal(true)
    setActiveTab('summary') // Always start on summary tab
    // Auto-load script and generate audio and mind map when opening summary modal
    if (document.summary_text) {
      loadScriptForDocument(document)
      // Auto-generate audio if not already present
      if (!document.summary_audio_url) {
        handleGenerateAudio(document.doc_id)
      }
      // Auto-generate mind map if not already present
      if (!document.summary_graph_data || !document.summary_graph_data.nodes) {
        generateMindMap(document)
      }
    }
  }

  const loadScriptForDocument = async (document: Document) => {
    setLoadingScript(true)
    setScriptData(null)
    
    try {
      const script = await documentsAPI.getPodcastScript(document.doc_id)
      setScriptData(script)
    } catch (error) {
      console.error('Error fetching script:', error)
      // Don't show error toast here since it's auto-loading
    } finally {
      setLoadingScript(false)
    }
  }

  const regenerateScriptForDocument = async (document: Document) => {
    setLoadingScript(true)
    setScriptData(null)
    
    try {
      const script = await documentsAPI.regeneratePodcastScript(document.doc_id)
      setScriptData(script)
      toast.success('Script regenerated successfully!')
    } catch (error) {
      console.error('Error regenerating script:', error)
      toast.error('Failed to regenerate script')
    } finally {
      setLoadingScript(false)
    }
  }

  const closeSummaryModal = () => {
    setShowSummaryModal(false)
    setSelectedDocument(null)
    setScriptData(null)
    setLoadingScript(false)
    setActiveTab('summary') // Reset to summary tab
  }



  const handleGenerateAudio = async (docId: string) => {
    try {
      toast.loading('Generating audio...')
      await documentsAPI.generateAudio(docId)
      toast.dismiss()
      toast.success('Audio generated successfully!')
      
      // Refresh documents list
      await loadDocuments()
      
      // Update the selected document in the modal with fresh data
      if (selectedDocument && selectedDocument.doc_id === docId) {
        const updatedData = await documentsAPI.getAll()
        const updatedDoc = updatedData.documents.find((doc: Document) => doc.doc_id === docId)
        if (updatedDoc) {
          setSelectedDocument(updatedDoc)
        }
      }
    } catch (error) {
      toast.dismiss()
      toast.error('Failed to generate audio')
    }
  }

  const handleDownloadSummary = async (docId: string, format: string = 'txt') => {
    try {
      const blob = await documentsAPI.downloadSummary(docId, format)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.style.display = 'none'
      a.href = url
      a.download = `summary-${docId}.${format}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      toast.success('Summary downloaded!')
    } catch (error) {
      toast.error('Failed to download summary')
    }
  }

  const generateMindMap = async (document: Document) => {
    try {
      toast.loading('Generating mind map...')
      
      if (!document.summary_text) {
        toast.dismiss()
        toast.error('Document summary is required to generate mind map')
        return
      }

      // Use the summaries API to generate a new mind map
      const response = await summariesAPI.generateGraph(document.summary_text, 'mindmap')
      
      toast.dismiss()
      toast.success('Mind map generated successfully!')
      
      // Refresh documents to get updated data
      await loadDocuments()
      
      // Update the selected document with the new mind map data
      if (selectedDocument && selectedDocument.doc_id === document.doc_id) {
        const updatedData = await documentsAPI.getAll()
        const updatedDoc = updatedData.documents.find((doc: Document) => doc.doc_id === document.doc_id)
        if (updatedDoc) {
          setSelectedDocument(updatedDoc)
        }
      }
    } catch (error) {
      toast.dismiss()
      toast.error('Failed to generate mind map')
      console.error('Mind map generation error:', error)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center space-x-4">
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-3">
                <Brain className="h-7 w-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                  Intellinotes
                </h1>
                <p className="text-sm text-gray-500">AI-Powered Learning Platform</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* User Menu Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center space-x-3 px-4 py-2 rounded-2xl hover:bg-gray-100/80 transition-all duration-200 group"
                >
                  <div className="bg-gradient-to-r from-blue-500 to-purple-500 rounded-full p-2">
                    <User className="h-5 w-5 text-white" />
                  </div>
                  <div className="hidden sm:block text-left">
                    <p className="text-sm font-medium text-gray-900">My Account</p>
                    <p className="text-xs text-gray-500">
                      {userLoading ? 'Loading...' : (user?.email || 'user@example.com')}
                    </p>
                  </div>
                  <ChevronDown className="h-4 w-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
                </button>
                
                {showUserMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    className="absolute right-0 mt-3 w-56 bg-white/95 backdrop-blur-lg rounded-2xl shadow-xl border border-gray-200/50 py-2 z-50"
                  >
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="text-sm font-semibold text-gray-900">
                        Welcome back{!userLoading && user?.first_name ? `, ${user.first_name}` : ''}!
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {userLoading ? 'Loading...' : (user?.email || 'user@example.com')}
                      </p>
                    </div>
                    <div className="py-2">
                      <button 
                        onClick={() => {
                          setShowUserMenu(false)
                          toast('Profile Settings - Coming Soon!', {
                            icon: '👤',
                            duration: 2000,
                          })
                        }}
                        className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-3 transition-colors"
                      >
                        <div className="bg-blue-100 rounded-lg p-1">
                          <User className="h-4 w-4 text-blue-600" />
                        </div>
                        <span>Profile Settings</span>
                      </button>
                      <button 
                        onClick={() => {
                          setShowUserMenu(false)
                          toast('Preferences - Coming Soon!', {
                            icon: '⚙️',
                            duration: 2000,
                          })
                        }}
                        className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-3 transition-colors"
                      >
                        <div className="bg-gray-100 rounded-lg p-1">
                          <Settings className="h-4 w-4 text-gray-600" />
                        </div>
                        <span>Preferences</span>
                      </button>
                    </div>
                    <div className="border-t border-gray-100 pt-2 px-2">
                      <LogoutButton variant="full" className="w-full justify-start" />
                    </div>
                  </motion.div>
                )}
              </div>
              
              {/* Quick Actions */}
              <button 
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                title="Settings"
              >
                <Settings className="h-5 w-5 text-gray-600" />
              </button>
              
              {/* Logout Button */}
              <LogoutButton variant="icon" />
            </div>
          </div>
        </div>
      </header>

      {/* Click outside to close menu */}
      {showUserMenu && (
        <div 
          className="fixed inset-0 z-5" 
          onClick={() => setShowUserMenu(false)}
        />
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 lg:px-8 py-12">
        {/* Welcome Message */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 bg-clip-text text-transparent mb-6">
            Welcome to Intellinotes
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed mb-8">
            Transform your documents into intelligent learning experiences with the power of AI
          </p>
          <div className="flex items-center justify-center space-x-8 text-sm text-gray-500">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>AI-Powered Summaries</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span>Interactive Visualizations</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
              <span>Audio Learning</span>
            </div>
          </div>
        </motion.div>


        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.6 }}
            className="group bg-white/80 backdrop-blur-sm rounded-3xl shadow-lg border border-gray-200/50 p-8 hover:shadow-2xl hover:scale-105 transition-all duration-300 cursor-pointer"
          >
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl w-16 h-16 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Upload className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Upload Document</h3>
            <p className="text-gray-600 leading-relaxed">Upload PDF, Word, or text files for intelligent AI analysis and insights</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="group bg-white/80 backdrop-blur-sm rounded-3xl shadow-lg border border-gray-200/50 p-8 hover:shadow-2xl hover:scale-105 transition-all duration-300 cursor-pointer"
          >
            <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl w-16 h-16 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <FileText className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Smart Summaries</h3>
            <p className="text-gray-600 leading-relaxed">Get AI-generated summaries tailored for effective learning</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow cursor-pointer"
          >
            <div className="bg-purple-100 rounded-full w-12 h-12 flex items-center justify-center mb-4">
              <Headphones className="h-6 w-6 text-purple-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Audio Learning</h3>
            <p className="text-gray-600 text-sm">Convert summaries to podcast-style audio</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.5 }}
            className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow cursor-pointer"
          >
            <div className="bg-orange-100 rounded-full w-12 h-12 flex items-center justify-center mb-4">
              <BarChart3 className="h-6 w-6 text-orange-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Visual Insights</h3>
            <p className="text-gray-600 text-sm">Create flowcharts and diagrams from content</p>
          </motion.div>
        </div>

        {/* Upload Area */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.5 }}
          className="bg-white rounded-xl shadow-lg p-8 mb-8"
        >
          <div className="text-center mb-6">
            <div className="bg-blue-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <Upload className="h-8 w-8 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Ready to get started?</h3>
            <p className="text-gray-600 mb-6">Upload your first document to experience the power of AI-assisted learning.</p>
          </div>
          
          <FileUpload onUploadSuccess={handleUploadSuccess} />
        </motion.div>

        {/* Recent Documents */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.5 }}
          className="mt-8"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Recent Documents</h2>
            <button
              onClick={hardRefreshDocuments}
              className="px-3 py-1 text-xs bg-red-100 text-red-600 rounded-md hover:bg-red-200 transition-colors"
              title="Hard refresh (bypasses all caches)"
            >
              🔥 Hard Refresh
            </button>
          </div>
          
          {loading ? (
            <div className="bg-white rounded-xl shadow-lg p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-500">Loading documents...</p>
            </div>
          ) : documents.length === 0 ? (
            <div className="bg-white rounded-xl shadow-lg p-8 text-center">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-700 mb-2">No documents yet</h3>
              <p className="text-gray-500">Upload your first document to see it here</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
              {documents.map((doc) => (
                <motion.div
                  key={doc.doc_id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-white rounded-xl shadow-lg p-4 md:p-6 hover:shadow-xl transition-shadow"
                >
                  <div className="flex items-start justify-between h-full">
                    <div className="flex items-start space-x-3 flex-1 min-w-0">
                      <div className="bg-blue-100 rounded-full p-2 flex-shrink-0">
                        <FileText className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 
                          className="text-lg font-medium text-gray-900 mb-1 truncate cursor-help" 
                          title={`${doc.doc_name} (ID: ${doc.doc_id.substring(0, 8)}...)`}
                        >
                          {doc.doc_name.length > 25 ? `${doc.doc_name.substring(0, 25)}...` : doc.doc_name}
                        </h4>
                        <p className="text-sm text-gray-500 mb-2">
                          {new Date(doc.upload_time).toLocaleDateString()}
                        </p>
                        {doc.summary_text ? (
                          <div>
                            <p className="text-sm text-gray-600 line-clamp-3 mb-3">
                              {doc.summary_text.substring(0, 150)}...
                            </p>
                            <div className="flex flex-wrap gap-2 mt-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  openSummaryModal(doc)
                                }}
                                className="inline-flex items-center px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors flex-shrink-0"
                              >
                                <ExternalLink className="h-3 w-3 mr-1" />
                                View Summary
                              </button>


                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-yellow-600 italic">
                            Processing summary...
                          </p>
                        )}
                      </div>
                    </div>
                    
                    {/* Delete Button */}
                    <div className="flex-shrink-0 ml-2">
                      {deleteConfirm === doc.doc_id ? (
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleDeleteDocument(doc.doc_id)}
                            disabled={deleting === doc.doc_id}
                            className="text-red-600 hover:text-red-800 p-1 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Confirm delete"
                          >
                            {deleting === doc.doc_id ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                            ) : (
                              <AlertCircle className="h-4 w-4" />
                            )}
                          </button>
                          <button
                            onClick={cancelDelete}
                            disabled={deleting === doc.doc_id}
                            className="text-gray-400 hover:text-gray-600 p-1 rounded transition-colors text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Cancel"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => confirmDelete(doc.doc_id)}
                          disabled={deleting === doc.doc_id}
                          className="text-gray-400 hover:text-red-600 p-1 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Delete document"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </main>

      {/* Summary Modal */}
      {showSummaryModal && selectedDocument && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={closeSummaryModal}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[95vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <div className="bg-blue-100 rounded-full p-2">
                  <FileText className="h-5 w-5 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0 mr-4">
                  <h2 
                    className="text-xl font-semibold text-gray-900 truncate" 
                    title={selectedDocument.doc_name}
                  >
                    {selectedDocument.doc_name}
                  </h2>
                  <p className="text-sm text-gray-500">
                    Uploaded on {new Date(selectedDocument.upload_time).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <button
                onClick={closeSummaryModal}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Tab Navigation */}
            <div className="border-b border-gray-200">
              <nav className="flex">
                <button
                  onClick={() => setActiveTab('summary')}
                  className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'summary' 
                      ? 'border-blue-500 text-blue-600' 
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Summary
                </button>
                <button
                  onClick={() => setActiveTab('mindmap')}
                  className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'mindmap' 
                      ? 'border-orange-500 text-orange-600' 
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Mind Map
                </button>
                <button
                  onClick={() => setActiveTab('podcast')}
                  className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'podcast' 
                      ? 'border-purple-500 text-purple-600' 
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Podcast & Audio
                </button>
              </nav>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(95vh-200px)]">
              {activeTab === 'summary' && (
                <div className="space-y-6">
                  {selectedDocument.summary_text ? (
                    <>
                      <div className="prose prose-gray max-w-none">
                        <div className="bg-gray-50 rounded-lg p-6">
                          <h3 className="text-lg font-semibold text-gray-900 mb-4">Document Summary</h3>
                          <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
                            {selectedDocument.summary_text}
                          </div>
                        </div>
                      </div>

                                             {/* Quick Action Buttons */}
                       <div className="flex flex-wrap gap-3 pt-6 border-t border-gray-200">
                         <button
                           onClick={() => setActiveTab('mindmap')}
                           className="inline-flex items-center px-4 py-2 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition-colors"
                         >
                           <BarChart3 className="h-4 w-4 mr-2" />
                           View Mind Map
                         </button>
                         <button
                           onClick={() => setActiveTab('podcast')}
                           className="inline-flex items-center px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors"
                         >
                           <Headphones className="h-4 w-4 mr-2" />
                           Podcast & Audio
                         </button>
                        <button
                          onClick={() => handleDownloadSummary(selectedDocument.doc_id, 'txt')}
                          className="inline-flex items-center px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download Summary
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                      <p className="text-gray-500">Summary is being generated...</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'mindmap' && (
                <div className="space-y-6">
                  {selectedDocument.summary_graph_data && selectedDocument.summary_graph_data.nodes ? (
                    <div className="bg-orange-50 rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-orange-800 mb-4">🧠 Mind Map Visualization</h3>
                      <div className="bg-white rounded-lg p-6 mb-4">
                        <div className="mindmap-container">
                          <InteractiveGraph 
                            data={selectedDocument.summary_graph_data}
                            width={800}
                            height={500}
                          />
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-orange-700">
                          <p>🔍 This mind map shows the key concepts and relationships from your document</p>
                          <p>📊 Automatically generated using AI analysis</p>
                        </div>
                        <button
                          onClick={() => generateMindMap(selectedDocument)}
                          className="inline-flex items-center px-4 py-2 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition-colors"
                        >
                          <BarChart3 className="h-4 w-4 mr-2" />
                          Reload Mind Map
                        </button>
                      </div>
                    </div>
                  ) : (
                    selectedDocument.summary_text ? (
                      <div className="bg-orange-50 rounded-lg p-6">
                        <div className="text-center">
                          <BarChart3 className="h-12 w-12 text-orange-600 mx-auto mb-4" />
                          <h3 className="text-lg font-semibold text-orange-800 mb-2">Generate Mind Map</h3>
                          <p className="text-orange-600 mb-4">Create a visual mind map from your document summary</p>
                          <button
                            onClick={() => generateMindMap(selectedDocument)}
                            className="inline-flex items-center px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                          >
                            <BarChart3 className="h-4 w-4 mr-2" />
                            Generate Mind Map
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-500">Document summary needed to generate mind map</p>
                      </div>
                    )
                  )}
                </div>
              )}

              {activeTab === 'podcast' && (
                <div className="space-y-6">
                  {loadingScript ? (
                    <div className="text-center py-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
                      <p className="text-gray-500">Loading podcast content...</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* Audio Player Section - MOVED TO TOP */}
                      {selectedDocument.summary_audio_url ? (
                        <div className="bg-purple-50 rounded-lg p-6">
                          <h3 className="text-lg font-semibold text-purple-800 mb-4">🎧 Podcast Audio</h3>
                          <div className="bg-white rounded-lg p-4 mb-4">
                            <audio 
                              controls 
                              className="w-full"
                              src={getAbsoluteAudioUrl(selectedDocument.summary_audio_url)}
                            >
                              Your browser does not support the audio element.
                            </audio>
                          </div>
                          <div className="text-sm text-purple-700">
                            <p>🎧 Use headphones for the best listening experience</p>
                            <p>🗣️ Features natural breathing pauses and human-like conversational rhythm</p>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-purple-50 rounded-lg p-6">
                          <div className="text-center">
                            <Headphones className="h-12 w-12 text-purple-600 mx-auto mb-4" />
                            <h3 className="text-lg font-semibold text-purple-800 mb-2">Generate Podcast Audio</h3>
                            <p className="text-purple-600 mb-4">Create audio with natural human-like pacing, breathing pauses, and conversational rhythm</p>
                            <button
                              onClick={() => handleGenerateAudio(selectedDocument.doc_id)}
                              className="inline-flex items-center px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                            >
                              <Play className="h-4 w-4 mr-2" />
                              Generate Audio Now
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Podcast Script Section - MOVED TO BOTTOM */}
                      {scriptData ? (
                        <div className="bg-green-50 rounded-lg p-6">
                          <h3 className="text-lg font-semibold text-green-800 mb-4">📝 Podcast Script</h3>
                          <div className="bg-white rounded-lg p-4 mb-4">
                            <div className="prose prose-gray max-w-none">
                              <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
                                {scriptData.raw_script}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center justify-between text-sm text-green-700">
                            <p>📊 Estimated duration: ~{Math.round(scriptData.estimated_duration)} seconds</p>
                            <div className="flex gap-2">
                              <button
                                onClick={() => navigator.clipboard.writeText(scriptData.raw_script)}
                                className="inline-flex items-center px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
                              >
                                Copy Script
                              </button>
                              <button
                                onClick={() => regenerateScriptForDocument(selectedDocument)}
                                className="inline-flex items-center px-3 py-1 bg-orange-100 text-orange-700 rounded hover:bg-orange-200 transition-colors"
                              >
                                Regenerate
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        selectedDocument.summary_text && (
                          <div className="bg-green-50 rounded-lg p-6">
                            <div className="text-center">
                              <FileText className="h-12 w-12 text-green-600 mx-auto mb-4" />
                              <h3 className="text-lg font-semibold text-green-800 mb-2">Podcast Script</h3>
                              <p className="text-green-600 mb-4">Generate or view the podcast script for this document</p>
                              <button
                                onClick={() => loadScriptForDocument(selectedDocument)}
                                className="inline-flex items-center px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                              >
                                <FileText className="h-4 w-4 mr-2" />
                                Load Script
                              </button>
                            </div>
                          </div>
                        )
                      )}

                      {/* Action Buttons */}
                      <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-200">
                        {!selectedDocument.summary_audio_url && (
                          <button
                            onClick={() => handleGenerateAudio(selectedDocument.doc_id)}
                            className="inline-flex items-center px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors"
                          >
                            <Play className="h-4 w-4 mr-2" />
                            Generate Audio
                          </button>
                        )}
                        {selectedDocument.summary_audio_url && (
                          <a
                            href={getAbsoluteAudioUrl(selectedDocument.summary_audio_url)}
                            download
                            className="inline-flex items-center px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Download Audio
                          </a>
                        )}
                        {scriptData && (
                          <button
                            onClick={() => navigator.clipboard.writeText(scriptData.raw_script)}
                            className="inline-flex items-center px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                          >
                            <FileText className="h-4 w-4 mr-2" />
                            Copy Script
                          </button>
                        )}
                        {selectedDocument.summary_text && (
                          <button
                            onClick={() => loadScriptForDocument(selectedDocument)}
                            className="inline-flex items-center px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                          >
                            <FileText className="h-4 w-4 mr-2" />
                            {scriptData ? 'Reload Script' : 'Load Script'}
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}

      
    </div>
  )
} 