import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

export const ProtectedRoute = ({ children }) => {
  const { user, token, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: '#64748b' }}>
        Loading gym system...
      </div>
    );
  }

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  return children;
};
