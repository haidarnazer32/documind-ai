"use client"

import { useEffect, useState } from "react"
import { useSession, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"

export default function DocumentPage({ params }: { params: Promise<{ id: string }> }) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [document, setDocument] = useState<any>(null)
  const [reviews, setReviews] = useState<any[]>([])
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [complianceChecks, setComplianceChecks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  const [docId, setDocId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    params.then((p) => {
      if (!cancelled) setDocId(p.id)
    })
    return () => {
      cancelled = true
    }
  }, [params])

  useEffect(() => {
    if (status === "loading" || docId === null) return
    if (!session) {
      router.push("/login")
      return
    }

    async function fetchDocumentData() {
      try {
        setLoading(true)
        const [docRes, reviewsRes, suggestionsRes, complianceRes] = await Promise.all([
          fetch(`/api/documents/${docId}`),
          fetch(`/api/documents/${docId}/reviews`),
          fetch(`/api/documents/${docId}/suggestions`),
          fetch(`/api/documents/${docId}/compliance`),
        ])

        if (!docRes.ok) throw new Error("Failed to fetch document")

        const docData = await docRes.json()
        setDocument(docData.document)

        if (reviewsRes.ok) {
          const reviewsData = await reviewsRes.json()
          setReviews(reviewsData.reviews || [])
        }

        if (suggestionsRes.ok) {
          const suggestionsData = await suggestionsRes.json()
          setSuggestions(suggestionsData.suggestions || [])
        }

        if (complianceRes.ok) {
          const complianceData = await complianceRes.json()
          setComplianceChecks(complianceData.complianceChecks || [])
        }
      } catch (err) {
        console.error("Error fetching document data:", err)
        setError("Failed to load document data")
      } finally {
        setLoading(false)
      }
    }

    fetchDocumentData()
  }, [docId, session, status, router])

  async function handleProcess() {
    if (!docId) return
    setProcessing(true)
    try {
      const res = await fetch(`/api/documents/${docId}/process`, { method: "POST" })
      if (!res.ok) {
        const data = await res.json()
        alert(data.error || "Processing failed")
      } else {
        // Refresh data
        window.location.reload()
      }
    } catch (err) {
      alert("Failed to process document")
    } finally {
      setProcessing(false)
    }
  }

  async function handleSuggestion(suggestionId: string, status: string) {
    if (!docId) return
    try {
      const res = await fetch(`/api/documents/${docId}/suggestions`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ suggestionId, status }),
      })
      if (res.ok) {
        const suggestionsRes = await fetch(`/api/documents/${docId}/suggestions`)
        const suggestionsData = await suggestionsRes.json()
        setSuggestions(suggestionsData.suggestions || [])
      }
    } catch (err) {
      console.error("Error updating suggestion:", err)
    }
  }

  if (status === "loading" || loading || docId === null) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full border-4 border-indigo-600 border-t-transparent h-12 w-12"></div>
        <p className="mt-4 text-gray-900">Loading...</p>
      </div>
    )
  }

  if (!session) return null

  if (error || !document) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-md text-center">
          <h2 className="text-xl font-bold text-gray-900">{error || "Document not found"}</h2>
          <a href="/documents" className="mt-4 inline-block text-indigo-600 hover:text-indigo-500 font-medium">← Back to Documents</a>
        </div>
      </div>
    )
  }

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

      <main className="py-8">
        <div className="container mx-auto px-4 max-w-4xl">
          {/* Header */}
          <div className="mb-6">
            <a href="/documents" className="text-sm font-medium text-indigo-600 hover:text-indigo-500">← Back to Documents</a>
            <div className="flex items-center justify-between mt-2">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{document.title}</h1>
                <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                  <span>{document.fileName}</span>
                  <span>•</span>
                  <span>{document.fileType?.toUpperCase()}</span>
                  <span>•</span>
                  <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${
                    document.status === "uploaded" ? "bg-yellow-100 text-yellow-800" :
                    document.status === "processing" ? "bg-blue-100 text-blue-800" :
                    document.status === "reviewed" ? "bg-green-100 text-green-800" :
                    "bg-red-100 text-red-800"
                  }`}>
                    {document.status}
                  </span>
                </div>
              </div>
              {document.status !== "reviewed" && (
                <button
                  onClick={handleProcess}
                  disabled={processing}
                  className={`px-4 py-2 rounded-md text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
                    processing ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                >
                  {processing ? "Processing..." : "AI Review"}
                </button>
              )}
            </div>
          </div>

          {/* Document Content */}
          <section className="mb-8">
            <h2 className="mb-3 text-lg font-semibold text-gray-900">Document Content</h2>
            <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
              <pre className="text-sm text-gray-900 whitespace-pre-wrap font-sans">{document.content || "No content available"}</pre>
            </div>
          </section>

          {/* AI Summary */}
          {document.summary && (
            <section className="mb-8">
              <h2 className="mb-3 text-lg font-semibold text-gray-900">AI Summary</h2>
              <div className="bg-indigo-50 p-6 rounded-lg shadow-md border border-indigo-100">
                <p className="text-gray-900">{document.summary}</p>
              </div>
            </section>
          )}

          {/* AI Reviews */}
          {reviews.length > 0 && (
            <section className="mb-8">
              <h2 className="mb-3 text-lg font-semibold text-gray-900">AI Reviews</h2>
              <div className="space-y-4">
                {reviews.map((review) => (
                  <div key={review.id} className="bg-white rounded-lg shadow-md p-5 border border-gray-200">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="text-base font-medium text-gray-900 capitalize">{review.reviewType} Review</h3>
                      {review.score != null && (
                        <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                          review.score >= 80 ? "bg-green-100 text-green-800" :
                          review.score >= 60 ? "bg-yellow-100 text-yellow-800" :
                          "bg-red-100 text-red-800"
                        }`}>
                          Score: {review.score}/100
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-700">{review.feedback}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* AI Suggestions */}
          {suggestions.length > 0 && (
            <section className="mb-8">
              <h2 className="mb-3 text-lg font-semibold text-gray-900">AI Suggestions</h2>
              <div className="space-y-4">
                {suggestions.map((suggestion) => (
                  <div key={suggestion.id} className="bg-white rounded-lg shadow-md p-5 border border-gray-200">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="text-base font-medium text-gray-900 capitalize">{suggestion.type} Suggestion</h3>
                      <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                        suggestion.status === "accepted" ? "bg-green-100 text-green-800" :
                        suggestion.status === "rejected" ? "bg-red-100 text-red-800" :
                        "bg-yellow-100 text-yellow-800"
                      }`}>
                        {suggestion.status}
                      </span>
                    </div>
                    <div className="mb-2">
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Original</p>
                      <p className="text-sm text-gray-900 bg-red-50 p-2 rounded mt-1">&ldquo;{suggestion.originalText}&rdquo;</p>
                    </div>
                    <div className="mb-3">
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Suggested</p>
                      <p className="text-sm text-gray-900 bg-green-50 p-2 rounded mt-1">&ldquo;{suggestion.suggestedText}&rdquo;</p>
                    </div>
                    {suggestion.status === "pending" && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSuggestion(suggestion.id, "accepted")}
                          className="flex-1 px-3 py-2 bg-green-50 border border-green-200 rounded-md text-sm font-medium text-green-700 hover:bg-green-100"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => handleSuggestion(suggestion.id, "rejected")}
                          className="flex-1 px-3 py-2 bg-red-50 border border-red-200 rounded-md text-sm font-medium text-red-700 hover:bg-red-100"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Compliance Checks */}
          {complianceChecks.length > 0 && (
            <section className="mb-8">
              <h2 className="mb-3 text-lg font-semibold text-gray-900">Compliance Checks</h2>
              <div className="space-y-3">
                {complianceChecks.map((check) => (
                  <div key={check.id} className="bg-white rounded-lg shadow-md p-4 border border-gray-200 flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-900">{check.ruleName}</span>
                    <span className={`px-3 py-1 text-xs rounded-full font-medium ${
                      check.passed ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                    }`}>
                      {check.passed ? "PASS" : "FAIL"}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  )
}
