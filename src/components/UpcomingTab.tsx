import React, { useState, useMemo } from "react";
import {
  CalendarClock,
  CheckCircle2,
  Clock,
  ListTodo,
  FolderKanban,
  Check,
  AlertTriangle,
  Calendar,
  Search,
  Layers,
  Flame,
  Plus,
  Trash2,
  Edit3,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  X,
  Filter,
  RotateCcw,
  Tag,
  AlertCircle,
} from "lucide-react";
import { Tarefa, Projeto, PassoProjeto, Prioridade, StatusTarefa } from "../types";

export interface EtapaItemUpcoming {
  id: string;
  stepId: string | number;
  projetoId: string | number;
  projetoTitulo: string;
  categoria: string;
  titulo: string;
  data_vencimento?: string;
  step: PassoProjeto;
}

interface UpcomingTabProps {
  tarefas: Tarefa[];
  projetos: Projeto[];
  categorias: string[];
  onToggleTaskStatus: (id: string | number, currentStatus: "Pendente" | "Concluída") => Promise<void>;
  onToggleProjectStep: (projectId: string | number, step: PassoProjeto) => Promise<void>;
  onEditTask: (tarefa: Tarefa) => void;
  onDeleteTask: (id: string | number) => Promise<void>;
  onCreateTask: (novaTarefa: {
    titulo: string;
    descricao: string;
    categoria: string;
    prioridade: Prioridade;
    data_vencimento: string;
  }) => Promise<void>;
  onNavigateToTab?: (tab: string) => void;
  onShowToast: (text: string, type?: "success" | "info") => void;
}

type TipoVisualizacao = "secoes" | "lista_continua";
type FiltroPeriodo = "todos" | "vencidas" | "hoje" | "amanha" | "7dias" | "sem_data";

// Date helpers
const parseDate = (dateStr?: string): Date | null => {
  if (!dateStr || !dateStr.trim()) return null;
  const parts = dateStr.trim().split("-");
  if (parts.length !== 3) return null;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  if (isNaN(year) || isNaN(month) || isNaN(day)) return null;
  return new Date(year, month, day);
};

const getDaysDiff = (dateStr?: string): number | null => {
  const target = parseDate(dateStr);
  if (!target) return null;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const diffTime = target.getTime() - today.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
};

const formatBrDate = (dateStr?: string) => {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
};

const formatRelativeDate = (dateStr?: string) => {
  const diff = getDaysDiff(dateStr);
  if (diff === null) {
    return {
      text: "Sem data",
      badgeClass: "bg-slate-100 text-slate-600 border-slate-200",
      days: 9999,
    };
  }

  if (diff < 0) {
    const days = Math.abs(diff);
    return {
      text: days === 1 ? "Atrasada há 1 dia" : `Atrasada há ${days} dias`,
      badgeClass: "bg-rose-100 text-rose-800 border-rose-200 font-bold",
      days: diff,
    };
  }
  if (diff === 0) {
    return {
      text: "Vence Hoje",
      badgeClass: "bg-amber-100 text-amber-800 border-amber-200 font-bold animate-pulse",
      days: 0,
    };
  }
  if (diff === 1) {
    return {
      text: "Amanhã",
      badgeClass: "bg-blue-100 text-blue-800 border-blue-200 font-semibold",
      days: 1,
    };
  }
  if (diff <= 7) {
    return {
      text: `Em ${diff} dias (${formatBrDate(dateStr)})`,
      badgeClass: "bg-indigo-50 text-indigo-700 border-indigo-200 font-medium",
      days: diff,
    };
  }
  return {
    text: `Em ${diff} dias (${formatBrDate(dateStr)})`,
    badgeClass: "bg-slate-100 text-slate-700 border-slate-200 font-normal",
    days: diff,
  };
};

