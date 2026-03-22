/**
 * 배송 예상 도착 시간(ETA) 계산 유틸리티.
 * 각 배송에 평균 20분이 소요된다고 가정하고,
 * 배송순서(deliverySequence) x 20분을 시작 시간에 더하여 예상 시간을 반환한다.
 */

/**
 * 배송순서와 전체 주문 수를 기반으로 예상 도착 시간을 계산한다.
 *
 * @param deliverySequence - 해당 주문의 배송순서 (1부터 시작)
 * @param totalOrders - 전체 주문 수 (현재 사용하지 않지만 향후 확장을 위해 유지)
 * @param startHour - 배송 시작 시간 (24시간제, 기본값 8 = 오전 8시)
 * @returns "오전 9:40" 또는 "오후 2:20" 형식의 문자열
 */
export function estimateEta(
  deliverySequence: number,
  _totalOrders?: number,
  startHour: number = 8,
): string {
  const MINUTES_PER_DELIVERY = 20;
  const totalMinutes = startHour * 60 + deliverySequence * MINUTES_PER_DELIVERY;

  const hours = Math.floor(totalMinutes / 60) % 24;
  const minutes = totalMinutes % 60;

  const period = hours < 12 ? '오전' : '오후';
  const displayHour = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  const displayMinute = minutes.toString().padStart(2, '0');

  return `${period} ${displayHour}:${displayMinute}`;
}
