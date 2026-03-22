export interface BusinessProfile {
  businessName: string;     // 상호명
  representative: string;   // 대표자
  registrationNumber: string; // 사업자등록번호
  businessType: string;     // 업태
  businessCategory: string; // 종목
  address: string;          // 사업장 소재지
  phone: string;            // 전화번호 (수동 입력)
  registeredAt: string;     // 등록 일시
  creditLimit?: number;      // 외상 한도 (원)
  creditUsed?: number;       // 현재 외상 사용액 (원)
}
