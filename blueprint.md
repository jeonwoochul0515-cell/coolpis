# Coolpis Wholesale Order App Blueprint

## 1. 개요 (Overview)

간단한 쿨피스 도매 주문을 위한 React 기반 웹 어플리케이션입니다. 사업자등록증을 OCR로 자동 인식하여 프로필을 생성합니다. 사용자는 제품을 보고 장바구니에 담아 주문할 수 있으며, 관리자는 Firebase 콘솔을 통해 주문을 관리합니다. (로그인 기능은 추후 추가 예정)

---

## 2. 프로젝트 설계 (Project Outline)

### 주요 기능 (Features)
- **사용자 인증:** 추후 추가 예정
- **프로필 자동 생성:** 한국 사업자등록증을 촬영/업로드하면 OCR 기술로 정보를 자동 추출하여 프로필 생성 (전화번호는 별도 입력)
- **제품 카탈로그:** 다양한 쿨피스 박스 단위 제품을 이미지와 함께 조회
- **장바구니:** 원하는 상품의 수량을 입력하여 장바구니에 추가 (사운드 효과 포함)
- **주문 관리:** 장바구니에서 최종 주문을 제출하고, 관리자는 Firebase 콘솔에서 주문 내역을 확인 및 처리

### 기술 스택 (Technology Stack)
- **프론트엔드:** React, TypeScript, Vite
- **UI 라이브러리:** MUI (Material-UI)
- **상태 관리:** React Context API 또는 Zustand
- **라우팅:** `react-router-dom`
- **백엔드:** Firebase
  - **Authentication:** 추후 추가 예정
  - **Firestore:** 사용자 프로필, 제품, 주문 데이터 저장
  - **Storage:** 사업자등록증 이미지 파일 저장
  - **Cloud Functions:** OCR 실행 등 서버 로직 수행
- **외부 서비스:**
  - **Google Cloud Vision API:** 사업자등록증 OCR

### 디자인 컨셉 (Design Concept)
- MUI를 기반으로 한 모던하고 깔끔한 디자인
- 모바일과 웹 환경에 모두 대응하는 반응형 UI
- 직관적인 사용자 경험(UX)을 제공하여 누구나 쉽게 사용 가능

---

## 3. 현재 진행 계획 (Current Task Plan)

### 1단계: 환경 설정 및 Firebase 연동
- [x] Firebase 프로젝트 생성 및 웹 앱 구성
- [x] Firestore, Storage, Cloud Functions 서비스 활성화
- [x] `npm`을 통해 `firebase`, `@mui/material`, `react-router-dom` 등 주요 라이브러리 설치
- [x] Firebase 초기화 설정 파일 (`firebase.js` 또는 `firebase.ts`) 생성

### 2단계: 프로필 생성 (OCR)
- [x] Replicate API (deepseek-ocr) 연동 (Vite 프록시로 CORS 해결)
- [x] 이미지 업로드/카메라 촬영 UI 컴포넌트 개발
- [x] OCR 결과 파싱 + 사업자 정보 자동 입력 폼
- [x] 프로필 저장 (localStorage) + 미등록 시 자동 리다이렉트

### 3단계: 핵심 기능 개발
- [x] Firestore에 `products` 데이터 구조 설계 및 샘플 데이터 입력
- [x] 제품 목록을 표시하는 메인 페이지 UI 개발
- [x] 수량 입력 및 장바구니 추가/삭제 기능 구현 (상태 관리 포함)
- [x] 장바구니 페이지 UI 및 주문 제출 기능 개발

### 4단계: 사용자 인증
- [ ] 로그인 방식 결정 및 구현 (추후 진행)

### 5단계: 마무리
- [ ] 전체적인 스타일링 및 반응형 디자인 점검
- [ ] 사용자 플로우 테스트 및 버그 수정
