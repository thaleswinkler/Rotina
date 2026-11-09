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
  ArrowRight,
  Flag,
  Play,
} from "lucide-react";
import { Tarefa, Projeto, PassoProjeto, Prioridade, StatusTarefa } from "../types";

export interface CalendarEventItem {
  id: string;
  type: "task" | "step";
  title: string;
  dateStr: string; // YYYY-MM-DD for this specific day on the calendar
  dataInicio?: string; // YYYY-MM-DD
  dataFim?: string; // YYYY-MM-DD
  horaInicio?: string; // HH:mm
  horaFim?: string; // HH:mm
  isStart?: boolean;
  isEnd?: boolean;
  isMultiDay?: boolean;
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
    data_inicio?: string;
    data_vencimento: string;
    hora_inicio?: string;
    hora_fim?: string;
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

const formatBrDate = (isoStr?: string): string => {
  if (!isoStr) return "";
  const parts = isoStr.split("-");
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return isoStr;
};

// Returns all dates (YYYY-MM-DD) in the interval [start, end] inclusive
function getDatesInRange(startStr?: string, endStr?: string): string[] {
  if (!startStr && !endStr) return [];
  const sStr = startStr || endStr!;
  const eStr = endStr || startStr!;

  const sParts = sStr.split("-").map(Number);
  const eParts = eStr.split("-").map(Number);

  if (sParts.length !== 3 || eParts.length !== 3) return [sStr];

  const startDate = new Date(sParts[0], sParts[1] - 1, sParts[2]);
  const endDate = new Date(eParts[0], eParts[1] - 1, eParts[2]);

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return [sStr];

  const [first, last] = startDate <= endDate ? [startDate, endDate] : [endDate, startDate];

  const dates: string[] = [];
  const curr = new Date(first);

  // Safety clamp to max 62 days
  let count = 0;
  while (curr <= last && count < 62) {
    dates.push(formatISODate(curr.getFullYear(), curr.getMonth(), curr.getDate()));
    curr.setDate(curr.getDate() + 1);
    count++;
  }
  return dates;
}

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
  const [quickAddStartDate, setQuickAddStartDate] = useState(todayISO);
  const [quickAddEndDate, setQuickAddEndDate] = useState(todayISO);
  const [quickAddStartTime, setQuickAddStartTime] = useState("");
  const [quickAddEndTime, setQuickAddEndTime] = useState("");
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

  // Aggregate all events with multi-day expansion and hour sorting
  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEventItem[]>();

    const addEventToDate = (date: string, item: CalendarEventItem) => {
      const arr = map.get(date) || [];
      arr.push(item);
      map.set(date, arr);
    };

    // 1. Process Tarefas (multi-day span from data_inicio to data_vencimento)
    tarefas.forEach((t) => {
      const start = t.data_inicio || t.data_vencimento;
      const end = t.data_vencimento || t.data_inicio;
      if (!start && !end) return;

      const dateRange = getDatesInRange(start, end);
      const isMulti = dateRange.length > 1;

      dateRange.forEach((dayStr) => {
        const isStart = dayStr === (start <= end ? start : end);
        const isEnd = dayStr === (start <= end ? end : start);

        addEventToDate(dayStr, {
          id: `t_${t.id}_${dayStr}`,
          type: "task",
          title: t.titulo,
          dateStr: dayStr,
          dataInicio: start,
          dataFim: end,
          horaInicio: t.hora_inicio,
          horaFim: t.hora_fim,
          isStart,
          isEnd,
          isMultiDay: isMulti,
          isCompleted: t.status === "Concluída",
          categoria: t.categoria,
          prioridade: t.prioridade,
          taskData: t,
        });
      });
    });

