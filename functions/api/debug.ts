// 임시 디버깅: 환경변수 확인용 (확인 후 삭제)
export const onRequest: PagesFunction<{ ANTHROPIC_API_KEY: string }> = async (context) => {
  const key = context.env.ANTHROPIC_API_KEY ?? '(undefined)';
  const allKeys = Object.keys(context.env);
  return new Response(JSON.stringify({
    keyExists: !!context.env.ANTHROPIC_API_KEY,
    keyPrefix: key.slice(0, 10) + '...',
    keyLength: key.length,
    envKeys: allKeys,
  }, null, 2), {
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  });
};
