// Cloudflare Pages Function: Replicate API 프록시
// /api/replicate/* → https://api.replicate.com/*
export const onRequest: PagesFunction<{ REPLICATE_API_TOKEN: string }> = async (context) => {
  const { request, env, params } = context;
  const path = (params.path as string[]).join('/');
  const targetUrl = `https://api.replicate.com/${path}`;

  const headers = new Headers(request.headers);
  headers.set('Authorization', `Bearer ${env.REPLICATE_API_TOKEN}`);
  headers.delete('host');

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