export const UpcomingTab: React.FC<UpcomingTabProps> = ({
  tarefas,
  projetos,
  categorias,
  onToggleTaskStatus,
  onToggleProjectStep,
  onEditTask,
  onDeleteTask,
  onCreateTask,
  onNavigateToTab,
  onShowToast,
}) => {
  // Filter States - Defaulting status to "Pendente" as requested so "Em Breve" starts focused on what's due
  const [busca, setBusca] = useState("");
  const [statusFiltro, setStatusFiltro] = useState<"Todos" | "Pendente" | "Concluída">("Pendente");
  const [categoriaFiltro, setCategoriaFiltro] = useState<string>("Todas");
  const [prioridadeFiltro, setPrioridadeFiltro] = useState<string>("Todas");
  const [periodoFiltro, setPeriodoFiltro] = useState<FiltroPeriodo>("todos");
  const [dataEspecificaFiltro, setDataEspecificaFiltro] = useState<string>("");
  const [incluirEtapasProjetos, setIncluirEtapasProjetos] = useState(true);

  // View mode: sections (buckets) or continuous list
  const [viewMode, setViewMode] = useState<TipoVisualizacao>("secoes");

  // Mobile filters collapse toggle (open or closed)
  const [showFiltersMobile, setShowFiltersMobile] = useState(false);

  // Quick New Task Modal / Box state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [novoTitulo, setNovoTitulo] = useState("");
  const [novaDescricao, setNovaDescricao] = useState("");
  const [novaCategoria, setNovaCategoria] = useState(categorias[0] || "Trabalho");
  const [novaPrioridade, setNovaPrioridade] = useState<Prioridade>("Média");
  const [novaDataVencimento, setNovaDataVencimento] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Active filter count for badge
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (busca.trim()) count++;
    if (statusFiltro !== "Pendente") count++; // default is "Pendente"
    if (categoriaFiltro !== "Todas") count++;
    if (prioridadeFiltro !== "Todas") count++;
    if (periodoFiltro !== "todos") count++;
    if (dataEspecificaFiltro) count++;
    return count;
  }, [busca, statusFiltro, categoriaFiltro, prioridadeFiltro, periodoFiltro, dataEspecificaFiltro]);

  const handleResetFilters = () => {
    setBusca("");
    setStatusFiltro("Pendente");
    setCategoriaFiltro("Todas");
    setPrioridadeFiltro("Todas");
    setPeriodoFiltro("todos");
    setDataEspecificaFiltro("");
  };

  // Submit quick create task
  const handleQuickCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoTitulo.trim()) return;

    setIsSubmitting(true);
    try {
      await onCreateTask({
        titulo: novoTitulo.trim(),
        descricao: novaDescricao.trim(),
        categoria: novaCategoria,
        prioridade: novaPrioridade,
        data_vencimento: novaDataVencimento,
      });
      setNovoTitulo("");
      setNovaDescricao("");
      setShowCreateForm(false);
      onShowToast("✅ Tarefa criada com sucesso no cronograma!", "success");
    } catch (err: any) {
      alert("Erro ao criar tarefa.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 1. Filter Tasks
  const tarefasFiltradas = useMemo(() => {
    return tarefas.filter((t) => {
      // Status
      if (statusFiltro !== "Todos" && t.status !== statusFiltro) return false;

      // Categoria
      if (categoriaFiltro !== "Todas" && t.categoria !== categoriaFiltro) return false;

      // Prioridade
      if (prioridadeFiltro !== "Todas" && t.prioridade !== prioridadeFiltro) return false;

      // Busca texto
      if (busca.trim()) {
        const q = busca.toLowerCase();
        const matchTitulo = (t.titulo || "").toLowerCase().includes(q);
        const matchDesc = (t.descricao || "").toLowerCase().includes(q);
        if (!matchTitulo && !matchDesc) return false;
      }

      // Data específica
      if (dataEspecificaFiltro && t.data_vencimento !== dataEspecificaFiltro) return false;

      // Período
      if (periodoFiltro !== "todos") {
        const diff = getDaysDiff(t.data_vencimento);
        if (periodoFiltro === "sem_data" && diff !== null) return false;
        if (periodoFiltro === "vencidas" && (diff === null || diff >= 0)) return false;
        if (periodoFiltro === "hoje" && diff !== 0) return false;
        if (periodoFiltro === "amanha" && diff !== 1) return false;
        if (periodoFiltro === "7dias" && (diff === null || diff < 0 || diff > 7)) return false;
      }

      return true;
    });
  }, [
    tarefas,
    statusFiltro,
    categoriaFiltro,
    prioridadeFiltro,
    busca,
    dataEspecificaFiltro,
    periodoFiltro,
  ]);

  // 2. Extract and Filter Project Steps (if included and status is Pendente or Todos)
  const etapasFiltradas = useMemo(() => {
    if (!incluirEtapasProjetos || statusFiltro === "Concluída") return [];

    const list: EtapaItemUpcoming[] = [];
    const projetosAtivos = projetos.filter((p) => p.status !== "Concluído");

    projetosAtivos.forEach((proj) => {
      if (categoriaFiltro !== "Todas" && proj.categoria !== categoriaFiltro) return;

      (proj.passos || []).forEach((step) => {
        if (!step.concluido) {
          const dateStr = step.data_limite || proj.data_limite || "";

          // Filter by busca
          if (busca.trim()) {
            const q = busca.toLowerCase();
            const matchTitulo = (step.titulo || "").toLowerCase().includes(q);
            const matchProj = (proj.titulo || "").toLowerCase().includes(q);
            if (!matchTitulo && !matchProj) return;
          }

          // Data específica
          if (dataEspecificaFiltro && dateStr !== dataEspecificaFiltro) return;

          // Período
          if (periodoFiltro !== "todos") {
            const diff = getDaysDiff(dateStr);
            if (periodoFiltro === "sem_data" && diff !== null) return;
            if (periodoFiltro === "vencidas" && (diff === null || diff >= 0)) return;
            if (periodoFiltro === "hoje" && diff !== 0) return;
            if (periodoFiltro === "amanha" && diff !== 1) return;
            if (periodoFiltro === "7dias" && (diff === null || diff < 0 || diff > 7)) return;
          }

          list.push({
            id: `step_${proj.id}_${step.id}`,
            stepId: step.id,
            projetoId: proj.id,
            projetoTitulo: proj.titulo,
            categoria: proj.categoria,
            titulo: step.titulo,
            data_vencimento: dateStr,
            step,
          });
        }
      });
    });

    return list;
  }, [
    projetos,
    incluirEtapasProjetos,
    statusFiltro,
    categoriaFiltro,
    busca,
    dataEspecificaFiltro,
    periodoFiltro,
  ]);

  // 3. STRICT CHRONOLOGICAL SORTING (DEFAULT)
  // Ascending by date: overdue first, then today, tomorrow, this week, future, no date at the end
  const sortedTasks = useMemo(() => {
    return [...tarefasFiltradas].sort((a, b) => {
      if (!a.data_vencimento && !b.data_vencimento) return 0;
      if (!a.data_vencimento) return 1;
      if (!b.data_vencimento) return -1;
      return a.data_vencimento.localeCompare(b.data_vencimento);
    });
  }, [tarefasFiltradas]);

  const sortedSteps = useMemo(() => {
    return [...etapasFiltradas].sort((a, b) => {
      if (!a.data_vencimento && !b.data_vencimento) return 0;
      if (!a.data_vencimento) return 1;
      if (!b.data_vencimento) return -1;
      return a.data_vencimento.localeCompare(b.data_vencimento);
    });
  }, [etapasFiltradas]);

  // Combined flat list sorted chronologically
  const flatChronologicalList = useMemo(() => {
    type UnifiedItem =
      | { type: "task"; data: Tarefa; dateStr: string; diff: number | null }
      | { type: "step"; data: EtapaItemUpcoming; dateStr: string; diff: number | null };

    const combined: UnifiedItem[] = [];

    sortedTasks.forEach((t) => {
      combined.push({
        type: "task",
        data: t,
        dateStr: t.data_vencimento || "",
        diff: getDaysDiff(t.data_vencimento),
      });
    });

    sortedSteps.forEach((s) => {
      combined.push({
        type: "step",
        data: s,
        dateStr: s.data_vencimento || "",
        diff: getDaysDiff(s.data_vencimento),
      });
    });

    // Sort strictly by date ascending: earlier dates first, null dates at end
    combined.sort((a, b) => {
      if (a.diff === null && b.diff === null) return 0;
      if (a.diff === null) return 1;
      if (b.diff === null) return -1;
      return a.diff - b.diff;
    });

    return combined;
  }, [sortedTasks, sortedSteps]);

  // 4. Chronological Buckets (Timeline View)
  const buckets = useMemo(() => {
    const overdueTasks: Tarefa[] = [];
    const todayTasks: Tarefa[] = [];
    const tomorrowTasks: Tarefa[] = [];
    const thisWeekTasks: Tarefa[] = [];
    const laterTasks: Tarefa[] = [];
    const noDateTasks: Tarefa[] = [];

    const overdueSteps: EtapaItemUpcoming[] = [];
    const todaySteps: EtapaItemUpcoming[] = [];
    const tomorrowSteps: EtapaItemUpcoming[] = [];
    const thisWeekSteps: EtapaItemUpcoming[] = [];
    const laterSteps: EtapaItemUpcoming[] = [];
    const noDateSteps: EtapaItemUpcoming[] = [];

    sortedTasks.forEach((t) => {
      const diff = getDaysDiff(t.data_vencimento);
      if (diff === null) {
        noDateTasks.push(t);
      } else if (diff < 0) {
        overdueTasks.push(t);
      } else if (diff === 0) {
        todayTasks.push(t);
      } else if (diff === 1) {
        tomorrowTasks.push(t);
      } else if (diff <= 7) {
        thisWeekTasks.push(t);
      } else {
        laterTasks.push(t);
      }
    });

    sortedSteps.forEach((s) => {
      const diff = getDaysDiff(s.data_vencimento);
      if (diff === null) {
        noDateSteps.push(s);
      } else if (diff < 0) {
        overdueSteps.push(s);
      } else if (diff === 0) {
        todaySteps.push(s);
      } else if (diff === 1) {
        tomorrowSteps.push(s);
      } else if (diff <= 7) {
        thisWeekSteps.push(s);
      } else {
        laterSteps.push(s);
      }
    });

    return [
      {
        id: "overdue",
        title: "Vencidas / Atrasadas",
        subtitle: "Atenção: requerem ação imediata",
        icon: AlertTriangle,
        color: "text-rose-700",
        badgeBg: "bg-rose-100 text-rose-800 border-rose-200 font-bold",
        containerBg: "bg-rose-50/40 border-rose-200",
        headerBorder: "border-rose-200",
        tasks: overdueTasks,
        steps: overdueSteps,
        total: overdueTasks.length + overdueSteps.length,
      },
      {
        id: "today",
        title: "Vencem Hoje",
        subtitle: "Prioridade para o dia de hoje",
        icon: Flame,
        color: "text-amber-700",
        badgeBg: "bg-amber-100 text-amber-800 border-amber-200 font-bold",
        containerBg: "bg-amber-50/30 border-amber-200",
        headerBorder: "border-amber-200",
        tasks: todayTasks,
        steps: todaySteps,
        total: todayTasks.length + todaySteps.length,
      },
      {
        id: "tomorrow",
        title: "Vencem Amanhã",
        subtitle: "Programação para o dia seguinte",
        icon: CalendarClock,
        color: "text-blue-700",
        badgeBg: "bg-blue-100 text-blue-800 border-blue-200 font-semibold",
        containerBg: "bg-blue-50/20 border-blue-200",
        headerBorder: "border-blue-200",
        tasks: tomorrowTasks,
        steps: tomorrowSteps,
        total: tomorrowTasks.length + tomorrowSteps.length,
      },
      {
        id: "this_week",
        title: "Esta Semana (Próximos 7 Dias)",
        subtitle: "Vencimentos no radar desta semana",
        icon: Calendar,
        color: "text-indigo-700",
        badgeBg: "bg-indigo-100 text-indigo-800 border-indigo-200 font-medium",
        containerBg: "bg-white border-slate-200",
        headerBorder: "border-slate-100",
        tasks: thisWeekTasks,
        steps: thisWeekSteps,
        total: thisWeekTasks.length + thisWeekSteps.length,
      },
      {
        id: "later",
        title: "Mais Adiante (Futuras)",
        subtitle: "Prazos programados além de 7 dias",
        icon: Clock,
        color: "text-slate-700",
        badgeBg: "bg-slate-100 text-slate-800 border-slate-200",
        containerBg: "bg-white border-slate-200",
        headerBorder: "border-slate-100",
        tasks: laterTasks,
        steps: laterSteps,
        total: laterTasks.length + laterSteps.length,
      },
      {
        id: "no_date",
        title: "Sem Data Definida",
        subtitle: "Tarefas e etapas sem prazo fixado",
        icon: ListTodo,
        color: "text-slate-500",
        badgeBg: "bg-slate-100 text-slate-700 border-slate-200",
        containerBg: "bg-white border-slate-200",
        headerBorder: "border-slate-100",
        tasks: noDateTasks,
        steps: noDateSteps,
        total: noDateTasks.length + noDateSteps.length,
      },
    ];
  }, [sortedTasks, sortedSteps]);

  // Overall KPI counts
  const totalOverdue = buckets[0].total;
  const totalToday = buckets[1].total;
  const totalThisWeek = buckets[2].total + buckets[3].total;
  const totalVisivel = sortedTasks.length + sortedSteps.length;

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      {/* ===================================================================== */}
      {/* 1. TOP HEADER & KPI CARDS */}
      {/* ===================================================================== */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">📅</span>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                Em Breve (Cronograma de Prazos)
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Suas tarefas e etapas ordenadas estritamente por ordem de vencimento, com filtros completos e edição direta.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Toggle Filters Mobile */}
            <button
              onClick={() => setShowFiltersMobile((prev) => !prev)}
              className={`sm:hidden px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                showFiltersMobile || activeFiltersCount > 0
                  ? "bg-indigo-50 text-indigo-700 border-indigo-300"
                  : "bg-slate-50 text-slate-700 border-slate-200"
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              <span>Filtros</span>
              {activeFiltersCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center">
                  {activeFiltersCount}
                </span>
              )}
            </button>

            {/* Quick Create Task Button */}
            <button
              onClick={() => setShowCreateForm((prev) => !prev)}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-semibold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{showCreateForm ? "Fechar" : "Nova Tarefa"}</span>
            </button>
          </div>
        </div>

        {/* 4 Mini KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
          <div
            onClick={() => setPeriodoFiltro(periodoFiltro === "vencidas" ? "todos" : "vencidas")}
            className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
              periodoFiltro === "vencidas"
                ? "bg-rose-100/70 border-rose-400 ring-2 ring-rose-500/20"
                : totalOverdue > 0
                ? "bg-rose-50/60 border-rose-200/90 hover:bg-rose-100/50 text-rose-900"
                : "bg-slate-50/70 border-slate-200 text-slate-700 hover:bg-slate-100/60"
            }`}
            title="Clique para filtrar apenas atrasadas"
          >
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Atrasadas
            </span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-xl font-black text-rose-600">{totalOverdue}</span>
              {totalOverdue > 0 && (
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-rose-200 text-rose-800">
                  Urgente
                </span>
              )}
            </div>
          </div>

          <div
            onClick={() => setPeriodoFiltro(periodoFiltro === "hoje" ? "todos" : "hoje")}
            className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
              periodoFiltro === "hoje"
                ? "bg-amber-100/70 border-amber-400 ring-2 ring-amber-500/20"
                : "bg-amber-50/50 border-amber-200 hover:bg-amber-100/50"
            }`}
            title="Clique para filtrar apenas as que vencem hoje"
          >
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800">
              Vencem Hoje
            </span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-xl font-black text-amber-600">{totalToday}</span>
              <span className="text-[10px] font-semibold text-amber-700">hoje</span>
            </div>
          </div>

          <div
            onClick={() => setPeriodoFiltro(periodoFiltro === "7dias" ? "todos" : "7dias")}
            className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
              periodoFiltro === "7dias"
                ? "bg-indigo-100/70 border-indigo-400 ring-2 ring-indigo-500/20"
                : "bg-indigo-50/40 border-indigo-100 hover:bg-indigo-100/50"
            }`}
            title="Clique para filtrar os próximos 7 dias"
          >
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700">
              Próximos 7 Dias
            </span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-xl font-black text-indigo-600">{totalThisWeek}</span>
              <span className="text-[10px] text-indigo-500 font-medium">no radar</span>
            </div>
          </div>

          <div
            onClick={handleResetFilters}
            className="p-3 rounded-xl border bg-slate-50/70 border-slate-200 hover:bg-slate-100 transition-all cursor-pointer flex flex-col justify-between"
            title="Clique para limpar filtros e ver todas"
          >
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Tarefas no Radar
            </span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-xl font-black text-slate-800">{totalVisivel}</span>
              <span className="text-[10px] text-slate-400 font-medium">ver tudo</span>
            </div>
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* FORM: INLINE QUICK CREATE NEW TASK */}
      {/* ===================================================================== */}
      {showCreateForm && (
        <div className="bg-white rounded-2xl border-2 border-indigo-400/80 shadow-md p-5 space-y-3 ring-4 ring-indigo-500/10 animate-in fade-in duration-150">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Plus className="w-4 h-4 text-indigo-600" />
              <span>Nova Tarefa no Cronograma</span>
            </h3>
            <button
              onClick={() => setShowCreateForm(false)}
              className="text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleQuickCreate} className="space-y-3">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                Título da Tarefa *
              </label>
              <input
                type="text"
                required
                autoFocus
                value={novoTitulo}
                onChange={(e) => setNovoTitulo(e.target.value)}
                placeholder="Ex: Entregar relatório trimestral, Ligar para cliente..."
                className="w-full px-3.5 py-2 text-sm font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 placeholder:text-slate-400"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                Descrição ou Observações (opcional)
              </label>
              <input
                type="text"
                value={novaDescricao}
                onChange={(e) => setNovaDescricao(e.target.value)}
                placeholder="Detalhes, links ou contexto..."
                className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 placeholder:text-slate-400"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Categoria
                </label>
                <select
                  value={novaCategoria}
                  onChange={(e) => setNovaCategoria(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl text-slate-800 cursor-pointer"
                >
                  {categorias.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Prioridade
                </label>
                <select
                  value={novaPrioridade}
                  onChange={(e) => setNovaPrioridade(e.target.value as Prioridade)}
                  className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl text-slate-800 cursor-pointer"
                >
                  <option value="Alta">🔴 Alta</option>
                  <option value="Média">🟡 Média</option>
                  <option value="Baixa">🟢 Baixa</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Data de Vencimento
                </label>
                <input
                  type="date"
                  value={novaDataVencimento}
                  onChange={(e) => setNovaDataVencimento(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl text-slate-800 cursor-pointer"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-lg cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !novoTitulo.trim()}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? "Salvando..." : "Salvar Tarefa"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 2. COMPLETE FILTER PANEL (THE ONES REQUESTED BY THE USER) */}
      {/* ===================================================================== */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-3">
        {/* Row 1: Search & Quick Período Chips */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          {/* BUSCA */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar tarefa ou palavra-chave..."
              className="w-full pl-10 pr-3.5 py-2 text-xs sm:text-sm bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 transition-all placeholder:text-slate-400"
            />
            {busca && (
              <button
                onClick={() => setBusca("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            )}
          </div>

          {/* View Mode Toggle: Seções vs Lista Contínua */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold shrink-0">
            <button
              onClick={() => setViewMode("secoes")}
              className={`px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === "secoes"
                  ? "bg-white text-indigo-700 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Timeline
            </button>
            <button
              onClick={() => setViewMode("lista_continua")}
              className={`px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === "lista_continua"
                  ? "bg-white text-indigo-700 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Lista Contínua
            </button>
          </div>

          {/* Reset Filters Button if any is active */}
          {activeFiltersCount > 0 && (
            <button
              onClick={handleResetFilters}
              className="px-2.5 py-1.5 rounded-xl text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 flex items-center gap-1 transition-colors cursor-pointer shrink-0"
              title="Resetar todos os filtros para o padrão"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Limpar ({activeFiltersCount})</span>
            </button>
          )}
        </div>

        {/* Row 2: The Core Filters (Always visible on desktop, toggleable on mobile) */}
        <div className={`space-y-3 pt-2 border-t border-slate-100 ${showFiltersMobile ? "block" : "hidden sm:block"}`}>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
            {/* STATUS DA TAREFA */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Status da Tarefa
              </label>
              <div className="flex items-center bg-slate-100 p-1 rounded-xl font-semibold">
                {(["Pendente", "Todos", "Concluída"] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatusFiltro(st)}
                    className={`flex-1 py-1 text-center rounded-lg transition-colors cursor-pointer text-[11px] ${
                      statusFiltro === st
                        ? "bg-white text-indigo-700 shadow-xs font-bold"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* CATEGORIA */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1 flex items-center justify-between">
                <span>Categoria</span>
                <span className="text-[10px] font-normal text-slate-400">
                  {categorias.length} cadastradas
                </span>
              </label>
              <select
                value={categoriaFiltro}
                onChange={(e) => setCategoriaFiltro(e.target.value)}
                className="w-full px-3 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl text-slate-800 cursor-pointer focus:outline-hidden"
              >
                <option value="Todas">Todas as Categorias</option>
                {categorias.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* PRIORIDADE */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Prioridade
              </label>
              <div className="flex items-center bg-slate-100 p-1 rounded-xl font-semibold">
                {["Todas", "Alta", "Média", "Baixa"].map((p) => (
                  <button
                    key={p}
                    onClick={() => setPrioridadeFiltro(p)}
                    className={`flex-1 py-1 text-center rounded-lg transition-colors cursor-pointer text-[11px] ${
                      prioridadeFiltro === p
                        ? "bg-white text-indigo-700 shadow-xs font-bold"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* DATA DE VENCIMENTO ESPECÍFICA */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Data de Vencimento
              </label>
              <div className="flex items-center gap-1">
                <input
                  type="date"
                  value={dataEspecificaFiltro}
                  onChange={(e) => setDataEspecificaFiltro(e.target.value)}
                  className="w-full px-2.5 py-1 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 cursor-pointer focus:outline-hidden"
                />
                {dataEspecificaFiltro && (
                  <button
                    onClick={() => setDataEspecificaFiltro("")}
                    className="p-1 text-slate-400 hover:text-slate-600 text-xs"
                    title="Limpar data"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Quick Shortcuts for Period + Project Step Toggle */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <div className="flex flex-wrap items-center gap-1 text-[11px]">
              <span className="text-[10px] font-bold uppercase text-slate-400 mr-1">
                Período:
              </span>
              {[
                { id: "todos", label: "Todos os Prazos" },
                { id: "vencidas", label: "Atrasadas" },
                { id: "hoje", label: "Hoje" },
                { id: "amanha", label: "Amanhã" },
                { id: "7dias", label: "7 Dias" },
                { id: "sem_data", label: "Sem Data" },
              ].map((per) => (
                <button
                  key={per.id}
                  onClick={() => setPeriodoFiltro(per.id as FiltroPeriodo)}
                  className={`px-2.5 py-0.5 rounded-lg border font-semibold transition-colors cursor-pointer ${
                    periodoFiltro === per.id
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-2xs"
                      : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  {per.label}
                </button>
              ))}
            </div>

            {/* Toggle Project Steps */}
            <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={incluirEtapasProjetos}
                onChange={(e) => setIncluirEtapasProjetos(e.target.checked)}
                className="w-3.5 h-3.5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
              />
              <span>Incluir etapas de projetos ({etapasFiltradas.length})</span>
            </label>
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 3. TASK LIST / TIMELINE (ORDERED BY DATE ASCENDING) */}
      {/* ===================================================================== */}
      {totalVisivel === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3">
            <CalendarClock className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-900 mb-1">
            Nenhuma tarefa encontrada
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto mb-4">
            Não há tarefas correspondentes aos filtros selecionados. Crie uma nova tarefa agora ou redefina os filtros.
          </p>
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => setShowCreateForm(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold cursor-pointer shadow-xs"
            >
              + Criar Tarefa Agora
            </button>
            {activeFiltersCount > 0 && (
              <button
                onClick={handleResetFilters}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Limpar Filtros
              </button>
            )}
          </div>
        </div>
      ) : viewMode === "lista_continua" ? (
        /* ------------------------------------------------------------------- */
        /* VIEW A: CONTINUOUS FLAT LIST ORDERED STRICTLY BY DATE */
        /* ------------------------------------------------------------------- */
        <div className="space-y-2.5">
          <div className="flex items-center justify-between px-1 text-xs text-slate-500 font-semibold">
            <span>Lista Contínua por Ordem Cronológica ({flatChronologicalList.length})</span>
            <span>Da mais antiga / urgente para as futuras</span>
          </div>

          {flatChronologicalList.map((item) => {
            if (item.type === "task") {
              const t = item.data;
              const rel = formatRelativeDate(t.data_vencimento);
              const isDone = t.status === "Concluída";

              return (
                <div
                  key={t.id}
                  className={`bg-white rounded-xl border p-3.5 transition-all shadow-2xs hover:shadow-xs flex items-start justify-between gap-3 group ${
                    isDone
                      ? "bg-slate-50/70 border-slate-200 text-slate-400"
                      : t.data_vencimento && getDaysDiff(t.data_vencimento)! < 0
                      ? "border-rose-200/90 hover:border-rose-300"
                      : "border-slate-200 hover:border-indigo-300"
                  }`}
                >
                  {/* Left: Checkbox & Info */}
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <button
                      onClick={() => onToggleTaskStatus(t.id, t.status)}
                      className={`mt-0.5 w-5 h-5 rounded-lg border flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                        isDone
                          ? "bg-emerald-600 border-emerald-600 text-white shadow-xs"
                          : "border-slate-300 hover:border-indigo-600 bg-white hover:bg-indigo-50/50"
                      }`}
                      title={isDone ? "Marcar como pendente" : "Marcar como concluída"}
                    >
                      {isDone && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5 mb-1">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-md border font-semibold ${rel.badgeClass}`}
                        >
                          {rel.text}
                        </span>

                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded-md border font-bold uppercase ${
                            t.prioridade === "Alta"
                              ? "bg-rose-50 text-rose-700 border-rose-200"
                              : t.prioridade === "Média"
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : "bg-emerald-50 text-emerald-700 border-emerald-200"
                          }`}
                        >
                          {t.prioridade}
                        </span>

                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                          {t.categoria}
                        </span>
                      </div>

                      <h4
                        className={`text-sm font-semibold leading-snug break-words ${
                          isDone ? "line-through text-slate-400" : "text-slate-900"
                        }`}
                      >
                        {t.titulo}
                      </h4>

                      {t.descricao && (
                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                          {t.descricao}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right Actions: Edit & Delete */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => onEditTask(t)}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                      title="Editar esta tarefa"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Deseja excluir a tarefa "${t.titulo}"?`)) {
                          onDeleteTask(t.id);
                        }
                      }}
                      className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="Excluir tarefa"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            } else {
              // Project Step
              const etapa = item.data;
              const rel = formatRelativeDate(etapa.data_vencimento);

              return (
                <div
                  key={etapa.id}
                  className="bg-white rounded-xl border border-indigo-100 p-3.5 transition-all shadow-2xs hover:border-indigo-300 flex items-start justify-between gap-3 group"
                >
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <button
                      onClick={() => onToggleProjectStep(etapa.projetoId, etapa.step)}
                      className="mt-0.5 w-5 h-5 rounded-lg border-2 border-indigo-300 hover:border-emerald-500 hover:bg-emerald-50 bg-white flex items-center justify-center text-transparent hover:text-emerald-600 transition-colors cursor-pointer shrink-0"
                      title="Marcar etapa como concluída"
                    >
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5 mb-1">
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200">
                          <FolderKanban className="w-3 h-3" />
                          {etapa.projetoTitulo}
                        </span>

                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-md border font-semibold ${rel.badgeClass}`}
                        >
                          {rel.text}
                        </span>

                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 font-semibold flex items-center gap-1">
                          <Layers className="w-3 h-3" />
                          Etapa
                        </span>
                      </div>

                      <h4 className="text-sm font-semibold text-slate-900 leading-snug">
                        {etapa.titulo}
                      </h4>
                    </div>
                  </div>
                </div>
              );
            }
          })}
        </div>
      ) : (
        /* ------------------------------------------------------------------- */
        /* VIEW B: CHRONOLOGICAL SECTIONS (TIMELINE BUCKETS) */
        /* ------------------------------------------------------------------- */
        <div className="space-y-5">
          {buckets.map((bucket) => {
            if (bucket.total === 0) return null;
            const IconComponent = bucket.icon;

            return (
              <div
                key={bucket.id}
                className={`rounded-2xl border ${bucket.containerBg} shadow-xs overflow-hidden transition-all`}
              >
                {/* Section Header */}
                <div
                  className={`px-4 sm:px-5 py-3 border-b ${bucket.headerBorder} flex items-center justify-between gap-3 bg-white/70`}
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-7 h-7 rounded-xl flex items-center justify-center ${
                        bucket.id === "overdue"
                          ? "bg-rose-100 text-rose-700"
                          : bucket.id === "today"
                          ? "bg-amber-100 text-amber-700"
                          : bucket.id === "tomorrow"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      <IconComponent className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className={`text-sm sm:text-base font-bold ${bucket.color}`}>
                          {bucket.title}
                        </h3>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.2 rounded-full border ${bucket.badgeBg}`}
                        >
                          {bucket.total}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500">{bucket.subtitle}</p>
                    </div>
                  </div>

                  <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400">
                    {bucket.tasks.length > 0 && <span>{bucket.tasks.length} tarefa(s)</span>}
                    {bucket.tasks.length > 0 && bucket.steps.length > 0 && <span>•</span>}
                    {bucket.steps.length > 0 && <span>{bucket.steps.length} etapa(s) de projeto</span>}
                  </div>
                </div>

                {/* Items in this bucket */}
                <div className="p-3.5 sm:p-4 space-y-2.5">
                  {/* Tasks */}
                  {bucket.tasks.map((t) => {
                    const rel = formatRelativeDate(t.data_vencimento);
                    const isDone = t.status === "Concluída";

                    return (
                      <div
                        key={t.id}
                        className={`bg-white rounded-xl border p-3.5 transition-all shadow-2xs hover:shadow-xs flex items-start justify-between gap-3 group ${
                          isDone
                            ? "bg-slate-50/70 border-slate-200 text-slate-400"
                            : t.data_vencimento && getDaysDiff(t.data_vencimento)! < 0
                            ? "border-rose-200/90 hover:border-rose-300"
                            : "border-slate-200 hover:border-indigo-300"
                        }`}
                      >
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          {/* Checkbox */}
                          <button
                            onClick={() => onToggleTaskStatus(t.id, t.status)}
                            className={`mt-0.5 w-5 h-5 rounded-lg border flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                              isDone
                                ? "bg-emerald-600 border-emerald-600 text-white shadow-xs"
                                : "border-slate-300 hover:border-indigo-600 bg-white hover:bg-indigo-50/50"
                            }`}
                            title={isDone ? "Marcar como pendente" : "Marcar como concluída"}
                          >
                            {isDone && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          </button>

                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5 mb-1">
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded-md border font-semibold ${rel.badgeClass}`}
                              >
                                {rel.text}
                              </span>

                              <span
                                className={`text-[10px] px-1.5 py-0.5 rounded-md border font-bold uppercase ${
                                  t.prioridade === "Alta"
                                    ? "bg-rose-50 text-rose-700 border-rose-200"
                                    : t.prioridade === "Média"
                                    ? "bg-amber-50 text-amber-700 border-amber-200"
                                    : "bg-emerald-50 text-emerald-700 border-emerald-200"
                                }`}
                              >
                                {t.prioridade}
                              </span>

                              <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                                {t.categoria}
                              </span>
                            </div>

                            <h4
                              className={`text-sm font-semibold leading-snug break-words ${
                                isDone ? "line-through text-slate-400" : "text-slate-900"
                              }`}
                            >
                              {t.titulo}
                            </h4>

                            {t.descricao && (
                              <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                                {t.descricao}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Right: Edit & Delete Task Actions */}
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => onEditTask(t)}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                            title="Editar esta tarefa"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Deseja excluir a tarefa "${t.titulo}"?`)) {
                                onDeleteTask(t.id);
                              }
                            }}
                            className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Excluir tarefa"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {/* Project Steps in this bucket */}
                  {bucket.steps.map((etapa) => {
                    const rel = formatRelativeDate(etapa.data_vencimento);

                    return (
                      <div
                        key={etapa.id}
                        className="bg-white rounded-xl border border-indigo-100 p-3.5 transition-all shadow-2xs hover:border-indigo-300 flex items-start justify-between gap-3 group"
                      >
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <button
                            onClick={() => onToggleProjectStep(etapa.projetoId, etapa.step)}
                            className="mt-0.5 w-5 h-5 rounded-lg border-2 border-indigo-300 hover:border-emerald-500 hover:bg-emerald-50 bg-white flex items-center justify-center text-transparent hover:text-emerald-600 transition-colors cursor-pointer shrink-0"
                            title="Marcar etapa do projeto como concluída"
                          >
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </button>

                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5 mb-1">
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200">
                                <FolderKanban className="w-3 h-3" />
                                {etapa.projetoTitulo}
                              </span>

                              <span
                                className={`text-[10px] px-2 py-0.5 rounded-md border font-semibold ${rel.badgeClass}`}
                              >
                                {rel.text}
                              </span>

                              <span className="text-[10px] px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 font-semibold flex items-center gap-1">
                                <Layers className="w-3 h-3" />
                                Etapa
                              </span>
                            </div>

                            <h4 className="text-sm font-semibold text-slate-900 leading-snug">
                              {etapa.titulo}
                            </h4>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
