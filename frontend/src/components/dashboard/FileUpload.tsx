'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Upload, File, X, CheckCircle, AlertCircle, Clock, RefreshCw } from 'lucide-react'
import { documentsAPI } from '@/lib/api'
import { toast } from 'react-hot-toast'

interface FileUploadProps {
  onUploadSuccess?: (document: any) => void
  className?: string
}

interface UploadFile {
  file: File
  id: string
  status: 'uploading' | 'success' | 'error' | 'processing'
  progress?: number
  error?: string
  startTime?: number
}

export default function FileUpload({ onUploadSuccess, className = '' }: FileUploadProps) {
  const [files, setFiles] = useState<UploadFile[]>([])
  const [dragActive, setDragActive] = useState(false)
  const [showRefreshSuggestion, setShowRefreshSuggestion] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Check for long uploads and suggest refresh
  useEffect(() => {
    const interval = setInterval(() => {
      const hasLongUploads = files.some(f => 
        f.status === 'uploading' && 
        f.startTime && 
        Date.now() - f.startTime > 30000 // 30 seconds
      )
      setShowRefreshSuggestion(hasLongUploads)
    }, 5000)

    return () => clearInterval(interval)
  }, [files])

  const handleFiles = useCallback(async (fileList: FileList) => {
    const newFiles: UploadFile[] = Array.from(fileList).map(file => ({
      file,
      id: Math.random().toString(36).substr(2, 9),
      status: 'uploading' as const,
      startTime: Date.now()
    }))

    setFiles(prev => [...prev, ...newFiles])

    // Process each file
    for (const uploadFile of newFiles) {
      try {
        // Validate file
        if (!uploadFile.file.name.match(/\.(pdf|docx|txt)$/i)) {
          throw new Error('Only PDF, DOCX, and TXT files are supported')
        }

        if (uploadFile.file.size > 50 * 1024 * 1024) {
          throw new Error('File size must be less than 50MB')
        }

        // Update to processing status
        setFiles(prev => prev.map(f => 
          f.id === uploadFile.id 
            ? { ...f, status: 'processing' as const }
            : f
        ))

        // Upload file with progress tracking
        const document = await documentsAPI.upload(uploadFile.file)
        
        // Update file status
        setFiles(prev => prev.map(f => 
          f.id === uploadFile.id 
            ? { ...f, status: 'success' as const }
            : f
        ))

        toast.success(`${uploadFile.file.name} uploaded and processing completed!`)
        onUploadSuccess?.(document)

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Upload failed'
        
        setFiles(prev => prev.map(f => 
          f.id === uploadFile.id 
            ? { ...f, status: 'error' as const, error: errorMessage }
            : f
        ))

        toast.error(`Failed to upload ${uploadFile.file.name}: ${errorMessage}`)
      }
    }
  }, [onUploadSuccess])

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files)
    }
  }, [handleFiles])

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault()
    if (e.target.files && e.target.files[0]) {
      handleFiles(e.target.files)
    }
  }, [handleFiles])

  const removeFile = useCallback((id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id))
  }, [])

  const openFileDialog = () => {
    fileInputRef.current?.click()
  }

  const handleRefreshPage = () => {
    window.location.reload()
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Refresh Suggestion for Long Uploads */}
      {showRefreshSuggestion && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Clock className="h-5 w-5 text-amber-600" />
              <div>
                <p className="text-amber-800 font-medium">Upload taking longer than expected?</p>
                <p className="text-amber-700 text-sm">Large files may take time to process. You can refresh the page to check progress.</p>
              </div>
            </div>
            <button
              onClick={handleRefreshPage}
              className="inline-flex items-center px-3 py-2 bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 transition-colors"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Page
            </button>
          </div>
        </div>
      )}

      {/* Upload Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 cursor-pointer ${
          dragActive 
            ? 'border-blue-400 bg-blue-50' 
            : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={openFileDialog}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.docx,.txt"
          onChange={handleChange}
          className="hidden"
        />
        
        <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-lg font-medium text-gray-700 mb-2">
          Drop your files here or click to browse
        </p>
        <p className="text-sm text-gray-500">
          Supports PDF, Word, and text files up to 50MB
        </p>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium text-gray-700">Upload Progress</h4>
          {files.map((uploadFile) => (
            <div
              key={uploadFile.id}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
            >
              <div className="flex items-center space-x-3">
                <File className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-700">
                    {uploadFile.file.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {(uploadFile.file.size / 1024 / 1024).toFixed(2)} MB
                    {uploadFile.startTime && uploadFile.status !== 'success' && uploadFile.status !== 'error' && (
                      <span className="ml-2">
                        • {Math.round((Date.now() - uploadFile.startTime) / 1000)}s elapsed
                      </span>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                {uploadFile.status === 'uploading' && (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    <span className="text-xs text-blue-600">Uploading...</span>
                  </div>
                )}
                
                {uploadFile.status === 'processing' && (
                  <div className="flex items-center space-x-2">
                    <div className="animate-pulse rounded-full h-4 w-4 bg-purple-600"></div>
                    <span className="text-xs text-purple-600">Processing AI...</span>
                  </div>
                )}
                
                {uploadFile.status === 'success' && (
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-xs text-green-600">Complete</span>
                  </div>
                )}
                
                {uploadFile.status === 'error' && (
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="h-4 w-4 text-red-600" />
                    <span className="text-xs text-red-600" title={uploadFile.error}>
                      Failed
                    </span>
                  </div>
                )}

                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    removeFile(uploadFile.id)
                  }}
                  className="p-1 hover:bg-gray-200 rounded"
                >
                  <X className="h-4 w-4 text-gray-400" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
} 