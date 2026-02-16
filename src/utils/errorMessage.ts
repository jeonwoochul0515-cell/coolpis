const firebaseErrorMap: Record<string, string> = {
  'permission-denied': '접근 권한이 없습니다. Firestore 보안 규칙을 확인하세요.',
  'not-found': '요청한 데이터를 찾을 수 없습니다.',
  'already-exists': '이미 존재하는 데이터입니다.',
  'resource-exhausted': '요청 한도를 초과했습니다. 잠시 후 다시 시도하세요.',
  'unavailable': '서버에 연결할 수 없습니다. 네트워크를 확인하세요.',
  'unauthenticated': '인증이 필요합니다. 페이지를 새로고침하세요.',
  'deadline-exceeded': '서버 응답 시간이 초과되었습니다. 다시 시도하세요.',
  'cancelled': '요청이 취소되었습니다.',
  'internal': '서버 내부 오류가 발생했습니다.',
  'invalid-argument': '잘못된 요청입니다.',
  'failed-precondition': '요청을 처리할 수 없는 상태입니다.',
  'unimplemented': '지원하지 않는 기능입니다.',
  'data-loss': '데이터 손실이 발생했습니다.',
  'out-of-range': '범위를 벗어난 요청입니다.',
  // Auth errors
  'auth/network-request-failed': '네트워크 연결에 실패했습니다.',
  'auth/too-many-requests': '요청이 너무 많습니다. 잠시 후 다시 시도하세요.',
  'auth/internal-error': '인증 서버 오류가 발생했습니다.',
};

export function getErrorMessage(err: unknown, fallback = '오류가 발생했습니다.'): string {
  if (err instanceof Error) {
    // Firebase error codes
    const codeMatch = err.message.match(/\(([^)]+)\)/);
    const code = codeMatch?.[1] || (err as { code?: string }).code;
    if (code && firebaseErrorMap[code]) {
      return firebaseErrorMap[code];
    }
    // Check code property directly
    const firebaseErr = err as { code?: string };
    if (firebaseErr.code && firebaseErrorMap[firebaseErr.code]) {
      return firebaseErrorMap[firebaseErr.code];
    }
  }
  return fallback;
}
