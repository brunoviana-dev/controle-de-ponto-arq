import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../services/interfaces/types';

const DashboardLayout: React.FC = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    signOut();
    navigate('/login');
  };

  const navClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center space-x-3 p-3 rounded-lg transition-colors ${isActive
      ? 'bg-primary/20 text-primary border-r-4 border-primary'
      : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
    }`;

  return (
    <div className="min-h-screen bg-background text-slate-100 flex flex-col md:flex-row">

      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 bg-surface border-b border-slate-700">
        <span className="font-bold text-lg text-primary">ArqPonto</span>
        <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="text-slate-200">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
        </button>
      </div>

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-surface border-r border-slate-700 transform transition-transform duration-200 ease-in-out
        md:relative md:translate-x-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-6">
          <h1 className="text-2xl font-bold tracking-tight text-white mb-1">ArqPonto</h1>
          <p className="text-xs text-slate-500 uppercase tracking-widest">Architecture Office</p>
        </div>

        <nav className="px-4 space-y-2 mt-4">

          {user?.role === UserRole.ADMIN && (
            <>
              <div className="text-xs font-semibold text-slate-500 uppercase px-3 pt-4 pb-2">Administração</div>
              <NavLink to="/admin/colaboradores" className={navClass}>
                <span>👥</span> <span>Colaboradores</span>
              </NavLink>
              <NavLink to="/clientes" className={navClass}>
                <span>🏢</span> <span>Clientes</span>
              </NavLink>
              <NavLink to="/projetos" className={navClass}>
                <span>🏗️</span> <span>Projetos</span>
              </NavLink>
              <NavLink to="/admin/tipos-projeto" className={navClass}>
                <span>🏷️</span> <span>Tipos de Projeto</span>
              </NavLink>
              <NavLink to="/admin/relatorios" className={navClass}>
                <span>📊</span> <span>Relatório de Pagamento</span>
              </NavLink>
              <NavLink to="/admin/recebimentos" className={navClass}>
                <span>💰</span> <span>Relatório de Recebimento</span>
              </NavLink>
              <NavLink to="/admin/ponto-admin" className={navClass}>
                <span>📅</span> <span>Gerenciar Pontos</span>
              </NavLink>
            </>
          )}

          <div className="text-xs font-semibold text-slate-500 uppercase px-3 pt-4 pb-2">Meu Espaço</div>
          <NavLink to="/ponto" end className={navClass}>
            <span>🕒</span> <span>Minha Folha</span>
          </NavLink>

        </nav>

        <div className="absolute bottom-0 w-full p-4 border-t border-slate-700 bg-surface">
          <div className="flex items-center space-x-3 mb-4 px-2">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white font-bold text-sm">
              {user?.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.name}</p>
              <p className="text-xs text-slate-500 truncate">{user?.role === UserRole.ADMIN ? 'Administrador' : 'Colaborador'}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center space-x-2 py-2 px-4 rounded-md border border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors text-sm"
          >
            <span>Sair</span>
          </button>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-4 md:p-8">
        <Outlet />
      </main>
    </div>
  );
};

export default DashboardLayout;