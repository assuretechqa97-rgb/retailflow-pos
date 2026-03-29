import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { DEMO_USERS, type AppUser } from "@/lib/auth";

interface AuthContextValue {
  user: AppUser | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => string | null;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AppUser | null>(null);

  const login = useCallback((username: string, password: string): string | null => {
    const match = DEMO_USERS.find(
      (u) => u.username === username.toLowerCase().trim() && u.password === password
    );
    if (!match) return "Invalid username or password";
    setUser(match.user);
    return null;
  }, []);

  const logout = useCallback(() => {
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
