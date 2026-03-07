import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../services/interfaces/types';

// ─────────────────────────────────────────────────────────────
//  Mapa rota → título
// ─────────────────────────────────────────────────────────────
const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/ponto': 'Minha Folha de Ponto',
  '/calendario': 'Calendário',
  '/clientes': 'Clientes',
  '/projetos': 'Projetos',
  '/admin/colaboradores': 'Colaboradores',
  '/admin/empresa': 'Empresa',
  '/admin/tipos-projeto': 'Tipos de Projeto',
  '/admin/ponto-admin': 'Gerenciar Pontos',
  '/admin/relatorios': 'Relatório de Pagamento',
  '/admin/recebimentos': 'Relatório de Recebimento',
  '/admin/financeiro/contas-pagar': 'Contas a Pagar',
  '/admin/briefing-template': 'Briefing – Perguntas',
  '/admin/briefing-respostas': 'Briefing – Respostas',
  '/area-cliente': 'Meus Projetos',
};

function getPageTitle(pathname: string): string {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  if (pathname.startsWith('/clientes/') && pathname.endsWith('/editar')) return 'Editar Cliente';
  if (pathname.startsWith('/clientes/') && !pathname.endsWith('/novo')) return 'Detalhe do Cliente';
  if (pathname === '/clientes/novo') return 'Novo Cliente';
  if (pathname.startsWith('/projetos/') && pathname.endsWith('/editar')) return 'Editar Projeto';
  if (pathname.startsWith('/projetos/') && !pathname.endsWith('/novo')) return 'Detalhe do Projeto';
  if (pathname === '/projetos/novo') return 'Novo Projeto';
  if (pathname.startsWith('/admin/tipos-projeto/') && pathname.endsWith('/editar')) return 'Editar Tipo de Projeto';
  if (pathname === '/admin/tipos-projeto/novo') return 'Novo Tipo de Projeto';
  if (pathname === '/admin/financeiro/contas-pagar/novo') return 'Nova Conta a Pagar';
  if (pathname.startsWith('/admin/financeiro/contas-pagar/')) return 'Editar Conta a Pagar';
  if (pathname.startsWith('/area-cliente/projeto/')) return 'Detalhe do Projeto';
  return 'ArqPonto';
}

// ─────────────────────────────────────────────────────────────
//  Utilitário de tema
// ─────────────────────────────────────────────────────────────
const THEME_KEY = 'arqponto_theme';

function applyTheme(isLight: boolean) {
  if (isLight) {
    document.documentElement.classList.add('light-mode');
  } else {
    document.documentElement.classList.remove('light-mode');
  }
  localStorage.setItem(THEME_KEY, isLight ? 'light' : 'dark');
}

function loadSavedTheme(): boolean {
  const saved = localStorage.getItem(THEME_KEY);
  return saved === 'light';
}

// ─────────────────────────────────────────────────────────────
//  Ícones SVG internos
// ─────────────────────────────────────────────────────────────

const SunIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="5" />
    <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
    <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
  </svg>
);

const MoonIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
);

const HomeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);


const KeyIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
  </svg>
);

const LogOutIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);

const CalendarIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const ChevronDownIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

// ─────────────────────────────────────────────────────────────
//  Props
// ─────────────────────────────────────────────────────────────
interface TopbarProps {
  onOpenChangePassword: () => void;
}

