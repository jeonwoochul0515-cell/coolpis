import {
  doc,
  setDoc,
  getDoc,
  query,
  where,
  getDocs,
  collection,
} from 'firebase/firestore';
import { db } from '../firebase';
import type { BusinessProfile } from '../types/profile';

const PROFILES_COLLECTION = 'profiles';

/** uid로 프로필 조회 */
export async function getProfileByUid(uid: string): Promise<BusinessProfile | null> {
  const snap = await getDoc(doc(db, PROFILES_COLLECTION, uid));
  return snap.exists() ? (snap.data() as BusinessProfile) : null;
}

/** 사업자등록번호로 기존 프로필 조회 */
export async function findProfileByRegNumber(registrationNumber: string): Promise<{ uid: string; profile: BusinessProfile } | null> {
  // 하이픈 포함/미포함 모두 검색
  const normalized = registrationNumber.replace(/[^0-9]/g, '');
  const withDash = normalized.length === 10
    ? `${normalized.slice(0, 3)}-${normalized.slice(3, 5)}-${normalized.slice(5)}`
    : registrationNumber;
  const withoutDash = normalized;

  const variants = [withDash, withoutDash, registrationNumber].filter(
    (v, i, arr) => arr.indexOf(v) === i // 중복 제거
  );

  for (const variant of variants) {
    const q = query(
      collection(db, PROFILES_COLLECTION),
      where('registrationNumber', '==', variant)
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      const docSnap = snap.docs[0];
      console.log('[프로필 조회] 기존 회원 발견:', variant, docSnap.data());
      return { uid: docSnap.id, profile: docSnap.data() as BusinessProfile };
    }
  }

  console.log('[프로필 조회] 미등록 번호:', variants);
  return null;
}

/** 프로필 저장 (uid를 문서 ID로 사용) */
export async function saveProfile(uid: string, profile: BusinessProfile): Promise<void> {
  console.log('[프로필 저장] uid:', uid, '번호:', profile.registrationNumber);
  await setDoc(doc(db, PROFILES_COLLECTION, uid), profile);
  console.log('[프로필 저장] 완료');
}
