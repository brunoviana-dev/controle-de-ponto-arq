import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../services/interfaces/types';
import ChangePasswordModal from './ChangePasswordModal';

const DashboardLayout: React.FC = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isCPModalOpen, setIsCPModalOpen] = useState(false);

  const handleLogout = () => {
    signOut();
    navigate('/login');
  };

  const navClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center ${isCollapsed ? 'justify-center' : 'space-x-3'} p-3 rounded-lg transition-all duration-200 ${isActive
      ? 'bg-primary/20 text-primary border-r-4 border-primary'
      : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
    }`;

  return (
    <div className="h-screen bg-background text-slate-100 flex flex-col md:flex-row overflow-hidden">

      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 bg-surface border-b border-slate-700">
        <span className="font-bold text-lg text-primary">ArqPonto</span>
        <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="text-slate-200">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
        </button>
      </div>

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 bg-surface border-r border-slate-700 transform transition-all duration-300 ease-in-out
        md:relative md:translate-x-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        ${isCollapsed ? 'w-20' : 'w-64'}
      `}>
        {/* Toggle Collapse Button (Desktop Only) */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="hidden md:flex absolute -right-3 top-20 bg-slate-800 border border-slate-700 rounded-full p-1 text-slate-400 hover:text-white z-50"
        >
          <svg className={`w-4 h-4 transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <div className={`p-6 transition-all duration-300 ${isCollapsed ? 'px-4 text-center' : ''}`}>
          <h1 className={`font-bold tracking-tight text-white transition-all duration-300 ${isCollapsed ? 'text-xl' : 'text-2xl mb-1'}`}>
            {isCollapsed ? 'AP' : 'ArqPonto'}
          </h1>
          {!isCollapsed && <p className="text-xs text-slate-500 uppercase tracking-widest">Architecture Office</p>}
        </div>

        {/* User Profile - Now at Top */}
        <div className={`mx-4 mb-4 p-3 rounded-xl bg-slate-800/50 border border-slate-700/50 transition-all duration-300 ${isCollapsed ? 'px-2' : ''}`}>
          <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'space-x-3'}`}>
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-primary/20">
              {user?.name.charAt(0)}
            </div>
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white truncate">{user?.name}</p>
                <p className="text-[10px] text-slate-500 uppercase font-semibold">{user?.role === UserRole.ADMIN ? 'Administrador' : 'Colaborador'}</p>
              </div>
            )}
          </div>
          {!isCollapsed && (
            <div className="mt-3 flex flex-col gap-2">
              <button
                onClick={() => setIsCPModalOpen(true)}
                className="w-full flex items-center justify-center space-x-2 py-1.5 rounded-lg border border-slate-600/50 text-slate-300 hover:bg-slate-700 hover:text-white transition-all text-xs"
              >
                <span>🔑 Alterar Senha</span>
              </button>
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center space-x-2 py-1.5 rounded-lg border border-slate-600/50 text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-all text-xs"
              >
                <span>🚪 Sair</span>
              </button>
            </div>
          )}
          {isCollapsed && (
            <div className="mt-3 flex flex-col gap-2 items-center">
              <button
                onClick={() => setIsCPModalOpen(true)}
                title="Alterar Senha"
                className="w-10 h-10 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-700 hover:text-white transition-all"
              >
                <span>🔑</span>
              </button>
              <button
                onClick={handleLogout}
                title="Sair"
                className="w-10 h-10 flex items-center justify-center rounded-lg text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-all"
              >
                <span>🚪</span>
              </button>
            </div>
          )}
        </div>

        <nav className={`px-4 space-y-1 mt-4 overflow-y-auto max-h-[calc(100vh-250px)] custom-scrollbar ${isCollapsed ? 'px-2' : ''}`}>

          {user?.role === UserRole.ADMIN && (
            <>
              {!isCollapsed && <div className="text-[10px] font-bold text-slate-600 uppercase px-3 pt-4 pb-2 tracking-widest">Administração</div>}
              {isCollapsed && <div className="h-px bg-slate-700/50 my-4 mx-2" />}
              <NavLink to="/dashboard" end className={navClass} title="Dashboard">
                <span className="text-xl">🏠</span> {!isCollapsed && <span>Dashboard</span>}
              </NavLink>
              <NavLink to="/admin/empresa" className={navClass} title="Empresa">
                <span className="text-xl">💼</span> {!isCollapsed && <span>Empresa</span>}
              </NavLink>
              <NavLink to="/admin/colaboradores" className={navClass} title="Colaboradores">
                <span className="text-xl">👥</span> {!isCollapsed && <span>Colaboradores</span>}
              </NavLink>
              <NavLink to="/clientes" className={navClass} title="Clientes">
                <span className="text-xl">🏢</span> {!isCollapsed && <span>Clientes</span>}
              </NavLink>
              <NavLink to="/projetos" className={navClass} title="Projetos">
                <span className="text-xl">🏗️</span> {!isCollapsed && <span>Projetos</span>}
              </NavLink>
              <NavLink to="/admin/tipos-projeto" className={navClass} title="Tipos de Projeto">
                <span className="text-xl">🏷️</span> {!isCollapsed && <span>Tipos de Projeto</span>}
              </NavLink>
              <NavLink to="/admin/ponto-admin" className={navClass} title="Gerenciar Pontos">
                <span className="text-xl">📅</span> {!isCollapsed && <span>Gerenciar Pontos</span>}
              </NavLink>
              <NavLink to="/calendario" className={navClass} title="Calendário">
                <span className="text-xl">📆</span> {!isCollapsed && <span>Calendário</span>}
              </NavLink>

              {!isCollapsed && <div className="text-[10px] font-bold text-slate-600 uppercase px-3 pt-4 pb-2 tracking-widest">Financeiro</div>}
              {isCollapsed && <div className="h-px bg-slate-700/50 my-4 mx-2" />}
              <NavLink to="/admin/financeiro/contas-pagar" className={navClass} title="Contas a Pagar">
                <span className="text-xl">📝</span> {!isCollapsed && <span>Contas a Pagar</span>}
              </NavLink>
              <NavLink to="/admin/relatorios" className={navClass} title="Relatório de Pagamento">
                <span className="text-xl">📊</span> {!isCollapsed && <span>Relatório de Pagamento</span>}
              </NavLink>
              <NavLink to="/admin/recebimentos" className={navClass} title="Relatório de Recebimento">
                <span className="text-xl">💰</span> {!isCollapsed && <span>Relatório de Recebimento</span>}
              </NavLink>

              {!isCollapsed && <div className="text-[10px] font-bold text-slate-600 uppercase px-3 pt-4 pb-2 tracking-widest">Briefing</div>}
              {isCollapsed && <div className="h-px bg-slate-700/50 my-4 mx-2" />}
              <NavLink to="/admin/briefing-template" className={navClass} title="Perguntas">
                <span className="text-xl">❓</span> {!isCollapsed && <span>Perguntas</span>}
              </NavLink>
              <NavLink to="/admin/briefing-respostas" className={navClass} title="Respostas">
                <span className="text-xl">📥</span> {!isCollapsed && <span>Respostas</span>}
              </NavLink>
            </>
          )}

          {user?.role !== UserRole.ADMIN && (
            <>
              {!isCollapsed && <div className="text-[10px] font-bold text-slate-600 uppercase px-3 pt-4 pb-2 tracking-widest">Meu Espaço</div>}
              {isCollapsed && <div className="h-px bg-slate-700/50 my-4 mx-2" />}
              <NavLink to="/dashboard" end className={navClass} title="Dashboard">
                <span className="text-xl">🏠</span> {!isCollapsed && <span>Dashboard</span>}
              </NavLink>
              <NavLink to="/ponto" end className={navClass} title="Minha Folha">
                <span className="text-xl">🕒</span> {!isCollapsed && <span>Minha Folha</span>}
              </NavLink>
              <NavLink to="/calendario" className={navClass} title="Calendário">
                <span className="text-xl">📆</span> {!isCollapsed && <span>Calendário</span>}
              </NavLink>
            </>
          )}

        </nav>
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

      <ChangePasswordModal
        isOpen={isCPModalOpen}
        onClose={() => setIsCPModalOpen(false)}
      />
    </div>
  );
};

export default DashboardLayout;