    // 2. Process Project Steps
    projetos.forEach((proj) => {
      if (!proj.passos || proj.passos.length === 0) {
        if (proj.data_limite) {
          addEventToDate(proj.data_limite, {
            id: `p_${proj.id}_${proj.data_limite}`,
            type: "step",
            title: `Projeto: ${proj.titulo}`,
            dateStr: proj.data_limite,
            dataFim: proj.data_limite,
            isCompleted: proj.status === "Concluído",
            categoria: proj.categoria,
            projetoTitulo: proj.titulo,
            projetoId: proj.id,
          });
        }
        return;
      }

      proj.passos.forEach((step) => {
        const start = step.data_inicio || step.data_limite || proj.data_limite;
        const end = step.data_limite || proj.data_limite || step.data_inicio;
        if (!start && !end) return;

        const dateRange = getDatesInRange(start, end);
        const isMulti = dateRange.length > 1;

        dateRange.forEach((dayStr) => {
          const isStart = dayStr === (start <= end ? start : end);
          const isEnd = dayStr === (start <= end ? end : start);

          addEventToDate(dayStr, {
            id: `step_${proj.id}_${step.id}_${dayStr}`,
            type: "step",
            title: step.titulo,
            dateStr: dayStr,
            dataInicio: start,
            dataFim: end,
            horaInicio: step.hora_inicio,
            horaFim: step.hora_fim,
            isStart,
            isEnd,
            isMultiDay: isMulti,
            isCompleted: step.concluido,
            categoria: proj.categoria,
            projetoTitulo: proj.titulo,
            projetoId: proj.id,
            stepData: step,
          });
        });
      });
    });

    // Filter and sort items for each day by time & completion
    const filteredMap = new Map<string, CalendarEventItem[]>();

    map.forEach((items, dateKey) => {
      const filtered = items.filter((ev) => {
        if (categoriaFiltro !== "Todas" && ev.categoria !== categoriaFiltro) return false;
        if (statusFiltro === "Pendentes" && ev.isCompleted) return false;
        if (statusFiltro === "Concluídos" && !ev.isCompleted) return false;
        if (tipoFiltro === "Tarefas" && ev.type !== "task") return false;
        if (tipoFiltro === "Projetos" && ev.type !== "step") return false;
        return true;
      });

      // Sort: Pending first, then chronologically by horaInicio, then by title
      filtered.sort((a, b) => {
        if (a.isCompleted !== b.isCompleted) return a.isCompleted ? 1 : -1;
        if (a.horaInicio && b.horaInicio) return a.horaInicio.localeCompare(b.horaInicio);
        if (a.horaInicio && !b.horaInicio) return -1;
        if (!a.horaInicio && b.horaInicio) return 1;
        return a.title.localeCompare(b.title);
      });

      if (filtered.length > 0) {
        filteredMap.set(dateKey, filtered);
      }
    });

