export enum UserRole {
  ADMIN = 'ADMIN',
  COLABORADOR = 'COLABORADOR',
  CLIENTE = 'CLIENTE'
}

export interface User {
  id: string;
  name: string;
  login: string;
  role: UserRole;
  email?: string;
  token?: string; // Mock token
}

export interface Colaborador {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  valorHora: number;
  valorInssFixo?: number;
  login: string;
  senha?: string; // Only used for creation/auth check, not returned in lists ideally
  createdAt: string;
}

export interface PontoDia {
  dia: number; // 1-31
  dataIso: string; // YYYY-MM-DD

  // Normal
  entrada1: string; // HH:MM
  saida1: string;   // HH:MM (Almoço inicio)
  entrada2: string; // HH:MM (Almoço fim)
  saida2: string;   // HH:MM

  // Extra
  extraEntrada1: string;
  extraSaida1: string; // Intervalo inicio
  extraEntrada2: string; // Intervalo fim
  extraSaida2: string;

  observacoes: string;
}

export interface FolhaPonto {
  id: string; // Composite key: colaboradorId_YYYY_MM
  colaboradorId: string;
  mes: number;
  ano: number;
  dias: PontoDia[];
  updatedAt: string;

  // Payment fields
  valorTotalCalculado?: number;
  valorInss?: number;
  valorPagoFinal?: number;
  snapshotValorHora?: number;
  snapshotTotalHoras?: number;
  statusPagamento?: 'pendente' | 'pago';
}

export interface ResumoPagamento {
  colaboradorId: string;
  colaboradorNome: string;
  mes: number;
  ano: number;
  totalHorasNormais: number;
  totalHorasExtras: number;
  totalGeral: number;
  valorHora: number;
  totalPagar: number;
  statusPagamento?: 'pendente' | 'pago';
  valorTotalCalculado?: number;
  valorInss?: number;
}

export interface ProjetoTipo {
  id: string;
  nome: string;
  ativo: boolean;
  contratoTemplatePath?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Cliente {
  id: string;
  nome: string;
  email?: string;
  telefone: string;
  cpfCnpj?: string;
  dataNascimento?: string;
  endereco?: string;
  observacoes?: string;
  ativo: boolean;
  origem?: string;
  auth_user_id?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Projeto {
  id: string;
  clienteId: string;
  nomeProjeto: string;
  empresa?: string;
  enderecoObra?: string;
  dataInicio?: string;
  dataPrevistaTermino?: string;
  status: string; // 'nao_iniciado' | 'em_andamento' | 'concluido' | 'cancelado'
  valor?: number;
  formaPagamento?: string;
  numeroPrestacoes?: number;
  dataPrimeiroVencimento?: string;
  observacoes?: string;
  projetoTipoId?: string;
  createdAt: string;
  updatedAt?: string;

  // Campos opcionais para join
  cliente?: Partial<Cliente>;
  projetoTipo?: Partial<ProjetoTipo>;
  contrato?: { arquivoPath: string };
}

export interface ProjetoParcela {
  id: string;
  projetoId: string;
  numeroParcela: number;
  valorParcela: number;
  dataVencimento?: string;
  dataRecebimento?: string;
  status: 'pendente' | 'recebido' | 'atrasado';
  createdAt: string;
  updatedAt: string;
}

export interface RelatorioRecebimento {
  projetoId: string;
  nomeProjeto: string;
  clienteNome: string;
  valorTotal: number;
  numeroParcelas: number;
  parcelasRecebidas: number;
  valorRecebido: number;
  valorEmAberto: number;
  todasPagas: boolean;
  statusFinanceiro: 'quitado' | 'em_dia' | 'atrasado';
}

export interface ProjetoEtapa {
  id: string;
  projetoId: string;
  nomeEtapa: string;
  ordem?: number;
  dataInicioPrevista?: string;
  dataFimPrevista?: string;
  status: 'nao_iniciado' | 'em_andamento' | 'concluido' | 'cancelado';
  colaboradorId?: string;
  createdAt?: string;
  updatedAt?: string;

  // Campo opcional para join
  colaborador?: {
    nome: string;
  };
}

export interface ProjetoTipoEtapa {
  id: string;
  projetoTipoId: string;
  nomeEtapa: string;
  ordem?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface ContaPagar {
  id: string;
  descricao: string;
  categoria?: string;
  valor: number;
  data_vencimento: string; // ISO date YYYY-MM-DD
  observacoes?: string;
  recorrente: boolean;
  created_at?: string;
}
export interface ContaPagarPagamento {
  id: string;
  conta_id: string;
  data_pagamento: string; // ISO date YYYY-MM-DD
  valor_pago: number;
  mes_referencia: number;
  ano_referencia: number;
  created_at?: string;
}

export type PerguntaTipo = 'texto' | 'textarea' | 'numero' | 'email' | 'telefone' | 'select' | 'radio' | 'checkbox' | 'data' | 'arquivo';

export interface BriefingOpcao {
  label: string;
  value: string;
  image_url: string | null;
}

export interface BriefingPergunta {
  id: string;
  pergunta: string;
  tipo: PerguntaTipo;
  obrigatorio: boolean;
  opcoes?: BriefingOpcao[] | string[]; // Suporta legidaco e novo formato
  ordem: number;
  ativo: boolean;
  instagram: boolean;
  created_at?: string;
}

export type BriefingStatus = 'novo' | 'em_contato' | 'convertido' | 'descartado';

export interface BriefingAnexo {
  pergunta_id: string;
  nome: string;
  url: string;
  tipo: string;
  tamanho: number;
}

export interface BriefingResposta {
  id: string;
  nome: string;
  email: string;
  telefone?: string;
  tipo_projeto_id?: string;
  respostas: Record<string, any>;
  anexos?: BriefingAnexo[];
  status: BriefingStatus;
  created_at?: string;
}

export interface Empresa {
  id?: string;
  razao_social: string;
  nome_fantasia?: string;
  cnpj?: string;
  inscricao_estadual?: string;
  email?: string;
  telefone?: string;
  cep?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  logo_url?: string;
  titulo_briefing?: string;
  texto_briefing?: string;
  slug: string;
  ativo: boolean;
  created_at?: string;
  updated_at?: string;
}
