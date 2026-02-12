import React, { useEffect, useState } from 'react';
import { Colaborador } from '../../services/interfaces/types';
import { getColaboradores, saveColaborador, deleteColaborador } from '../../services/colaboradorService';
import { formatCurrency } from '../../utils/timeUtils';

const CollaboratorsPage: React.FC = () => {
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingColab, setEditingColab] = useState<Partial<Colaborador>>({});

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
        login: '',
        senha: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingColab.nome || !editingColab.login) return;

    await saveColaborador(editingColab);
    setIsModalOpen(false);
    fetchColaboradores();
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este colaborador?')) {
      await deleteColaborador(id);
      fetchColaboradores();
    }
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
                  <th className="px-6 py-4">Valor/Hora</th>
                  <th className="px-6 py-4">Login</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {colaboradores.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
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
                      <td className="px-6 py-4 text-accent">{formatCurrency(colab.valorHora)}</td>
                      <td className="px-6 py-4">{colab.login}</td>
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

      {/* Modal */}
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
                    className="w-full bg-background border border-slate-600 rounded p-2 text-white focus:border-primary outline-none"
                    value={editingColab.telefone || ''}
                    onChange={e => setEditingColab({ ...editingColab, telefone: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Valor Hora (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    className="w-full bg-background border border-slate-600 rounded p-2 text-white focus:border-primary outline-none"
                    value={editingColab.valorHora || ''}
                    onChange={e => setEditingColab({ ...editingColab, valorHora: parseFloat(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Valor INSS Mensal (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full bg-background border border-slate-600 rounded p-2 text-white focus:border-primary outline-none"
                    value={editingColab.valorInssFixo || 0}
                    onChange={e => setEditingColab({ ...editingColab, valorInssFixo: parseFloat(e.target.value) })}
                  />
                </div>
              </div>

              <div className="border-t border-slate-700 pt-4 mt-2">
                <h4 className="text-sm font-semibold text-slate-300 mb-3">Acesso</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Login</label>
                    <input
                      type="text"
                      required
                      className="w-full bg-background border border-slate-600 rounded p-2 text-white focus:border-primary outline-none"
                      value={editingColab.login || ''}
                      onChange={e => setEditingColab({ ...editingColab, login: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Senha</label>
                    <input
                      type="text" // Visible for admin convenience in this mock
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
                  className="bg-primary hover:bg-blue-600 text-white px-6 py-2 rounded font-medium transition-colors"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CollaboratorsPage;
