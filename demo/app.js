/* ════════════════════════════════════════════════════
   Sensory-Check AI — Demo App JavaScript
   Full UI interaction implementation with mock API responses
   After deployment: Replace API_BASE with Worker URL
   ════════════════════════════════════════════════════ */

'use strict';

// ── Settings ────────────────────────────────────────────
const API_BASE = 'https://sensory-check-ai.workers.dev'; // Update after deployment
const USE_MOCK = true; // Use mock data for demo

// ── DOM References ─────────────────────────────────────────
const urlInput      = document.getElementById('product-url');
const analyzeBtn    = document.getElementById('analyze-btn');
const btnText       = document.getElementById('btn-text');
const btnSpinner    = document.getElementById('btn-spinner');
const resultPanel   = document.getElementById('result-panel');
const resultPlaceholder = document.getElementById('result-placeholder');
const resultContent = document.getElementById('result-content');
const jsonSection   = document.getElementById('json-section');
const jsonToggle    = document.getElementById('json-toggle');
const jsonOutput    = document.getElementById('json-output');
const exampleBtns   = document.querySelectorAll('.example-btn');
const codeTabs      = document.querySelectorAll('.code-tab');

// ── Background Canvas Particles ───────────────────────────────
(function initCanvas() {
  const canvas = document.getElementById('bgCanvas');
  const ctx = canvas.getContext('2d');
  let particles = [];
  
  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  class Particle {
    constructor() { this.reset(); }
    reset() {
      this.x = Math.random() * canvas.width;
      this.y = Math.random() * canvas.height;
      this.r = Math.random() * 1.5 + 0.3;
      this.alpha = Math.random() * 0.5 + 0.1;
      this.vx = (Math.random() - 0.5) * 0.2;
      this.vy = (Math.random() - 0.5) * 0.2;
      this.hue = Math.random() > 0.5 ? 260 : 190; // purple or cyan
    }
    update() {
      this.x += this.vx; this.y += this.vy;
      if (this.x < 0 || this.x > canvas.width || this.y < 0 || this.y > canvas.height) this.reset();
    }
    draw() {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${this.hue}, 80%, 70%, ${this.alpha})`;
      ctx.fill();
    }
  }

  for (let i = 0; i < 120; i++) particles.push(new Particle());

  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => { p.update(); p.draw(); });
    requestAnimationFrame(animate);
  }
  animate();
})();

// ── Example Buttons ─────────────────────────────────────────
exampleBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    exampleBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    urlInput.value = btn.dataset.url;
    
    // Update focus checkboxes
    const focusList = (btn.dataset.focus || 'taste').split(',');
    document.querySelectorAll('input[name="focus"]').forEach(cb => {
      cb.checked = focusList.includes(cb.value) || focusList.includes('all');
    });
  });
});

// ── Analysis Button ─────────────────────────────────────────
analyzeBtn.addEventListener('click', runAnalysis);
urlInput.addEventListener('keydown', e => { if (e.key === 'Enter') runAnalysis(); });

async function runAnalysis() {
  const url = urlInput.value.trim();
  if (!url) { urlInput.focus(); return; }

  const focusChecked = [...document.querySelectorAll('input[name="focus"]:checked')]
    .map(cb => cb.value);
  const focus = focusChecked.length ? focusChecked : ['all'];

  // Loading state
  setLoading(true);

  try {
    let data;
    if (USE_MOCK) {
      await delay(1400 + Math.random() * 600); // Realistic delay
      data = generateMockResponse(url, focus);
    } else {
      const res = await fetch(`${API_BASE}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_url: url, focus, language: 'both' }),
      });
      data = await res.json();
    }

    renderResult(data);
    showJsonSection(data);
  } catch (err) {
    renderError(err.message);
  } finally {
    setLoading(false);
  }
}

