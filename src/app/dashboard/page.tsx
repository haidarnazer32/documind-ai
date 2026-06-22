"use client"

import { useEffect, useState } from "react"
import { useSession, signOut } from "next-auth/react"

export default function Dashboard() {
  const { data: session, status } = useSession()
  const [documents, setDocuments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (status === "loading") return
    if (!session) {
      window.location.href = "/login"
      return
    }

    async function fetchDocuments() {
      try {
        const res = await fetch("/api/documents")
        if (!res.ok) throw new Error("Failed to fetch documents")
        const data = await res.json()
        setDocuments(data.documents || [])
      } catch (err) {
        console.error("Error fetching documents:", err)
        setError("Failed to load documents")
      } finally {
        setLoading(false)
      }
    }

    fetchDocuments()
  }, [session, status])

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full border-4 border-indigo-600 border-t-transparent h-12 w-12"></div>
        <p className="mt-4 text-gray-900">Loading...</p>
      </div>
    )
  }

  if (!session) return null

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200 px-2 sm:px-4 py-2.5">
        <div className="container mx-auto flex flex-wrap items-center justify-between">
          <a href="/dashboard" className="flex items-center flex-shrink-0 text-indigo-600 mr-6">
            <span className="font-semibold text-xl">DocuMind AI</span>
          </a>
          <div className="flex items-center gap-4">
            <a href="/documents" className="text-sm font-medium text-gray-900 hover:text-indigo-600">Documents</a>
            <span className="text-sm text-gray-900">{session?.user?.name ?? "User"}</span>
            <button
              onClick={async () => { await signOut(); window.location.href = "/" }}
              className="text-sm font-medium text-gray-500 hover:text-gray-900"
            >
              Sign out
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="py-8">
        <div className="container mx-auto px-4">
          <h1 className="mb-6 text-2xl font-bold text-gray-900">Welcome back, {session?.user?.name ?? "User"}!</h1>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Upload Card */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="mb-4 text-xl font-semibold text-gray-900">Upload Document</h2>
              <p className="text-gray-600 mb-4">Upload a PDF or DOCX document to start reviewing with AI.</p>
              <a
                href="/documents/upload"
                className="inline-flex justify-center py-2 px-4 rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Upload Document
              </a>
            </div>

            {/* Documents Card */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="mb-4 text-xl font-semibold text-gray-900">Your Documents</h2>
              {error && <p className="text-red-600 text-sm mb-2">{error}</p>}
              {documents.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No documents yet. Upload your first document above.</p>
              ) : (
                <div className="space-y-3">
                  {documents.map((doc) => (
                    <div key={doc.id} className="flex justify-between items-center p-3 border border-gray-200 rounded-lg">
                      <div>
                        <h3 className="text-sm font-medium text-gray-900">{doc.title}</h3>
                        <p className="text-xs text-gray-500">{doc.fileName}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                          doc.status === "uploaded" ? "bg-yellow-100 text-yellow-800" :
                          doc.status === "processing" ? "bg-blue-100 text-blue-800" :
                          doc.status === "reviewed" ? "bg-green-100 text-green-800" :
                          doc.status === "error" ? "bg-red-100 text-red-800" :
                          "bg-gray-100 text-gray-800"
                        }`}>
                          {doc.status}
                        </span>
                        <a href={`/documents/${doc.id}`} className="text-sm text-indigo-600 hover:text-indigo-500 font-medium">View →</a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
