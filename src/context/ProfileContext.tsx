import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { BusinessProfile } from '../types/profile';
import { useAuth } from './AuthContext';
import { getProfileByUid, saveProfile } from '../services/profileStore';

interface ProfileContextType {
  profile: BusinessProfile | null;
  isRegistered: boolean;
  uid: string | null;
  loading: boolean;
  setProfile: (profile: BusinessProfile) => Promise<void>;
  clearProfile: () => void;
}

const ProfileContext = createContext<ProfileContextType | null>(null);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { uid } = useAuth();
  const [profile, setProfileState] = useState<BusinessProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // uid가 설정되면 Firestore에서 프로필 로드
  useEffect(() => {
    if (!uid) {
      setLoading(false);
      return;
    }
    setLoading(true);
    getProfileByUid(uid)
      .then((p) => setProfileState(p))
      .catch((err) => console.error('프로필 로드 실패:', err))
      .finally(() => setLoading(false));
  }, [uid]);

  const setProfile = useCallback(async (newProfile: BusinessProfile) => {
    if (!uid) return;
    await saveProfile(uid, newProfile);
    setProfileState(newProfile);
  }, [uid]);

  const clearProfile = useCallback(() => {
    setProfileState(null);
  }, []);

  return (
    <ProfileContext.Provider
      value={{
        profile,
        isRegistered: profile !== null,
        uid,
        loading,
        setProfile,
        clearProfile,
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return context;
}
