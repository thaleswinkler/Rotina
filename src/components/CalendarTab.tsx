import React, { useState, useMemo } from "react";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  CheckCircle2,
  Clock,
  FolderKanban,
  Edit3,
  Trash2,
  Check,
  CalendarDays,
  Filter,
  X,
  Layers,
  Sparkles,
} from "lucide-react";
import { Tarefa, Projeto, PassoProjeto, Prioridade, StatusTarefa } from "../types";

export interface CalendarEventItem {
  id: string;
  type: "task" | "step";
  title: string;
  dateStr: string; // YYYY-MM-DD
  isCompleted: boolean;
  categoria?: string;
  prioridade?: Prioridade;
  projetoTitulo?: string;
  projetoId?: string | number;
  taskData?: Tarefa;
  stepData?: PassoProjeto;
}

interface CalendarTabProps {
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
  onShowToast: (text: string, type?: "success" | "info") => void;
  onNavigateToTab?: (tab: string) => void;
}

type CalendarViewMode = "mes" | "semana";

const MONTH_NAMES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

const WEEK_DAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const WEEK_DAYS_FULL = [
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
  "Domingo",
];

const formatISODate = (year: number, month: number, day: number): string => {
  const m = String(month + 1).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${year}-${m}-${d}`;
};

const getTodayISO = (): string => {
  const now = new Date();
  return formatISODate(now.getFullYear(), now.getMonth(), now.getDate());
};

export const CalendarTab: React.FC<CalendarTabProps> = ({
  tarefas,
  projetos,
  categorias,
  onToggleTaskStatus,
  onToggleProjectStep,
  onEditTask,
  onDeleteTask,
  onCreateTask,
  onShowToast,
  onNavigateToTab,
}) => {
  const todayISO = useMemo(() => getTodayISO(), []);

  // View state
  const [viewMode, setViewMode] = useState<CalendarViewMode>("mes");
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedDateISO, setSelectedDateISO] = useState<string>(todayISO);

  // Filters
  const [categoriaFiltro, setCategoriaFiltro] = useState<string>("Todas");
  const [statusFiltro, setStatusFiltro] = useState<"Todos" | "Pendentes" | "Concluídos">("Pendentes");
  const [tipoFiltro, setTipoFiltro] = useState<"Todos" | "Tarefas" | "Projetos">("Todos");

  // Quick task creation modal / form
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickAddTitle, setQuickAddTitle] = useState("");
  const [quickAddDesc, setQuickAddDesc] = useState("");
  const [quickAddCategoria, setQuickAddCategoria] = useState(categorias[0] || "Trabalho");
  const [quickAddPrioridade, setQuickAddPrioridade] = useState<Prioridade>("Média");
  const [quickAddDate, setQuickAddDate] = useState(todayISO);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Navigation handlers
  const handlePrev = () => {
    setCurrentDate((prev) => {
      const copy = new Date(prev);
      if (viewMode === "mes") {
        copy.setMonth(copy.getMonth() - 1);
      } else {
        copy.setDate(copy.getDate() - 7);
      }
      return copy;
    });
  };

  const handleNext = () => {
    setCurrentDate((prev) => {
      const copy = new Date(prev);
      if (viewMode === "mes") {
        copy.setMonth(copy.getMonth() + 1);
      } else {
        copy.setDate(copy.getDate() + 7);
      }
      return copy;
    });
  };

  const handleToday = () => {
    const now = new Date();
    setCurrentDate(now);
    setSelectedDateISO(todayISO);
  };

  // Aggregate all events (Tarefas and Project Steps)
  const allEvents = useMemo(() => {
    const list: CalendarEventItem[] = [];

    // 1. Tarefas
    tarefas.forEach((t) => {
      if (!t.data_vencimento) return;
      list.push({
        id: `t_${t.id}`,
        type: "task",
        title: t.titulo,
        dateStr: t.data_vencimento,
        isCompleted: t.status === "Concluída",
        categoria: t.categoria,
        prioridade: t.prioridade,
        taskData: t,
      });
    });

    // 2. Project Steps
    projetos.forEach((proj) => {
      if (!proj.passos || proj.passos.length === 0) {
        // If project itself has a data_limite
        if (proj.data_limite) {
          list.push({
            id: `p_${proj.id}`,
            type: "step",
            title: `Projeto: ${proj.titulo}`,
            dateStr: proj.data_limite,
            isCompleted: proj.status === "Concluído",
            categoria: proj.categoria,
            projetoTitulo: proj.titulo,
            projetoId: proj.id,
          });
        }
        return;
      }

      proj.passos.forEach((step) => {
        const dateStr = step.data_limite || proj.data_limite;
        if (!dateStr) return;
        list.push({
          id: `step_${proj.id}_${step.id}`,
          type: "step",
          title: step.titulo,
          dateStr: dateStr,
          isCompleted: step.concluido,
          categoria: proj.categoria,
          projetoTitulo: proj.titulo,
          projetoId: proj.id,
          stepData: step,
        });
      });
    });

    return list;
  }, [tarefas, projetos]);

  // Filtered events
  const filteredEvents = useMemo(() => {
    return allEvents.filter((ev) => {
      if (categoriaFiltro !== "Todas" && ev.categoria !== categoriaFiltro) return false;
      if (statusFiltro === "Pendentes" && ev.isCompleted) return false;
      if (statusFiltro === "Concluídos" && !ev.isCompleted) return false;
      if (tipoFiltro === "Tarefas" && ev.type !== "task") return false;
      if (tipoFiltro === "Projetos" && ev.type !== "step") return false;
      return true;
    });
  }, [allEvents, categoriaFiltro, statusFiltro, tipoFiltro]);

  // Map events by date (YYYY-MM-DD -> CalendarEventItem[])
  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEventItem[]>();
    filteredEvents.forEach((ev) => {
      const arr = map.get(ev.dateStr) || [];
      arr.push(ev);
      map.set(ev.dateStr, arr);
    });
    return map;
  }, [filteredEvents]);

  // Selected date events
  const selectedDateEvents = useMemo(() => {
    const items = eventsByDate.get(selectedDateISO) || [];
    // Sort items: pending first, then by priority / title
    return [...items].sort((a, b) => {
      if (a.isCompleted !== b.isCompleted) return a.isCompleted ? 1 : -1;
      return a.title.localeCompare(b.title);
    });
  }, [eventsByDate, selectedDateISO]);

  // Month Grid Calculation
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  const monthGridDays = useMemo(() => {
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);

    // Day of week: 0 = Sun, 1 = Mon, ..., 6 = Sat
    // Convert so Monday = 0, Sunday = 6
    let startingDayOfWeek = firstDayOfMonth.getDay() - 1;
    if (startingDayOfWeek === -1) startingDayOfWeek = 6;

    const days: {
      dateISO: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      isToday: boolean;
    }[] = [];

    // Previous month padding days
    const prevMonthLastDay = new Date(currentYear, currentMonth, 0).getDate();
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const dayNum = prevMonthLastDay - i;
      const prevDate = new Date(currentYear, currentMonth - 1, dayNum);
      const iso = formatISODate(prevDate.getFullYear(), prevDate.getMonth(), prevDate.getDate());
      days.push({
        dateISO: iso,
        dayNumber: dayNum,
        isCurrentMonth: false,
        isToday: iso === todayISO,
      });
    }

    // Current month days
    for (let d = 1; d <= lastDayOfMonth.getDate(); d++) {
      const iso = formatISODate(currentYear, currentMonth, d);
      days.push({
        dateISO: iso,
        dayNumber: d,
        isCurrentMonth: true,
        isToday: iso === todayISO,
      });
    }

    // Next month padding days to complete 35 or 42 cells
    const remaining = (7 - (days.length % 7)) % 7;
    for (let d = 1; d <= remaining; d++) {
      const nextDate = new Date(currentYear, currentMonth + 1, d);
      const iso = formatISODate(nextDate.getFullYear(), nextDate.getMonth(), nextDate.getDate());
      days.push({
        dateISO: iso,
        dayNumber: d,
        isCurrentMonth: false,
        isToday: iso === todayISO,
      });
    }

    return days;
  }, [currentYear, currentMonth, todayISO]);

  // Week Grid Calculation (7 days of the week containing currentDate)
  const weekDays = useMemo(() => {
    const copy = new Date(currentDate);
    // Determine Monday of current week
    let dayOfWeek = copy.getDay() - 1;
    if (dayOfWeek === -1) dayOfWeek = 6;

    const monday = new Date(copy);
    monday.setDate(copy.getDate() - dayOfWeek);

    const days: {
      dateISO: string;
      dayNumber: number;
      monthName: string;
      dayName: string;
      isToday: boolean;
    }[] = [];

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const iso = formatISODate(d.getFullYear(), d.getMonth(), d.getDate());
      days.push({
        dateISO: iso,
        dayNumber: d.getDate(),
        monthName: MONTH_NAMES[d.getMonth()].slice(0, 3),
        dayName: WEEK_DAYS[i],
        isToday: iso === todayISO,
      });
    }

    return days;
  }, [currentDate, todayISO]);

  // Quick Task Creation Submit
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickAddTitle.trim()) return;

    setIsSubmitting(true);
    try {
      await onCreateTask({
        titulo: quickAddTitle.trim(),
        descricao: quickAddDesc.trim(),
        categoria: quickAddCategoria,
        prioridade: quickAddPrioridade,
        data_vencimento: quickAddDate,
      });
      setQuickAddTitle("");
      setQuickAddDesc("");
      setShowQuickAdd(false);
      onShowToast("✅ Tarefa adicionada ao calendário!", "success");
    } catch {
      onShowToast("Erro ao criar tarefa", "info");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openQuickAddForDate = (dateISO: string) => {
    setQuickAddDate(dateISO);
    setShowQuickAdd(true);
  };

  // Formatted date string for selected date
  const selectedDateFormatted = useMemo(() => {
    const parts = selectedDateISO.split("-");
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const d = new Date(year, month, day);
      const dayOfWeekName = WEEK_DAYS_FULL[d.getDay() === 0 ? 6 : d.getDay() - 1];
      return `${dayOfWeekName}, ${day} de ${MONTH_NAMES[month]} de ${year}`;
    }
    return selectedDateISO;
  }, [selectedDateISO]);

  return (
    <div className="space-y-5">
      {/* 1. Header Toolbar with Controls */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Navigation & Current Month / Week */}
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <div className="flex items-center bg-slate-100 rounded-xl p-1 border border-slate-200/60">
              <button
                onClick={handlePrev}
                className="p-1.5 hover:bg-white text-slate-700 hover:text-slate-900 rounded-lg transition-colors cursor-pointer"
                title="Anterior"
                aria-label="Período anterior"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={handleToday}
                className="px-2.5 py-1 text-xs font-semibold text-slate-700 hover:text-indigo-600 rounded-lg hover:bg-white transition-colors cursor-pointer"
              >
                Hoje
              </button>
              <button
                onClick={handleNext}
                className="p-1.5 hover:bg-white text-slate-700 hover:text-slate-900 rounded-lg transition-colors cursor-pointer"
                title="Próximo"
                aria-label="Próximo período"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                {viewMode === "mes" ? (
                  <>
                    {MONTH_NAMES[currentMonth]} de {currentYear}
                  </>
                ) : (
                  <>
                    Semana de {weekDays[0].dayNumber} {weekDays[0].monthName} a{" "}
                    {weekDays[6].dayNumber} {weekDays[6].monthName} {currentYear}
                  </>
                )}
              </h2>
            </div>
          </div>

          {/* Right Controls: Mode Switcher & Add Task */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* View Mode Switcher: Mês / Semana */}
            <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200/60 text-xs font-semibold">
              <button
                onClick={() => setViewMode("mes")}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  viewMode === "mes"
                    ? "bg-white text-indigo-700 shadow-2xs font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Mês
              </button>
              <button
                onClick={() => setViewMode("semana")}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  viewMode === "semana"
                    ? "bg-white text-indigo-700 shadow-2xs font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Semana
              </button>
            </div>

            {/* Quick Add Button */}
            <button
              onClick={() => openQuickAddForDate(selectedDateISO)}
              className="py-2 px-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Nova Tarefa</span>
            </button>
          </div>
        </div>

        {/* Filter bar */}
        <div className="mt-4 pt-3.5 border-t border-slate-100 flex flex-wrap items-center gap-2.5 text-xs text-slate-600">
          <span className="font-semibold text-slate-700 flex items-center gap-1 mr-1">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            Filtros:
          </span>

          {/* Status filter */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200/50">
            {(["Pendentes", "Todos", "Concluídos"] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFiltro(st)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                  statusFiltro === st
                    ? "bg-white text-slate-900 shadow-2xs font-semibold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          {/* Tipo filter */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200/50">
            {(["Todos", "Tarefas", "Projetos"] as const).map((tipo) => (
              <button
                key={tipo}
                onClick={() => setTipoFiltro(tipo)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                  tipoFiltro === tipo
                    ? "bg-white text-slate-900 shadow-2xs font-semibold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {tipo}
              </button>
            ))}
          </div>

          {/* Categoria dropdown */}
          <select
            value={categoriaFiltro}
            onChange={(e) => setCategoriaFiltro(e.target.value)}
            className="py-1 px-2.5 rounded-lg bg-slate-100 border border-slate-200/60 text-[11px] font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="Todas">Todas Categorias</option>
            {categorias.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          {/* Reset button if any filter changed */}
          {(statusFiltro !== "Pendentes" || tipoFiltro !== "Todos" || categoriaFiltro !== "Todas") && (
            <button
              onClick={() => {
                setStatusFiltro("Pendentes");
                setTipoFiltro("Todos");
                setCategoriaFiltro("Todas");
              }}
              className="text-[11px] text-indigo-600 hover:text-indigo-800 font-medium underline underline-offset-2 ml-auto cursor-pointer"
            >
              Limpar filtros
            </button>
          )}
        </div>
      </div>

      {/* 2. Main Calendar Content: Month or Week */}
      {viewMode === "mes" ? (
        /* Month Grid */
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
          {/* Days of week header */}
          <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50/70 text-center">
            {WEEK_DAYS.map((day, idx) => (
              <div
                key={day}
                className={`py-2 text-[11px] sm:text-xs font-semibold tracking-wider uppercase ${
                  idx >= 5 ? "text-slate-400" : "text-slate-600"
                }`}
              >
                {day}
              </div>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-slate-100">
            {monthGridDays.map((dayObj) => {
              const dayEvents = eventsByDate.get(dayObj.dateISO) || [];
              const pendingEvents = dayEvents.filter((ev) => !ev.isCompleted);
              const isSelected = dayObj.dateISO === selectedDateISO;

              return (
                <div
                  key={dayObj.dateISO}
                  onClick={() => setSelectedDateISO(dayObj.dateISO)}
                  className={`min-h-[70px] sm:min-h-[105px] p-1.5 sm:p-2 transition-all flex flex-col justify-between cursor-pointer select-none ${
                    isSelected
                      ? "bg-indigo-50/60 ring-2 ring-indigo-500/80 ring-inset"
                      : dayObj.isToday
                      ? "bg-amber-50/30"
                      : dayObj.isCurrentMonth
                      ? "bg-white hover:bg-slate-50/70"
                      : "bg-slate-50/40 text-slate-400"
                  }`}
                >
                  {/* Top row: day number & today indicator */}
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs sm:text-sm font-semibold rounded-full w-6 h-6 flex items-center justify-center tabular-nums ${
                        dayObj.isToday
                          ? "bg-indigo-600 text-white font-bold"
                          : isSelected
                          ? "text-indigo-700 font-bold"
                          : dayObj.isCurrentMonth
                          ? "text-slate-800"
                          : "text-slate-400"
                      }`}
                    >
                      {dayObj.dayNumber}
                    </span>

                    {/* Pending count badge on mobile */}
                    {pendingEvents.length > 0 && (
                      <span className="sm:hidden text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1 py-0.2 rounded-full tabular-nums">
                        {pendingEvents.length}
                      </span>
                    )}
                  </div>

                  {/* Desktop Item previews (up to 2 visible) */}
                  <div className="hidden sm:flex flex-col gap-1 mt-1 overflow-hidden">
                    {dayEvents.slice(0, 2).map((ev) => (
                      <div
                        key={ev.id}
                        className={`text-[11px] px-1.5 py-0.5 rounded truncate flex items-center gap-1 leading-tight ${
                          ev.isCompleted
                            ? "bg-slate-100 text-slate-400 line-through"
                            : ev.type === "step"
                            ? "bg-purple-50 text-purple-700 border border-purple-100"
                            : "bg-indigo-50 text-indigo-700 border border-indigo-100"
                        }`}
                        title={ev.title}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                            ev.isCompleted
                              ? "bg-slate-400"
                              : ev.type === "step"
                              ? "bg-purple-600"
                              : "bg-indigo-600"
                          }`}
                        />
                        <span className="truncate">{ev.title}</span>
                      </div>
                    ))}

                    {dayEvents.length > 2 && (
                      <span className="text-[10px] font-medium text-slate-500 pl-1 tabular-nums">
                        +{dayEvents.length - 2} mais
                      </span>
                    )}
                  </div>

                  {/* Mobile indicator dots */}
                  <div className="flex sm:hidden items-center justify-center gap-1 mt-auto pt-1">
                    {dayEvents.slice(0, 3).map((ev) => (
                      <span
                        key={ev.id}
                        className={`w-1.5 h-1.5 rounded-full ${
                          ev.isCompleted
                            ? "bg-slate-300"
                            : ev.type === "step"
                            ? "bg-purple-500"
                            : "bg-indigo-600"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Week View Grid */
        <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
          {weekDays.map((dayObj) => {
            const dayEvents = eventsByDate.get(dayObj.dateISO) || [];
            const isSelected = dayObj.dateISO === selectedDateISO;

            return (
              <div
                key={dayObj.dateISO}
                onClick={() => setSelectedDateISO(dayObj.dateISO)}
                className={`bg-white rounded-2xl p-3 border transition-all flex flex-col justify-between cursor-pointer min-h-[140px] md:min-h-[280px] ${
                  isSelected
                    ? "border-indigo-500 ring-2 ring-indigo-500/30 shadow-2xs"
                    : dayObj.isToday
                    ? "border-amber-300 bg-amber-50/20"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                {/* Day Header */}
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div>
                    <span className="text-xs font-semibold text-slate-500 block uppercase tracking-wider">
                      {dayObj.dayName}
                    </span>
                    <span
                      className={`text-base font-bold tabular-nums ${
                        dayObj.isToday ? "text-indigo-600" : "text-slate-900"
                      }`}
                    >
                      {dayObj.dayNumber} {dayObj.monthName}
                    </span>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openQuickAddForDate(dayObj.dateISO);
                    }}
                    className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                    title="Adicionar tarefa neste dia"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Day Items List */}
                <div className="flex-1 py-2 space-y-1.5 overflow-y-auto max-h-[220px]">
                  {dayEvents.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-center p-2">
                      <span className="text-[11px] text-slate-400">Sem atividades</span>
                    </div>
                  ) : (
                    dayEvents.map((ev) => (
                      <div
                        key={ev.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedDateISO(dayObj.dateISO);
                        }}
                        className={`p-2 rounded-xl text-xs transition-all border ${
                          ev.isCompleted
                            ? "bg-slate-50 border-slate-200 text-slate-400 line-through"
                            : ev.type === "step"
                            ? "bg-purple-50/80 border-purple-200/70 text-purple-900"
                            : "bg-indigo-50/80 border-indigo-200/70 text-indigo-900"
                        }`}
                      >
                        <div className="flex items-start gap-1.5">
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              if (ev.type === "task" && ev.taskData) {
                                await onToggleTaskStatus(
                                  ev.taskData.id,
                                  ev.taskData.status
                                );
                              } else if (ev.type === "step" && ev.projetoId && ev.stepData) {
                                await onToggleProjectStep(ev.projetoId, ev.stepData);
                              }
                            }}
                            className={`mt-0.5 w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 cursor-pointer ${
                              ev.isCompleted
                                ? "bg-emerald-500 border-emerald-500 text-white"
                                : "border-slate-300 bg-white hover:border-indigo-500"
                            }`}
                          >
                            {ev.isCompleted && <Check className="w-2.5 h-2.5" />}
                          </button>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium truncate leading-tight">{ev.title}</p>
                            {ev.type === "step" && ev.projetoTitulo && (
                              <p className="text-[10px] text-purple-600 truncate mt-0.5">
                                📁 {ev.projetoTitulo}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Day Summary */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                  <span className="tabular-nums">
                    {dayEvents.filter((ev) => !ev.isCompleted).length} pendentes
                  </span>
                  {dayObj.isToday && (
                    <span className="text-amber-600 font-semibold text-[10px]">Hoje</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 3. Selected Day Detailed Agenda */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-indigo-600" />
              <h3 className="text-sm sm:text-base font-bold text-slate-900 capitalize">
                Agenda de {selectedDateFormatted}
              </h3>
              {selectedDateISO === todayISO && (
                <span className="px-2 py-0.5 rounded-full text-[11px] bg-amber-100 text-amber-800 font-semibold">
                  Hoje
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {selectedDateEvents.length === 0
                ? "Nenhuma atividade agendada para esta data"
                : `${selectedDateEvents.filter((e) => !e.isCompleted).length} pendente(s) · ${
                    selectedDateEvents.filter((e) => e.isCompleted).length
                  } concluída(s)`}
            </p>
          </div>

          <button
            onClick={() => openQuickAddForDate(selectedDateISO)}
            className="py-1.5 px-3 rounded-xl bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Adicionar Tarefa neste dia</span>
          </button>
        </div>

        {/* Selected Day Agenda Items */}
        <div className="mt-4 space-y-2.5">
          {selectedDateEvents.length === 0 ? (
            <div className="py-8 text-center bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
              <CalendarDays className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-medium text-slate-600">
                Dia livre! Nada previsto para esta data.
              </p>
              <button
                onClick={() => openQuickAddForDate(selectedDateISO)}
                className="mt-3 text-xs text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer underline underline-offset-2"
              >
                + Agendar uma tarefa para este dia
              </button>
            </div>
          ) : (
            selectedDateEvents.map((ev) => (
              <div
                key={ev.id}
                className={`p-3 sm:p-3.5 rounded-xl border transition-all flex items-start justify-between gap-3 ${
                  ev.isCompleted
                    ? "bg-slate-50/70 border-slate-200/80 text-slate-500"
                    : ev.type === "step"
                    ? "bg-purple-50/30 border-purple-200/60 hover:border-purple-300"
                    : "bg-white border-slate-200 hover:border-indigo-300 shadow-2xs"
                }`}
              >
                {/* Left: Checkbox + Title + Metadata */}
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <button
                    onClick={async () => {
                      if (ev.type === "task" && ev.taskData) {
                        await onToggleTaskStatus(ev.taskData.id, ev.taskData.status);
                      } else if (ev.type === "step" && ev.projetoId && ev.stepData) {
                        await onToggleProjectStep(ev.projetoId, ev.stepData);
                      }
                    }}
                    className={`mt-0.5 w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
                      ev.isCompleted
                        ? "bg-emerald-500 border-emerald-500 text-white"
                        : "border-slate-300 bg-white hover:border-indigo-600"
                    }`}
                  >
                    {ev.isCompleted && <Check className="w-3.5 h-3.5" />}
                  </button>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-sm font-semibold ${
                          ev.isCompleted
                            ? "line-through text-slate-400"
                            : "text-slate-900"
                        }`}
                      >
                        {ev.title}
                      </span>

                      {/* Clean textual metadata without pill-slop */}
                      <span className="text-xs text-slate-500 flex items-center gap-1.5">
                        <span aria-hidden="true">·</span>
                        {ev.type === "step" ? (
                          <span className="text-purple-700 font-medium flex items-center gap-1">
                            <FolderKanban className="w-3 h-3" />
                            {ev.projetoTitulo || "Projeto"}
                          </span>
                        ) : (
                          <span>{ev.categoria || "Geral"}</span>
                        )}
                        {ev.prioridade && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span
                              className={
                                ev.prioridade === "Alta"
                                  ? "text-rose-600 font-semibold"
                                  : ev.prioridade === "Média"
                                  ? "text-amber-600"
                                  : "text-slate-500"
                              }
                            >
                              {ev.prioridade}
                            </span>
                          </>
                        )}
                      </span>
                    </div>

                    {/* Task description or project step notice */}
                    {ev.taskData?.descricao && (
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                        {ev.taskData.descricao}
                      </p>
                    )}
                  </div>
                </div>

                {/* Right: Actions for Tasks (Edit / Delete) */}
                {ev.type === "task" && ev.taskData && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => onEditTask(ev.taskData!)}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                      title="Editar tarefa"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDeleteTask(ev.taskData!.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="Excluir tarefa"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Right: Link to Project */}
                {ev.type === "step" && onNavigateToTab && (
                  <button
                    onClick={() => onNavigateToTab("projetos")}
                    className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors cursor-pointer text-xs font-medium"
                    title="Ver no projeto"
                  >
                    Ver projeto →
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* 4. Quick Add Task Modal for Specific Date */}
      {showQuickAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 border border-slate-200 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-indigo-600" />
                <h3 className="text-base font-bold text-slate-900">
                  Nova Tarefa no Calendário
                </h3>
              </div>
              <button
                onClick={() => setShowQuickAdd(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Título da Tarefa *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Pagar IPVA parcela 1, Reunião com cliente..."
                  value={quickAddTitle}
                  onChange={(e) => setQuickAddTitle(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Data de Vencimento
                </label>
                <input
                  type="date"
                  required
                  value={quickAddDate}
                  onChange={(e) => setQuickAddDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Categoria
                  </label>
                  <select
                    value={quickAddCategoria}
                    onChange={(e) => setQuickAddCategoria(e.target.value)}
                    className="w-full px-2.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  >
                    {categorias.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Prioridade
                  </label>
                  <select
                    value={quickAddPrioridade}
                    onChange={(e) => setQuickAddPrioridade(e.target.value as Prioridade)}
                    className="w-full px-2.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  >
                    <option value="Alta">Alta</option>
                    <option value="Média">Média</option>
                    <option value="Baixa">Baixa</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Descrição (opcional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Detalhes ou anotações..."
                  value={quickAddDesc}
                  onChange={(e) => setQuickAddDesc(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowQuickAdd(false)}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !quickAddTitle.trim()}
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl transition-colors shadow-2xs cursor-pointer"
                >
                  {isSubmitting ? "Salvando..." : "Salvar no Calendário"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
