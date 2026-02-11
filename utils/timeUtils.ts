
export const timeToMinutes = (time: string): number => {
  if (!time) return 0;
  const [hours, minutes] = time.split(':').map(Number);
  if (isNaN(hours) || isNaN(minutes)) return 0;
  return hours * 60 + minutes;
};

export const minutesToTime = (minutes: number): string => {
  if (minutes <= 0) return "00:00";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

export const calculateWorkedMinutes = (entrada: string, saida: string): number => {
  const start = timeToMinutes(entrada);
  const end = timeToMinutes(saida);
  if (start === 0 || end === 0) return 0;
  if (end < start) return 0; // Assume no overnight shifts for simplicity or invalid
  return end - start;
};

export const calculateDailyTotal = (
  e1: string, s1: string, e2: string, s2: string
): number => {
  // Caso 1: Nenhum horário preenchido
  if (!e1) return 0;

  // Caso 2: Só entrada preenchida (sem saída alguma)
  if (!s1 && !e2 && !s2) return 0;

  // Caso 3: Entrada + Almoço Ini preenchidos, mas sem retorno e saída final
  // Calcula: Almoço Ini - Entrada
  if (e1 && s1 && !e2 && !s2) {
    return calculateWorkedMinutes(e1, s1);
  }

  // Caso 4: Entrada e Saída final preenchidas, sem intervalo de almoço
  // Calcula: Saída - Entrada (jornada contínua)
  if (e1 && !s1 && !e2 && s2) {
    return calculateWorkedMinutes(e1, s2);
  }

  // Caso 5: Todos os horários preenchidos (jornada completa com intervalo)
  // Calcula: (Almoço Ini - Entrada) + (Saída - Almoço Fim)
  if (e1 && s1 && e2 && s2) {
    const morning = calculateWorkedMinutes(e1, s1);
    const afternoon = calculateWorkedMinutes(e2, s2);
    return morning + afternoon;
  }

  // Caso 6: Entrada, Almoço completo, mas sem saída final ainda
  // Calcula apenas o período da manhã: Almoço Ini - Entrada
  if (e1 && s1 && e2 && !s2) {
    return calculateWorkedMinutes(e1, s1);
  }

  // Qualquer outro cenário parcial não contemplado
  return 0;
};

export const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};

export const getMonthName = (month: number) => {
  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  return months[month - 1];
};
