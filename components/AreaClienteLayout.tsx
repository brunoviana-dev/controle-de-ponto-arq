import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import ChangePasswordModal from './ChangePasswordModal';
import Topbar from './Topbar';

const AreaClienteLayout: React.FC = () => {
    const { user, signOut } = useAuth();
    const navigate = useNavigate();
    const [isSidebarOpen, setSidebarOpen] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isCPModalOpen, setIsCPModalOpen] = useState(false);

    const navClass = ({ isActive }: { isActive: boolean }) =>
        `flex items-center ${isCollapsed ? 'justify-center' : 'space-x-3'} p-3 rounded-lg transition-all duration-200 ${isActive
            ? 'bg-primary/20 text-primary border-r-4 border-primary'
            : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
        }`;

    return (
        <div className="h-screen bg-background text-slate-100 flex flex-col overflow-hidden">

            {/* Mobile Header */}
            <div className="md:hidden flex items-center justify-between p-4 bg-surface border-b border-slate-700 flex-shrink-0">
                <span className="font-bold text-lg text-primary">ArqPonto</span>
                <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="text-slate-200">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                </button>
            </div>

            <div className="flex flex-1 overflow-hidden">

                {/* Sidebar */}
                <aside className={`
                    fixed inset-y-0 left-0 z-50 bg-surface border-r border-slate-700 transform transition-all duration-300 ease-in-out
                    md:relative md:translate-x-0 md:inset-y-auto md:flex-shrink-0
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
                        {!isCollapsed && <p className="text-xs text-slate-500 uppercase tracking-widest">Portal do Cliente</p>}
                    </div>

                    <nav className={`px-4 space-y-1 mt-4 ${isCollapsed ? 'px-2' : ''}`}>
                        {!isCollapsed && <div className="text-[10px] font-bold text-slate-600 uppercase px-3 pt-4 pb-2 tracking-widest">Navegação</div>}
                        {isCollapsed && <div className="h-px bg-slate-700/50 my-4 mx-2" />}

                        <NavLink to="/area-cliente" end className={navClass} title="Meus Projetos">
                            <span className="text-xl">🏠</span>
                            {!isCollapsed && <span>Meus Projetos</span>}
                        </NavLink>
                    </nav>
                </aside>

                {/* Overlay for mobile */}
                {isSidebarOpen && (
                    <div
                        className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
                        onClick={() => setSidebarOpen(false)}
                    />
                )}

                {/* Right Column: Topbar + Content */}
                <div className="flex flex-col flex-1 overflow-hidden">

                    {/* Topbar */}
                    <Topbar onOpenChangePassword={() => setIsCPModalOpen(true)} />

                    {/* Main Content Area */}
                    <main className="flex-1 overflow-auto p-4 md:p-8">
                        <Outlet />
                    </main>
                </div>
            </div>

            <ChangePasswordModal
                isOpen={isCPModalOpen}
                onClose={() => setIsCPModalOpen(false)}
            />
        </div>
    );
};

export default AreaClienteLayout;
