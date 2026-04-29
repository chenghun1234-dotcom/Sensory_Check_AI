// ─────────────────────────────────────────────────────
// Sensory-Check AI — TypeScript Type Definitions
// ─────────────────────────────────────────────────────

export interface Env {
  SENSORY_CACHE: KVNamespace;
  SENSORY_DB: D1Database;
  AI: Ai;
  ENVIRONMENT: string;
  CACHE_TTL_DAYS: string;
  MAX_BATCH_SIZE: string;
  API_VERSION: string;
  RAPIDAPI_SECRET?: string;
}

// ─── Request Types ────────────────────────────────────

export type FocusArea = 'taste' | 'durability' | 'context' | 'sensory' | 'all';
export type ProductType = 'food' | 'electronics' | 'fashion' | 'beauty' | 'general';

export interface AnalyzeRequest {
  product_url: string;
  focus?: FocusArea[];
  language?: 'ko' | 'en' | 'both';
  force_refresh?: boolean;
}

export interface BatchAnalyzeRequest {
  products: AnalyzeRequest[];
}

// ─── Sensory Score Types ──────────────────────────────

export interface TasteProfile {
  sweetness: number | null;        // 1-10: 당도
  acidity: number | null;          // 1-10: 산도
  crunchiness: number | null;      // 1-10: 식감 (아삭함)
  richness: number | null;         // 1-10: 풍미 깊이
  spiciness: number | null;        // 1-10: 매운맛
}

export interface DurabilityIndex {
  grade: 'A' | 'B' | 'C' | 'D' | 'F' | 'N/A';
  score: number;                   // 0-100
  positive_keywords: string[];     // ["튼튼", "내구성 좋음"]
  negative_keywords: string[];     // ["고장", "파손"]
  confidence: number;              // 0-100
}

export interface ContextMatch {
  primary_use: string;             // "자취생 간단 한 끼"
  scenarios: string[];             // ["캠핑용", "선물용", "파티용"]
  best_for: string;                // 최적 대상
  not_for: string[];               // 비추천 상황
}

export interface SensoryProfile {
  texture: string;                 // "묵직한 무게감"
  visual: string;                  // "무광 재질"
  weight_perception: string;       // "가벼운 / 무거운"
  summary: string;                 // 1줄 통합 요약
}

export interface NoiseFilter {
  score: number;                   // 0-100: 리뷰 신뢰도
  filtered_reviews: number;        // 제거된 리뷰 수
  total_reviews: number;
  ad_review_ratio: number;         // 광고성 리뷰 비율 0-1
}

// ─── Response Types ───────────────────────────────────

export interface SensoryScores {
  taste?: TasteProfile;
  durability?: DurabilityIndex;
  context?: ContextMatch;
  sensory?: SensoryProfile;
  noise_filter?: NoiseFilter;
}

export interface AnalyzeResponse {
  success: true;
  product_id: string;
  product_name: string;
  product_type: ProductType;
  product_url: string;
  avg_rating: number | null;
  review_count: number;
  sensory_scores: SensoryScores;
  voice_summary: {
    ko: string;
    en: string;
  };
  meta: {
    cached: boolean;
    analyzed_at: string;
    analysis_version: string;
    response_ms: number;
  };
}

export interface ErrorResponse {
  success: false;
  error: string;
  code: string;
  details?: string;
}

export interface BatchAnalyzeResponse {
  success: true;
  results: (AnalyzeResponse | ErrorResponse)[];
  meta: {
    total: number;
    succeeded: number;
    failed: number;
    response_ms: number;
  };
}

export interface HealthResponse {
  status: 'ok' | 'degraded';
  version: string;
  environment: string;
  services: {
    kv: 'ok' | 'error';
    d1: 'ok' | 'error';
    ai: 'ok' | 'error';
  };
  timestamp: string;
}

// ─── Internal Types ───────────────────────────────────

export interface ProductMetadata {
  name: string;
  type: ProductType;
  description: string;
  reviews: string[];
  avg_rating: number | null;
  review_count: number;
  image_alts: string[];
  price?: string;
  brand?: string;
}

export interface CachedProfile {
  data: AnalyzeResponse;
  cached_at: string;
  expires_at: string;
}

export interface AIAnalysisResult {
  product_type: ProductType;
  taste_profile?: Partial<TasteProfile>;
  durability_index?: Partial<DurabilityIndex>;
  context_match?: Partial<ContextMatch>;
  sensory_profile?: Partial<SensoryProfile>;
  noise_filter?: Partial<NoiseFilter>;
  voice_summary_ko: string;
  voice_summary_en: string;
  avg_rating?: number;
  review_count?: number;
}
