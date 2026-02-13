import { Colaborador, FolhaPonto, PontoDia, User, UserRole } from './interfaces/types';

const STORAGE_KEYS = {
  COLABORADORES: 'app_colaboradores',
  FOLHAS: 'app_folhas',
  SESSION: 'app_session'
};

// Utils
const generateId = () => Math.random().toString(36).substr(2, 9);
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// --- Auth Service ---

export const login = async (login: string, pass: string): Promise<User> => {
  await delay(500); // Simulate network

  // Hardcoded Admin
  if (login === 'admin' && pass === 'admin') {
    const user: User = {
      id: 'admin_id',
      name: 'Administrador',
      login: 'admin',
      role: UserRole.ADMIN,
      token: 'mock_admin_token'
    };
    localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(user));
    return user;
  }

  // Check Collaborators
  const colaboradores = getColaboradoresSync();
  const found = colaboradores.find(c => c.login === login && c.senha === pass);

  if (found) {
    const user: User = {
      id: found.id,
      name: found.nome,
      login: found.login,
      email: found.email,
      role: UserRole.COLABORADOR,
      token: `mock_colab_${found.id}`
    };
    localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(user));
    return user;
  }

  throw new Error('Credenciais inválidas');
};

export const logout = () => {
  localStorage.removeItem(STORAGE_KEYS.SESSION);
};

export const getCurrentUser = (): User | null => {
  const session = localStorage.getItem(STORAGE_KEYS.SESSION);
  return session ? JSON.parse(session) : null;
};

// --- Colaborador Service ---

const getColaboradoresSync = (): Colaborador[] => {
  const data = localStorage.getItem(STORAGE_KEYS.COLABORADORES);
  return data ? JSON.parse(data) : [];
};

export const getColaboradores = async (): Promise<Colaborador[]> => {
  await delay(300);
  return getColaboradoresSync();
};

export const getColaboradorById = async (id: string): Promise<Colaborador | undefined> => {
  await delay(200);
  return getColaboradoresSync().find(c => c.id === id);
};

export const saveColaborador = async (colab: Partial<Colaborador>): Promise<void> => {
  await delay(400);
  const current = getColaboradoresSync();
  
  if (colab.id) {
    // Update
    const index = current.findIndex(c => c.id === colab.id);
    if (index !== -1) {
      current[index] = { ...current[index], ...colab } as Colaborador;
    }
  } else {
    // Create
    const newColab: Colaborador = {
      ...(colab as Colaborador),
      id: generateId(),
      createdAt: new Date().toISOString()
    };
    current.push(newColab);
  }
  
  localStorage.setItem(STORAGE_KEYS.COLABORADORES, JSON.stringify(current));
};

export const deleteColaborador = async (id: string): Promise<void> => {
  await delay(300);
  const current = getColaboradoresSync();
  const filtered = current.filter(c => c.id !== id);
  localStorage.setItem(STORAGE_KEYS.COLABORADORES, JSON.stringify(filtered));
};

// --- Folha Ponto Service ---

const getFolhaId = (colaboradorId: string, mes: number, ano: number) => 
  `${colaboradorId}_${ano}_${mes}`;

const getDaysInMonth = (month: number, year: number) => 
  new Date(year, month, 0).getDate();

const createEmptyMonth = (colaboradorId: string, mes: number, ano: number): FolhaPonto => {
  const daysCount = getDaysInMonth(mes, ano);
  const dias: PontoDia[] = [];

  for (let i = 1; i <= daysCount; i++) {
    const dataIso = new Date(ano, mes - 1, i).toISOString().split('T')[0];
    dias.push({
      dia: i,
      dataIso,
      entrada1: '',
      saida1: '',
      entrada2: '',
      saida2: '',
      extraEntrada1: '',
      extraSaida1: '',
      extraEntrada2: '',
      extraSaida2: '',
      observacoes: ''
    });
  }

  return {
    id: getFolhaId(colaboradorId, mes, ano),
    colaboradorId,
    mes,
    ano,
    dias,
    updatedAt: new Date().toISOString()
  };
};

export const getFolhaPonto = async (colaboradorId: string, mes: number, ano: number): Promise<FolhaPonto> => {
  await delay(400);
  const allFolhasRaw = localStorage.getItem(STORAGE_KEYS.FOLHAS);
  const allFolhas: Record<string, FolhaPonto> = allFolhasRaw ? JSON.parse(allFolhasRaw) : {};
  
  const id = getFolhaId(colaboradorId, mes, ano);
  
  if (allFolhas[id]) {
    return allFolhas[id];
  }

  // Create new if not exists
  return createEmptyMonth(colaboradorId, mes, ano);
};

export const saveFolhaPonto = async (folha: FolhaPonto): Promise<void> => {
  await delay(500);
  const allFolhasRaw = localStorage.getItem(STORAGE_KEYS.FOLHAS);
  const allFolhas: Record<string, FolhaPonto> = allFolhasRaw ? JSON.parse(allFolhasRaw) : {};
  
  folha.updatedAt = new Date().toISOString();
  allFolhas[folha.id] = folha;
  
  localStorage.setItem(STORAGE_KEYS.FOLHAS, JSON.stringify(allFolhas));
};