    return filteredMap;
  }, [tarefas, projetos, categoriaFiltro, statusFiltro, tipoFiltro]);

  // Selected date events
  const selectedDateEvents = useMemo(() => {
    return eventsByDate.get(selectedDateISO) || [];
  }, [eventsByDate, selectedDateISO]);

  // Month Grid Calculation
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  const monthGridDays = useMemo(() => {
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);

    // Convert so Monday = 0, Sunday = 6
    let startingDayOfWeek = firstDayOfMonth.getDay() - 1;
    if (startingDayOfWeek === -1) startingDayOfWeek = 6;

    const days: {
      dateISO: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      isToday: boolean;
      isWeekend: boolean;
    }[] = [];

    // Previous month padding days
    const prevMonthLastDay = new Date(currentYear, currentMonth, 0).getDate();
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const dayNum = prevMonthLastDay - i;
      const prevDate = new Date(currentYear, currentMonth - 1, dayNum);
      const iso = formatISODate(prevDate.getFullYear(), prevDate.getMonth(), prevDate.getDate());
      const dayOfWeek = prevDate.getDay();
      days.push({
        dateISO: iso,
        dayNumber: dayNum,
        isCurrentMonth: false,
        isToday: iso === todayISO,
        isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
      });
    }

    // Current month days
    for (let d = 1; d <= lastDayOfMonth.getDate(); d++) {
      const iso = formatISODate(currentYear, currentMonth, d);
      const curDate = new Date(currentYear, currentMonth, d);
      const dayOfWeek = curDate.getDay();
      days.push({
        dateISO: iso,
        dayNumber: d,
        isCurrentMonth: true,
        isToday: iso === todayISO,
        isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
      });
    }

    // Next month padding days to complete 35 or 42 cells
    const remaining = (7 - (days.length % 7)) % 7;
    for (let d = 1; d <= remaining; d++) {
      const nextDate = new Date(currentYear, currentMonth + 1, d);
      const iso = formatISODate(nextDate.getFullYear(), nextDate.getMonth(), nextDate.getDate());
      const dayOfWeek = nextDate.getDay();
      days.push({
        dateISO: iso,
        dayNumber: d,
        isCurrentMonth: false,
        isToday: iso === todayISO,
        isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
      });
    }

    return days;
  }, [currentYear, currentMonth, todayISO]);

  // Week Grid Calculation (7 days of the week containing currentDate)
  const weekDays = useMemo(() => {
    const copy = new Date(currentDate);
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
      isWeekend: boolean;
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
        isWeekend: i >= 5,
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
        data_inicio: quickAddStartDate || quickAddEndDate,
        data_vencimento: quickAddEndDate,
        hora_inicio: quickAddStartTime ? quickAddStartTime.trim() : undefined,
        hora_fim: quickAddEndTime ? quickAddEndTime.trim() : undefined,
      });
      setQuickAddTitle("");
      setQuickAddDesc("");
      setQuickAddStartTime("");
      setQuickAddEndTime("");
      setShowQuickAdd(false);
      onShowToast("✅ Tarefa adicionada ao calendário!", "success");
    } catch {
      onShowToast("Erro ao criar tarefa", "info");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openQuickAddForDate = (dateISO: string) => {
    setQuickAddStartDate(dateISO);
    setQuickAddEndDate(dateISO);
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
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border-2 border-slate-300 dark:border-slate-700 shadow-xs transition-colors duration-150">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Navigation & Current Month / Week */}
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-1 border border-slate-300 dark:border-slate-700">
              <button
                onClick={handlePrev}
                className="p-1.5 hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white rounded-lg transition-colors cursor-pointer"
                title="Período anterior"
                aria-label="Período anterior"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={handleToday}
                className="px-2.5 py-1 text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg hover:bg-white dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                Hoje
              </button>
              <button
                onClick={handleNext}
                className="p-1.5 hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white rounded-lg transition-colors cursor-pointer"
                title="Próximo período"
                aria-label="Próximo período"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight">
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
            <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold">
              <button
                onClick={() => setViewMode("mes")}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  viewMode === "mes"
                    ? "bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-400 shadow-2xs font-bold"
                    : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                Mês
              </button>
              <button
                onClick={() => setViewMode("semana")}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  viewMode === "semana"
                    ? "bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-400 shadow-2xs font-bold"
                    : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                Semana
              </button>
            </div>

            {/* Quick Add Button */}
            <button
              onClick={() => openQuickAddForDate(selectedDateISO)}
              className="py-2 px-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Nova Tarefa</span>
            </button>
          </div>
        </div>

        {/* Filter bar with high contrast */}
        <div className="mt-4 pt-3.5 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center gap-2.5 text-xs text-slate-600 dark:text-slate-300">
          <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1 mr-1">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            Filtros:
          </span>

          {/* Status filter */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-300 dark:border-slate-700">
            {(["Pendentes", "Todos", "Concluídos"] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFiltro(st)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                  statusFiltro === st
                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs font-bold"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          {/* Tipo filter */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-300 dark:border-slate-700">
            {(["Todos", "Tarefas", "Projetos"] as const).map((tipo) => (
              <button
                key={tipo}
                onClick={() => setTipoFiltro(tipo)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                  tipoFiltro === tipo
                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs font-bold"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
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
            className="py-1 px-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-[11px] font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
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
              className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline font-medium ml-auto cursor-pointer"
            >
              Limpar filtros
            </button>
          )}
        </div>
      </div>

      {/* 2. Main Calendar Content: High Contrast Grid */}
      {viewMode === "mes" ? (
        /* Month Grid with Sharp Separation */
        <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-slate-300 dark:border-slate-700 shadow-sm overflow-hidden">
          {/* Days of week header - distinct background */}
          <div className="grid grid-cols-7 border-b-2 border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-center">
            {WEEK_DAYS.map((day, idx) => (
              <div
                key={day}
                className={`py-2.5 text-xs font-bold tracking-wider uppercase border-r border-slate-300 dark:border-slate-700 last:border-r-0 ${
                  idx >= 5
                    ? "text-slate-500 dark:text-slate-400 bg-slate-200/50 dark:bg-slate-800/80"
                    : "text-slate-800 dark:text-slate-200"
                }`}
              >
                {day}
              </div>
            ))}
          </div>

          {/* Days grid with sharp visible dividers */}
          <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-slate-300 dark:divide-slate-700">
            {monthGridDays.map((dayObj) => {
              const dayEvents = eventsByDate.get(dayObj.dateISO) || [];
              const pendingEvents = dayEvents.filter((ev) => !ev.isCompleted);
              const isSelected = dayObj.dateISO === selectedDateISO;

              return (
                <div
                  key={dayObj.dateISO}
                  onClick={() => setSelectedDateISO(dayObj.dateISO)}
                  className={`min-h-[85px] sm:min-h-[115px] p-1.5 sm:p-2 transition-all flex flex-col justify-between cursor-pointer select-none relative ${
                    isSelected
                      ? "bg-indigo-50/80 dark:bg-indigo-950/60 ring-2 ring-indigo-600 dark:ring-indigo-400 ring-inset"
                      : dayObj.isToday
                      ? "bg-indigo-50/40 dark:bg-indigo-950/30"
                      : !dayObj.isCurrentMonth
                      ? "bg-slate-100/90 dark:bg-slate-950/90 text-slate-400 dark:text-slate-600"
                      : dayObj.isWeekend
                      ? "bg-slate-50/70 dark:bg-slate-900/60 hover:bg-slate-100/80 dark:hover:bg-slate-800/60"
                      : "bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  }`}
                >
                  {/* Top row: day number & today indicator */}
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs sm:text-sm font-bold rounded-lg w-6 h-6 flex items-center justify-center tabular-nums transition-colors ${
                        dayObj.isToday
                          ? "bg-indigo-600 text-white font-black shadow-xs"
                          : isSelected
                          ? "text-indigo-700 dark:text-indigo-300 font-black underline"
                          : dayObj.isCurrentMonth
                          ? "text-slate-900 dark:text-slate-100"
                          : "text-slate-400 dark:text-slate-600 font-normal"
                      }`}
                    >
                      {dayObj.dayNumber}
                    </span>

                    {/* Pending count badge on mobile */}
                    {pendingEvents.length > 0 && (
                      <span className="sm:hidden text-[10px] font-black text-indigo-700 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-900/80 px-1.5 py-0.2 rounded-full tabular-nums">
                        {pendingEvents.length}
                      </span>
                    )}

                    {/* Today label on desktop */}
                    {dayObj.isToday && (
                      <span className="hidden sm:inline text-[10px] uppercase font-bold text-indigo-600 dark:text-indigo-400">
                        Hoje
                      </span>
                    )}
                  </div>

                  {/* Desktop Item previews with start/end indicators and times */}
                  <div className="hidden sm:flex flex-col gap-1 mt-1.5 overflow-hidden">
                    {dayEvents.slice(0, 3).map((ev) => {
                      const hasTime = !!ev.horaInicio;
                      return (
                        <div
                          key={ev.id}
                          className={`text-[11px] px-1.5 py-0.5 rounded truncate flex items-center gap-1 leading-tight font-medium ${
                            ev.isCompleted
                              ? "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 line-through border border-slate-200 dark:border-slate-700"
                              : ev.type === "step"
                              ? "bg-purple-100 dark:bg-purple-950/70 text-purple-900 dark:text-purple-200 border border-purple-300 dark:border-purple-800"
                              : "bg-indigo-100 dark:bg-indigo-950/70 text-indigo-900 dark:text-indigo-200 border border-indigo-300 dark:border-indigo-800"
                          }`}
                          title={`${ev.horaInicio ? `[${ev.horaInicio}] ` : ""}${ev.title}`}
                        >
                          {/* Multi-day indicators */}
                          {ev.isMultiDay && ev.isStart && (
                            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 shrink-0" title="Início">
                              ▶
                            </span>
                          )}
                          {ev.isMultiDay && !ev.isStart && !ev.isEnd && (
                            <span className="text-[10px] text-slate-400 shrink-0" title="Em andamento">
                              ─
                            </span>
                          )}
                          {ev.isMultiDay && ev.isEnd && (
                            <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 shrink-0" title="Término">
                              🏁
                            </span>
                          )}

                          {/* Time tag if present */}
                          {hasTime && (
                            <span className="font-mono text-[10px] font-bold opacity-90 shrink-0 tabular-nums">
                              {ev.horaInicio}
                            </span>
                          )}

                          <span className="truncate">{ev.title}</span>
                        </div>
                      );
                    })}

                    {dayEvents.length > 3 && (
                      <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 pl-1 tabular-nums">
                        +{dayEvents.length - 3} mais
                      </span>
                    )}
                  </div>

                  {/* Mobile indicator dots */}
                  <div className="flex sm:hidden items-center justify-center gap-1 mt-auto pt-1">
                    {dayEvents.slice(0, 4).map((ev) => (
                      <span
                        key={ev.id}
                        className={`w-1.5 h-1.5 rounded-full ${
                          ev.isCompleted
                            ? "bg-slate-300 dark:bg-slate-600"
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
        /* Week View Grid with Defined Columns */
        <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
          {weekDays.map((dayObj) => {
            const dayEvents = eventsByDate.get(dayObj.dateISO) || [];
            const isSelected = dayObj.dateISO === selectedDateISO;

            return (
              <div
                key={dayObj.dateISO}
                onClick={() => setSelectedDateISO(dayObj.dateISO)}
                className={`bg-white dark:bg-slate-900 rounded-2xl p-3 border-2 transition-all flex flex-col justify-between cursor-pointer min-h-[160px] md:min-h-[320px] ${
                  isSelected
                    ? "border-indigo-600 dark:border-indigo-400 ring-2 ring-indigo-600/30 shadow-md"
                    : dayObj.isToday
                    ? "border-indigo-400 dark:border-indigo-500 bg-indigo-50/20 dark:bg-indigo-950/20"
                    : "border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600"
                }`}
              >
                {/* Day Header */}
                <div className="flex items-center justify-between pb-2 border-b-2 border-slate-200 dark:border-slate-800">
                  <div>
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-400 block uppercase tracking-wider">
                      {dayObj.dayName}
                    </span>
                    <span
                      className={`text-base font-bold tabular-nums ${
                        dayObj.isToday
                          ? "text-indigo-600 dark:text-indigo-400"
                          : "text-slate-900 dark:text-slate-100"
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
                    className="p-1 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                    title="Adicionar tarefa neste dia"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                {/* Day Items List with Times */}
                <div className="flex-1 py-2 space-y-1.5 overflow-y-auto max-h-[240px]">
                  {dayEvents.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-center p-2">
                      <span className="text-xs text-slate-400 dark:text-slate-500">Sem atividades</span>
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
                            ? "bg-slate-100 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 line-through"
                            : ev.type === "step"
                            ? "bg-purple-50 dark:bg-purple-950/60 border-purple-300 dark:border-purple-800 text-purple-900 dark:text-purple-200"
                            : "bg-indigo-50 dark:bg-indigo-950/60 border-indigo-300 dark:border-indigo-800 text-indigo-900 dark:text-indigo-200"
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
                            className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 cursor-pointer ${
                              ev.isCompleted
                                ? "bg-emerald-500 border-emerald-500 text-white"
                                : "border-slate-400 dark:border-slate-600 bg-white dark:bg-slate-800 hover:border-indigo-500"
                            }`}
                          >
                            {ev.isCompleted && <Check className="w-3 h-3 stroke-[3]" />}
                          </button>

                          <div className="min-w-0 flex-1">
                            {/* Time badge if specified */}
                            {ev.horaInicio && (
                              <div className="flex items-center gap-1 text-[10px] font-mono font-bold text-indigo-700 dark:text-indigo-300 mb-0.5 tabular-nums">
                                <Clock className="w-3 h-3" />
                                <span>
                                  {ev.horaInicio}
                                  {ev.horaFim ? ` - ${ev.horaFim}` : ""}
                                </span>
                              </div>
                            )}

                            <p className="font-semibold truncate leading-tight">{ev.title}</p>

                            {ev.isMultiDay && (
                              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                                {ev.isStart ? "▶ Início" : ev.isEnd ? "🏁 Término" : "─ Em andamento"}
                              </p>
                            )}

                            {ev.type === "step" && ev.projetoTitulo && (
                              <p className="text-[10px] text-purple-700 dark:text-purple-300 truncate mt-0.5">
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
                <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400 font-medium">
                  <span className="tabular-nums">
                    {dayEvents.filter((ev) => !ev.isCompleted).length} pendente(s)
                  </span>
                  {dayObj.isToday && (
                    <span className="text-indigo-600 dark:text-indigo-400 font-bold text-[10px] uppercase">
                      Hoje
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 3. Selected Day Detailed Agenda */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border-2 border-slate-300 dark:border-slate-700 shadow-sm transition-colors duration-150">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b-2 border-slate-200 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 capitalize">
                Agenda de {selectedDateFormatted}
              </h3>
              {selectedDateISO === todayISO && (
                <span className="px-2 py-0.5 rounded-full text-xs bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-200 font-bold border border-indigo-200 dark:border-indigo-800">
                  Hoje
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {selectedDateEvents.length === 0
                ? "Nenhuma atividade agendada para esta data"
                : `${selectedDateEvents.filter((e) => !e.isCompleted).length} pendente(s) · ${
                    selectedDateEvents.filter((e) => e.isCompleted).length
                  } concluída(s)`}
            </p>
          </div>

          <button
            onClick={() => openQuickAddForDate(selectedDateISO)}
            className="py-2 px-3.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 text-slate-800 dark:text-slate-200 hover:text-indigo-700 dark:hover:text-indigo-300 border border-slate-300 dark:border-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Adicionar Tarefa neste dia</span>
          </button>
        </div>

        {/* Selected Day Agenda Items */}
        <div className="mt-4 space-y-2.5">
          {selectedDateEvents.length === 0 ? (
            <div className="py-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
              <CalendarDays className="w-8 h-8 text-slate-400 dark:text-slate-500 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                Dia livre! Nada previsto para esta data.
              </p>
              <button
                onClick={() => openQuickAddForDate(selectedDateISO)}
                className="mt-3 text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-bold cursor-pointer"
              >
                + Agendar uma tarefa para este dia
              </button>
            </div>
          ) : (
            selectedDateEvents.map((ev) => (
              <div
                key={ev.id}
                className={`p-3.5 rounded-xl border-2 transition-all flex items-start justify-between gap-3 ${
                  ev.isCompleted
                    ? "bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-500"
                    : ev.type === "step"
                    ? "bg-purple-50/40 dark:bg-purple-950/40 border-purple-300 dark:border-purple-800 hover:border-purple-400"
                    : "bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-600 shadow-2xs"
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
                    className={`mt-0.5 w-5 h-5 rounded-lg border-2 flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
                      ev.isCompleted
                        ? "bg-emerald-500 border-emerald-500 text-white"
                        : "border-slate-400 dark:border-slate-600 bg-white dark:bg-slate-800 hover:border-indigo-600"
                    }`}
                  >
                    {ev.isCompleted && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </button>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-sm font-bold ${
                          ev.isCompleted
                            ? "line-through text-slate-400 dark:text-slate-500"
                            : "text-slate-900 dark:text-slate-100"
                        }`}
                      >
                        {ev.title}
                      </span>

                      {/* Time badge */}
                      {ev.horaInicio && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-mono font-bold bg-indigo-100 dark:bg-indigo-950/80 text-indigo-800 dark:text-indigo-200 border border-indigo-200 dark:border-indigo-800 tabular-nums">
                          <Clock className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                          <span>
                            {ev.horaInicio}
                            {ev.horaFim ? ` às ${ev.horaFim}` : ""}
                          </span>
                        </span>
                      )}

                      {/* Multi-day badge */}
                      {ev.isMultiDay && ev.dataInicio && ev.dataFim && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
                          <span>
                            Período: {formatBrDate(ev.dataInicio)} → {formatBrDate(ev.dataFim)}
                          </span>
                          <span className="font-bold text-indigo-600 dark:text-indigo-400">
                            ({ev.isStart ? "Início hoje" : ev.isEnd ? "Término hoje" : "Em andamento"})
                          </span>
                        </span>
                      )}

                      {/* Category and priority metadata */}
                      <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                        <span aria-hidden="true">·</span>
                        {ev.type === "step" ? (
                          <span className="text-purple-700 dark:text-purple-300 font-semibold flex items-center gap-1">
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
                                  ? "text-rose-600 dark:text-rose-400 font-bold"
                                  : ev.prioridade === "Média"
                                  ? "text-amber-600 dark:text-amber-400 font-semibold"
                                  : "text-slate-500 dark:text-slate-400"
                              }
                            >
                              {ev.prioridade}
                            </span>
                          </>
                        )}
                      </span>
                    </div>

                    {/* Task description or details */}
                    {ev.taskData?.descricao && (
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 line-clamp-2">
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
                      className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                      title="Editar tarefa"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDeleteTask(ev.taskData!.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
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
                    className="p-1.5 text-slate-500 hover:text-purple-600 dark:text-slate-400 dark:hover:text-purple-300 hover:bg-purple-50 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer text-xs font-bold"
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

      {/* 4. Quick Add Task Modal with Start/End Dates & Times */}
      {showQuickAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-5 sm:p-6 border-2 border-slate-300 dark:border-slate-700 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b-2 border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Nova Tarefa no Calendário
                </h3>
              </div>
              <button
                onClick={() => setShowQuickAdd(false)}
                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1">
                  Título da Tarefa *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Pagar IPVA parcela 1, Reunião com equipe..."
                  value={quickAddTitle}
                  onChange={(e) => setQuickAddTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  autoFocus
                />
              </div>

              {/* Data de Início e Término */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1">
                    Data de Início
                  </label>
                  <input
                    type="date"
                    required
                    value={quickAddStartDate}
                    onChange={(e) => {
                      setQuickAddStartDate(e.target.value);
                      if (quickAddEndDate < e.target.value) {
                        setQuickAddEndDate(e.target.value);
                      }
                    }}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1">
                    Data de Término *
                  </label>
                  <input
                    type="date"
                    required
                    value={quickAddEndDate}
                    onChange={(e) => setQuickAddEndDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  />
                </div>
              </div>

              {/* Horários */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1">
                    Horário Início
                  </label>
                  <input
                    type="time"
                    value={quickAddStartTime}
                    onChange={(e) => setQuickAddStartTime(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1">
                    Horário Término
                  </label>
                  <input
                    type="time"
                    value={quickAddEndTime}
                    onChange={(e) => setQuickAddEndTime(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  />
                </div>
              </div>

              {/* Categoria e Prioridade */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1">
                    Categoria
                  </label>
                  <select
                    value={quickAddCategoria}
                    onChange={(e) => setQuickAddCategoria(e.target.value)}
                    className="w-full px-2.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  >
                    {categorias.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1">
                    Prioridade
                  </label>
                  <select
                    value={quickAddPrioridade}
                    onChange={(e) => setQuickAddPrioridade(e.target.value as Prioridade)}
                    className="w-full px-2.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  >
                    <option value="Alta">Alta</option>
                    <option value="Média">Média</option>
                    <option value="Baixa">Baixa</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1">
                  Descrição (opcional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Detalhes, anotações ou observações..."
                  value={quickAddDesc}
                  onChange={(e) => setQuickAddDesc(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowQuickAdd(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !quickAddTitle.trim()}
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl transition-colors shadow-xs cursor-pointer"
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