// ─────────────────────────────────────────────────────────────
//  Componente principal
// ─────────────────────────────────────────────────────────────
const Topbar: React.FC<TopbarProps> = ({ onOpenChangePassword }) => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isLightMode, setIsLightMode] = useState<boolean>(() => {
    // Inicializa a partir do localStorage E aplica no <html> imediatamente
    const saved = loadSavedTheme();
    applyTheme(saved);
    return saved;
  });

  const userMenuRef = useRef<HTMLDivElement>(null);

  const pageTitle = getPageTitle(location.pathname);

  const handleLogout = () => {
    const isCliente = user?.role === UserRole.CLIENTE;
    signOut();
    navigate(isCliente ? '/area-cliente/login' : '/login');
  };

  // Fecha dropdowns ao clicar fora
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) setIsUserMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggleTheme = useCallback(() => {
    setIsLightMode(prev => {
      const next = !prev;
      applyTheme(next);
      return next;
    });
  }, []);

  const userInitial = user?.name?.charAt(0).toUpperCase() ?? '?';
  const userRole = user?.role === UserRole.ADMIN
    ? 'Administrador'
    : user?.role === UserRole.CLIENTE
      ? 'Cliente'
      : 'Colaborador';

  // ── Estilos via variáveis CSS ──
  const iconBtnStyle: React.CSSProperties = {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--color-text-muted)',
    padding: '0.5rem',
    borderRadius: '0.5rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  };

  const dropdownStyle: React.CSSProperties = {
    position: 'absolute',
    top: 'calc(100% + 8px)',
    right: 0,
    background: 'var(--color-dropdown-bg)',
    border: '1px solid var(--color-border)',
    borderRadius: '0.75rem',
    boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
    zIndex: 50,
    overflow: 'hidden',
  };

  return (
    <header
      style={{
        height: '60px',
        background: 'var(--color-topbar-bg)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--color-border)',
        display: 'flex',
        alignItems: 'center',
        paddingLeft: '1.5rem',
        paddingRight: '1.5rem',
        gap: '1rem',
        position: 'sticky',
        top: 0,
        zIndex: 30,
        flexShrink: 0,
      }}
    >
      {/* ── Dashboard Icon + Título ─────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: '0 0 auto' }}>
        <HoverButton
          id="topbar-home-btn"
          title="Dashboard"
          onClick={() => navigate(user?.role === UserRole.CLIENTE ? '/area-cliente' : '/dashboard')}
          style={{
            ...iconBtnStyle,
            color: (location.pathname === '/dashboard' || location.pathname === '/area-cliente') ? 'var(--color-primary)' : 'var(--color-text-muted)',
            padding: '0.4rem',
          }}
        >
          <HomeIcon />
        </HoverButton>

        <h2 style={{
          margin: 0,
          fontSize: '0.925rem',
          fontWeight: 600,
          color: 'var(--color-text-base)',
          letterSpacing: '0.01em',
          whiteSpace: 'nowrap',
        }}>
          {pageTitle}
        </h2>
      </div>

      {/* ── Espaço central flexível ──────────────────────── */}
      <div style={{ flex: 1 }} />

      {/* ── Ações à direita ──────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>


        {/* Atalho Calendário */}
        {user?.role !== UserRole.CLIENTE && (
          <HoverButton
            id="topbar-calendar-btn"
            title="Calendário"
            style={{
              ...iconBtnStyle,
              color: location.pathname === '/calendario' ? 'var(--color-primary)' : 'var(--color-text-muted)',
            }}
            onClick={() => navigate('/calendario')}
          >
            <CalendarIcon />
          </HoverButton>
        )}

        {/* Toggle de Tema */}
        <HoverButton
          id="topbar-theme-toggle-btn"
          title={isLightMode ? 'Mudar para tema escuro' : 'Mudar para tema claro'}
          style={iconBtnStyle}
          onClick={toggleTheme}
        >
          {isLightMode ? <SunIcon /> : <MoonIcon />}
        </HoverButton>

        {/* Separador */}
        <div style={{
          width: '1px', height: '24px',
          background: 'var(--color-border)',
          margin: '0 0.25rem',
        }} />

        {/* Menu do usuário */}
        <div ref={userMenuRef} style={{ position: 'relative' }}>
          <HoverButton
            id="topbar-user-menu-btn"
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.375rem 0.5rem',
              borderRadius: '0.625rem',
            }}
            onClick={() => { setIsUserMenuOpen(o => !o); }}
          >
            {/* Avatar */}
            <div style={{
              width: '32px', height: '32px', borderRadius: '50%',
              background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontWeight: 700, fontSize: '0.875rem', flexShrink: 0,
              boxShadow: '0 0 0 2px rgba(59,130,246,0.3)',
            }}>
              {userInitial}
            </div>
            {/* Info */}
            <div style={{ textAlign: 'left' }}>
              <p style={{
                margin: 0, fontSize: '0.8125rem', fontWeight: 600,
                color: 'var(--color-text-base)', lineHeight: 1.2,
                whiteSpace: 'nowrap', maxWidth: '120px',
                overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {user?.name}
              </p>
              <p style={{ margin: 0, fontSize: '0.6875rem', color: 'var(--color-text-subtle)', lineHeight: 1.2 }}>
                {userRole}
              </p>
            </div>
            <span style={{ color: 'var(--color-text-subtle)', display: 'flex', alignItems: 'center' }}>
              <ChevronDownIcon />
            </span>
          </HoverButton>

          {/* Dropdown do usuário */}
          {isUserMenuOpen && (
            <div style={{ ...dropdownStyle, width: '220px' }}>
              {/* Header */}
              <div style={{ padding: '0.875rem 1rem', borderBottom: '1px solid var(--color-border)' }}>
                <p style={{ margin: 0, fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-base)' }}>
                  {user?.name}
                </p>
                <p style={{ margin: '0.125rem 0 0', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                  {userRole}
                </p>
              </div>

              {/* Ações */}
              <div style={{ padding: '0.375rem' }}>
                <DropdownItem icon={<KeyIcon />} label="Alterar Senha"
                  onClick={() => { setIsUserMenuOpen(false); onOpenChangePassword(); }} />

              </div>

              <div style={{ height: '1px', background: 'var(--color-border)', margin: '0 0.5rem' }} />

              <div style={{ padding: '0.375rem' }}>
                <DropdownItem icon={<LogOutIcon />} label="Sair" onClick={handleLogout} danger />
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

// ─────────────────────────────────────────────────────────────
//  Sub-componente: botão com hover state via CSS vars
// ─────────────────────────────────────────────────────────────
interface HoverButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

const HoverButton: React.FC<HoverButtonProps> = ({ children, style, ...props }) => {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      {...props}
      style={{
        ...style,
        color: hovered ? 'var(--color-text-base)' : 'var(--color-text-muted)',
        background: hovered ? 'var(--color-hover-bg)' : 'transparent',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {children}
    </button>
  );
};

// ─────────────────────────────────────────────────────────────
//  Sub-componente: item de dropdown
// ─────────────────────────────────────────────────────────────
interface DropdownItemProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}

const DropdownItem: React.FC<DropdownItemProps> = ({ icon, label, onClick, danger }) => {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: '100%',
        display: 'flex', alignItems: 'center', gap: '0.625rem',
        padding: '0.5rem 0.625rem',
        borderRadius: '0.5rem', border: 'none',
        background: hovered
          ? (danger ? 'rgba(239,68,68,0.1)' : 'var(--color-hover-bg)')
          : 'transparent',
        color: danger
          ? (hovered ? '#f87171' : 'var(--color-text-muted)')
          : (hovered ? 'var(--color-text-base)' : 'var(--color-text-muted)'),
        fontSize: '0.8125rem', fontWeight: 500,
        cursor: 'pointer', textAlign: 'left',
      }}
    >
      <span style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>{icon}</span>
      {label}
    </button>
  );
};

export default Topbar;
