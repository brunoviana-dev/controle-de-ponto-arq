export enum UserRole {
  ADMIN = 'ADMIN',
  COLABORADOR = 'COLABORADOR'
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
  status: string; // 'planejamento' | 'em_andamento' | 'concluido' | 'cancelado'
  observacoes?: string;
  createdAt: string;
  updatedAt?: string;

  // Campo opcional para join
  cliente?: Partial<Cliente>;
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
