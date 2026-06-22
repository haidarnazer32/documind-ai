// Define the interfaces for AI service responses
export interface ReviewResult {
  feedback: string;
  score?: number; // 0-100
}

export interface Suggestion {
  originalText: string;
  suggestedText: string;
  type: 'grammar' | 'clarity' | 'conciseness' | 'tone';
}

export interface ComplianceResult {
  ruleName: string;
  passed: boolean;
  details: Record<string, any>;
}

// Abstract base class for AI providers
export abstract class AIProvider {
  abstract reviewGrammar(text: string): Promise<ReviewResult>;
  abstract reviewStyle(text: string): Promise<ReviewResult>;
  abstract suggestEdits(text: string): Promise<Suggestion[]>;
  abstract checkCompliance(text: string, rules: any[]): Promise<ComplianceResult[]>;
  abstract summarize(text: string, maxLength?: number): Promise<string>;
  abstract answerQuestion(documentText: string, question: string): Promise<string>;

  protected abstract generateCompletion(prompt: string, options?: { temperature?: number; maxTokens?: number }): Promise<string>;
}