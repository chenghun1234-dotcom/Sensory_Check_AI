// ─────────────────────────────────────────────────────
// Sensory-Check AI — Worker Entry Point (Router)
// ─────────────────────────────────────────────────────
import type { Env } from './types.ts';
import { handleAnalyze, handleBatchAnalyze, corsHeaders } from './handlers/analyze.ts';
import { handleHealth } from './handlers/health.ts';
import { handleDocs } from './handlers/docs.ts';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const { method, pathname } = { method: request.method, pathname: url.pathname };

    // ─── CORS Preflight ──────────────────────────────
    if (method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    // ─── Rate Limit Info Header ──────────────────────
    // RapidAPI handles rate limiting; we just add info headers

    // ─── Router ──────────────────────────────────────
    try {
      // GET / → Interactive API Documentation
      if (method === 'GET' && (pathname === '/' || pathname === '')) {
        return handleDocs();
      }

      // GET /health → Health Check
      if (method === 'GET' && pathname === '/health') {
        return handleHealth(env);
      }

      // POST /analyze → Single Product Analysis
      if (method === 'POST' && pathname === '/analyze') {
        return handleAnalyze(request, env);
      }

      // POST /analyze/batch → Batch Analysis
      if (method === 'POST' && pathname === '/analyze/batch') {
        return handleBatchAnalyze(request, env);
      }

      // GET /analyze → Usage Hint
      if (method === 'GET' && pathname === '/analyze') {
        return new Response(JSON.stringify({
          hint: 'Send a POST request with { "product_url": "..." }',
          docs: url.origin + '/',
        }), {
          status: 405,
          headers: corsHeaders({ 'Content-Type': 'application/json' }),
        });
      }

      // 404 Not Found
      return new Response(JSON.stringify({
        success: false,
        error: `Route not found: ${method} ${pathname}`,
        code: 'NOT_FOUND',
        docs: url.origin + '/',
      }), {
        status: 404,
        headers: corsHeaders({ 'Content-Type': 'application/json' }),
      });

    } catch (err) {
      // Unhandled Error Handling
      console.error('[Worker] Unhandled error:', err);
      return new Response(JSON.stringify({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
      }), {
        status: 500,
        headers: corsHeaders({ 'Content-Type': 'application/json' }),
      });
    }
  },
} satisfies ExportedHandler<Env>;
