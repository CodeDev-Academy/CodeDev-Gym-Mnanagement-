import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { LoginPage } from './auth/LoginPage';
import { AppLayout } from './components/AppLayout';
import { DashboardPage } from './dashboard/DashboardPage';
import { PlansPage } from './memberships/PlansPage';
import { MembersPage } from './members/MembersPage';
import { PaymentsPage } from './payments/PaymentsPage';
import { CheckInPage } from './checkin/CheckInPage';
import { ProfilePage } from './profile/ProfilePage';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          {/* Protected Routes inside unified Cinematic AppLayout */}
          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<DashboardPage />} />
            <Route path="/checkin" element={<CheckInPage />} />
            <Route path="/members" element={<MembersPage />} />
            <Route path="/plans" element={<PlansPage />} />
            <Route path="/payments" element={<PaymentsPage />} />
            <Route path="/profile" element={<ProfilePage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
