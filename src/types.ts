export type Prioridade = "Alta" | "Média" | "Baixa";
export type StatusTarefa = "Pendente" | "Concluída";
export type StatusProjeto = "Em Andamento" | "Concluído" | "Pausado";

export interface Tarefa {
  id: string | number;
  titulo: string;
  descricao: string;
  categoria: string;
  prioridade: Prioridade;
  data_inicio?: string; // Data de início (YYYY-MM-DD)
  data_vencimento: string; // Data de término / vencimento (YYYY-MM-DD)
  hora_inicio?: string; // Horário de início (HH:mm)
  hora_fim?: string; // Horário de término (HH:mm)
  status: StatusTarefa;
  criado_em: string;
  userId?: string;
}

export interface PassoProjeto {
  id: string | number;
  projeto_id: string | number;
  titulo: string;
  concluido: boolean;
  ordem: number;
  data_inicio?: string;
  data_limite?: string;
  hora_inicio?: string;
  hora_fim?: string;
  tipo?: string; // Tipo/Grupo de tarefa (ex: "Planejamento", "Design", "Execução", "Testes", etc.)
}

export interface Projeto {
  id: string | number;
  titulo: string;
  descricao: string;
  categoria: string;
  data_limite: string;
  status: StatusProjeto;
  criado_em: string;
  passos: PassoProjeto[];
  progresso_pct: number;
  total_passos: number;
  passos_concluidos: number;
  tipos_tarefas?: string[];
  userId?: string;
}

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  isAnonymous: boolean;
}

export interface MetricSummary {
  total: number;
  concluidas: number;
  pendentes: number;
  taxa: number;
  totalProjetos: number;
  projetosEmAndamento: number;
  mediaProgressoProjetos: number;
  totalMercadoPendentes?: number;
}

export interface ItemMercado {
  id: string | number;
  nome: string;
  categoria: string;
  quantidade?: string;
  comprado: boolean;
  criado_em: string;
  userId?: string;
}


