"use client"

import { useState } from "react"
import { useSession, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"

export default function UploadPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  if (status === "loading") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full border-4 border-indigo-600 border-t-transparent h-12 w-12"></div>
        <p className="mt-4 text-gray-900">Loading...</p>
      </div>
    )
  }

  if (!session) {
    router.push("/login")
    return null
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setLoading(true)

    const formData = new FormData(e.currentTarget as HTMLFormElement)
    const file = formData.get("file") as File

    if (!file) {
      setError("Please select a file")
      setLoading(false)
      return
    }

    const allowedTypes = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]
    if (!allowedTypes.includes(file.type)) {
      setError("Invalid file type. Only PDF and DOCX are allowed.")
      setLoading(false)
      return
    }

    try {
      const res = await fetch("/api/documents/upload", {
        method: "POST",
        body: formData,
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || "Failed to upload document")
      }

      const data = await res.json()
      setSuccess("Document uploaded successfully!")
      setTimeout(() => {
        router.push(`/documents/${data.document.id}`)
      }, 1500)
    } catch (err: any) {
      console.error("Upload error:", err)
      setError(err.message || "An unexpected error occurred")
    } finally {
      setLoading(false)
    }
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
        <div className="container mx-auto px-4 max-w-2xl">
          <div className="mb-6">
            <a href="/documents" className="text-sm font-medium text-indigo-600 hover:text-indigo-500">← Back to Documents</a>
            <h1 className="mt-2 text-2xl font-bold text-gray-900">Upload Document</h1>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-4 mb-4 border border-red-200">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {success && (
            <div className="rounded-md bg-green-50 p-4 mb-4 border border-green-200">
              <p className="text-sm text-green-700">{success}</p>
            </div>
          )}

          <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="file" className="block text-sm font-medium text-gray-900 mb-2">
                  Select a PDF or DOCX file
                </label>
                <input
                  id="file"
                  name="file"
                  type="file"
                  accept=".pdf,.docx"
                  required
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
                <p className="mt-2 text-sm text-gray-500">Maximum file size: 10MB</p>
              </div>

              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => router.push("/documents")}
                  className="px-4 py-2 bg-white rounded-md border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className={`px-4 py-2 bg-indigo-600 text-white rounded-md shadow-sm text-sm font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
                    loading ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                >
                  {loading ? "Uploading..." : "Upload Document"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  )
}
