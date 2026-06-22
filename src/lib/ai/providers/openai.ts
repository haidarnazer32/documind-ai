import { OpenAI } from 'openai';
import { AIProvider, ReviewResult, Suggestion, ComplianceResult } from '../base';

export class OpenAIProvider implements AIProvider {
  constructor(private client: OpenAI, private model: string = 'gpt-4o') {}

  async reviewGrammar(text: string): Promise<ReviewResult> {
    const prompt = `Review the following text for grammar errors. Provide specific suggestions and a score (0-100):\n\n${text}`;
    const completion = await this.generateCompletion(prompt, { temperature: 0.3 });
    // Simple parsing - in a real app, you'd want more structured output
    const scoreMatch = completion.match(/score:?\s*(\d+)/i);
    const score = scoreMatch ? parseInt(scoreMatch[1], 10) : undefined;
    return {
      feedback: completion,
      score,
    };
  }

  async reviewStyle(text: string): Promise<ReviewResult> {
    const prompt = `Review the following text for style, clarity, and tone. Provide suggestions for improvement and a score (0-100):\n\n${text}`;
    const completion = await this.generateCompletion(prompt, { temperature: 0.3 });
    const scoreMatch = completion.match(/score:?\s*(\d+)/i);
    const score = scoreMatch ? parseInt(scoreMatch[1], 10) : undefined;
    return {
      feedback: completion,
      score,
    };
  }

  async suggestEdits(text: string): Promise<Suggestion[]> {
    const prompt = `Please suggest edits to improve the following text. For each suggestion, provide the original text and the suggested text. Focus on grammar, clarity, conciseness, and tone.\n\nText:\n\n${text}\n\nFormat your response as a list of suggestions where each suggestion has:\nOriginal Text: [text]\nSuggested Text: [text]\nType: [grammar|clarity|conciseness|tone]`;
    const completion = await this.generateCompletion(prompt, { temperature: 0.3 });
    // Parse the completion to extract suggestions
    // This is a simplified parser - in production you'd want more robust parsing
    const suggestions: Suggestion[] = [];
    const lines = completion.split('\n');
    let currentSuggestion: Partial<Suggestion> = {};

    for (const line of lines) {
      if (line.startsWith('Original Text:')) {
        if (currentSuggestion.originalText) {
          suggestions.push(currentSuggestion as Suggestion);
          currentSuggestion = {};
        }
        currentSuggestion.originalText = line.substring('Original Text:'.length).trim();
      } else if (line.startsWith('Suggested Text:')) {
        currentSuggestion.suggestedText = line.substring('Suggested Text:'.length).trim();
      } else if (line.startsWith('Type:')) {
        const type = line.substring('Type:'.length).trim().toLowerCase() as any;
        if (['grammar', 'clarity', 'conciseness', 'tone'].includes(type)) {
          currentSuggestion.type = type;
        }
      }
    }

    // Don't forget the last suggestion
    if (currentSuggestion.originalText && currentSuggestion.suggestedText && currentSuggestion.type) {
      suggestions.push(currentSuggestion as Suggestion);
    }

    // If parsing failed, return a fallback suggestion
    if (suggestions.length === 0) {
      return [{
        originalText: text.substring(0, Math.min(100, text.length)),
        suggestedText: text.substring(0, Math.min(100, text.length)), // No change as fallback
        type: 'clarity',
      }];
    }

    return suggestions;
  }

  async checkCompliance(text: string, rules: any[]): Promise<ComplianceResult[]> {
    // If no rules provided, return empty array
    if (rules.length === 0) {
      return [];
    }

    // For each rule, check compliance
    const results: ComplianceResult[] = [];
    for (const rule of rules) {
      const prompt = `Check if the following text complies with the rule: "${rule.name || rule.description || JSON.stringify(rule)}"\n\nText:\n\n${text}\n\nRespond with "PASS" or "FAIL" and a brief explanation.`;
      const completion = await this.generateCompletion(prompt, { temperature: 0.1 });
      const passed = completion.toUpperCase().includes('PASS');
      results.push({
        ruleName: rule.name || rule.description || `Rule ${results.length + 1}`,
        passed,
        details: { explanation: completion },
      });
    }

    return results;
  }

  async summarize(text: string, maxLength = 200): Promise<string> {
    const prompt = `Please provide a concise summary of the following text in no more than ${maxLength} characters:\n\n${text}`;
    return this.generateCompletion(prompt, { temperature: 0.5 });
  }

  async answerQuestion(documentText: string, question: string): Promise<string> {
    const prompt = `Based on the following document text, answer the question:\n\nDocument:\n\n${documentText}\n\nQuestion: ${question}\n\nAnswer:`;
    return this.generateCompletion(prompt, { temperature: 0.3 });
  }

  protected async generateCompletion(prompt: string, options?: { temperature?: number; maxTokens?: number }): Promise<string> {
    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.maxTokens ?? 1000,
      });

      return response.choices[0]?.message?.content ?? '';
    } catch (error) {
      console.error('OpenAI API error:', error);
      throw new Error(`Failed to generate completion: ${error.message}`);
    }
  }
}