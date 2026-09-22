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
  CheckCheck,
} from "lucide-react";
import { Tarefa, Projeto, PassoProjeto } from "../types";

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
  onNavigateToTab: (tab: "tarefas" | "projetos" | "manual") => void;
}

type TipoFiltro = "todas" | "tarefas" | "etapas" | "projetos";

// Date calculations
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
  if (diff === null) return { text: "Sem data", badgeClass: "bg-slate-100 text-slate-600 border-slate-200" };

  if (diff < 0) {
    const days = Math.abs(diff);
    return {
      text: days === 1 ? "Atrasada há 1 dia" : `Atrasada há ${days} dias`,
      badgeClass: "bg-rose-100 text-rose-800 border-rose-200 font-bold",
    };
  }
  if (diff === 0) {
    return {
      text: "Vence Hoje",
      badgeClass: "bg-amber-100 text-amber-800 border-amber-200 font-bold animate-pulse",
    };
  }
  if (diff === 1) {
    return {
      text: "Amanhã",
      badgeClass: "bg-blue-100 text-blue-800 border-blue-200 font-semibold",
    };
  }
  if (diff <= 7) {
    return {
      text: `Em ${diff} dias`,
      badgeClass: "bg-indigo-50 text-indigo-700 border-indigo-200 font-medium",
    };
  }
  return {
    text: `Em ${diff} dias (${formatBrDate(dateStr)})`,
    badgeClass: "bg-slate-100 text-slate-700 border-slate-200 font-normal",
  };
};