// ── Mock Response Generator ──────────────────────────────────
function generateMockResponse(url, focus) {
  const isFuji   = url.includes('B08N5WRWNW') || url.includes('apple');
  const isSony   = url.includes('B09V3KXJPB') || url.includes('headphone');
  const isBento  = url.includes('bento') || url.includes('lunchbox');
  const isCamping = url.includes('B0BSHF7WHW') || url.includes('chair');

  const templates = {
    fuji: {
      product_name: 'Premium Fuji Apple 6-Pack',
      product_type: 'food',
      avg_rating: 4.8,
      review_count: 2847,
      sensory_scores: {
        taste: { sweetness: 8.5, acidity: 3.2, crunchiness: 9.1, richness: 7.0, spiciness: null },
        context: {
          primary_use: 'Premium fruit gift set',
          scenarios: ['Gifting', 'Breakfast', 'Snack', 'Dieting', 'Lunchbox'],
          best_for: 'Health-conscious individuals, high-end gifting',
          not_for: ['Sour fruit lovers', 'Soft fruit enthusiasts'],
        },
        sensory: {
          texture: 'Firm and satisfying crunch',
          visual: 'Deep red matte finish',
          weight_perception: 'Medium',
          summary: 'A top-tier Fuji apple with a brisk crunch and abundant juice.',
        },
        noise_filter: { score: 92, filtered_reviews: 127, total_reviews: 2847, ad_review_ratio: 0.04 },
      },
      voice_summary: {
        ko: '이 사과는 당도 8.5점으로 매우 아삭한 식감입니다. 리뷰 신뢰도 92점으로 선물용으로 최적입니다.',
        en: 'Highly sweet (8.5/10) and extremely crispy Fuji apple with 92% review reliability. Perfect for gifts.',
      },
    },
    sony: {
      product_name: 'Sony WH-1000XM5 Wireless Headphones',
      product_type: 'electronics',
      avg_rating: 4.6,
      review_count: 18432,
      sensory_scores: {
        durability: {
          grade: 'B',
          score: 78,
          positive_keywords: ['solid', 'well-built', 'durable', 'robust'],
          negative_keywords: ['plastic creak', 'hinge wear'],
          confidence: 88,
        },
        context: {
          primary_use: 'Long-distance commuting with noise cancellation',
          scenarios: ['Remote work', 'Flight travel', 'Cafe work', 'Exercise'],
          best_for: 'Commuters, remote workers',
          not_for: ['Intense sports', 'Rugged outdoor use'],
        },
        sensory: {
          texture: 'Soft synthetic leather earpads',
          visual: 'Matte black minimal design',
          weight_perception: 'Light',
          summary: 'Premium headphones with a light, soft fit that remains comfortable for long sessions.',
        },
        noise_filter: { score: 85, filtered_reviews: 1205, total_reviews: 18432, ad_review_ratio: 0.07 },
      },
      voice_summary: {
        ko: '소니 WH-1000XM5는 내구성 B등급으로 재택근무 및 출퇴근에 최적화된 노이즈 캔슬링 헤드폰입니다.',
        en: 'Sony WH-1000XM5 has durability grade B, ideal for remote work and commuting with excellent noise cancelling.',
      },
    },
    bento: {
      product_name: 'Convenience Store Bento - Spicy Bulgogi Box',
      product_type: 'food',
      avg_rating: 4.2,
      review_count: 512,
      sensory_scores: {
        taste: { sweetness: 4.5, acidity: 2.0, crunchiness: 5.5, richness: 7.8, spiciness: 7.5 },
        context: {
          primary_use: 'Quick meal for solo living',
          scenarios: ['Solo meal', 'Quick lunch', 'Late night snack', 'Value meal'],
          best_for: 'Busy students, quick dining',
          not_for: ['People sensitive to spice', 'Strict dieters'],
        },
        sensory: {
          texture: 'Chewy texture of bulgogi beef',
          visual: 'Vivid red spicy sauce',
          weight_perception: 'Medium',
          summary: 'A high-value convenience box featuring spicy-sweet bulgogi that pairs perfectly with rice.',
        },
        noise_filter: { score: 78, filtered_reviews: 43, total_reviews: 512, ad_review_ratio: 0.08 },
      },
      voice_summary: {
        ko: '매콤함 7.5점의 불고기 도시락으로 자취생에게 최적입니다. 리뷰 신뢰도 78점, 가성비 최고.',
        en: 'Spicy beef bulgogi lunchbox (7.5/10 spiciness), perfect for quick solo meals. Good value for money.',
      },
    },
    camping: {
      product_name: 'Helinox Chair One Ultralight Camping Chair',
      product_type: 'general',
      avg_rating: 4.7,
      review_count: 5621,
      sensory_scores: {
        durability: {
          grade: 'A',
          score: 91,
          positive_keywords: ['durable', 'sturdy', 'solid', 'long-lasting'],
          negative_keywords: ['fabric wear'],
          confidence: 94,
        },
        context: {
          primary_use: 'Camping and outdoor activities',
          scenarios: ['Backpacking', 'Camping', 'Festival', 'Fishing', 'Beach'],
          best_for: 'Campers preferring ultralight gear',
          not_for: ['Weight over 100kg', 'Indoor use only'],
        },
        sensory: {
          texture: 'Smooth polyester seat',
          visual: 'Lightweight aluminum frame',
          weight_perception: 'Ultralight',
          summary: 'Palm-sized when packed but boasts exceptional 91-point durability for serious outdoor use.',
        },
        noise_filter: { score: 89, filtered_reviews: 312, total_reviews: 5621, ad_review_ratio: 0.06 },
      },
      voice_summary: {
        ko: '헬리녹스 체어원은 내구성 A등급으로 캠핑과 백패킹에 완벽한 초경량 의자입니다.',
        en: 'Helinox Chair One earns durability grade A, perfect ultralight chair for camping and backpacking.',
      },
    },
  };

  const base = isFuji ? templates.fuji
    : isSony    ? templates.sony
    : isBento   ? templates.bento
    : isCamping ? templates.camping
    : templates.fuji;

  return {
    success: true,
    product_id: hashStr(url),
    product_url: url,
    ...base,
    meta: {
      cached: Math.random() > 0.6,
      analyzed_at: new Date().toISOString(),
      analysis_version: '1.0.0',
      response_ms: Math.round(800 + Math.random() * 600),
    },
  };
}

