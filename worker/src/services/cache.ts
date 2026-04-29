// ─────────────────────────────────────────────────────
// Sensory-Check AI — Cache Service (KV + D1)
// ─────────────────────────────────────────────────────
import type { Env, AnalyzeResponse, CachedProfile } from '../types.ts';

const CACHE_PREFIX = 'sensory:v1:';

/**
 * 상품 URL을 고유 ID로 해시 (FNV-1a 변형)
 */
export function hashProductUrl(url: string): string {
  const normalized = url.toLowerCase()
    .replace(/https?:\/\/(www\.)?/, '')
    .replace(/[?&].*$/, '')           // 쿼리스트링 제거
    .replace(/\/$/, '');
  
  let hash = 2166136261;
  for (let i = 0; i < normalized.length; i++) {
    hash ^= normalized.charCodeAt(i);
    hash = (hash * 16777619) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

/**
 * KV에서 캐시 조회 (빠른 경로)
 */
export async function getFromKVCache(
  env: Env,
  productId: string
): Promise<AnalyzeResponse | null> {
  try {
    const key = CACHE_PREFIX + productId;
    const cached = await env.SENSORY_CACHE.get<CachedProfile>(key, 'json');
    if (!cached) return null;
    
    // TTL 만료 체크
    const expiresAt = new Date(cached.expires_at).getTime();
    if (Date.now() > expiresAt) {
      await env.SENSORY_CACHE.delete(key);
      return null;
    }
    
    return { ...cached.data, meta: { ...cached.data.meta, cached: true } };
  } catch {
    return null;
  }
}

/**
 * D1에서 영구 프로파일 조회 (KV 미스 시 폴백)
 */
export async function getFromD1(
  env: Env,
  productId: string,
  ttlDays: number
): Promise<AnalyzeResponse | null> {
  try {
    const result = await env.SENSORY_DB
      .prepare(`
        SELECT * FROM sensory_profiles
        WHERE product_id = ?
          AND datetime(analyzed_at, '+' || cache_ttl_days || ' days') > datetime('now')
        LIMIT 1
      `)
      .bind(productId)
      .first<Record<string, unknown>>();
    
    if (!result) return null;
    
    return dbRowToResponse(result);
  } catch {
    return null;
  }
}

/**
 * 분석 결과를 KV와 D1에 동시 저장
 */
export async function saveToCache(
  env: Env,
  productId: string,
  response: AnalyzeResponse,
  ttlDays: number
): Promise<void> {
  const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000).toISOString();
  
  // KV 저장 (TTL 초 단위)
  const kvPayload: CachedProfile = {
    data: response,
    cached_at: new Date().toISOString(),
    expires_at: expiresAt,
  };
  
  const kvTTL = ttlDays * 24 * 60 * 60;
  
  await Promise.allSettled([
    env.SENSORY_CACHE.put(
      CACHE_PREFIX + productId,
      JSON.stringify(kvPayload),
      { expirationTtl: kvTTL }
    ),
    saveToD1(env, productId, response, ttlDays),
    updatePopularity(env, productId),
  ]);
}

/**
 * D1에 분석 결과 저장
 */
async function saveToD1(
  env: Env,
  productId: string,
  response: AnalyzeResponse,
  ttlDays: number
): Promise<void> {
  const s = response.sensory_scores;
  
  await env.SENSORY_DB
    .prepare(`
      INSERT OR REPLACE INTO sensory_profiles (
        product_id, product_url, product_name, product_type,
        sweetness, acidity, crunchiness,
        durability, durability_score,
        context_tags,
        sensory_summary_ko, sensory_summary_en,
        noise_filter_score, review_count, avg_rating,
        analyzed_at, cache_ttl_days, analysis_version
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), ?, ?)
    `)
    .bind(
      productId,
      response.product_url,
      response.product_name,
      response.product_type,
      s.taste?.sweetness ?? null,
      s.taste?.acidity ?? null,
      s.taste?.crunchiness ?? null,
      s.durability?.grade ?? null,
      s.durability?.score ?? null,
      JSON.stringify(s.context?.scenarios ?? []),
      response.voice_summary.ko,
      response.voice_summary.en,
      s.noise_filter?.score ?? null,
      response.review_count,
      response.avg_rating,
      ttlDays,
      response.meta.analysis_version,
    )
    .run();
}

/**
 * 인기도 카운터 업데이트
 */
async function updatePopularity(env: Env, productId: string): Promise<void> {
  await env.SENSORY_DB
    .prepare(`
      INSERT INTO product_popularity (product_id, request_count, last_requested)
      VALUES (?, 1, datetime('now'))
      ON CONFLICT(product_id) DO UPDATE SET
        request_count = request_count + 1,
        last_requested = datetime('now')
    `)
    .bind(productId)
    .run();
}

/**
 * D1 행을 AnalyzeResponse로 변환
 */
function dbRowToResponse(row: Record<string, unknown>): AnalyzeResponse {
  const contextTags = (() => {
    try { return JSON.parse(row.context_tags as string ?? '[]'); }
    catch { return []; }
  })();

  return {
    success: true,
    product_id: row.product_id as string,
    product_name: row.product_name as string ?? 'Unknown Product',
    product_type: row.product_type as any ?? 'general',
    product_url: row.product_url as string,
    avg_rating: row.avg_rating as number | null,
    review_count: row.review_count as number ?? 0,
    sensory_scores: {
      taste: row.sweetness != null ? {
        sweetness: row.sweetness as number,
        acidity: row.acidity as number,
        crunchiness: row.crunchiness as number,
        richness: null,
        spiciness: null,
      } : undefined,
      durability: row.durability != null ? {
        grade: row.durability as any,
        score: row.durability_score as number ?? 0,
        positive_keywords: [],
        negative_keywords: [],
        confidence: 80,
      } : undefined,
      context: contextTags.length > 0 ? {
        primary_use: contextTags[0] ?? '',
        scenarios: contextTags,
        best_for: '',
        not_for: [],
      } : undefined,
      noise_filter: row.noise_filter_score != null ? {
        score: row.noise_filter_score as number,
        filtered_reviews: 0,
        total_reviews: row.review_count as number ?? 0,
        ad_review_ratio: 0,
      } : undefined,
    },
    voice_summary: {
      ko: row.sensory_summary_ko as string ?? '',
      en: row.sensory_summary_en as string ?? '',
    },
    meta: {
      cached: true,
      analyzed_at: row.analyzed_at as string,
      analysis_version: row.analysis_version as string ?? '1.0',
      response_ms: 0,
    },
  };
}

/**
 * API 사용량 기록
 */
export async function logApiUsage(
  env: Env,
  opts: {
    apiKeyHash: string;
    endpoint: string;
    productId?: string;
    responseMs: number;
    cacheHit: boolean;
  }
): Promise<void> {
  try {
    await env.SENSORY_DB
      .prepare(`
        INSERT INTO api_usage (api_key_hash, endpoint, product_id, response_ms, cache_hit)
        VALUES (?, ?, ?, ?, ?)
      `)
      .bind(
        opts.apiKeyHash,
        opts.endpoint,
        opts.productId ?? null,
        opts.responseMs,
        opts.cacheHit ? 1 : 0,
      )
      .run();
  } catch {
    // 사용량 기록 실패는 무시
  }
}
