// Cloudflare Pages Function: Anthropic API 프록시
// /api/anthropic/* → https://api.anthropic.com/*

interface Env {
  ANTHROPIC_API_KEY: string;
  ALLOWED_ORIGINS?: string;
}

/** 요청 Origin이 허용 목록에 포함되는지 확인 */
function isOriginAllowed(origin: string | null, env: Env): boolean {
  if (!origin) return false;

  // 기본 허용 도메인
  const allowed: string[] = [
    'https://coolpis.pages.dev',
  ];

  // 환경변수로 추가 허용 도메인
  if (env.ALLOWED_ORIGINS) {
    const extras = env.ALLOWED_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean);
    allowed.push(...extras);
  }

  // localhost는 모든 포트 허용 (http/https)
  if (/^https?:\/\/localhost(:\d+)?$/.test(origin)) {
    return true;
  }

  return allowed.includes(origin);
}

/** 허용된 Origin이면 CORS 헤더를 붙여 반환, 아니면 빈 Headers */
function corsHeaders(origin: string | null, env: Env): Headers {
  const headers = new Headers();
  headers.set('Vary', 'Origin');

  if (origin && isOriginAllowed(origin, env)) {
    headers.set('Access-Control-Allow-Origin', origin);
    headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    headers.set('Access-Control-Allow-Headers', 'Content-Type');
  }

  return headers;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env, params } = context;
  const origin = request.headers.get('Origin');

  // CORS preflight 처리
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders(origin, env),
    });
  }

  const path = (params.path as string[]).join('/');
  const targetUrl = `https://api.anthropic.com/${path}`;

  const headers = new Headers();
  headers.set('Content-Type', 'application/json');
  headers.set('x-api-key', env.ANTHROPIC_API_KEY);
  headers.set('anthropic-version', '2023-06-01');

  const response = await fetch(targetUrl, {
    method: request.method,
    headers,
    body: request.method !== 'GET' ? request.body : undefined,
  });

  const responseHeaders = new Headers(response.headers);
  // CORS 헤더 적용 (허용된 Origin만)
  const cors = corsHeaders(origin, env);
  cors.forEach((value, key) => {
    responseHeaders.set(key, value);
  });

  return new Response(response.body, {
    status: response.status,
    headers: responseHeaders,
  });
};
