import { optionalEnv } from './env';

/**
 * AI Configuration for Claude API (Anthropic)
 * 
 * Handles API key and model configuration for AI Date Planner feature
 */

export interface AIConfig {
  anthropicApiKey: string;
  model: string;
  maxTokens: number;
  temperature: number;
}

/**
 * Get AI configuration
 * In production, store API key in secure environment variables
 */
export function getAIConfig(): AIConfig {
  return {
    // Your Anthropic API key
    anthropicApiKey: optionalEnv('EXPO_PUBLIC_ANTHROPIC_API_KEY'),
    
    // Claude Sonnet 4 - best balance of speed and intelligence
    model: 'claude-sonnet-4-20250514',
    
    // Max tokens for response (2000 is enough for detailed date plans)
    maxTokens: 2000,
    
    // Temperature 0.7 for creative but consistent suggestions
    temperature: 0.7,
  };
}

/**
 * Check if AI service is configured
 */
export function isAIConfigured(): boolean {
  const config = getAIConfig();
  return !!config.anthropicApiKey && config.anthropicApiKey.length > 0;
}

export default {
  getAIConfig,
  isAIConfigured,
};