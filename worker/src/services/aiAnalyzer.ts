// ─────────────────────────────────────────────────────
// Sensory-Check AI — Workers AI Analyzer
// Extract sensory metrics using Llama 3.1 8B Instruct
// ─────────────────────────────────────────────────────
import type {
  Env,
  ProductMetadata,
  AIAnalysisResult,
  ProductType,
  FocusArea,
} from '../types.ts';

const AI_MODEL = '@cf/meta/llama-3.1-8b-instruct';
const MAX_REVIEW_CHARS = 3000; // Character limit for reviews to save tokens

/**
 * Analyze sensory metrics with Workers AI
 */
export async function analyzeWithAI(
  env: Env,
  metadata: ProductMetadata,
  focus: FocusArea[]
): Promise<AIAnalysisResult> {
  const reviewText = metadata.reviews
    .join('\n---\n')
    .slice(0, MAX_REVIEW_CHARS);

  const shouldAnalyze = {
    taste: focus.includes('all') || focus.includes('taste'),
    durability: focus.includes('all') || focus.includes('durability'),
    context: focus.includes('all') || focus.includes('context'),
    sensory: focus.includes('all') || focus.includes('sensory'),
  };

  const prompt = buildAnalysisPrompt(metadata, reviewText, shouldAnalyze);

  try {
    const aiResponse = await env.AI.run(AI_MODEL, {
      messages: [
        {
          role: 'system',
          content: `You are SensoryCheckAI, an expert product analyst specializing in extracting sensory and qualitative data from product reviews. 
You always respond with valid JSON only, no markdown, no explanations.
Be precise with numerical scores. For missing data, use null.`,
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: 800,
      temperature: 0.2,  // Maximize consistency
    }) as { response: string };

    const parsed = parseAIResponse(aiResponse.response, metadata);
    return parsed;
    
  } catch (err) {
    // Fallback to rule-based analysis if AI fails
    return ruleBasedFallback(metadata, shouldAnalyze);
  }
}

/**
 * Generate analysis prompt
 */
function buildAnalysisPrompt(
  metadata: ProductMetadata,
  reviewText: string,
  focus: Record<string, boolean>
): string {
  const sections: string[] = [];
  
  sections.push(`PRODUCT: ${metadata.name}`);
  sections.push(`TYPE: ${metadata.type}`);
  sections.push(`DESCRIPTION: ${metadata.description.slice(0, 500)}`);
  sections.push(`RATING: ${metadata.avg_rating ?? 'unknown'}/5 (${metadata.review_count} reviews)`);
  
  if (reviewText) {
    sections.push(`\nREVIEW SAMPLES:\n${reviewText}`);
  }
  
  if (metadata.image_alts.length > 0) {
    sections.push(`\nIMAGE DESCRIPTIONS: ${metadata.image_alts.join(', ')}`);
  }

  const outputSchema: Record<string, unknown> = {
    product_type: 'food|electronics|beauty|fashion|general',
    noise_filter: {
      score: '0-100 (review reliability after filtering ad reviews)',
      filtered_reviews: 'number removed',
      total_reviews: 'number',
      ad_review_ratio: '0.0-1.0',
    },
    voice_summary_ko: '1-sentence Korean voice summary for Alexa/AI assistant',
    voice_summary_en: '1-sentence English voice summary for Alexa/AI assistant',
  };

  if (focus.taste && (metadata.type === 'food')) {
    outputSchema.taste_profile = {
      sweetness: '1-10 or null',
      acidity: '1-10 or null',
      crunchiness: '1-10 or null',
      richness: '1-10 or null',
      spiciness: '1-10 or null',
    };
  }

  if (focus.durability && metadata.type !== 'food') {
    outputSchema.durability_index = {
      grade: 'A|B|C|D|F',
      score: '0-100',
      positive_keywords: ['array', 'of', 'keywords'],
      negative_keywords: ['array', 'of', 'keywords'],
      confidence: '0-100',
    };
  }

  if (focus.context) {
    outputSchema.context_match = {
      primary_use: 'primary use case in English',
      scenarios: ['array', 'of', 'use', 'cases'],
      best_for: 'target audience/occasion',
      not_for: ['situations', 'to', 'avoid'],
    };
  }

  if (focus.sensory) {
    outputSchema.sensory_profile = {
      texture: 'texture description',
      visual: 'visual/appearance description',
      weight_perception: 'light/medium/heavy',
      summary: '1-sentence physical sensory description in English',
    };
  }

  sections.push(`\nRespond ONLY with JSON matching this schema:\n${JSON.stringify(outputSchema, null, 2)}`);
  
  return sections.join('\n');
}

/**
 * Parse and validate AI response
 */
function parseAIResponse(
  responseText: string,
  metadata: ProductMetadata
): AIAnalysisResult {
  // Extract JSON (remove markdown code blocks)
  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('No JSON in AI response');
  
  const raw = JSON.parse(jsonMatch[0]);
  
  return {
    product_type: validateProductType(raw.product_type) ?? metadata.type,
    taste_profile: raw.taste_profile ? {
      sweetness: clamp(raw.taste_profile.sweetness, 1, 10),
      acidity: clamp(raw.taste_profile.acidity, 1, 10),
      crunchiness: clamp(raw.taste_profile.crunchiness, 1, 10),
      richness: clamp(raw.taste_profile.richness, 1, 10),
      spiciness: clamp(raw.taste_profile.spiciness, 1, 10),
    } : undefined,
    durability_index: raw.durability_index ? {
      grade: validateGrade(raw.durability_index.grade),
      score: clamp(raw.durability_index.score, 0, 100) ?? 50,
      positive_keywords: Array.isArray(raw.durability_index.positive_keywords)
        ? raw.durability_index.positive_keywords.slice(0, 10)
        : [],
      negative_keywords: Array.isArray(raw.durability_index.negative_keywords)
        ? raw.durability_index.negative_keywords.slice(0, 10)
        : [],
      confidence: clamp(raw.durability_index.confidence, 0, 100) ?? 70,
    } : undefined,
    context_match: raw.context_match ? {
      primary_use: raw.context_match.primary_use ?? '',
      scenarios: Array.isArray(raw.context_match.scenarios)
        ? raw.context_match.scenarios.slice(0, 6)
        : [],
      best_for: raw.context_match.best_for ?? '',
      not_for: Array.isArray(raw.context_match.not_for)
        ? raw.context_match.not_for.slice(0, 4)
        : [],
    } : undefined,
    sensory_profile: raw.sensory_profile ? {
      texture: raw.sensory_profile.texture ?? '',
      visual: raw.sensory_profile.visual ?? '',
      weight_perception: raw.sensory_profile.weight_perception ?? 'medium',
      summary: raw.sensory_profile.summary ?? '',
    } : undefined,
    noise_filter: {
      score: clamp(raw.noise_filter?.score, 0, 100) ?? 75,
      filtered_reviews: raw.noise_filter?.filtered_reviews ?? 0,
      total_reviews: metadata.review_count,
      ad_review_ratio: clamp(raw.noise_filter?.ad_review_ratio, 0, 1) ?? 0.1,
    },
    voice_summary_ko: raw.voice_summary_ko ?? generateFallbackSummaryKo(metadata),
    voice_summary_en: raw.voice_summary_en ?? generateFallbackSummaryEn(metadata),
    avg_rating: metadata.avg_rating ?? undefined,
    review_count: metadata.review_count,
  };
}

/**
 * Rule-based fallback analysis (if AI fails)
 */
function ruleBasedFallback(
  metadata: ProductMetadata,
  focus: Record<string, boolean>
): AIAnalysisResult {
  const reviews = metadata.reviews.join(' ').toLowerCase();
  
  // Durability keyword analysis
  const durabilityPositive = ['durable', 'solid', 'sturdy', 'well-built', 'robust', 'strong'];
  const durabilityNegative = ['broke', 'broken', 'fragile', 'cheap', 'failed', 'damaged'];
  
  const posCount = durabilityPositive.filter(k => reviews.includes(k)).length;
  const negCount = durabilityNegative.filter(k => reviews.includes(k)).length;
  const durabilityScore = Math.max(0, Math.min(100, 60 + posCount * 10 - negCount * 15));
  
  // Taste keyword analysis (Food)
  const sweetnessKeywords = ['sweet', 'sugary', 'sweetness'];
  const spicyKeywords = ['spicy', 'hot', 'spiciness', 'peppery'];
  const sweetness = sweetnessKeywords.some(k => reviews.includes(k)) ? 7.5 : null;
  const spiciness = spicyKeywords.some(k => reviews.includes(k)) ? 7.0 : null;
  
  return {
    product_type: metadata.type,
    taste_profile: (focus.taste && metadata.type === 'food') ? {
      sweetness,
      acidity: null,
      crunchiness: null,
      richness: null,
      spiciness,
    } : undefined,
    durability_index: (focus.durability && metadata.type !== 'food') ? {
      grade: scoreToGrade(durabilityScore),
      score: durabilityScore,
      positive_keywords: durabilityPositive.filter(k => reviews.includes(k)),
      negative_keywords: durabilityNegative.filter(k => reviews.includes(k)),
      confidence: 60,
    } : undefined,
    context_match: focus.context ? {
      primary_use: 'General Use',
      scenarios: ['General Use', 'Gifting'],
      best_for: 'General consumers',
      not_for: [],
    } : undefined,
    noise_filter: {
      score: 70,
      filtered_reviews: 0,
      total_reviews: metadata.review_count,
      ad_review_ratio: 0.15,
    },
    voice_summary_ko: generateFallbackSummaryKo(metadata),
    voice_summary_en: generateFallbackSummaryEn(metadata),
    avg_rating: metadata.avg_rating ?? undefined,
    review_count: metadata.review_count,
  };
}

// ─── Utility Functions ────────────────────────────────────

function clamp(val: unknown, min: number, max: number): number | null {
  const n = typeof val === 'number' ? val : parseFloat(String(val));
  if (isNaN(n)) return null;
  return Math.max(min, Math.min(max, n));
}

function validateProductType(val: unknown): ProductType | null {
  const valid = ['food', 'electronics', 'beauty', 'fashion', 'general'];
  return valid.includes(String(val)) ? val as ProductType : null;
}

function validateGrade(val: unknown): 'A' | 'B' | 'C' | 'D' | 'F' {
  const valid = ['A', 'B', 'C', 'D', 'F'];
  return valid.includes(String(val)) ? val as any : 'C';
}

function scoreToGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
  if (score >= 90) return 'A';
  if (score >= 75) return 'B';
  if (score >= 60) return 'C';
  if (score >= 40) return 'D';
  return 'F';
}

function generateFallbackSummaryKo(metadata: ProductMetadata): string {
  const rating = metadata.avg_rating;
  const ratingText = rating ? `rated ${rating.toFixed(1)} stars` : '';
  return `${metadata.name} is a ${metadata.type === 'food' ? 'food item' : 'product'} ${ratingText} with ${metadata.review_count} reviews.`;
}

function generateFallbackSummaryEn(metadata: ProductMetadata): string {
  const rating = metadata.avg_rating;
  return `${metadata.name} has ${rating ? `a rating of ${rating.toFixed(1)} stars` : 'unknown rating'} based on ${metadata.review_count} reviews.`;
}

