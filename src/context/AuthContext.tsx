import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { apiPost, apiGet, setToken, getToken } from '../lib/api';

interface User {
  id: string;
  email: string;
  displayName: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  authModalOpen: boolean;
  setAuthModalOpen: (open: boolean) => void;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  authModalOpen: false,
  setAuthModalOpen: () => {},
  login: async () => {},
  register: async () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  useEffect(() => {
    const token = getToken();
    if (token) {
      apiGet('/auth/me')
        .then(data => {
          setUser(data.user);
        })
        .catch(() => {
          setToken(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    const data = await apiPost('/auth/login', { email, password });
    setToken(data.token);
    setUser(data.user);
  };

  const register = async (email: string, password: string, displayName: string) => {
    const data = await apiPost('/auth/register', { email, password, displayName });
    setToken(data.token);
    setUser(data.user);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, authModalOpen, setAuthModalOpen, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