export const UpcomingTab: React.FC<UpcomingTabProps> = ({
  tarefas,
  projetos,
  categorias,
  onToggleTaskStatus,
  onToggleProjectStep,
  onNavigateToTab,
}) => {
  const [busca, setBusca] = useState("");
  const [filtroTipo, setFiltroTipo] = useState<TipoFiltro>("todas");
  const [categoriaFiltro, setCategoriaFiltro] = useState<string>("Todas");

  // Only consider pending tasks and active projects
  const tarefasPendentes = useMemo(() => {
    return tarefas.filter((t) => t.status === "Pendente");
  }, [tarefas]);

  const projetosAtivos = useMemo(() => {
    return projetos.filter((p) => p.status !== "Concluído");
  }, [projetos]);

  // Extract actionable pending project steps as pseudo-tasks
  const etapasPendentes = useMemo(() => {
    const list: EtapaItemUpcoming[] = [];
    projetosAtivos.forEach((proj) => {
      (proj.passos || []).forEach((step) => {
        if (!step.concluido) {
          // Use the step's specific deadline if set, otherwise fallback to project deadline
          const dateStr = step.data_limite || proj.data_limite || "";
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
  }, [projetosAtivos]);

  // Filter by search and category
  const tarefasFiltradas = useMemo(() => {
    return tarefasPendentes.filter((t) => {
      if (categoriaFiltro !== "Todas" && t.categoria !== categoriaFiltro) return false;
      if (busca.trim()) {
        const q = busca.toLowerCase();
        const matchTitulo = t.titulo.toLowerCase().includes(q);
        const matchDesc = (t.descricao || "").toLowerCase().includes(q);
        if (!matchTitulo && !matchDesc) return false;
      }
      return true;
    });
  }, [tarefasPendentes, categoriaFiltro, busca]);

  const etapasFiltradas = useMemo(() => {
    return etapasPendentes.filter((e) => {
      if (categoriaFiltro !== "Todas" && e.categoria !== categoriaFiltro) return false;
      if (busca.trim()) {
        const q = busca.toLowerCase();
        const matchTitulo = e.titulo.toLowerCase().includes(q);
        const matchProj = e.projetoTitulo.toLowerCase().includes(q);
        if (!matchTitulo && !matchProj) return false;
      }
      return true;
    });
  }, [etapasPendentes, categoriaFiltro, busca]);

  const projetosFiltrados = useMemo(() => {
    return projetosAtivos.filter((p) => {
      if (categoriaFiltro !== "Todas" && p.categoria !== categoriaFiltro) return false;
      if (busca.trim()) {
        const q = busca.toLowerCase();
        const matchTitulo = p.titulo.toLowerCase().includes(q);
        const matchDesc = (p.descricao || "").toLowerCase().includes(q);
        if (!matchTitulo && !matchDesc) return false;
      }
      return true;
    });
  }, [projetosAtivos, categoriaFiltro, busca]);

  // Group items by chronological bucket
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

    const overdueProjects: Projeto[] = [];
    const todayProjects: Projeto[] = [];
    const tomorrowProjects: Projeto[] = [];
    const thisWeekProjects: Projeto[] = [];
    const laterProjects: Projeto[] = [];
    const noDateProjects: Projeto[] = [];

    // Sort tasks chronologically ascending (earliest dates first)
    const sortedTasks = [...tarefasFiltradas].sort((a, b) => {
      if (!a.data_vencimento && !b.data_vencimento) return 0;
      if (!a.data_vencimento) return 1;
      if (!b.data_vencimento) return -1;
      return a.data_vencimento.localeCompare(b.data_vencimento);
    });

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

    // Sort steps chronologically ascending (earliest dates first)
    const sortedSteps = [...etapasFiltradas].sort((a, b) => {
      if (!a.data_vencimento && !b.data_vencimento) return 0;
      if (!a.data_vencimento) return 1;
      if (!b.data_vencimento) return -1;
      return a.data_vencimento.localeCompare(b.data_vencimento);
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

    // Sort projects chronologically ascending by data_limite
    const sortedProjects = [...projetosFiltrados].sort((a, b) => {
      if (!a.data_limite && !b.data_limite) return 0;
      if (!a.data_limite) return 1;
      if (!b.data_limite) return -1;
      return a.data_limite.localeCompare(b.data_limite);
    });

    sortedProjects.forEach((p) => {
      const diff = getDaysDiff(p.data_limite);
      if (diff === null) {
        noDateProjects.push(p);
      } else if (diff < 0) {
        overdueProjects.push(p);
      } else if (diff === 0) {
        todayProjects.push(p);
      } else if (diff === 1) {
        tomorrowProjects.push(p);
      } else if (diff <= 7) {
        thisWeekProjects.push(p);
      } else {
        laterProjects.push(p);
      }
    });

    return [
      {
        id: "overdue",
        title: "Vencidas / Atrasadas",
        subtitle: "Requerem ação imediata",
        icon: AlertTriangle,
        color: "text-rose-700",
        badgeBg: "bg-rose-100 text-rose-800 border-rose-200",
        containerBg: "bg-rose-50/40 border-rose-200",
        headerBorder: "border-rose-200",
        tasks: overdueTasks,
        steps: overdueSteps,
        projects: overdueProjects,
        total: overdueTasks.length + overdueSteps.length,
      },
      {
        id: "today",
        title: "Vencem Hoje",
        subtitle: "Prioridade para o dia de hoje",
        icon: Flame,
        color: "text-amber-700",
        badgeBg: "bg-amber-100 text-amber-800 border-amber-200",
        containerBg: "bg-amber-50/30 border-amber-200",
        headerBorder: "border-amber-200",
        tasks: todayTasks,
        steps: todaySteps,
        projects: todayProjects,
        total: todayTasks.length + todaySteps.length,
      },
      {
        id: "tomorrow",
        title: "Vencem Amanhã",
        subtitle: "Programação para o dia seguinte",
        icon: CalendarClock,
        color: "text-blue-700",
        badgeBg: "bg-blue-100 text-blue-800 border-blue-200",
        containerBg: "bg-blue-50/20 border-blue-200",
        headerBorder: "border-blue-200",
        tasks: tomorrowTasks,
        steps: tomorrowSteps,
        projects: tomorrowProjects,
        total: tomorrowTasks.length + tomorrowSteps.length,
      },
      {
        id: "this_week",
        title: "Esta Semana (Próximos 7 Dias)",
        subtitle: "Vencimentos nos próximos dias",
        icon: Calendar,
        color: "text-indigo-700",
        badgeBg: "bg-indigo-100 text-indigo-800 border-indigo-200",
        containerBg: "bg-white border-slate-200",
        headerBorder: "border-slate-100",
        tasks: thisWeekTasks,
        steps: thisWeekSteps,
        projects: thisWeekProjects,
        total: thisWeekTasks.length + thisWeekSteps.length,
      },
      {
        id: "later",
        title: "Mais Adiante (Futuras)",
        subtitle: "Prazos com mais de 7 dias",
        icon: Clock,
        color: "text-slate-700",
        badgeBg: "bg-slate-100 text-slate-800 border-slate-200",
        containerBg: "bg-white border-slate-200",
        headerBorder: "border-slate-100",
        tasks: laterTasks,
        steps: laterSteps,
        projects: laterProjects,
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
        projects: noDateProjects,
        total: noDateTasks.length + noDateSteps.length,
      },
    ];
  }, [tarefasFiltradas, etapasFiltradas, projetosFiltrados]);

  // Overall metric counts
  const totalOverdue = buckets[0].total;
  const totalToday = buckets[1].total;
  const totalThisWeek = buckets[2].total + buckets[3].total;
  const totalGeral = tarefasPendentes.length + etapasPendentes.length;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Banner & Date KPI Summary */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">📅</span>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                Em Breve (Cronograma por Vencimento)
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Tarefas e etapas de projetos organizadas por prazo, das mais urgentes às futuras.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigateToTab("manual")}
              className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs cursor-pointer flex items-center gap-1.5 transition-colors"
            >
              <span>+ Nova Tarefa</span>
            </button>
            <button
              onClick={() => onNavigateToTab("projetos")}
              className="px-3.5 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-xs font-semibold cursor-pointer flex items-center gap-1.5 transition-colors"
            >
              <span>+ Projetos & Etapas</span>
            </button>
          </div>
        </div>

        {/* KPI Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
          <div
            className={`p-3 rounded-xl border flex flex-col justify-between ${
              totalOverdue > 0
                ? "bg-rose-50/70 border-rose-200 text-rose-900"
                : "bg-slate-50/70 border-slate-200 text-slate-700"
            }`}
          >
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Atrasadas
            </span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-xl font-black text-rose-600">{totalOverdue}</span>
              {totalOverdue > 0 && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-200 text-rose-800">
                  Urgente
                </span>
              )}
            </div>
          </div>

          <div className="p-3 rounded-xl border bg-amber-50/50 border-amber-200 flex flex-col justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800">
              Vencem Hoje
            </span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-xl font-black text-amber-600">{totalToday}</span>
              <span className="text-[10px] font-semibold text-amber-700">prioritárias</span>
            </div>
          </div>

          <div className="p-3 rounded-xl border bg-indigo-50/40 border-indigo-100 flex flex-col justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700">
              Próximos 7 Dias
            </span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-xl font-black text-indigo-600">{totalThisWeek}</span>
              <span className="text-[10px] text-indigo-500 font-medium">no radar</span>
            </div>
          </div>

          <div className="p-3 rounded-xl border bg-slate-50/70 border-slate-200 flex flex-col justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Total Pendências
            </span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-xl font-black text-slate-800">{totalGeral}</span>
              <span className="text-[10px] text-slate-500">ações ativas</span>
            </div>
          </div>
        </div>

        {/* Quick Search & Filter Controls */}
        <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar em tarefas e etapas..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
            {busca && (
              <button
                onClick={() => setBusca("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            {/* Filter by Type */}
            <div className="bg-slate-100 p-0.5 rounded-xl flex items-center gap-0.5 shrink-0">
              <button
                onClick={() => setFiltroTipo("todas")}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  filtroTipo === "todas"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Tudo
              </button>
              <button
                onClick={() => setFiltroTipo("tarefas")}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  filtroTipo === "tarefas"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Tarefas ({tarefasFiltradas.length})
              </button>
              <button
                onClick={() => setFiltroTipo("etapas")}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  filtroTipo === "etapas"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Etapas ({etapasFiltradas.length})
              </button>
              <button
                onClick={() => setFiltroTipo("projetos")}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  filtroTipo === "projetos"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Projetos ({projetosFiltrados.length})
              </button>
            </div>

            {/* Optional Category Filter dropdown */}
            <select
              value={categoriaFiltro}
              onChange={(e) => setCategoriaFiltro(e.target.value)}
              className="px-2.5 py-1 text-xs font-semibold bg-slate-100 hover:bg-slate-200/70 border border-slate-200 rounded-xl text-slate-700 cursor-pointer focus:outline-hidden shrink-0"
            >
              <option value="Todas">Todas as Categorias</option>
              {categorias.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Chronological Timeline Sections */}
      <div className="space-y-5">
        {buckets.map((bucket) => {
          const visibleTasks = filtroTipo === "projetos" || filtroTipo === "etapas" ? [] : bucket.tasks;
          const visibleSteps = filtroTipo === "projetos" || filtroTipo === "tarefas" ? [] : bucket.steps;
          const visibleProjects = filtroTipo === "todas" || filtroTipo === "projetos" ? bucket.projects : [];

          const totalItemsInBucket =
            filtroTipo === "projetos"
              ? visibleProjects.length
              : filtroTipo === "tarefas"
              ? visibleTasks.length
              : filtroTipo === "etapas"
              ? visibleSteps.length
              : visibleTasks.length + visibleSteps.length + (visibleProjects.length > 0 && visibleTasks.length === 0 && visibleSteps.length === 0 ? visibleProjects.length : 0);

          if (totalItemsInBucket === 0) return null;

          const IconComponent = bucket.icon;

          return (
            <div
              key={bucket.id}
              className={`rounded-2xl border ${bucket.containerBg} shadow-xs overflow-hidden transition-all`}
            >
              {/* Section Header */}
              <div
                className={`px-5 py-3.5 border-b ${bucket.headerBorder} flex items-center justify-between gap-3 bg-white/70`}
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
                        className={`text-[11px] font-bold px-2 py-0.2 rounded-full border ${bucket.badgeBg}`}
                      >
                        {visibleTasks.length + visibleSteps.length}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">{bucket.subtitle}</p>
                  </div>
                </div>

                <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400">
                  {visibleTasks.length > 0 && <span>{visibleTasks.length} tarefa(s)</span>}
                  {visibleTasks.length > 0 && visibleSteps.length > 0 && <span>•</span>}
                  {visibleSteps.length > 0 && <span>{visibleSteps.length} etapa(s) de projeto</span>}
                </div>
              </div>

              {/* Items List in Chronological Order */}
              <div className="p-4 sm:p-5 space-y-3">
                {/* 1. Tasks in this bucket */}
                {visibleTasks.map((t) => {
                  const rel = formatRelativeDate(t.data_vencimento);
                  const priBadge =
                    t.prioridade === "Alta"
                      ? "bg-rose-50 text-rose-700 border-rose-200"
                      : t.prioridade === "Média"
                      ? "bg-amber-50 text-amber-700 border-amber-200"
                      : "bg-emerald-50 text-emerald-700 border-emerald-200";

                  return (
                    <div
                      key={t.id}
                      className="bg-white hover:border-slate-300 rounded-xl border border-slate-200/90 p-3.5 transition-all shadow-2xs flex items-start gap-3 group"
                    >
                      {/* Checkbox */}
                      <button
                        onClick={() => onToggleTaskStatus(t.id, t.status)}
                        className="mt-0.5 w-5 h-5 rounded-lg border-2 border-slate-300 hover:border-emerald-500 hover:bg-emerald-50 bg-white flex items-center justify-center text-transparent hover:text-emerald-600 transition-colors cursor-pointer shrink-0"
                        title="Marcar como concluída"
                      >
                        <Check className="w-3 h-3 stroke-[3]" />
                      </button>

                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                          <h4 className="text-sm font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">
                            {t.titulo}
                          </h4>

                          <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-md border font-semibold ${rel.badgeClass}`}
                            >
                              {rel.text}
                            </span>
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded-md border font-bold uppercase ${priBadge}`}
                            >
                              {t.prioridade}
                            </span>
                          </div>
                        </div>

                        {t.descricao && (
                          <p className="text-xs text-slate-500 line-clamp-2 mb-2">
                            {t.descricao}
                          </p>
                        )}

                        <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-medium">
                            📁 {t.categoria}
                          </span>
                          {t.data_vencimento && (
                            <span className="flex items-center gap-1 text-slate-500">
                              <Calendar className="w-3 h-3 text-slate-400" />
                              Prazo: {formatBrDate(t.data_vencimento)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* 2. Project Steps in this bucket (treated like actionable tasks) */}
                {visibleSteps.map((etapa) => {
                  const rel = formatRelativeDate(etapa.data_vencimento);

                  return (
                    <div
                      key={etapa.id}
                      className="bg-white hover:border-indigo-300 rounded-xl border border-indigo-100/80 p-3.5 transition-all shadow-2xs flex items-start gap-3 group"
                    >
                      {/* Checkbox to complete the step */}
                      <button
                        onClick={() => onToggleProjectStep(etapa.projetoId, etapa.step)}
                        className="mt-0.5 w-5 h-5 rounded-lg border-2 border-indigo-300 hover:border-emerald-500 hover:bg-emerald-50 bg-white flex items-center justify-center text-transparent hover:text-emerald-600 transition-colors cursor-pointer shrink-0"
                        title="Marcar etapa do projeto como concluída"
                      >
                        <Check className="w-3 h-3 stroke-[3]" />
                      </button>

                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200">
                              <FolderKanban className="w-3 h-3" />
                              {etapa.projetoTitulo}
                            </span>
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600">
                              {etapa.categoria}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
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
                        </div>

                        <h4 className="text-sm font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">
                          {etapa.titulo}
                        </h4>

                        <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1">
                          {etapa.data_vencimento && (
                            <span className="flex items-center gap-1 text-slate-500">
                              <Calendar className="w-3 h-3 text-slate-400" />
                              Prazo da etapa: {formatBrDate(etapa.data_vencimento)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* 3. Projects in this bucket (when project view selected or if no tasks/steps) */}
                {filtroTipo === "projetos" &&
                  visibleProjects.map((proj) => {
                    const rel = formatRelativeDate(proj.data_limite);
                    const passosPendentes = (proj.passos || []).filter((s) => !s.concluido);

                    return (
                      <div
                        key={proj.id}
                        className="bg-white hover:border-slate-300 rounded-xl border border-slate-200/90 p-4 transition-all shadow-2xs space-y-3"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-start gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 mt-0.5">
                              <FolderKanban className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-medium">
                                  {proj.categoria}
                                </span>
                                <h4 className="text-sm font-bold text-slate-900">{proj.titulo}</h4>
                              </div>
                              {proj.descricao && (
                                <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                                  {proj.descricao}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-start sm:self-auto">
                            {proj.data_limite && (
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded-md border font-semibold ${rel.badgeClass}`}
                              >
                                {rel.text}
                              </span>
                            )}
                            <span className="text-xs font-black text-purple-700 bg-purple-50 border border-purple-100 px-2 py-0.5 rounded-lg shrink-0">
                              {proj.progresso_pct || 0}% concluído
                            </span>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="h-full bg-purple-600 rounded-full transition-all duration-300"
                            style={{ width: `${proj.progresso_pct || 0}%` }}
                          ></div>
                        </div>

                        {/* Remaining Steps Checklist */}
                        {passosPendentes.length > 0 ? (
                          <div className="bg-slate-50/80 rounded-lg p-2.5 border border-slate-100 space-y-1.5">
                            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                              Passos a concluir ({passosPendentes.length}):
                            </span>
                            <div className="space-y-1">
                              {passosPendentes.map((step) => (
                                <div
                                  key={step.id}
                                  className="flex items-center justify-between gap-2 text-xs text-slate-700 bg-white px-2.5 py-1.5 rounded border border-slate-200/70"
                                >
                                  <div className="flex items-center gap-2 truncate">
                                    <button
                                      onClick={() => onToggleProjectStep(proj.id, step)}
                                      className="w-4 h-4 rounded border border-slate-300 hover:border-emerald-500 flex items-center justify-center cursor-pointer shrink-0"
                                      title="Concluir passo"
                                    >
                                      <Check className="w-2.5 h-2.5 text-transparent hover:text-emerald-600" />
                                    </button>
                                    <span className="truncate">{step.titulo}</span>
                                  </div>
                                  {step.data_limite && (
                                    <span className="text-[10px] text-slate-500 shrink-0">
                                      {formatBrDate(step.data_limite)}
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
                            <CheckCheck className="w-3.5 h-3.5" />
                            <span>Todos os passos cadastrados deste projeto já foram concluídos!</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          );
        })}

        {/* If no pending items match search or criteria */}
        {totalGeral === 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
            <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-slate-800">Parabéns! Tudo em dia!</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              Você não tem nenhuma tarefa pendente nem etapas de projetos aguardando conclusão no momento.
            </p>
            <button
              onClick={() => onNavigateToTab("manual")}
              className="mt-4 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 cursor-pointer transition-colors shadow-xs"
            >
              + Adicionar Nova Tarefa
            </button>
          </div>
        )}

        {totalGeral > 0 &&
          buckets.every(
            (b) =>
              (filtroTipo === "projetos"
                ? b.projects.length === 0
                : filtroTipo === "tarefas"
                ? b.tasks.length === 0
                : filtroTipo === "etapas"
                ? b.steps.length === 0
                : b.tasks.length === 0 && b.steps.length === 0)
          ) && (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-xs">
              <p className="text-sm font-semibold text-slate-700">
                Nenhum item corresponde ao filtro selecionado.
              </p>
              <button
                onClick={() => {
                  setBusca("");
                  setCategoriaFiltro("Todas");
                  setFiltroTipo("todas");
                }}
                className="mt-2 text-xs text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer underline"
              >
                Limpar filtros
              </button>
            </div>
          )}
      </div>
    </div>
  );
};