// ── Result Rendering ───────────────────────────────────────
function renderResult(data) {
  if (!data.success) { renderError(data.error); return; }
  
  resultPlaceholder.classList.add('hidden');
  resultContent.classList.remove('hidden');
  resultContent.classList.add('fade-in');

  const s = data.sensory_scores || {};
  let html = '';

  // Product Header
  html += `
    <div class="product-header">
      <div class="product-name">${escHtml(data.product_name)}</div>
      <div class="product-meta">
        ${data.avg_rating ? `⭐ ${data.avg_rating.toFixed(1)}` : ''}
        ${data.review_count ? ` · ${data.review_count.toLocaleString()} reviews` : ''}
        · <span class="product-type-badge">${typeEmoji(data.product_type)} ${data.product_type}</span>
        <span class="cache-badge ${data.meta.cached ? 'cache-hit' : 'cache-miss'}">
          ${data.meta.cached ? '⚡ Cache HIT' : '🔄 New Analysis'}
        </span>
        <span style="font-size:0.72rem;color:var(--text-3)">${data.meta.response_ms}ms</span>
      </div>
    </div>
  `;

  // Taste Profile
  if (s.taste) {
    html += `<div class="score-section">
      <div class="score-label">🍯 Taste Profile</div>`;
    const tasteFields = [
      ['sweetness', 'Sweetness'],
      ['acidity', 'Acidity'],
      ['crunchiness', 'Crunchiness'],
      ['richness', 'Richness'],
      ['spiciness', 'Spiciness'],
    ];
    tasteFields.forEach(([key, label]) => {
      if (s.taste[key] != null) {
        html += scoreBar(label, s.taste[key], 10);
      }
    });
    html += `</div>`;
  }

  // Durability
  if (s.durability) {
    html += `<div class="score-section">
      <div class="score-label">🔩 Durability Index</div>
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px;">
        <span class="grade-badge grade-${s.durability.grade}">${s.durability.grade}</span>
        ${scoreBar('', s.durability.score, 100, true)}
      </div>
      ${s.durability.positive_keywords.length ? `<div style="font-size:0.75rem;color:var(--green)">✓ ${s.durability.positive_keywords.slice(0,4).join(', ')}</div>` : ''}
      ${s.durability.negative_keywords.length ? `<div style="font-size:0.75rem;color:var(--red);margin-top:4px">✗ ${s.durability.negative_keywords.slice(0,3).join(', ')}</div>` : ''}
    </div>`;
  }

  // Context Match
  if (s.context) {
    html += `<div class="score-section">
      <div class="score-label">🎯 Usage Context</div>
      <div style="margin-bottom:8px;font-size:0.85rem;color:var(--text-2)">${escHtml(s.context.primary_use)}</div>
      <div class="context-tags">
        ${s.context.scenarios.map(t => `<span class="context-tag">${escHtml(t)}</span>`).join('')}
      </div>
    </div>`;
  }

  // Sensory Summary
  if (s.sensory) {
    html += `<div class="score-section">
      <div class="score-label">👆 Sensory Summary</div>
      <div style="font-size:0.82rem;color:var(--text-2);line-height:1.7">
        ${s.sensory.texture ? `<span style="color:var(--cyan)">Texture</span>: ${escHtml(s.sensory.texture)}<br>` : ''}
        ${s.sensory.visual  ? `<span style="color:var(--cyan)">Appearance</span>: ${escHtml(s.sensory.visual)}<br>` : ''}
        ${s.sensory.weight_perception ? `<span style="color:var(--cyan)">Weight</span>: ${escHtml(s.sensory.weight_perception)}` : ''}
      </div>
    </div>`;
  }

  // Noise Filter
  if (s.noise_filter) {
    html += `<div class="score-section">
      <div class="score-label">🧹 Review Reliability</div>
      ${scoreBar('Reliability', s.noise_filter.score, 100, true)}
      <div style="font-size:0.73rem;color:var(--text-3);margin-top:4px">
        ${Math.round(s.noise_filter.ad_review_ratio * 100)}% promotional reviews filtered · 
        ${(s.noise_filter.total_reviews - s.noise_filter.filtered_reviews).toLocaleString()} valid reviews
      </div>
    </div>`;
  }

  // Voice Summary
  if (data.voice_summary?.en) {
    html += `
      <div class="voice-summary">
        <div class="voice-summary-label">🎙️ Voice Assistant Summary (Alexa / AI Agent)</div>
        <div id="voice-text-en">${escHtml(data.voice_summary.en)}</div>
        <button class="tts-btn" id="tts-btn" onclick="speakText('${escAttr(data.voice_summary.en)}')">
          🔊 Listen in English
        </button>
      </div>
    `;
  }

  resultContent.innerHTML = html;

  // Score bar animation
  requestAnimationFrame(() => {
    document.querySelectorAll('.score-bar-fill[data-target]').forEach(bar => {
      const target = parseFloat(bar.dataset.target);
      bar.style.width = target + '%';
    });
  });
}

