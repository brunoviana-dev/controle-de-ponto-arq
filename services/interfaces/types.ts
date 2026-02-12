export enum UserRole {
  ADMIN = 'admin',
  COLABORADOR = 'colaborador'
}

export interface User {
  id: string;
  name: string;
  login: string;
  email: string;
  role: UserRole;
  token?: string;
}

export interface Colaborador {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  valorHora: number;
  valorInssFixo: number;
  login: string;
  createdAt?: string;
  senha?: string; // Usado apenas no formulário
}

export interface PontoDia {
  dia: number;
  dataIso: string;
  entrada1: string;
  saida1: string;
  entrada2: string;
  saida2: string;
  extraEntrada1: string;
  extraSaida1: string;
  extraEntrada2: string;
  extraSaida2: string;
  observacoes: string;
}

export interface FolhaPonto {
  id: string;
  colaboradorId: string;
  mes: number;
  ano: number;
  dias: PontoDia[];
  updatedAt: string;
  statusPagamento?: 'pendente' | 'pago';
  valorTotalCalculado?: number;
  valorInss?: number;
  valorPagoFinal?: number;
  snapshotValorHora?: number;
  snapshotTotalHoras?: number;
}

export interface ResumoPagamento {
  colaboradorId: string;
  colaboradorNome: string;
  mes: number;
  ano: number;
  totalHorasNormais: number;
  totalHorasExtras: number;
  totalGeral: number; // minutos
  valorHora: number;
  valorTotalCalculado: number;
  valorInss: number;
  totalPagar: number;
  statusPagamento: 'pago' | 'pendente';
}

export interface Cliente {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  ativo: boolean;
  createdAt: string;
}

export interface Projeto {
  id: string;
  clienteId: string;
  nomeProjeto: string;
  empresa?: string;
  enderecoObra?: string;
  dataInicio?: string;
  dataPrevistaTermino?: string;
  status: 'planejamento' | 'em_andamento' | 'concluido' | 'cancelado';
  observacoes?: string;
  createdAt: string;
  updatedAt: string;

  // Campo opcional para o join
  cliente?: {
    id: string;
    nome: string;
    email?: string;
    telefone?: string;
    ativo?: boolean;
    createdAt?: string;
  };
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
