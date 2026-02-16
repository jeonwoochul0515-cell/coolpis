import type { BusinessProfile } from '../types/profile';

export async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/** Claude Haiku로 사업자등록증 이미지에서 정보 추출 (OCR + 파싱 동시) */
export async function extractBusinessInfo(
  imageDataUrl: string
): Promise<Partial<BusinessProfile>> {
  // data:image/jpeg;base64,XXXX → mediaType + base64 분리
  const match = imageDataUrl.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
  if (!match) throw new Error('이미지 형식이 올바르지 않습니다.');

  const mediaType = match[1] as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';
  const base64Data = match[2];

  const res = await fetch('/api/anthropic/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mediaType, data: base64Data },
            },
            {
              type: 'text',
              text: `이 사업자등록증 이미지에서 아래 정보를 추출하여 JSON만 반환하세요. 값이 없으면 빈 문자열로 채우세요.
{
  "registrationNumber": "000-00-00000",
  "businessName": "",
  "representative": "",
  "businessType": "",
  "businessCategory": "",
  "address": ""
}`,
            },
          ],
        },
      ],
    }),
  });

  if (!res.ok) {
    const errorBody = await res.text().catch(() => '');
    console.error('Anthropic API 에러:', res.status, errorBody);
    if (res.status === 401 || res.status === 403) {
      throw new Error('OCR API 인증에 실패했습니다. API 키를 확인하세요.');
    }
    throw new Error('OCR 서버에 연결할 수 없습니다. 잠시 후 다시 시도하세요.');
  }

  const data = await res.json();
  const text: string = data.content?.[0]?.text ?? '';

  // JSON 블록 추출
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('텍스트 인식에 실패했습니다. 더 선명한 이미지로 다시 시도하세요.');
  }

  const parsed = JSON.parse(jsonMatch[0]) as Partial<BusinessProfile>;
  return parsed;
}
