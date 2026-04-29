// ─────────────────────────────────────────────────────
// Sensory-Check AI — Product Metadata Scraper
// Extracts review snippets, ratings, and product info
// from structured URL patterns (Amazon, Coupang, etc.)
// ─────────────────────────────────────────────────────
import type { ProductMetadata, ProductType } from '../types.ts';

// Supported platform patterns
const PLATFORM_PATTERNS = {
  amazon:  /amazon\.(com|co\.jp|co\.uk|de|fr|ca)/i,
  coupang: /coupang\.com/i,
  gmarket: /gmarket\.(co\.kr|com)/i,
  11st:    /11st\.co\.kr/i,
  naver:   /smartstore\.naver\.com|naver\.com\/shopping/i,
};

/**
 * Extract product metadata
 * In production, consider using Cloudflare Browser Rendering API
 * or partner data feeds for more robust scraping.
 * Currently uses URL pattern analysis + public Product metadata.
 */
export async function scrapeProductMetadata(
  productUrl: string
): Promise<ProductMetadata> {
  const url = normalizeUrl(productUrl);
  const platform = detectPlatform(url);
  
  // Amazon Product Advertising API (공식 파트너십 시)
  // 현재는 Open Graph + JSON-LD 메타데이터 추출
  const metadata = await fetchMetadataViaFetch(url, platform);
  return metadata;
}

/**
 * URL 정규화
 */
function normalizeUrl(url: string): string {
  if (!url.startsWith('http')) {
    url = 'https://' + url;
  }
  try {
    const parsed = new URL(url);
    // 트래킹 파라미터 제거
    ['ref', 'tag', 'linkCode', 'th', 'psc', 'utm_source', 'utm_medium'].forEach(p => {
      parsed.searchParams.delete(p);
    });
    return parsed.toString();
  } catch {
    return url;
  }
}

/**
 * 플랫폼 감지
 */
function detectPlatform(url: string): string {
  for (const [name, pattern] of Object.entries(PLATFORM_PATTERNS)) {
    if (pattern.test(url)) return name;
  }
  return 'generic';
}

/**
 * Metadata extraction via HTTP fetch
 * Parses Open Graph, JSON-LD, and meta tags
 */
async function fetchMetadataViaFetch(
  url: string,
  platform: string
): Promise<ProductMetadata> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; SensoryCheckBot/1.0; +https://sensory-check.ai)',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
      },
      redirect: 'follow',
    });

    if (!response.ok) {
      return buildFallbackMetadata(url, platform);
    }

    const html = await response.text();
    return parseHtmlMetadata(html, url, platform);
    
  } catch {
    return buildFallbackMetadata(url, platform);
  }
}

/**
 * HTML에서 메타데이터 파싱 (정규식 기반 — Wasm 파서 없이도 동작)
 */
function parseHtmlMetadata(html: string, url: string, platform: string): ProductMetadata {
  // Open Graph 태그 추출
  const ogTitle = extractMeta(html, 'og:title') || extractMeta(html, 'title') || 'Unknown Product';
  const ogDescription = extractMeta(html, 'og:description') || extractMeta(html, 'description') || '';
  
  // JSON-LD 구조화 데이터 추출
  const jsonLd = extractJsonLd(html);
  
  // 리뷰 스니펫 추출 (Amazon 구조 기반)
  const reviews = extractReviewSnippets(html, platform);
  
  // 평점 추출
  const avgRating = jsonLd?.aggregateRating?.ratingValue 
    ? parseFloat(jsonLd.aggregateRating.ratingValue)
    : extractRatingFromHtml(html);
  
  const reviewCount = jsonLd?.aggregateRating?.reviewCount
    ? parseInt(jsonLd.aggregateRating.reviewCount)
    : extractReviewCountFromHtml(html);
  
  // 이미지 alt 텍스트 추출 (감각 정보 보완)
  const imageAlts = extractImageAlts(html);
  
  // 제품 유형 추론
  const productType = inferProductType(ogTitle, ogDescription, jsonLd?.category ?? '');
  
  return {
    name: cleanText(ogTitle),
    type: productType,
    description: cleanText(ogDescription),
    reviews: reviews.slice(0, 20),  // 최대 20개 리뷰
    avg_rating: avgRating,
    review_count: reviewCount,
    image_alts: imageAlts.slice(0, 10),
    price: jsonLd?.offers?.price ?? undefined,
    brand: jsonLd?.brand?.name ?? undefined,
  };
}

