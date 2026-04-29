# 🧠 Sensory-Check AI

> **Product Sensory Profiling API for Voice Commerce**  
> Voice Shopping Sensory Profiling API — Optimized for Cloudflare Free Tier

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-F38020?logo=cloudflare)](https://workers.cloudflare.com)
[![RapidAPI](https://img.shields.io/badge/RapidAPI-Listed-0055DA)](https://rapidapi.com)

---

## 📖 Overview

When a user asks a voice assistant like Alexa, **"Is this apple good?"**,  
Instead of listing generic reviews, this API returns **structured sensory data**:

```json
{
  "sweetness": 8.5,
  "crunchiness": 9.1,
  "voice_summary": {
    "ko": "이 사과는 당도 8.5점으로 매우 아삭한 식감입니다. 선물용 최적입니다.",
    "en": "Highly sweet (8.5/10) and extremely crispy. Perfect for gifting."
  }
}
```

---

## 🚀 Features

| Metric | Description |
|------|------|
| 🍯 **Taste Profile** | Quantifies sweetness, acidity, texture, and spiciness (1-10) |
| 🔩 **Durability Index** | Review-based durability grade (A-F) and score |
| 🎯 **Context Match** | Automated tagging for best-use scenarios (e.g., camping, gifting) |
| 👆 **Sensory Summary** | 1-sentence tactile/visual physical description |
| 🧹 **Noise Filter** | Reliability score after filtering promotional/low-quality reviews |

---

## 💰 Zero-Cost Infrastructure Architecture

```
Request → Cloudflare Workers (100K/day FREE)
             ↓
         KV Cache → 7일 캐시 히트 → <10ms 응답
             ↓ (캐시 미스)
         HTML 스크래핑 (Open Graph / JSON-LD)
             ↓
         Workers AI → Llama 3.1 8B (FREE tier)
             ↓
         D1 SQLite → 영구 저장 (5GB FREE)
             ↓
         Return JSON Response
```

| Service | Free Limit | Est. Usage | Cost |
|--------|----------|-----------|------|
| CF Workers | 100,000 req/day | ~3,000 req/day | **Included** |
| CF Workers AI | 10,000 neurons/day | ~5,000 neurons/day | **Included** |
| CF D1 SQLite | 5GB / 5M rows | ~50K rows/month | **Included** |
| CF KV | 100,000 reads/day | ~2,000 reads/day | **Included** |
| **Strategy** | | | **Cloudflare Free Tier Optimized** |

---

## 📁 Project Structure

```
Sensory-Check AI/
├── worker/                    ← Cloudflare Worker (TypeScript)
│   ├── src/
│   │   ├── index.ts           ← 라우터
│   │   ├── types.ts           ← 타입 정의
│   │   ├── handlers/
│   │   │   ├── analyze.ts     ← POST /analyze
│   │   │   ├── health.ts      ← GET /health
│   │   │   └── docs.ts        ← GET / 문서 페이지
│   │   └── services/
│   │       ├── cache.ts       ← KV + D1 캐시
│   │       ├── scraper.ts     ← 메타데이터 스크래핑
│   │       └── aiAnalyzer.ts  ← Workers AI 분석
│   ├── wrangler.toml
│   └── package.json
│
├── demo/                      ← 데모 웹페이지
│   ├── index.html
│   ├── style.css
│   └── app.js
│
├── schema/
│   └── d1_init.sql            ← D1 스키마
│
└── docs/
    └── rapidapi_listing.md   ← RapidAPI 등록 문서 (영문)
```

---

## ⚡ Deployment Guide

### 1. Prerequisites
```bash
npm install -g wrangler
wrangler login
```

### 2. Install Dependencies
```bash
cd worker
npm install
```

### 3. Create Cloudflare Resources
```bash
# Create KV Namespace
wrangler kv namespace create sensory-cache
# → Copy the ID to wrangler.toml [SENSORY_CACHE]

# Create D1 Database
wrangler d1 create sensory-check-db
# → Copy the database_id to wrangler.toml [SENSORY_DB]

# Initialize Database Schema
npm run db:init
```

### 4. wrangler.toml 업데이트
```toml
[[kv_namespaces]]
binding = "SENSORY_CACHE"
id = "YOUR_KV_ID_HERE"

[[d1_databases]]
binding = "SENSORY_DB"
database_name = "sensory-check-db"
database_id = "YOUR_D1_ID_HERE"
```

### 5. Deployment
```bash
# 개발 서버
npm run dev

# 프로덕션 배포
npm run deploy
```

### 6. Run Demo Page
```bash
# Open demo/ folder with a local server
cd demo
npx serve .
# Visit http://localhost:3000
```

---

## 🧪 API 테스트

```bash
# Single Analysis
curl -X POST https://sensory-check-ai.workers.dev/analyze \
  -H 'Content-Type: application/json' \
  -d '{"product_url": "https://amazon.com/dp/B08N5WRWNW", "focus": ["taste"]}'

# Health Check
curl https://sensory-check-ai.workers.dev/health

# Batch Analysis
curl -X POST https://sensory-check-ai.workers.dev/analyze/batch \
  -H 'Content-Type: application/json' \
  -d '{"products": [{"product_url": "https://amazon.com/dp/B08N5WRWNW"}]}'
```

---

## 📋 RapidAPI Listing

1. See [docs/rapidapi_listing.md](docs/rapidapi_listing.md) for full content.
2. Register your API at [RapidAPI Provider](https://rapidapi.com/provider).
3. Base URL: `https://sensory-check-ai.workers.dev`
4. Plans: Basic (Free) / Pro ($9.99) / Ultra ($49.99)

---

## 🤝 Integration Examples

### Integration Idea: Food Recommendation
```
"지금 가장 매콤하고 가성비 좋은 도시락 찾아줘"
→ /analyze/batch → spiciness > 7 필터링 → 상위 3개 반환
→ "치킨마요 도시락은 매운맛 7.5점, 자취생 추천 1위입니다"
```

### Alexa Skill 연계
```javascript
const result = await analyze({ product_url, focus: ['taste', 'context'], language: 'ko' });
alexa.speak(result.voice_summary.ko);
```

---

## 📄 License

MIT License — Free to use, modify, and distribute.
