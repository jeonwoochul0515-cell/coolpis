import type { BusinessProfile } from '../types/profile';

const REPLICATE_API_TOKEN = import.meta.env.VITE_REPLICATE_API_TOKEN;

export async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function runOcr(imageDataUrl: string): Promise<string> {
  // Use Prefer: wait to get result in a single request (up to 60s)
  const res = await fetch('/api/replicate/v1/predictions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${REPLICATE_API_TOKEN}`,
      'Content-Type': 'application/json',
      'Prefer': 'wait=60',
    },
    body: JSON.stringify({
      version: 'cb3b474fbfc56b1664c8c7841550bccecbe7b74c30e45ce938ffca1180b4dff5',
      input: { image: imageDataUrl },
    }),
  });

  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      throw new Error('OCR API 인증에 실패했습니다. API 키를 확인하세요.');
    }
    if (res.status === 422) {
      throw new Error('이미지를 처리할 수 없습니다. 다른 이미지를 시도하세요.');
    }
    throw new Error('OCR 서버에 연결할 수 없습니다. 잠시 후 다시 시도하세요.');
  }

  const prediction = await res.json();

  if (prediction.status === 'failed') {
    throw new Error('텍스트 인식에 실패했습니다. 더 선명한 이미지로 다시 시도하세요.');
  }

  // If still processing (unlikely with Prefer: wait), fall back to polling
  if (prediction.status !== 'succeeded') {
    return await pollPrediction(prediction.id);
  }

  const output = prediction.output;
  return Array.isArray(output) ? output.join('') : String(output);
}

async function pollPrediction(id: string): Promise<string> {
  while (true) {
    await new Promise((r) => setTimeout(r, 1000));
    const res = await fetch(`/api/replicate/v1/predictions/${id}`, {
      headers: { 'Authorization': `Bearer ${REPLICATE_API_TOKEN}` },
    });
    const prediction = await res.json();
    if (prediction.status === 'succeeded') {
      const output = prediction.output;
      return Array.isArray(output) ? output.join('') : String(output);
    }
    if (prediction.status === 'failed') {
      throw new Error('텍스트 인식에 실패했습니다. 더 선명한 이미지로 다시 시도하세요.');
    }
  }
}

export function parseBusinessRegistration(text: string): Partial<BusinessProfile> {
  const result: Partial<BusinessProfile> = {};

  // 사업자등록번호 (XXX-XX-XXXXX 형태)
  const regNumMatch = text.match(/(\d{3}[-\s]?\d{2}[-\s]?\d{5})/);
  if (regNumMatch) {
    result.registrationNumber = regNumMatch[1].replace(/\s/g, '');
  }

  // 상호명 (상호 or 법인명 뒤)
  const businessNameMatch = text.match(/(?:상\s*호|법인명)[:\s]*([^\n\r|]+)/);
  if (businessNameMatch) {
    result.businessName = businessNameMatch[1].trim();
  }

  // 대표자
  const repMatch = text.match(/(?:대\s*표\s*자|성\s*명)[:\s]*([^\n\r|]+)/);
  if (repMatch) {
    result.representative = repMatch[1].trim();
  }

  // 업태
  const typeMatch = text.match(/업\s*태[:\s]*([^\n\r|]+)/);
  if (typeMatch) {
    result.businessType = typeMatch[1].trim();
  }

  // 종목
  const categoryMatch = text.match(/종\s*목[:\s]*([^\n\r|]+)/);
  if (categoryMatch) {
    result.businessCategory = categoryMatch[1].trim();
  }

  // 사업장 소재지
  const addressMatch = text.match(/(?:사업장\s*소재지|소\s*재\s*지|주\s*소)[:\s]*([^\n\r|]+)/);
  if (addressMatch) {
    result.address = addressMatch[1].trim();
  }

  return result;
}
