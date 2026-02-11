import React, { createContext, useContext, useEffect, useState } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { User, UserRole } from './services/interfaces/types';
import { getCurrentUser, logout } from './services/authService';
import Login from './pages/Login';
import DashboardLayout from './components/DashboardLayout';
import CollaboratorsPage from './pages/admin/CollaboratorsPage';
import TimesheetPage from './pages/TimesheetPage';
import ReportsPage from './pages/admin/ReportsPage';

// --- Auth Context ---
interface AuthContextType {
  user: User | null;
  refreshUser: () => void;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType>(null!);

export const useAuth = () => useContext(AuthContext);

const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(getCurrentUser());

  const refreshUser = () => {
    setUser(getCurrentUser());
  };

  const signOut = () => {
    logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, refreshUser, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

// --- Protected Route Wrapper ---
const ProtectedRoute: React.FC<{ children: React.ReactNode; allowedRoles?: UserRole[] }> = ({ children, allowedRoles }) => {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect logic based on role if access denied
    return <Navigate to={user.role === UserRole.ADMIN ? '/admin/colaboradores' : '/ponto'} replace />;
  }

  return <>{children}</>;
};

// --- Main App ---
const App: React.FC = () => {
  return (
    <AuthProvider>
      <HashRouter>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route path="/" element={<Navigate to="/ponto" replace />} />

          {/* Admin Routes */}
          <Route path="/admin" element={
            <ProtectedRoute allowedRoles={[UserRole.ADMIN]}>
              <DashboardLayout />
            </ProtectedRoute>
          }>
            <Route path="colaboradores" element={<CollaboratorsPage />} />
            <Route path="relatorios" element={<ReportsPage />} />
            <Route path="ponto-admin" element={<TimesheetPage adminView />} />
          </Route>

          {/* Shared/Collaborator Routes */}
          <Route path="/ponto" element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }>
            <Route index element={<TimesheetPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      </HashRouter>
    </AuthProvider>
  );
};

export default App;