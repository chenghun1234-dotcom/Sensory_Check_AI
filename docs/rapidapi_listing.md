# VoiceCommerce-Sensory-API — RapidAPI Listing (English)

## API Name
**VoiceCommerce-Sensory-API**

---

## Short Description (140 chars max)
> Quantify product taste, durability & sensory profiles for voice shopping AI agents. Powered by LLaMA 3.1 on Cloudflare Workers.

---

## Long Description

### What is Sensory-Check AI?

Sensory-Check AI transforms raw product URLs into **structured sensory data** that voice assistants and AI shopping agents can actually use.

When a user asks Alexa *"Is this apple good?"*, standard APIs return reviews. Sensory-Check AI returns:

```json
{
  "sweetness": 8.5,
  "crunchiness": 9.1,
  "voice_summary": "Highly sweet and crispy Fuji apple, perfect for gifts."
}
```

### 5 Core Sensory Metrics

| Metric | Description | For |
|--------|-------------|-----|
| **Taste Profile** | Sweetness, acidity, crunchiness, spiciness (1-10) | Food products |
| **Durability Index** | Review-based durability grade (A-F) + score | Electronics, furniture |
| **Context Match** | Best-use scenarios, target audience | All categories |
| **Sensory Summary** | One-line tactile/visual description | All categories |
| **Noise Filter Score** | Review reliability after ad-review removal (0-100) | All categories |

### Why Voice Commerce Needs This

- **The Problem**: "Read me the reviews" is not voice-friendly. Voice assistants need numbers and 1-sentence summaries.
- **The Solution**: We distill 10,000+ reviews into 5 structured scores that sound natural when spoken aloud.
- **The Differentiator**: Our noise filter removes promotional/irrelevant reviews before scoring, giving 30-40% higher accuracy than raw-star-rating APIs.

### Architecture (Zero Infrastructure Cost)
- **Runtime**: Cloudflare Workers (100K req/day free)
- **AI Engine**: Cloudflare Workers AI — LLaMA 3.1 8B Instruct
- **Cache**: Cloudflare KV (7-day TTL) + D1 SQLite (permanent)
- **Monthly Cost**: $0 (all within Cloudflare free tier)

---

## Endpoints

### POST /analyze
Analyze a single product URL.

**Request:**
```json
{
  "product_url": "https://amazon.com/dp/B08N5WRWNW",
  "focus": ["taste", "durability", "context", "sensory"],
  "language": "both",
  "force_refresh": false
}
```

**Response:**
```json
{
  "success": true,
  "product_id": "a1b2c3d4",
  "product_name": "Premium Fuji Apple 6-Pack",
  "product_type": "food",
  "avg_rating": 4.8,
  "review_count": 2847,
  "sensory_scores": {
    "taste": {
      "sweetness": 8.5,
      "acidity": 3.2,
      "crunchiness": 9.1,
      "richness": 7.0,
      "spiciness": null
    },
    "context": {
      "primary_use": "Gift fruit set",
      "scenarios": ["Gift", "Breakfast", "Snack", "Diet"],
      "best_for": "Health-conscious consumers, gifting",
      "not_for": ["Those preferring sour fruit"]
    },
    "sensory": {
      "texture": "Firm and satisfying crunch",
      "visual": "Deep red matte skin",
      "weight_perception": "Medium",
      "summary": "Crisp, loud bite with abundant juice — premium Fuji quality."
    },
    "noise_filter": {
      "score": 92,
      "filtered_reviews": 127,
      "total_reviews": 2847,
      "ad_review_ratio": 0.04
    }
  },
  "voice_summary": {
    "ko": "이 사과는 당도 8.5점으로 매우 아삭한 식감입니다. 선물용으로 최적입니다.",
    "en": "Highly sweet and extremely crispy Fuji apple. Excellent for gifting."
  },
  "meta": {
    "cached": false,
    "analyzed_at": "2026-04-29T07:00:00Z",
    "analysis_version": "1.0.0",
    "response_ms": 1240
  }
}
```

