export type Prioridade = "Alta" | "Média" | "Baixa";
export type StatusTarefa = "Pendente" | "Concluída";
export type StatusProjeto = "Em Andamento" | "Concluído" | "Pausado";

export interface Tarefa {
  id: string | number;
  titulo: string;
  descricao: string;
  categoria: string;
  prioridade: Prioridade;
  data_vencimento: string;
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
  data_limite?: string;
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
}


