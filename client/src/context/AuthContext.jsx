import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/client.js';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check initial authentication
  useEffect(() => {
    const checkAuth = async () => {
      const storedToken = localStorage.getItem('aibot_token');
      if (!storedToken) {
        setLoading(false);
        return;
      }

      try {
        const userData = await api.getMe();
        setUser(userData);
      } catch (err) {
        console.warn('Session expired or invalid token:', err.message);
        api.setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();

    // Listen for unauthorized events from api client
    const handleUnauthorized = () => {
      setUser(null);
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, []);

  const login = async (email, password) => {
    setError(null);
    try {
      const data = await api.login({ email, password });
      setUser(data.user);
      return data.user;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const register = async (name, email, password, role = 'student') => {
    setError(null);
    try {
      const data = await api.register({ name, email, password, role });
      setUser(data.user);
      return data.user;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const acceptInvitation = async (token, password, name) => {
    setError(null);
    try {
      const data = await api.acceptInvitation({ token, password, name });
      setUser(data.user);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch {
      // ignore logout network errors
    } finally {
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        login,
        register,
        acceptInvitation,
        logout,
        isAuthenticated: !!user,
        isAdmin: user?.role === 'admin',
        isStudent: user?.role === 'student'
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;

