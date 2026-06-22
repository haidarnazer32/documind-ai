import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { prisma } from "@/lib/prisma"
import { mkdir, writeFile, unlink } from "fs/promises"
import { join } from "path"
import { randomUUID } from "crypto"
import { extractTextFromFile } from "@/lib/document/parser"

const UPLOAD_DIR = join(process.cwd(), "public", "uploads")

// Ensure upload directory exists
mkdir(UPLOAD_DIR, { recursive: true }).catch(console.error)

export async function POST(req: Request) {
  try {
    // Get the session
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Parse the incoming form data using the native Web API
    const formData = await req.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return NextResponse.json(
        { error: "No file uploaded" },
        { status: 400 }
      )
    }

    // Validate file type
    const allowedTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ]
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Only PDF and DOCX are allowed." },
        { status: 400 }
      )
    }

    // Determine file extension
    let extension = ""
    if (file.type === "application/pdf") {
      extension = "pdf"
    } else if (
      file.type ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      extension = "docx"
    }

    // Save the file to disk
    const uuid = randomUUID()
    const savedFileName = `${uuid}.${extension}`
    const filePath = join(UPLOAD_DIR, savedFileName)
    const buffer = Buffer.from(await file.arrayBuffer())
    await writeFile(filePath, buffer)

    // Extract text from the uploaded file
    let extractedText = ""
    try {
      extractedText = await extractTextFromFile(filePath, extension)
    } catch (error) {
      console.error("Text extraction error:", error)
      // Continue without extracted text
    }

    // Generate the public URL for the uploaded file
    const fileUrl = `/uploads/${savedFileName}`

    // Create a document record in the database
    const document = await prisma.document.create({
      data: {
        title: (file.name || "unknown").replace(/\.[^/.]+$/, ""), // Remove extension for title
        fileName: file.name || "unknown",
        fileUrl,
        fileType: extension,
        content: extractedText,
        status: "uploaded",
        userId: session.user.id,
      },
    })

    // Return success response
    return NextResponse.json({
      success: true,
      document: {
        id: document.id,
        title: document.title,
        fileUrl: document.fileUrl,
        fileType: document.fileType,
        status: document.status,
        hasText: !!document.content && document.content.length > 0,
      },
    })
  } catch (error: any) {
    console.error("Upload error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
