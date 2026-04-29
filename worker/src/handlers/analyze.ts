// ─────────────────────────────────────────────────────
// Sensory-Check AI — /analyze Handler
// ─────────────────────────────────────────────────────
import type {
  Env,
  AnalyzeRequest,
  AnalyzeResponse,
  ErrorResponse,
  FocusArea,
} from '../types.ts';
import { hashProductUrl, getFromKVCache, getFromD1, saveToCache, logApiUsage } from '../services/cache.ts';
import { scrapeProductMetadata } from '../services/scraper.ts';
import { analyzeWithAI } from '../services/aiAnalyzer.ts';

export async function handleAnalyze(
  request: Request,
  env: Env
): Promise<Response> {
  const startMs = Date.now();
  
  // ─── Request Parsing ───────────────────────────────────
  let body: AnalyzeRequest;
  try {
    body = await request.json() as AnalyzeRequest;
  } catch {
    return errorResponse('INVALID_JSON', 'Request body must be valid JSON', 400);
  }

  // ─── Validation ──────────────────────────────────
  if (!body.product_url) {
    return errorResponse('MISSING_FIELD', 'product_url is required', 400);
  }
  
  if (!isValidUrl(body.product_url)) {
    return errorResponse('INVALID_URL', 'product_url must be a valid HTTP/HTTPS URL', 400);
  }

  const focus: FocusArea[] = body.focus?.length ? body.focus : ['all'];
  const language = body.language ?? 'both';
  const forceRefresh = body.force_refresh ?? false;
  const ttlDays = parseInt(env.CACHE_TTL_DAYS) || 7;
  
  const productId = hashProductUrl(body.product_url);
  const apiKeyHash = hashHeader(request.headers.get('X-RapidAPI-Key') ?? 'anonymous');

  // ─── Cache Lookup (KV → D1) ─────────────────────────
  if (!forceRefresh) {
    const kvCached = await getFromKVCache(env, productId);
    if (kvCached) {
      const responseMs = Date.now() - startMs;
      await logApiUsage(env, { apiKeyHash, endpoint: '/analyze', productId, responseMs, cacheHit: true });
      return successResponse(filterByLanguage(kvCached, language), responseMs);
    }
    
    const d1Cached = await getFromD1(env, productId, ttlDays);
    if (d1Cached) {
      // D1 Hit: Re-cache to KV
      await saveToCache(env, productId, d1Cached, ttlDays);
      const responseMs = Date.now() - startMs;
      await logApiUsage(env, { apiKeyHash, endpoint: '/analyze', productId, responseMs, cacheHit: true });
      return successResponse(filterByLanguage(d1Cached, language), responseMs);
    }
  }

  // ─── New Analysis ────────────────────────────────────
  let metadata;
  try {
    metadata = await scrapeProductMetadata(body.product_url);
  } catch (err) {
    return errorResponse('SCRAPE_FAILED', 'Failed to fetch product data. Please check the URL.', 502);
  }

  let analysis;
  try {
    analysis = await analyzeWithAI(env, metadata, focus);
  } catch (err) {
    return errorResponse('AI_FAILED', 'Analysis service temporarily unavailable.', 503);
  }

  // ─── Assemble Response ────────────────────────────────────
  const responseMs = Date.now() - startMs;
  const fullResponse: AnalyzeResponse = {
    success: true,
    product_id: productId,
    product_name: metadata.name,
    product_type: analysis.product_type,
    product_url: body.product_url,
    avg_rating: analysis.avg_rating ?? metadata.avg_rating ?? null,
    review_count: analysis.review_count ?? metadata.review_count,
    sensory_scores: {
      taste: analysis.taste_profile as any,
      durability: analysis.durability_index as any,
      context: analysis.context_match as any,
      sensory: analysis.sensory_profile as any,
      noise_filter: analysis.noise_filter as any,
    },
    voice_summary: {
      ko: analysis.voice_summary_ko,
      en: analysis.voice_summary_en,
    },
    meta: {
      cached: false,
      analyzed_at: new Date().toISOString(),
      analysis_version: env.API_VERSION || '1.0.0',
      response_ms: responseMs,
    },
  };

  // ─── Async Storage (Non-blocking) ──────────────
  // Use waitUntil pattern to save to cache after response
  const savePromise = saveToCache(env, productId, fullResponse, ttlDays);
  const logPromise = logApiUsage(env, { apiKeyHash, endpoint: '/analyze', productId, responseMs, cacheHit: false });
  
  // Ignore failures with Promise.allSettled
  Promise.allSettled([savePromise, logPromise]);

  return successResponse(filterByLanguage(fullResponse, language), responseMs);
}

