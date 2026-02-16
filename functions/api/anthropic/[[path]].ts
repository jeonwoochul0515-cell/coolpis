// Cloudflare Pages Function: Anthropic API 프록시
// /api/anthropic/* → https://api.anthropic.com/*
export const onRequest: PagesFunction<{ ANTHROPIC_API_KEY: string }> = async (context) => {
  const { request, env, params } = context;

  // CORS preflight 처리
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
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
  responseHeaders.set('Access-Control-Allow-Origin', '*');

  return new Response(response.body, {
    status: response.status,
    headers: responseHeaders,
  });
};
