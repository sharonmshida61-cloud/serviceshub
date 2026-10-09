import { createContext, useContext, useEffect, useState } from "react";
import { api } from "../api";
import { clearToken, readToken, writeToken } from "../utils/tokenStore";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  // Kept here rather than in sessionStorage because it has to outlive the
  // redirect to /login; a component-local one-shot read gets lost on remount.
  const [authNotice, setAuthNotice] = useState(null);

  useEffect(() => {
    if (!readToken()) {
      setLoading(false);
      return;
    }
    api
      .me()
      .then(({ user }) => setUser(user))
      .catch(() => clearToken())
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    function onUnauthorized() {
      if (!readToken()) return;
      setAuthNotice("session-ended");
      clearToken();
      setUser(null);
    }
    window.addEventListener("serviceshub:unauthorized", onUnauthorized);
    return () => window.removeEventListener("serviceshub:unauthorized", onUnauthorized);
  }, []);

  async function login(email, password, remember = true) {
    const { token, user } = await api.login({ email, password, remember });
    writeToken(token, remember);
    setAuthNotice(null);
    setUser(user);
    return user;
  }

  async function loginWithGoogle(credential, remember = true) {
    const { token, user } = await api.googleLogin(credential, remember);
    writeToken(token, remember);
    setAuthNotice(null);
    setUser(user);
    return user;
  }

  async function register(payload) {
    const { token, user } = await api.register(payload);
    writeToken(token, true);
    setAuthNotice(null);
    setUser(user);
    return user;
  }

  async function updateProfile(payload) {
    const { user: updated } = await api.updateProfile(payload);
    setUser(updated);
    return updated;
  }

  function logout() {
    clearToken();
    setAuthNotice(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        authNotice,
        login,
        loginWithGoogle,
        register,
        logout,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
