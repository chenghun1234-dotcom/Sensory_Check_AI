// ─────────────────────────────────────────────────────
// Sensory-Check AI — Interactive API Docs Handler
// ─────────────────────────────────────────────────────
import { corsHeaders } from './analyze.ts';

export function handleDocs(): Response {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Sensory-Check AI API</title>
<style>
  :root {
    --bg: #0a0a0f;
    --surface: #13131f;
    --border: #1e1e3a;
    --accent: #7c3aed;
    --accent2: #06b6d4;
    --text: #e2e8f0;
    --muted: #64748b;
    --green: #10b981;
    --orange: #f59e0b;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: var(--bg); color: var(--text); font-family: 'Inter', system-ui, sans-serif; }
  .hero {
    background: linear-gradient(135deg, #0a0a0f 0%, #1a0533 50%, #0a0f1f 100%);
    border-bottom: 1px solid var(--border);
    padding: 60px 24px;
    text-align: center;
  }
  .logo { font-size: 48px; margin-bottom: 16px; }
  h1 { font-size: 2.5rem; font-weight: 800; 
    background: linear-gradient(135deg, #7c3aed, #06b6d4);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
  .subtitle { color: var(--muted); margin-top: 12px; font-size: 1.1rem; }
  .badges { display: flex; gap: 8px; justify-content: center; margin-top: 20px; flex-wrap: wrap; }
  .badge { padding: 4px 12px; border-radius: 999px; font-size: 0.75rem; font-weight: 600; }
  .badge-green { background: rgba(16,185,129,0.15); color: var(--green); border: 1px solid rgba(16,185,129,0.3); }
  .badge-purple { background: rgba(124,58,237,0.15); color: #a78bfa; border: 1px solid rgba(124,58,237,0.3); }
  .badge-blue { background: rgba(6,182,212,0.15); color: var(--accent2); border: 1px solid rgba(6,182,212,0.3); }
  .container { max-width: 960px; margin: 0 auto; padding: 48px 24px; }
  .section-title { font-size: 1.3rem; font-weight: 700; margin-bottom: 16px; color: var(--text); }
  .endpoint-card {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: 12px; padding: 24px; margin-bottom: 16px;
  }
  .method { display: inline-block; padding: 3px 10px; border-radius: 6px; font-size: 0.75rem; font-weight: 700; margin-right: 10px; }
  .method-post { background: rgba(124,58,237,0.2); color: #a78bfa; }
  .method-get { background: rgba(16,185,129,0.2); color: var(--green); }
  .path { font-family: monospace; font-size: 1rem; color: var(--accent2); }
  .desc { color: var(--muted); margin-top: 8px; font-size: 0.9rem; }
  pre {
    background: #080810; border: 1px solid var(--border);
    border-radius: 8px; padding: 20px; overflow-x: auto;
    font-family: 'Fira Code', 'Courier New', monospace;
    font-size: 0.82rem; line-height: 1.6; margin-top: 16px;
  }
  .key { color: #7dd3fc; }
  .string { color: #86efac; }
  .number { color: #fbbf24; }
  .null { color: var(--muted); }
  .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; margin-bottom: 40px; }
  .stat-card {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: 12px; padding: 20px; text-align: center;
  }
  .stat-value { font-size: 1.8rem; font-weight: 800; 
    background: linear-gradient(135deg, #7c3aed, #06b6d4);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
  .stat-label { color: var(--muted); font-size: 0.8rem; margin-top: 4px; }
  .pricing { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 40px; }
  .price-card {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: 12px; padding: 24px;
  }
  .price-card.featured { border-color: var(--accent); }
  .tier-name { font-weight: 700; font-size: 1rem; margin-bottom: 8px; }
  .tier-price { font-size: 1.6rem; font-weight: 800; color: var(--accent2); }
  .tier-price span { font-size: 0.85rem; color: var(--muted); }
  .tier-features { list-style: none; margin-top: 12px; }
  .tier-features li { color: var(--muted); font-size: 0.85rem; padding: 4px 0; }
  .tier-features li::before { content: "✓ "; color: var(--green); }
  hr { border: none; border-top: 1px solid var(--border); margin: 40px 0; }
  .footer { text-align: center; color: var(--muted); font-size: 0.85rem; padding: 40px 24px; border-top: 1px solid var(--border); }
</style>
</head>
<body>
<div class="hero">
  <div class="logo">🧠</div>
  <h1>Sensory-Check AI</h1>
  <p class="subtitle">Voice Shopping Sensory Profiling API · Quantifying taste, durability, and context</p>
  <div class="badges">
    <span class="badge badge-green">Free Tier Optimized</span>
    <span class="badge badge-purple">Powered by Llama 3.1</span>
    <span class="badge badge-blue">RapidAPI Listed</span>
  </div>
</div>

<div class="container">
  <!-- Stats -->
  <div class="stats">
    <div class="stat-card">
      <div class="stat-value">100K</div>
      <div class="stat-label">Free Requests / Day</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">5</div>
      <div class="stat-label">Sensory Metrics</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">&lt;200ms</div>
      <div class="stat-label">Avg Cache Response</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">7 Days</div>
      <div class="stat-label">Cache TTL</div>
    </div>
  </div>

  <!-- Endpoints -->
  <p class="section-title">📡 Endpoints</p>
  
  <div class="endpoint-card">
    <span class="method method-post">POST</span>
    <span class="path">/analyze</span>
    <p class="desc">Analyze a product URL and extract sensory profile (taste, durability, context, sensory summary, noise filter score)</p>
    <pre><span class="key">"product_url"</span>: <span class="string">"https://amazon.com/dp/B0XXXX"</span>,
<span class="key">"focus"</span>: [<span class="string">"taste"</span>, <span class="string">"durability"</span>, <span class="string">"context"</span>, <span class="string">"sensory"</span>, <span class="string">"all"</span>],
<span class="key">"language"</span>: <span class="string">"both"</span>,  <span class="null">// "ko" | "en" | "both"</span>
<span class="key">"force_refresh"</span>: <span class="null">false</span></pre>

    <pre><span class="null">// Response</span>
{
  <span class="key">"success"</span>: <span class="null">true</span>,
  <span class="key">"product_name"</span>: <span class="string">"Premium Fuji Apple 6-Pack"</span>,
  <span class="key">"product_type"</span>: <span class="string">"food"</span>,
  <span class="key">"sensory_scores"</span>: {
    <span class="key">"taste"</span>: {
      <span class="key">"sweetness"</span>: <span class="number">8.5</span>,
      <span class="key">"acidity"</span>: <span class="number">3.2</span>,
      <span class="key">"crunchiness"</span>: <span class="number">9.1</span>
    },
    <span class="key">"noise_filter"</span>: {
      <span class="key">"score"</span>: <span class="number">87</span>,
      <span class="key">"ad_review_ratio"</span>: <span class="number">0.08</span>
    }
  },
  <span class="key">"voice_summary"</span>: {
    <span class="key">"ko"</span>: <span class="string">"This apple has a sweetness score of 8.5 and a very crunchy texture."</span>,
    <span class="key">"en"</span>: <span class="string">"Highly sweet and crispy Fuji apple with 4.8 stars, perfect for gifts."</span>
  },
  <span class="key">"meta"</span>: { <span class="key">"cached"</span>: <span class="null">false</span>, <span class="key">"response_ms"</span>: <span class="number">1240</span> }
}</pre>
  </div>

  <div class="endpoint-card">
    <span class="method method-post">POST</span>
    <span class="path">/analyze/batch</span>
    <p class="desc">Analyze up to 5 products simultaneously. Cached results return in &lt;100ms per item.</p>
    <pre>{ <span class="key">"products"</span>: [{ <span class="key">"product_url"</span>: <span class="string">"..."</span> }, ...] }  <span class="null">// max 5</span></pre>
  </div>

  <div class="endpoint-card">
    <span class="method method-get">GET</span>
    <span class="path">/health</span>
    <p class="desc">Service health check — KV, D1, and AI binding status</p>
    <pre>{ <span class="key">"status"</span>: <span class="string">"ok"</span>, <span class="key">"services"</span>: { <span class="key">"kv"</span>: <span class="string">"ok"</span>, <span class="key">"d1"</span>: <span class="string">"ok"</span>, <span class="key">"ai"</span>: <span class="string">"ok"</span> } }</pre>
  </div>

  <hr>

  <!-- Pricing -->
  <p class="section-title">💳 Pricing (RapidAPI)</p>
  <div class="pricing">
    <div class="price-card">
      <div class="tier-name">🆓 Basic</div>
      <div class="tier-price">$0 <span>/ month</span></div>
      <ul class="tier-features">
        <li>500 requests/month</li>
        <li>All endpoints</li>
        <li>7-day cache</li>
      </ul>
    </div>
    <div class="price-card featured">
      <div class="tier-name">⚡ Pro</div>
      <div class="tier-price">$9.99 <span>/ month</span></div>
      <ul class="tier-features">
        <li>10,000 requests/month</li>
        <li>Batch endpoint</li>
        <li>Priority cache</li>
        <li>Ko + En summaries</li>
      </ul>
    </div>
    <div class="price-card">
      <div class="tier-name">🚀 Ultra</div>
      <div class="tier-price">$49.99 <span>/ month</span></div>
      <ul class="tier-features">
        <li>100,000 requests/month</li>
        <li>Force refresh</li>
        <li>Usage analytics</li>
        <li>SLA 99.9%</li>
      </ul>
    </div>
  </div>
</div>

<div class="footer">
  Built on Cloudflare Workers · Workers AI · D1 · KV · Fully Serverless Architecture<br>
  <a href="https://rapidapi.com" style="color: var(--accent2);">Available on RapidAPI</a>
</div>
</body>
</html>`;

  return new Response(html, {
    headers: { 'Content-Type': 'text/html;charset=UTF-8', ...corsHeaders() },
  });
}