/**
 * meta 태그 값 추출
 */
function extractMeta(html: string, name: string): string | null {
  const patterns = [
    new RegExp(`<meta[^>]+property=["']${name}["'][^>]+content=["']([^"']+)["']`, 'i'),
    new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']+)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${name}["']`, 'i'),
  ];
  
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) return match[1];
  }
  return null;
}

/**
 * JSON-LD 구조화 데이터 추출
 */
function extractJsonLd(html: string): Record<string, any> | null {
  const match = html.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i);
  if (!match) return null;
  try {
    const data = JSON.parse(match[1]);
    return Array.isArray(data) ? data[0] : data;
  } catch {
    return null;
  }
}

/**
 * 리뷰 스니펫 추출
 */
function extractReviewSnippets(html: string, platform: string): string[] {
  const snippets: string[] = [];
  
  // Amazon 리뷰 패턴
  if (platform === 'amazon') {
    const reviewPattern = /<span[^>]+class="[^"]*review-text[^"]*"[^>]*>([\s\S]*?)<\/span>/gi;
    let match;
    while ((match = reviewPattern.exec(html)) !== null && snippets.length < 20) {
      const text = cleanText(match[1]);
      if (text.length > 20) snippets.push(text);
    }
  }
  
  // 일반 리뷰 패턴 (microdata)
  const genericPattern = /<[^>]+itemprop=["']reviewBody["'][^>]*>([\s\S]*?)<\/[^>]+>/gi;
  let match;
  while ((match = genericPattern.exec(html)) !== null && snippets.length < 20) {
    const text = cleanText(match[1]);
    if (text.length > 20) snippets.push(text);
  }
  
  return snippets;
}

function extractRatingFromHtml(html: string): number | null {
  const patterns = [
    /(\d+\.?\d*)\s*out\s*of\s*5/i,
    /rating['":\s]+(\d+\.?\d*)/i,
    /"ratingValue":\s*"?(\d+\.?\d*)"?/i,
  ];
  for (const p of patterns) {
    const m = html.match(p);
    if (m) {
      const val = parseFloat(m[1]);
      if (val >= 1 && val <= 5) return val;
    }
  }
  return null;
}

function extractReviewCountFromHtml(html: string): number {
  const patterns = [
    /(\d[\d,]+)\s*(?:ratings?|reviews?|평가|리뷰)/i,
    /"reviewCount":\s*"?(\d+)"?/i,
  ];
  for (const p of patterns) {
    const m = html.match(p);
    if (m) return parseInt(m[1].replace(/,/g, ''));
  }
  return 0;
}

function extractImageAlts(html: string): string[] {
  const alts: string[] = [];
  const pattern = /<img[^>]+alt=["']([^"']{10,100})["'][^>]*>/gi;
  let match;
  while ((match = pattern.exec(html)) !== null && alts.length < 10) {
    const alt = cleanText(match[1]);
    if (alt && !alt.toLowerCase().includes('logo')) alts.push(alt);
  }
  return alts;
}

/**
 * 제품 유형 추론
 */
function inferProductType(name: string, description: string, category: string): ProductType {
  const combined = `${name} ${description} ${category}`.toLowerCase();
  
  const foodKeywords = ['food', 'apple', 'rice', 'fruit', 'vegetable', 'snack', 'drink', 'tea', 'coffee'];
  const electronicsKeywords = ['phone', 'laptop', 'tablet', 'headphone', 'smart', 'battery', 'charger', 'cable', 'speaker'];
  const beautyKeywords = ['cream', 'serum', 'shampoo', 'lotion', 'makeup', 'cosmetic', 'skincare'];
  const fashionKeywords = ['shirt', 'pants', 'shoe', 'dress', 'clothing', 'apparel', 'fashion'];
  
  if (foodKeywords.some(k => combined.includes(k))) return 'food';
  if (electronicsKeywords.some(k => combined.includes(k))) return 'electronics';
  if (beautyKeywords.some(k => combined.includes(k))) return 'beauty';
  if (fashionKeywords.some(k => combined.includes(k))) return 'fashion';
  return 'general';
}

function cleanText(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * 폴백 메타데이터 (스크래핑 실패 시)
 */
function buildFallbackMetadata(url: string, platform: string): ProductMetadata {
  return {
    name: `Product from ${platform}`,
    type: 'general',
    description: '',
    reviews: [],
    avg_rating: null,
    review_count: 0,
    image_alts: [],
  };
}
