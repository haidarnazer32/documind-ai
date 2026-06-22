import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { prisma } from "@/lib/prisma"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const suggestions = await prisma.aISuggestion.findMany({
      where: { documentId: id },
      orderBy: { createdAt: 'asc' },
    })

    return NextResponse.json({ suggestions })
  } catch (error: any) {
    console.error("Failed to fetch suggestions:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { suggestionId, status } = await request.json()

    if (!suggestionId || !status) {
      return NextResponse.json(
        { error: "Suggestion ID and status are required" },
        { status: 400 }
      )
    }

    // Verify that the suggestion belongs to a document that the user owns
    const suggestion = await prisma.aISuggestion.findFirst({
      where: {
        id: suggestionId,
        documentId: id,
        document: {
          userId: session.user.id,
        },
      },
    })

    if (!suggestion) {
      return NextResponse.json(
        { error: "Suggestion not found or unauthorized" },
        { status: 404 }
      )
    }

    // Update the suggestion status
    const updatedSuggestion = await prisma.aISuggestion.update({
      where: { id: suggestionId },
      data: { status },
    })

    return NextResponse.json({ suggestion: updatedSuggestion })
  } catch (error: any) {
    console.error("Failed to update suggestion:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
