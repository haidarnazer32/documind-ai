import { prisma } from '@/lib/prisma'
import { AIProviderFactory, AIProviderConfig, ReviewResult, Suggestion, ComplianceResult } from '@/lib/ai/factory'
import { decrypt } from '@/lib/security/encryption'

/**
 * Process a document with AI using the user's preferred AI provider.
 * This function runs grammar review, style review, edit suggestions, compliance check, and summary.
 */
export async function processDocumentWithAI(documentId: string, userId: string): Promise<void> {
  // 1. Get the document and verify ownership
  const document = await prisma.document.findUnique({
    where: { id: documentId },
  })

  if (!document) {
    throw new Error('Document not found')
  }

  if (document.userId !== userId) {
    throw new Error('Unauthorized')
  }

  // 2. Get the user's AI preference
  // Prisma 7 camelCases acronyms as `aIPreference` (lowercase first letter, keep inner caps).
  const aiPreference = await prisma.aIPreference.findUnique({
    where: { userId },
  })

  if (!aiPreference) {
    throw new Error('AI preference not set for user')
  }

  // 3. Decrypt the API key
  let decryptedApiKey: string
  try {
    decryptedApiKey = decrypt(aiPreference.apiKey)
  } catch (error) {
    console.error('Failed to decrypt API key:', error)
    throw new Error('Failed to decrypt API key')
  }

  // 4. Create the AI provider
  const providerConfig: AIProviderConfig = {
    type: aiPreference.provider as 'openai' | 'anthropic',
    apiKey: decryptedApiKey,
    model: aiPreference.model,
  }

  const provider = AIProviderFactory.createProvider(providerConfig)

  // 5. Run AI tasks (we'll run them in parallel for efficiency)
  const [grammarReview, styleReview, suggestions, complianceCheck, summary] = await Promise.all([
    provider.reviewGrammar(document.content ?? ''),
    provider.reviewStyle(document.content ?? ''),
    provider.suggestEdits(document.content ?? ''),
    // For compliance, we need some rules. We'll use a placeholder for now.
    // In a real app, you would fetch compliance rules from the database or configuration.
    provider.checkCompliance(document.content ?? '', []),
    provider.summarize(document.content ?? ''),
  ])

  // 6. Save the results to the database
  // We'll use transactions to ensure data consistency
  await prisma.$transaction([
    // Save grammar review
    prisma.aIReview.create({
      data: {
        documentId,
        reviewType: 'grammar',
        feedback: grammarReview.feedback,
        score: grammarReview.score,
      },
    }),
    // Save style review
    prisma.aIReview.create({
      data: {
        documentId,
        reviewType: 'style',
        feedback: styleReview.feedback,
        score: styleReview.score,
      },
    }),
    // Save suggestions
    ...suggestions.map(suggestion =>
      prisma.aISuggestion.create({
        data: {
          documentId,
          originalText: suggestion.originalText,
          suggestedText: suggestion.suggestedText,
          type: suggestion.type as 'grammar' | 'clarity' | 'conciseness' | 'tone',
          status: 'pending',
        },
      })
    ),
    // Save compliance check results
    ...complianceCheck.map(result =>
      prisma.complianceCheck.create({
        data: {
          documentId,
          ruleName: result.ruleName,
          passed: result.passed,
          details: result.details,
        },
      })
    ),
    // Update document with summary and status
    prisma.document.update({
      where: { id: documentId },
      data: {
        summary,
        status: 'reviewed',
      },
    }),
  ])
}

/**
 * Get the AI provider for a user (used in other services like chat)
 */
export async function getAIProviderForUser(userId: string): Promise<{ provider: AIProvider; apiKey: string }> {
  // Prisma 7 camelCases acronyms as `aIPreference` (lowercase first letter, keep inner caps).
  const aiPreference = await prisma.aIPreference.findUnique({
    where: { userId },
  })

  if (!aiPreference) {
    throw new Error('AI preference not set for user')
  }

  const decryptedApiKey = decrypt(aiPreference.apiKey)

  const providerConfig: AIProviderConfig = {
    type: aiPreference.provider as 'openai' | 'anthropic',
    apiKey: decryptedApiKey,
    model: aiPreference.model,
  }

  const provider = AIProviderFactory.createProvider(providerConfig)

  return { provider, apiKey: decryptedApiKey }
}