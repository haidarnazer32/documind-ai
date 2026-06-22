"use client"

import { useEffect, useState } from "react"
import { useSession, signOut } from "next-auth/react"

export default function DocumentsPage() {
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
            <a href="/dashboard" className="text-sm font-medium text-gray-900 hover:text-indigo-600">Dashboard</a>
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

      <main className="py-8">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Your Documents</h1>
            <a
              href="/documents/upload"
              className="inline-flex items-center px-4 py-2 rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Upload New Document
            </a>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-4 mb-6">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {documents.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-12 text-center">
              <p className="text-gray-500 text-lg">No documents yet. Upload your first document to get started.</p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {documents.map((doc) => (
                <div key={doc.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">{doc.title}</h3>
                    <p className="text-sm text-gray-500 mb-3">{doc.fileName}</p>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="px-2 py-1 bg-indigo-100 text-indigo-800 rounded-full font-medium">{doc.fileType?.toUpperCase() || "N/A"}</span>
                      <span className={`px-2 py-1 rounded-full font-medium ${
                        doc.status === "uploaded" ? "bg-yellow-100 text-yellow-800" :
                        doc.status === "processing" ? "bg-blue-100 text-blue-800" :
                        doc.status === "reviewed" ? "bg-green-100 text-green-800" :
                        doc.status === "error" ? "bg-red-100 text-red-800" :
                        "bg-gray-100 text-gray-800"
                      }`}>
                        {doc.status}
                      </span>
                    </div>
                  </div>
                  <div className="border-t border-gray-100 px-6 py-3">
                    <a href={`/documents/${doc.id}`} className="text-sm font-medium text-indigo-600 hover:text-indigo-500">
                      View Document →
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
