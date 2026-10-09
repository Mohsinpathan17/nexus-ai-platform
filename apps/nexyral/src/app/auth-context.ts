import { createContext, useContext } from "react";
import type { Session } from "../../shared/contracts";
export interface AuthState extends Session {
  phase: "loading" | "ready" | "unavailable";
  update: (session: Session) => void;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}
export const AuthContext = createContext<AuthState>({
  user: null,
  csrfToken: null,
  phase: "loading",
  update: () => {},
  refresh: async () => {},
  logout: async () => {},
});
export const useAuth = () => useContext(AuthContext);
