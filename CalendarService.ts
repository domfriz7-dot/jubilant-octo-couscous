/**
 * AIEmergencyDateService — Claude-powered emergency date suggestions.
 *
 * When an API key is configured (or Firebase callable is available),
 * generates personalized, context-aware date ideas using Claude.
 * Falls back gracefully to the local catalog when AI is unavailable.
 *
 * Integrates with:
 * - Time of day context
 * - Weather (if available)
 * - Recent date history (avoids repetition)
 * - User preferences from PulseService
 * - Budget constraints
 */

import { getAIConfig, isAIConfigured } from '../config/ai';
import { callCallable } from './backend/firebaseFunctions';
import { logError, logEvent } from './logger';
import type { EmergencySuggestion, GenerateEmergencyDateArgs } from './EmergencyDateService';

interface AIEmergencyRequest {
  urgency: string;
  timeOfDay: string;
  hour: number;
  vibe: string | null;
  budget: string;
  weather: { condition?: string; temp?: number } | null;
  recentDates: string[];
  count: number;
}

interface AIEmergencyResponse {
  ideas: Array<{
    title: string;
    description: string;
    whyNow: string;
    durationMins: number;
    estimatedCost: string;
    vibe: string;
    category: 'romantic' | 'fun' | 'low-effort';
    steps: string[];
    venueType?: string;
  }>;
}

function getTimeOfDay(hour: number): string {
  if (hour >= 6 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'late night';
}

function buildPrompt(req: AIEmergencyRequest): string {
  const weatherStr = req.weather
    ? `Weather: ${req.weather.condition || 'unknown'}, ${req.weather.temp ? req.weather.temp + '°F' : 'unknown temp'}`
    : 'Weather: unknown';

  const avoidStr = req.recentDates.length > 0
    ? `\nAVOID these (done recently): ${req.recentDates.join(', ')}`
    : '';

  return `You are a date night expert. Generate ${req.count} specific, actionable date ideas for RIGHT NOW.

CONTEXT:
- Time: ${req.timeOfDay} (${req.hour}:00)
- Urgency: ${req.urgency} (${req.urgency === 'now' ? 'can leave in 10 minutes' : req.urgency === 'tonight' ? 'planning for tonight' : 'sometime this week'})
- Budget: ${req.budget}
- ${weatherStr}
- Vibe wanted: ${req.vibe || 'any — mix it up'}${avoidStr}

REQUIREMENTS:
1. Each idea must be SPECIFIC (not "go to a restaurant" — say "find a cozy ramen spot")
2. Include a "whyNow" explaining why this works at this exact time
3. Include 2-3 concrete steps to make it happen
4. Mix categories: at least one romantic, one fun, one easy/low-effort
5. Respect the budget constraint
6. If it's late night, only suggest things actually open/possible
7. Keep descriptions punchy and warm (this is for couples)

BUDGET GUIDE:
- low = under $30 total, prefer free/cheap options
- mid = $30-$100, can include a meal out
- high = $100+, special experiences OK

RESPONSE FORMAT (JSON only, no markdown):
{
  "ideas": [
    {
      "title": "Specific idea name",
      "description": "One warm, enticing sentence",
      "whyNow": "Why this works right now (1 sentence)",
      "durationMins": 60,
      "estimatedCost": "$15-25",
      "vibe": "romantic",
      "category": "romantic",
      "steps": ["Step 1", "Step 2", "Step 3"],
      "venueType": "restaurant"
    }
  ]
}

Return ONLY valid JSON. Generate the ideas now:`;
}

function parseResponse(text: string): AIEmergencyResponse {
  let cleaned = text
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '')
    .trim();

  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonMatch) cleaned = jsonMatch[0];

  const parsed = JSON.parse(cleaned);
  if (!parsed.ideas || !Array.isArray(parsed.ideas)) {
    throw new Error('Invalid AI response structure');
  }
  return parsed as AIEmergencyResponse;
}

function toEmergencySuggestion(
  idea: AIEmergencyResponse['ideas'][number],
  index: number,
  timeLabel: string,
  timeEmoji: string,
  urgency: string,
): EmergencySuggestion {
  return {
    title: idea.title,
    durationMins: idea.durationMins || 60,
    category: idea.category || 'fun',
    vibe: idea.vibe,
    urgency: urgency === 'now' ? 'immediate' : 'plan-ahead',
    details: idea.description + (idea.whyNow ? ` ${idea.whyNow}` : ''),
    plan: idea.steps || [],
    timeContext: timeLabel,
    timeEmoji,
    when: urgency === 'now' ? 'Right now' : urgency === 'tonight' ? 'Tonight' : 'This Week',
    actionable: {
      type: 'schedule',
      label: 'Add to calendar',
      action: 'create_event',
    },
  };
}

/**
 * Generate emergency date ideas using Claude AI.
 * Returns null if AI is not available (caller should fall back to local).
 */
export async function generateWithAI(
  args: GenerateEmergencyDateArgs & { location?: string },
): Promise<{
  timeContext: { period: string; label: string; emoji: string };
  urgency: string;
  ideas: EmergencySuggestion[];
  count: number;
  source: 'ai';
} | null> {
  const config = getAIConfig();
  const hasKey = isAIConfigured();

  const now = args.targetTime ? new Date(args.targetTime) : new Date();
  const hour = now.getHours();
  const timeOfDay = getTimeOfDay(hour);
  const timeLabel = timeOfDay.charAt(0).toUpperCase() + timeOfDay.slice(1);
  const timeEmoji = hour >= 6 && hour < 12 ? '🌅' : hour >= 12 && hour < 17 ? '☀️' : hour >= 17 && hour < 21 ? '🌆' : '🌙';

  const request: AIEmergencyRequest = {
    urgency: args.urgency || 'tonight',
    timeOfDay,
    hour,
    vibe: args.vibe || null,
    budget: args.budget || 'mid',
    weather: args.weather as AIEmergencyRequest['weather'],
    recentDates: (args.recentEvents || []).map((e) => e.title || '').filter(Boolean).slice(0, 5),
    count: args.count || 5,
  };

  const prompt = buildPrompt(request);

  try {
    let responseText = "";

    // Try Firebase callable first (preferred — no client-side API key)
    if (!hasKey) {
      const result = await callCallable<{ prompt: string }, { text: string }>('aiGenerateEmergencyDate', { prompt });
      if (!result.ok) return null; // AI not available
      responseText = result.value.text;
    } else {
      // Direct API call
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 20000);

      try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': config.anthropicApiKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: config.model,
            max_tokens: 1500,
            temperature: 0.8,
            messages: [{ role: 'user', content: prompt }],
          }),
        });

        if (!response.ok) return null;
        const data = await response.json();
        if (!data.content?.[0]?.text) return null;
        responseText = data.content[0].text;
      } catch { /* non-fatal */ } finally {
        clearTimeout(timer);
      }
    }

    if (!responseText) return null;

    const parsed = parseResponse(responseText);
    const ideas = parsed.ideas.map((idea, i) =>
      toEmergencySuggestion(idea, i, timeLabel, timeEmoji, request.urgency)
    );

    logEvent('ai_emergency_date_generated', { count: ideas.length, urgency: request.urgency });

    return {
      timeContext: { period: timeOfDay, label: timeLabel, emoji: timeEmoji },
      urgency: request.urgency,
      ideas,
      count: ideas.length,
      source: 'ai',
    };
  } catch (e) {
    logError('AIEmergencyDateService', e);
    return null; // Graceful fallback
  }
}

export default { generateWithAI };