function scoreBar(label, value, max, inline = false) {
  const pct = Math.min(100, (value / max) * 100).toFixed(1);
  const displayValue = max === 10 ? value.toFixed(1) : Math.round(value);
  if (inline) {
    return `<div class="score-bar-bg" style="flex:1"><div class="score-bar-fill" style="width:0%" data-target="${pct}"></div></div>
            <span class="score-value">${displayValue}</span>`;
  }
  return `
    <div class="score-row">
      <span class="score-name">${label}</span>
      <div class="score-bar-bg"><div class="score-bar-fill" style="width:0%" data-target="${pct}"></div></div>
      <span class="score-value">${displayValue}</span>
    </div>`;
}

function renderError(msg) {
  resultPlaceholder.classList.add('hidden');
  resultContent.classList.remove('hidden');
  resultContent.innerHTML = `
    <div style="text-align:center;padding:40px;color:var(--red)">
      <div style="font-size:2rem;margin-bottom:12px">⚠️</div>
      <div style="font-weight:600;margin-bottom:8px">Analysis Failed</div>
      <div style="font-size:0.85rem;color:var(--text-2)">${escHtml(msg)}</div>
    </div>
  `;
}

// ── JSON Toggle ─────────────────────────────────────────
function showJsonSection(data) {
  jsonSection.classList.remove('hidden');
  jsonOutput.textContent = JSON.stringify(data, null, 2);
  jsonOutput.classList.add('hidden');
  jsonToggle.setAttribute('aria-expanded', 'false');
  jsonToggle.querySelector('.chevron').classList.remove('open');
}

jsonToggle.addEventListener('click', () => {
  const isHidden = jsonOutput.classList.toggle('hidden');
  jsonToggle.setAttribute('aria-expanded', String(!isHidden));
  jsonToggle.querySelector('.chevron').classList.toggle('open', !isHidden);
});

// ── TTS ───────────────────────────────────────────────
window.speakText = function(text) {
  if (!window.speechSynthesis) return;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-US';
  utterance.rate = 0.95;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
};

// ── Code Tabs ───────────────────────────────────────────
codeTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    codeTabs.forEach(t => { t.classList.remove('active'); t.setAttribute('aria-selected', 'false'); });
    tab.classList.add('active');
    tab.setAttribute('aria-selected', 'true');
    
    const panelId = tab.getAttribute('aria-controls');
    document.querySelectorAll('.code-panel').forEach(p => p.classList.remove('active'));
    document.getElementById(panelId).classList.add('active');
  });
});

// ── Utilities ──────────────────────────────────────────────
function setLoading(on) {
  analyzeBtn.disabled = on;
  btnText.textContent = on ? 'Analyzing...' : 'Start AI Analysis';
  btnSpinner.classList.toggle('hidden', !on);
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

function escHtml(str) {
  return String(str ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function escAttr(str) {
  return String(str ?? '').replace(/'/g, '\\\'').replace(/"/g, '&quot;');
}

function hashStr(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = (h * 16777619) >>> 0; }
  return h.toString(16).padStart(8, '0');
}

function typeEmoji(type) {
  return { food: '🍎', electronics: '🔌', beauty: '💄', fashion: '👗', general: '📦' }[type] || '📦';
}

// ── Scroll Intersection Observer ────────────────────────────
const observer = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) e.target.classList.add('fade-in');
  });
}, { threshold: 0.1 });

document.querySelectorAll('.arch-step, .price-card, .endpoint-card').forEach(el => observer.observe(el));

// ── Initial Run ─────────────────────────────────────────
// Auto-select first example
document.getElementById('example-apple')?.click();