---

### POST /analyze/batch
Analyze up to 5 products simultaneously. Cached items return in <100ms each.

**Request:**
```json
{
  "products": [
    { "product_url": "https://amazon.com/dp/B08N5WRWNW" },
    { "product_url": "https://amazon.com/dp/B09V3KXJPB", "focus": ["durability"] }
  ]
}
```

---

### GET /health
Check service status.

```json
{
  "status": "ok",
  "version": "1.0.0",
  "services": { "kv": "ok", "d1": "ok", "ai": "ok" }
}
```

---

## Parameters

### `focus` (optional, array)
Filter which metrics to analyze. Reduces AI compute for faster responses.

| Value | Metrics Returned |
|-------|-----------------|
| `"all"` | All 5 metrics (default) |
| `"taste"` | Taste profile only |
| `"durability"` | Durability index only |
| `"context"` | Context match only |
| `"sensory"` | Sensory summary only |

### `language` (optional)
| Value | Description |
|-------|-------------|
| `"both"` | Korean + English voice summaries (default) |
| `"ko"` | Korean only |
| `"en"` | English only |

### `force_refresh` (optional, boolean)
Set `true` to bypass cache and re-analyze. Useful after major product updates.

---

## Supported Platforms
- Amazon (amazon.com, amazon.co.jp, amazon.co.uk, amazon.de)
- Coupang (coupang.com)
- Naver Smart Store (smartstore.naver.com)
- Gmarket, 11st
- Any URL with Open Graph / JSON-LD structured data

---

## Use Cases

### 1. Alexa Voice Shopping
```javascript
// User: "Alexa, is this apple sweet?"
const { voice_summary } = await sensoryCheck.analyze({ product_url: productUrl, language: 'en' });
alexa.speak(voice_summary.en);
// → "This apple scores 8.5 out of 10 for sweetness and is extremely crispy. Highly recommended."
```

### 2. AI Shopping Agent (LangChain / AutoGPT)
```python
tool = SensoryCheckTool(api_key=RAPIDAPI_KEY)
result = tool.run({"product_url": url, "focus": ["durability", "context"]})
agent.add_context(result["voice_summary"]["en"])
```

### 3. Voice Commerce Platform
Compare 5 products simultaneously with batch endpoint, then use scores to rank by user preference (e.g., sweetness > 8 AND durability grade ≥ B).

### 4. 도시락탈출 / Convenience Store Integration
```
User: "지금 가장 매콤한 편의점 도시락 찾아줘"
→ Batch analyze 10 products → Filter spiciness > 7 → Return top 3
→ "치킨마요 도시락은 매운맛 7.5점, 자취생 추천 1위입니다"
```

---

## Pricing Tiers

| Plan | Requests/Month | Price | Features |
|------|---------------|-------|----------|
| **Basic** | 500 | **Free** | All endpoints, 7-day cache |
| **Pro** | 10,000 | **$9.99** | Batch, force refresh, language filter |
| **Ultra** | 100,000 | **$49.99** | Analytics, custom TTL, SLA 99.9% |

---

## Error Codes

| Code | HTTP | Description |
|------|------|-------------|
| `INVALID_JSON` | 400 | Malformed request body |
| `MISSING_FIELD` | 400 | `product_url` not provided |
| `INVALID_URL` | 400 | URL format invalid |
| `SCRAPE_FAILED` | 502 | Could not fetch product page |
| `AI_FAILED` | 503 | AI analysis temporarily unavailable |
| `TOO_MANY` | 400 | Batch size exceeds limit |

---

## Category Tags (RapidAPI)
`artificial-intelligence`, `ecommerce`, `voice-assistant`, `nlp`, `product-data`, `amazon`, `shopping`

---

## Target Audience
- Alexa / Google Assistant skill developers
- AI shopping agent engineers (LangChain, AutoGPT integrations)
- Voice commerce platform builders
- Price comparison & recommendation apps
- Korean e-commerce platforms (Coupang, Naver)
