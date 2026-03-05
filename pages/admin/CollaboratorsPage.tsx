import React, { useEffect, useState } from 'react';
import { Colaborador } from '../../services/interfaces/types';
import { getColaboradores, saveColaborador, deleteColaborador } from '../../services/colaboradorService';
import { formatCurrency } from '../../utils/timeUtils';

const CollaboratorsPage: React.FC = () => {
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingColab, setEditingColab] = useState<Partial<Colaborador>>({});

  const [selectedColab, setSelectedColab] = useState<Colaborador | null>(null);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [creatingLogin, setCreatingLogin] = useState(false);

  const fetchColaboradores = async () => {
    setIsLoading(true);
    const data = await getColaboradores();
    setColaboradores(data);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchColaboradores();
  }, []);

  const handleOpenModal = (colab?: Colaborador) => {
    if (colab) {
      setEditingColab({ ...colab, senha: '' }); // Don't show password
    } else {
      setEditingColab({
        nome: '',
        email: '',
        telefone: '',
        valorHora: 0,
        valorInssFixo: 0,
        perfil: 'usuario',
        senha: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingColab.nome || !editingColab.email) return;

    try {
      setIsLoading(true);
      await saveColaborador(editingColab);
      setIsModalOpen(false);
      await fetchColaboradores();
      alert('Colaborador e usuário de acesso criados/atualizados com sucesso!');
    } catch (error: any) {
      alert('Erro ao salvar: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateLogin = async () => {
    if (!selectedColab || !password) return;

    try {
      setCreatingLogin(true);
      await saveColaborador({
        ...selectedColab,
        senha: password
      });

      alert('Login de colaborador atualizado com sucesso!');
      setSelectedColab(null);
      setPassword('');
      await fetchColaboradores();
    } catch (err: any) {
      alert(`Erro ao criar login: ${err.message}`);
    } finally {
      setCreatingLogin(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este colaborador?')) {
      await deleteColaborador(id);
      fetchColaboradores();
    }
  };

  const handleCurrencyChange = (value: string, field: 'valorHora' | 'valorInssFixo') => {
    // Remove tudo que não é dígito
    const digits = value.replace(/\D/g, '');
    const numberValue = digits ? parseInt(digits) / 100 : 0;
    setEditingColab({ ...editingColab, [field]: numberValue });
  };

  const displayCurrency = (value?: number) => {
    if (value === undefined || value === 0) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 2,
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const handlePhoneChange = (value: string) => {
    // Remove tudo que não é dígito
    const digits = value.replace(/\D/g, '');

    // Aplica a máscara (XX) XXXXX-XXXX ou (XX) XXXX-XXXX
    let formatted = digits;
    if (digits.length > 0) {
      formatted = `(${digits.slice(0, 2)}`;
    }
    if (digits.length > 2) {
      formatted += `) ${digits.slice(2, 7)}`;
    }
    if (digits.length > 7) {
      formatted += `-${digits.slice(7, 11)}`;
    }

    setEditingColab({ ...editingColab, telefone: formatted.slice(0, 15) });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Colaboradores</h2>
          <p className="text-slate-400 text-sm">Gerencie o acesso e valores da equipe.</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="bg-primary hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
        >
          <span>+</span> Novo Colaborador
        </button>
      </div>

      {isLoading ? (
        <div className="text-center py-10 text-slate-500">Carregando...</div>
      ) : (
        <div className="bg-surface rounded-xl border border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-900/50 text-slate-400 uppercase text-xs font-semibold">
                <tr>
                  <th className="px-6 py-4">Nome</th>
                  <th className="px-6 py-4">Contato</th>
                  <th className="px-6 py-4 text-center">Valor/Hora</th>
                  <th className="px-6 py-4 text-center">Perfil</th>
                  <th className="px-6 py-4 text-center">Login</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {colaboradores.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                      Nenhum colaborador cadastrado.
                    </td>
                  </tr>
                ) : (
                  colaboradores.map((colab) => (
                    <tr key={colab.id} className="hover:bg-slate-700/30 transition-colors">
                      <td className="px-6 py-4 font-medium text-white">{colab.nome}</td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span>{colab.email}</span>
                          <span className="text-xs text-slate-500">{colab.telefone}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center text-accent">{formatCurrency(colab.valorHora)}</td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold ${colab.perfil === 'admin' ? 'bg-primary/20 text-primary' : 'bg-slate-700 text-slate-400'}`}>
                          {colab.perfil || 'usuario'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => {
                            setSelectedColab(colab);
                            setPassword('');
                          }}
                          className={`transition-colors p-1.5 rounded-full hover:bg-slate-700 ${colab.userId ? 'text-emerald-500' : 'text-slate-500 hover:text-white'}`}
                          title={colab.userId ? "Gerenciar Login" : "Criar Login"}
                        >
                          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M2 21a8 8 0 0 1 13.292-6" />
                            <circle cx="10" cy="8" r="5" />
                            <path d="m21 8.5 1.5 1.5" />
                            <path d="M19 10.5 20.5 12" />
                            <path d="m17 12.5 1.5 1.5" />
                            <path d="m15.5 14 3-3 3.5 3.5-3 3-3.5-3.5Z" />
                          </svg>
                        </button>
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <button
                          onClick={() => handleOpenModal(colab)}
                          className="inline-block text-xs px-2 py-1 rounded border border-amber-500/30 text-amber-400 hover:bg-amber-500/10 transition-colors"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDelete(colab.id)}
                          className="inline-block text-xs px-2 py-1 rounded border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors"
                        >
                          Excluir
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal de cadastro/edição */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-surface w-full max-w-lg rounded-2xl border border-slate-700 p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-4">
              {editingColab.id ? 'Editar Colaborador' : 'Novo Colaborador'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs text-slate-400 mb-1">Nome Completo</label>
                  <input
                    type="text"
                    required
                    className="w-full bg-background border border-slate-600 rounded p-2 text-white focus:border-primary outline-none"
                    value={editingColab.nome || ''}
                    onChange={e => setEditingColab({ ...editingColab, nome: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">E-mail</label>
                  <input
                    type="email"
                    required
                    className="w-full bg-background border border-slate-600 rounded p-2 text-white focus:border-primary outline-none"
                    value={editingColab.email || ''}
                    onChange={e => setEditingColab({ ...editingColab, email: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Telefone</label>
                  <input
                    type="text"
                    required
                    maxLength={15}
                    className="w-full bg-background border border-slate-600 rounded p-2 text-white focus:border-primary outline-none"
                    value={editingColab.telefone || ''}
                    onChange={e => handlePhoneChange(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Valor Hora (R$)</label>
                  <input
                    type="text"
                    required
                    className="w-full bg-background border border-slate-600 rounded p-2 text-white focus:border-primary outline-none"
                    value={displayCurrency(editingColab.valorHora)}
                    onChange={e => handleCurrencyChange(e.target.value, 'valorHora')}
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Valor INSS Mensal (R$)</label>
                  <input
                    type="text"
                    className="w-full bg-background border border-slate-600 rounded p-2 text-white focus:border-primary outline-none"
                    value={displayCurrency(editingColab.valorInssFixo)}
                    onChange={e => handleCurrencyChange(e.target.value, 'valorInssFixo')}
                  />
                </div>
              </div>

              <div className="border-t border-slate-700 pt-4 mt-2">
                <h4 className="text-sm font-semibold text-slate-300 mb-3">Acesso</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Perfil</label>
                    <select
                      className="w-full bg-background border border-slate-600 rounded p-2 text-white focus:border-primary outline-none"
                      value={editingColab.perfil || 'usuario'}
                      onChange={e => setEditingColab({ ...editingColab, perfil: e.target.value as 'admin' | 'usuario' })}
                    >
                      <option value="usuario">Usuário</option>
                      <option value="admin">Administrador</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Senha</label>
                    <input
                      type="text" // Visible for admin convenience
                      required={!editingColab.id}
                      placeholder={editingColab.id ? "Manter atual" : ""}
                      className="w-full bg-background border border-slate-600 rounded p-2 text-white focus:border-primary outline-none"
                      value={editingColab.senha || ''}
                      onChange={e => setEditingColab({ ...editingColab, senha: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-primary hover:bg-blue-600 text-white px-6 py-2 rounded font-medium transition-colors disabled:opacity-50"
                  disabled={isLoading}
                >
                  {isLoading ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Gerenciamento de Login (igual ao de Clientes) */}
      {selectedColab && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-surface w-full max-w-md p-6 rounded-xl border border-slate-700 shadow-2xl animate-in fade-in zoom-in duration-200">
            <h2 className="text-xl font-bold text-white mb-2">Login de Acesso</h2>
            <p className="text-slate-400 text-sm mb-6">
              Defina ou altere a senha para o colaborador <strong>{selectedColab.nome}</strong> acessar o sistema.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">E-mail do Colaborador</label>
                <input
                  type="text"
                  disabled
                  value={selectedColab.email || ''}
                  className="w-full px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-500 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Nova Senha</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    autoFocus
                    placeholder="Mínimo 6 caracteres"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !creatingLogin && password.length >= 6) {
                        handleCreateLogin();
                      }
                    }}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors p-1"
                  >
                    {showPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-8">
              <button
                onClick={() => {
                  setSelectedColab(null);
                  setPassword('');
                  setShowPassword(false);
                }}
                className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateLogin}
                disabled={creatingLogin || password.length < 6}
                className="px-6 py-2 bg-primary hover:bg-primary-dark text-white font-bold rounded-lg transition-colors shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creatingLogin ? 'Salvando...' : 'Confirmar e Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CollaboratorsPage;