"use client"

import { useSession } from "next-auth/react"
import { useEffect } from "react"

export default function Home() {
  const { data: session, status } = useSession()

  useEffect(() => {
    if (status === "loading") {
      return
    }
    if (session) {
      window.location.href = "/dashboard"
    } else {
      window.location.href = "/login"
    }
  }, [session, status])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <div className="animate-spin rounded-full border-4 border-indigo-600 border-t-transparent h-12 w-12"></div>
      <p className="mt-4 text-gray-900">Loading...</p>
    </div>
  )
}
