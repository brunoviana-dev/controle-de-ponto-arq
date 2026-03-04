import React from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { UserRole } from './services/interfaces/types';
import Login from './pages/Login';
import DashboardLayout from './components/DashboardLayout';
import CollaboratorsPage from './pages/admin/CollaboratorsPage';
import TimesheetPage from './pages/TimesheetPage';
import ReportsPage from './pages/admin/ReportsPage';
import RelatorioRecebimentoPage from './pages/admin/RelatorioRecebimentoPage';
import ClientesPage from './pages/clientes/ClientesPage';
import ClienteFormPage from './pages/clientes/ClienteFormPage';
import ClienteDetailPage from './pages/clientes/ClienteDetailPage';
import ProjetosPage from './pages/projetos/ProjetosPage';
import ProjetoFormPage from './pages/projetos/ProjetoFormPage';
import ProjetoDetailPage from './pages/projetos/ProjetoDetailPage';
import TiposProjetoPage from './pages/admin/TiposProjetoPage';
import TipoProjetoFormPage from './pages/admin/TipoProjetoFormPage';
import ContasPagarPage from './pages/financeiro/ContasPagarPage';
import ContaFormPage from './pages/financeiro/ContaFormPage';
import BriefingTemplatePage from './pages/admin/BriefingTemplatePage';
import BriefingResponsesPage from './pages/admin/BriefingResponsesPage';
import EmpresaPage from './pages/admin/EmpresaPage';
import BriefingPage from './pages/BriefingPage';
import { AuthProvider, useAuth } from './contexts/AuthContext';

// Client Area Pages
import ClienteLoginPage from './pages/area-cliente/ClienteLoginPage';
import EsqueciSenhaPage from './pages/area-cliente/EsqueciSenhaPage';
import RedefinirSenhaPage from './pages/area-cliente/RedefinirSenhaPage';
import AreaClienteLayout from './components/AreaClienteLayout';
import ClienteDashboardPage from './pages/area-cliente/ClienteDashboardPage';
import ClienteProjetoDetailPage from './pages/area-cliente/ClienteProjetoDetailPage';

// --- Protected Route Wrapper ---
const ProtectedRoute: React.FC<{ children: React.ReactNode; allowedRoles?: UserRole[] }> = ({ children, allowedRoles }) => {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Se o usuário for um cliente e tentar acessar algo FORA da área do cliente
  if (user.role === UserRole.CLIENTE && !location.pathname.includes('area-cliente')) {
    return <Navigate to="/area-cliente" replace />;
  }

  // Se o usuário for admin/colaborador e tentar acessar a área do cliente
  if (user.role !== UserRole.CLIENTE && location.pathname.includes('area-cliente')) {
    // Redireciona para o destino padrão de colaboradores (pode ser /ponto ou pagina de admin)
    return <Navigate to="/ponto" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect logic based on role if access denied
    if (user.role === UserRole.CLIENTE) return <Navigate to="/area-cliente" replace />;
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
          <Route path="/briefing/:slug" element={<BriefingPage />} />
          <Route path="/briefingInsta/:slug" element={<BriefingPage />} />

          <Route path="/" element={<Navigate to="/ponto" replace />} />

          {/* Admin Routes */}
          <Route path="/admin" element={
            <ProtectedRoute allowedRoles={[UserRole.ADMIN]}>
              <DashboardLayout />
            </ProtectedRoute>
          }>
            <Route path="colaboradores" element={<CollaboratorsPage />} />
            <Route path="relatorios" element={<ReportsPage />} />
            <Route path="recebimentos" element={<RelatorioRecebimentoPage />} />
            <Route path="ponto-admin" element={<TimesheetPage adminView />} />

            {/* Project Types Routes */}
            <Route path="tipos-projeto">
              <Route index element={<TiposProjetoPage />} />
              <Route path="novo" element={<TipoProjetoFormPage />} />
              <Route path=":id/editar" element={<TipoProjetoFormPage />} />
            </Route>

            <Route path="empresa" element={<EmpresaPage />} />

            {/* Briefing Routes */}
            <Route path="briefing-template" element={<BriefingTemplatePage />} />
            <Route path="briefing-respostas" element={<BriefingResponsesPage />} />

            {/* Financeiro Routes */}
            <Route path="financeiro">
              <Route path="contas-pagar">
                <Route index element={<ContasPagarPage />} />
                <Route path="novo" element={<ContaFormPage />} />
                <Route path=":id/editar" element={<ContaFormPage />} />
              </Route>
            </Route>
          </Route>

          {/* Admin Client/Project Routes */}
          <Route path="/clientes" element={
            <ProtectedRoute allowedRoles={[UserRole.ADMIN]}>
              <DashboardLayout />
            </ProtectedRoute>
          }>
            <Route index element={<ClientesPage />} />
            <Route path="novo" element={<ClienteFormPage />} />
            <Route path=":id" element={<ClienteDetailPage />} />
            <Route path=":id/editar" element={<ClienteFormPage />} />
          </Route>

          <Route path="/projetos" element={
            <ProtectedRoute allowedRoles={[UserRole.ADMIN]}>
              <DashboardLayout />
            </ProtectedRoute>
          }>
            <Route index element={<ProjetosPage />} />
            <Route path="novo" element={<ProjetoFormPage />} />
            <Route path=":id" element={<ProjetoDetailPage />} />
            <Route path=":id/editar" element={<ProjetoFormPage />} />
          </Route>

          <Route path="/ponto" element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }>
            <Route index element={<TimesheetPage />} />
          </Route>

          {/* Client Area Routes */}
          <Route path="/area-cliente/login" element={<ClienteLoginPage />} />
          <Route path="/area-cliente/esqueci-senha" element={<EsqueciSenhaPage />} />
          <Route path="/area-cliente/redefinir-senha" element={<RedefinirSenhaPage />} />
          <Route path="/area-cliente" element={
            <ProtectedRoute allowedRoles={[UserRole.CLIENTE]}>
              <AreaClienteLayout />
            </ProtectedRoute>
          }>
            <Route index element={<ClienteDashboardPage />} />
            <Route path="projeto/:id" element={<ClienteProjetoDetailPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      </HashRouter>
    </AuthProvider>
  );
};

export default App;