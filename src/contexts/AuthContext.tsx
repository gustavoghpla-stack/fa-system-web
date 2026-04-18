import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { DB, logAcesso, initDefaultData, hashPassword, verifyPassword, isPasswordHash, type Usuario } from '@/lib/db';

interface Session {
  user: string;
  name: string;
  nivel: string;
}

interface AuthContextType {
  session: Session | null;
  login: (email: string, password: string) => Promise<string | null>;
  logout: () => void;
  permissionsVersion: number;
  refreshPermissions: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [permissionsVersion, setPermissionsVersion] = useState(0);
  const refreshPermissions = useCallback(() => setPermissionsVersion(v => v + 1), []);

  const login = useCallback(async (email: string, password: string): Promise<string | null> => {
    await initDefaultData();

    // Master login — compare against stored hash
    if (email === 'feaviplimpeza@gmail.com') {
      const cfg = DB.getObj('config');
      const masterOk = cfg.masterPasswordHash
        ? await verifyPassword(password, cfg.masterPasswordHash)
        : false;
      if (masterOk) {
        const s = { user: 'master', name: 'Administrador Master', nivel: 'Master' };
        setSession(s);
        logAcesso('Login efetuado', s.name, s.user);
        return null;
      }
    }

    // Registered users
    const users = DB.get<Usuario>('users');
    const found = users.find(x => x.email.toLowerCase() === email.toLowerCase());
    if (found) {
      let passwordOk = false;
      if (isPasswordHash(found.senha)) {
        // New accounts: compare hash
        passwordOk = await verifyPassword(password, found.senha);
      } else {
        // Legacy plaintext account: compare directly, then migrate to hash
        passwordOk = found.senha === password;
        if (passwordOk) {
          const newHash = await hashPassword(password);
          const updated = users.map(x => x.id === found.id ? { ...x, senha: newHash } : x);
          localStorage.setItem('fa_users', JSON.stringify(updated));
        }
      }
      if (passwordOk) {
        const s = { user: found.email, name: found.nome, nivel: found.nivel };
        setSession(s);
        logAcesso('Login efetuado', s.name, s.user);
        return null;
      }
    }

    return 'Usuário ou senha incorretos.';
  }, []);

  // Fix: use functional setState to avoid stale closure — no deps needed
  const logout = useCallback(() => {
    setSession(prev => {
      if (prev) {
        logAcesso('Logout', prev.name, prev.user);
      }
      return null;
    });
  }, []);

  return (
    <AuthContext.Provider value={{ session, login, logout, permissionsVersion, refreshPermissions }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
