import React, { useEffect, useState, useRef } from 'react';
import { getEmpresa, upsertEmpresa, uploadAsset } from '../../services/empresaService';
import { Empresa } from '../../services/interfaces/types';
import { maskCNPJ, maskTelefone, maskCEP } from '../../utils/masks';

const EmpresaPage: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const [formData, setFormData] = useState<Omit<Empresa, 'id' | 'created_at' | 'updated_at'>>({
        razao_social: '',
        nome_fantasia: '',
        cnpj: '',
        inscricao_estadual: '',
        responsavel_tecnico: '',
        registro_profissional: '',
        email: '',
        telefone: '',
        cep: '',
        logradouro: '',
        numero: '',
        complemento: '',
        bairro: '',
        cidade: '',
        estado: '',
        logo_url: '',
        titulo_briefing: '',
        texto_briefing: '',
        slug: '',
        ativo: true
    });

    const logoInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const data = await getEmpresa();
            if (data) {
                const { id, created_at, updated_at, ...rest } = data;
                setFormData(rest as any);
            }
        } catch (err: any) {
            setError('Erro ao carregar dados da empresa: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        let maskedValue = value;

        if (name === 'cnpj') maskedValue = maskCNPJ(value);
        if (name === 'telefone') maskedValue = maskTelefone(value);
        if (name === 'cep') maskedValue = maskCEP(value);

        setFormData(prev => ({ ...prev, [name]: maskedValue }));
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Limite: 2MB para logo
        const maxSize = 2 * 1024 * 1024;
        if (file.size > maxSize) {
            setError(`O arquivo é muito grande. Máximo permitido: 2MB`);
            return;
        }

        try {
            setSaving(true);
            const url = await uploadAsset(file, 'logo');
            setFormData(prev => ({
                ...prev,
                logo_url: url
            }));
            setSuccess('Upload realizado com sucesso!');
        } catch (err: any) {
            setError('Erro no upload: ' + err.message);
        } finally {
            setSaving(false);
            if (e.target) e.target.value = '';
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!formData.razao_social) {
            setError('Razão Social é obrigatória.');
            return;
        }

        try {
            setSaving(true);
            await upsertEmpresa(formData as Empresa);
            setSuccess('Dados da empresa salvos com sucesso!');
            // Scroll to top to see success message
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (err: any) {
            setError('Erro ao salvar: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-6 text-slate-300">Carregando...</div>;

    return (
        <div className="max-w-4xl mx-auto space-y-8 pb-12">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white">Configuração da Empresa</h1>
                    <p className="text-slate-400 font-medium">Configurações gerais e identidade visual do escritório</p>
                </div>
                <button
                    onClick={handleSubmit}
                    disabled={saving}
                    className="bg-primary hover:bg-primary-dark text-white px-8 py-3 rounded-xl font-bold transition-all shadow-lg shadow-primary/20 disabled:opacity-50 flex items-center gap-2"
                >
                    {saving ? (
                        <>
                            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                            Salvando...
                        </>
                    ) : (
                        'Salvar Alterações'
                    )}
                </button>
            </div>

            {error && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-500 p-4 rounded-xl flex items-center gap-3">
                    <span className="text-xl">⚠️</span> {error}
                </div>
            )}

            {success && (
                <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 p-4 rounded-xl flex items-center gap-3">
                    <span className="text-xl">✅</span> {success}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-8">
                {/* SEÇÃO 1 – Dados da Empresa */}
                <section className="bg-surface border border-slate-700/50 rounded-2xl overflow-hidden shadow-sm">
                    <div className="bg-slate-800/50 p-4 border-b border-slate-700/50">
                        <h2 className="font-bold text-slate-200 flex items-center gap-2 uppercase tracking-widest text-xs">
                            <span className="text-primary">01</span> Dados da Empresa
                        </h2>
                    </div>
                    <div className="p-6 space-y-8">
                        {/* Logo Upload */}
                        <div className="max-w-md">
                            <div className="space-y-4">
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2 tracking-wider">Logo do Escritório</label>
                                <div className="flex flex-col sm:flex-row items-center gap-6 p-4 bg-slate-900/30 rounded-2xl border border-slate-800">
                                    <div className="w-24 h-24 rounded-2xl bg-slate-900 border border-slate-700 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                                        {formData.logo_url ? (
                                            <img src={formData.logo_url} alt="Logo" className="w-full h-full object-contain p-2" />
                                        ) : (
                                            <span className="text-2xl text-slate-700">🏢</span>
                                        )}
                                    </div>
                                    <div className="text-center sm:text-left">
                                        <input
                                            type="file"
                                            ref={logoInputRef}
                                            onChange={handleFileUpload}
                                            accept="image/*"
                                            className="hidden"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => logoInputRef.current?.click()}
                                            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-all border border-slate-700 flex items-center gap-2"
                                        >
                                            <span className="text-primary">↑</span> Upload Logo
                                        </button>
                                        <p className="text-[10px] text-slate-500 mt-2 font-medium italic">Tamanho máx: 2MB. PNG ou SVG.</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-800/50">
                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Razão Social *</label>
                                <input
                                    name="razao_social"
                                    value={formData.razao_social}
                                    onChange={handleChange}
                                    placeholder="Nome oficial do escritório"
                                    className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30 transition-all placeholder:text-slate-600"
                                    required
                                    autoComplete="off"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Nome Fantasia</label>
                                <input
                                    name="nome_fantasia"
                                    value={formData.nome_fantasia}
                                    onChange={handleChange}
                                    placeholder="Nome como é conhecido"
                                    className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-primary focus:outline-none transition-all placeholder:text-slate-600"
                                    autoComplete="off"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">CNPJ</label>
                                <input
                                    name="cnpj"
                                    value={formData.cnpj}
                                    onChange={handleChange}
                                    placeholder="00.000.000/0000-00"
                                    className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-primary focus:outline-none transition-all placeholder:text-slate-600 font-mono"
                                    autoComplete="off"
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Inscrição Estadual</label>
                                <input
                                    name="inscricao_estadual"
                                    value={formData.inscricao_estadual}
                                    onChange={handleChange}
                                    placeholder="Se houver"
                                    className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-primary focus:outline-none transition-all placeholder:text-slate-600"
                                    autoComplete="off"
                                />
                            </div>
                            <div className="md:col-span-1">
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Responsável Técnico</label>
                                <input
                                    name="responsavel_tecnico"
                                    value={formData.responsavel_tecnico}
                                    onChange={handleChange}
                                    placeholder="Nome do Responsável"
                                    className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-primary focus:outline-none transition-all placeholder:text-slate-600"
                                    autoComplete="off"
                                />
                            </div>
                            <div className="md:col-span-1">
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Registro Profissional</label>
                                <input
                                    name="registro_profissional"
                                    value={formData.registro_profissional}
                                    onChange={handleChange}
                                    placeholder="CAU/CREA"
                                    className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-primary focus:outline-none transition-all placeholder:text-slate-600"
                                    autoComplete="off"
                                />
                            </div>
                        </div>
                    </div>
                </section>

                {/* SEÇÃO 2 – Contato */}
                <section className="bg-surface border border-slate-700/50 rounded-2xl overflow-hidden shadow-sm">
                    <div className="bg-slate-800/50 p-4 border-b border-slate-700/50">
                        <h2 className="font-bold text-slate-200 flex items-center gap-2 uppercase tracking-widest text-xs">
                            <span className="text-primary">02</span> Contato
                        </h2>
                    </div>
                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Email de contato</label>
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                placeholder="exemplo@gmail.com"
                                className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-primary focus:outline-none transition-all placeholder:text-slate-600"
                                autoComplete="off"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Telefone Principal</label>
                            <input
                                name="telefone"
                                value={formData.telefone}
                                onChange={handleChange}
                                placeholder="(00) 00000-0000"
                                className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-primary focus:outline-none transition-all placeholder:text-slate-600"
                                autoComplete="off"
                            />
                        </div>
                    </div>
                </section>

                {/* SEÇÃO 3 – Endereço */}
                <section className="bg-surface border border-slate-700/50 rounded-2xl overflow-hidden shadow-sm">
                    <div className="bg-slate-800/50 p-4 border-b border-slate-700/50">
                        <h2 className="font-bold text-slate-200 flex items-center gap-2 uppercase tracking-widest text-xs">
                            <span className="text-primary">03</span> Endereço
                        </h2>
                    </div>
                    <div className="p-6 grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">CEP</label>
                            <input
                                name="cep"
                                value={formData.cep}
                                onChange={handleChange}
                                placeholder="00000-000"
                                className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-primary focus:outline-none transition-all placeholder:text-slate-600"
                                autoComplete="off"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Logradouro</label>
                            <input
                                name="logradouro"
                                value={formData.logradouro}
                                onChange={handleChange}
                                placeholder="Ex: Av. Principal, Rua das Flores..."
                                className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-primary focus:outline-none transition-all placeholder:text-slate-600"
                                autoComplete="off"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Número</label>
                            <input
                                name="numero"
                                value={formData.numero}
                                onChange={handleChange}
                                placeholder="Ex: 50"
                                className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-primary focus:outline-none transition-all placeholder:text-slate-600"
                                autoComplete="off"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Bairro</label>
                            <input
                                name="bairro"
                                value={formData.bairro}
                                onChange={handleChange}
                                placeholder="Bairro"
                                className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-primary focus:outline-none transition-all placeholder:text-slate-600"
                                autoComplete="off"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Cidade</label>
                            <input
                                name="cidade"
                                value={formData.cidade}
                                onChange={handleChange}
                                placeholder="Cidade"
                                className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-primary focus:outline-none transition-all placeholder:text-slate-600"
                                autoComplete="off"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Estado (UF)</label>
                            <input
                                name="estado"
                                value={formData.estado}
                                onChange={handleChange}
                                placeholder="UF"
                                maxLength={2}
                                className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-primary focus:outline-none transition-all placeholder:text-slate-600 uppercase"
                                autoComplete="off"
                            />
                        </div>
                        <div className="md:col-span-4">
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Complemento</label>
                            <input
                                name="complemento"
                                value={formData.complemento}
                                onChange={handleChange}
                                placeholder="Ex: Sala 10, Bloco B"
                                className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-primary focus:outline-none transition-all placeholder:text-slate-600"
                                autoComplete="off"
                            />
                        </div>
                    </div>
                </section>

                {/* SEÇÃO 4 – Identidade Visual */}
                <section className="bg-surface border border-slate-700/50 rounded-2xl overflow-hidden shadow-sm">
                    <div className="bg-slate-800/50 p-4 border-b border-slate-700/50">
                        <h2 className="font-bold text-slate-200 flex items-center gap-2 uppercase tracking-widest text-xs">
                            <span className="text-primary">04</span> Briefing
                        </h2>
                    </div>
                    <div className="p-6 space-y-8">
                        <div className="space-y-6">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Título Personalizado do Briefing</label>
                                <input
                                    name="titulo_briefing"
                                    value={formData.titulo_briefing}
                                    onChange={handleChange}
                                    placeholder="Ex: Briefing de Arquitetura e Decoração"
                                    className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-primary focus:outline-none transition-all placeholder:text-slate-600"
                                    autoComplete="off"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Texto Institucional (Boas-vindas)</label>
                                <textarea
                                    name="texto_briefing"
                                    value={formData.texto_briefing}
                                    onChange={handleChange}
                                    placeholder="Apresente seu escritório para quem for responder ao briefing..."
                                    rows={6}
                                    className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-primary focus:outline-none transition-all placeholder:text-slate-600 resize-none"
                                ></textarea>
                                <p className="text-[11px] text-slate-500 mt-2 italic flex items-center gap-1.5">
                                    <span>ℹ️</span> Este texto aparecerá no topo da tela pública do briefing.
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-8 border-t border-slate-800">
                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Slug (Link de Briefing) *</label>
                                <div className="flex items-center gap-2">
                                    <span className="text-slate-500 font-mono text-xs">/briefing/</span>
                                    <input
                                        name="slug"
                                        value={formData.slug}
                                        onChange={(e) => {
                                            const cleanValue = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
                                            setFormData(prev => ({ ...prev, slug: cleanValue }));
                                        }}
                                        placeholder="ex-meu-escritorio"
                                        className="flex-1 bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-primary focus:outline-none transition-all placeholder:text-slate-600 font-mono"
                                        required
                                        autoComplete="off"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </form>
        </div>
    );
};

export default EmpresaPage;
