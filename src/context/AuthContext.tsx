import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { signInAnonymously, onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { auth } from '../firebase';

interface AuthContextType {
  user: User | null;
  uid: string | null;
  loading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({ user: null, uid: null, loading: true, logout: async () => {} });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        setLoading(false);
      } else {
        // 자동 익명 로그인
        try {
          await signInAnonymously(auth);
        } catch (err) {
          console.error('익명 로그인 실패:', err);
          // Firebase 콘솔에서 익명 인증이 활성화되어 있는지 확인하세요.
          setLoading(false);
        }
      }
    });
    return unsubscribe;
  }, []);

  const logout = useCallback(async () => {
    await signOut(auth);
    // onAuthStateChanged가 자동으로 다시 익명 로그인 처리
  }, []);

  return (
    <AuthContext.Provider value={{ user, uid: user?.uid ?? null, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