// ─────────────────────────────────────────────────────
// Batch Analyze Handler
// ─────────────────────────────────────────────────────
export async function handleBatchAnalyze(
  request: Request,
  env: Env
): Promise<Response> {
  const startMs = Date.now();
  const maxBatch = parseInt(env.MAX_BATCH_SIZE) || 5;
  
  let body: { products: AnalyzeRequest[] };
  try {
    body = await request.json() as { products: AnalyzeRequest[] };
  } catch {
    return errorResponse('INVALID_JSON', 'Request body must be valid JSON', 400);
  }
  
  if (!Array.isArray(body.products) || body.products.length === 0) {
    return errorResponse('MISSING_FIELD', 'products array is required and must not be empty', 400);
  }
  
  if (body.products.length > maxBatch) {
    return errorResponse('TOO_MANY', `Maximum ${maxBatch} products per batch request`, 400);
  }

  // Parallel analysis
  const results = await Promise.allSettled(
    body.products.map(p => 
      handleAnalyze(new Request(request.url, {
        method: 'POST',
        headers: request.headers,
        body: JSON.stringify(p),
      }), env).then(r => r.json())
    )
  );

  const responseMs = Date.now() - startMs;
  const mappedResults = results.map(r => 
    r.status === 'fulfilled' ? r.value : { success: false, error: 'Analysis failed', code: 'UNKNOWN' }
  );

  return new Response(JSON.stringify({
    success: true,
    results: mappedResults,
    meta: {
      total: body.products.length,
      succeeded: mappedResults.filter((r: any) => r.success).length,
      failed: mappedResults.filter((r: any) => !r.success).length,
      response_ms: responseMs,
    },
  }), {
    headers: corsHeaders({ 'Content-Type': 'application/json' }),
  });
}

// ─── Utilities ─────────────────────────────────────────

function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url.startsWith('http') ? url : 'https://' + url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function hashHeader(val: string): string {
  // Simple key hash (for usage tracking and privacy)
  let hash = 0;
  for (let i = 0; i < val.length; i++) {
    hash = ((hash << 5) - hash) + val.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(16);
}

function filterByLanguage(response: AnalyzeResponse, language: string): AnalyzeResponse {
  if (language === 'ko') {
    return { ...response, voice_summary: { ko: response.voice_summary.ko, en: '' } };
  }
  if (language === 'en') {
    return { ...response, voice_summary: { ko: '', en: response.voice_summary.en } };
  }
  return response;
}

function errorResponse(code: string, message: string, status: number): Response {
  const body: ErrorResponse = { success: false, error: message, code };
  return new Response(JSON.stringify(body), {
    status,
    headers: corsHeaders({ 'Content-Type': 'application/json' }),
  });
}

function successResponse(data: AnalyzeResponse, responseMs: number): Response {
  data.meta.response_ms = responseMs;
  return new Response(JSON.stringify(data), {
    headers: corsHeaders({
      'Content-Type': 'application/json',
      'X-Response-Time': `${responseMs}ms`,
      'X-Cache': data.meta.cached ? 'HIT' : 'MISS',
    }),
  });
}

export function corsHeaders(extra: Record<string, string> = {}): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-RapidAPI-Key, X-RapidAPI-Host',
    ...extra,
  };
}

