import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { signInWithEmailAndPassword, onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { auth } from '../firebase';

interface AdminAuthContextType {
  adminUser: User | null;
  isAdmin: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextType>({
  adminUser: null,
  isAdmin: false,
  loading: true,
  login: async () => {},
  logout: async () => {},
});

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [adminUser, setAdminUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let signingOut = false;
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (signingOut) return; // signOut 중 재호출 방지

      if (firebaseUser && !firebaseUser.isAnonymous) {
        setAdminUser(firebaseUser);
        setIsAdmin(true);
        setLoading(false);
      } else if (firebaseUser?.isAnonymous) {
        // anonymous 세션 정리 후 로그인 폼 표시
        signingOut = true;
        await signOut(auth);
        signingOut = false;
        setAdminUser(null);
        setIsAdmin(false);
        setLoading(false);
      } else {
        setAdminUser(null);
        setIsAdmin(false);
        setLoading(false);
      }
    });
    return unsubscribe;
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  }, []);

  const logout = useCallback(async () => {
    await signOut(auth);
  }, []);

  return (
    <AdminAuthContext.Provider value={{ adminUser, isAdmin, loading, login, logout }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  return useContext(AdminAuthContext);
}
