import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/client';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('gym_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('gym_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const verifyAuth = async () => {
      if (token) {
        try {
          const res = await api.get('auth/me/');
          setUser(res.data);
          localStorage.setItem('gym_user', JSON.stringify(res.data));
        } catch (err) {
          console.error('Auth verification failed:', err);
          logout();
        }
      }
      setLoading(false);
    };

    verifyAuth();
  }, [token]);

  const login = (authToken, userData) => {
    localStorage.setItem('gym_token', authToken);
    localStorage.setItem('gym_user', JSON.stringify(userData));
    setToken(authToken);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('gym_token');
    localStorage.removeItem('gym_user');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
