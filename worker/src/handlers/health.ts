// ─────────────────────────────────────────────────────
// Sensory-Check AI — /health Handler
// ─────────────────────────────────────────────────────
import type { Env, HealthResponse } from '../types.ts';
import { corsHeaders } from './analyze.ts';

export async function handleHealth(env: Env): Promise<Response> {
  const checks = await Promise.allSettled([
    checkKV(env),
    checkD1(env),
    checkAI(env),
  ]);

  const [kvResult, d1Result, aiResult] = checks;
  const services = {
    kv: kvResult.status === 'fulfilled' && kvResult.value ? 'ok' as const : 'error' as const,
    d1: d1Result.status === 'fulfilled' && d1Result.value ? 'ok' as const : 'error' as const,
    ai: aiResult.status === 'fulfilled' && aiResult.value ? 'ok' as const : 'error' as const,
  };

  const allOk = Object.values(services).every(s => s === 'ok');

  const body: HealthResponse = {
    status: allOk ? 'ok' : 'degraded',
    version: env.API_VERSION || '1.0.0',
    environment: env.ENVIRONMENT || 'production',
    services,
    timestamp: new Date().toISOString(),
  };

  return new Response(JSON.stringify(body), {
    status: allOk ? 200 : 207,
    headers: corsHeaders({ 'Content-Type': 'application/json' }),
  });
}

async function checkKV(env: Env): Promise<boolean> {
  try {
    await env.SENSORY_CACHE.put('__health__', '1', { expirationTtl: 60 });
    const val = await env.SENSORY_CACHE.get('__health__');
    return val === '1';
  } catch {
    return false;
  }
}

async function checkD1(env: Env): Promise<boolean> {
  try {
    await env.SENSORY_DB.prepare('SELECT 1').first();
    return true;
  } catch {
    return false;
  }
}

async function checkAI(env: Env): Promise<boolean> {
  try {
    // AI 바인딩 존재 확인 (실제 호출 없이)
    return typeof env.AI !== 'undefined';
  } catch {
    return false;
  }
}
