import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  FolderKanban,
  CheckCircle2,
  Circle,
  Plus,
  Trash2,
  Edit3,
  Calendar,
  Layers,
  ZoomIn,
  ZoomOut,
  Maximize2,
  RotateCcw,
  Sparkles,
  ChevronRight,
  ChevronDown,
  Tag,
  Clock,
  Check,
  AlertCircle,
  ListFilter,
  Eye,
  SlidersHorizontal,
} from "lucide-react";
import { Projeto, PassoProjeto } from "../types";

interface ProjectMindMapProps {
  projeto: Projeto;
  categorias: string[];
  onToggleStep: (projectId: string | number, step: PassoProjeto) => Promise<void>;
  onUpdateStepDate: (projectId: string | number, stepId: string | number, date: string) => Promise<void>;
  onUpdateStepType: (projectId: string | number, stepId: string | number, tipo: string) => Promise<void>;
  onDeleteStep: (projectId: string | number, stepId: string | number) => Promise<void>;
  onAddStepToType: (projectId: string | number, titulo: string, tipo: string, dataLimite?: string) => Promise<void>;
  onAddTipo: (projectId: string | number, novoTipo: string) => Promise<void>;
  onDeleteTipo: (projectId: string | number, tipo: string) => Promise<void>;
  onOpenEditProjectModal: (proj: Projeto) => void;
  onDeleteProject: (projectId: string | number, titulo: string) => void;
}

// Preset vibrant colors for different branches/types
const TYPE_COLORS: {
  [key: string]: {
    border: string;
    bg: string;
    text: string;
    badge: string;
    accent: string;
    line: string;
  };
} = {
  Planejamento: {
    border: "border-indigo-400",
    bg: "bg-indigo-50/80",
    text: "text-indigo-900",
    badge: "bg-indigo-100 text-indigo-700 border-indigo-200",
    accent: "bg-indigo-600",
    line: "#6366f1",
  },
  "Design & UX": {
    border: "border-purple-400",
    bg: "bg-purple-50/80",
    text: "text-purple-900",
    badge: "bg-purple-100 text-purple-700 border-purple-200",
    accent: "bg-purple-600",
    line: "#a855f7",
  },
  Design: {
    border: "border-purple-400",
    bg: "bg-purple-50/80",
    text: "text-purple-900",
    badge: "bg-purple-100 text-purple-700 border-purple-200",
    accent: "bg-purple-600",
    line: "#a855f7",
  },
  Desenvolvimento: {
    border: "border-blue-400",
    bg: "bg-blue-50/80",
    text: "text-blue-900",
    badge: "bg-blue-100 text-blue-700 border-blue-200",
    accent: "bg-blue-600",
    line: "#3b82f6",
  },
  Execução: {
    border: "border-cyan-400",
    bg: "bg-cyan-50/80",
    text: "text-cyan-900",
    badge: "bg-cyan-100 text-cyan-700 border-cyan-200",
    accent: "bg-cyan-600",
    line: "#06b6d4",
  },
  "Testes & Validação": {
    border: "border-amber-400",
    bg: "bg-amber-50/80",
    text: "text-amber-900",
    badge: "bg-amber-100 text-amber-800 border-amber-200",
    accent: "bg-amber-500",
    line: "#f59e0b",
  },
  Testes: {
    border: "border-amber-400",
    bg: "bg-amber-50/80",
    text: "text-amber-900",
    badge: "bg-amber-100 text-amber-800 border-amber-200",
    accent: "bg-amber-500",
    line: "#f59e0b",
  },
  "Lançamento & Marketing": {
    border: "border-emerald-400",
    bg: "bg-emerald-50/80",
    text: "text-emerald-900",
    badge: "bg-emerald-100 text-emerald-800 border-emerald-200",
    accent: "bg-emerald-600",
    line: "#10b981",
  },
  Revisão: {
    border: "border-emerald-400",
    bg: "bg-emerald-50/80",
    text: "text-emerald-900",
    badge: "bg-emerald-100 text-emerald-800 border-emerald-200",
    accent: "bg-emerald-600",
    line: "#10b981",
  },
  Financeiro: {
    border: "border-rose-400",
    bg: "bg-rose-50/80",
    text: "text-rose-900",
    badge: "bg-rose-100 text-rose-800 border-rose-200",
    accent: "bg-rose-500",
    line: "#f43f5e",
  },
  Geral: {
    border: "border-slate-300",
    bg: "bg-slate-50/90",
    text: "text-slate-900",
    badge: "bg-slate-200 text-slate-700 border-slate-300",
    accent: "bg-slate-600",
    line: "#94a3b8",
  },
};

const getColorForType = (tipo: string) => {
  if (TYPE_COLORS[tipo]) return TYPE_COLORS[tipo];
  // Hash to pick color
  const keys = Object.keys(TYPE_COLORS);
  let hash = 0;
  for (let i = 0; i < tipo.length; i++) {
    hash = tipo.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % keys.length;
  return TYPE_COLORS[keys[index]] || TYPE_COLORS.Geral;
};

const formatBrDate = (dateStr?: string) => {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
};

export const ProjectMindMap: React.FC<ProjectMindMapProps> = ({
  projeto,
  categorias,
  onToggleStep,
  onUpdateStepDate,
  onUpdateStepType,
  onDeleteStep,
  onAddStepToType,
  onAddTipo,
  onDeleteTipo,
  onOpenEditProjectModal,
  onDeleteProject,
}) => {
  const [zoom, setZoom] = useState(100);
  const [collapsedTypes, setCollapsedTypes] = useState<{ [tipo: string]: boolean }>({});
  const [addingStepToType, setAddingStepToType] = useState<string | null>(null);
  const [newStepText, setNewStepText] = useState("");
  const [newStepDate, setNewStepDate] = useState("");

  const [isAddingNewTipo, setIsAddingNewTipo] = useState(false);
  const [newTipoName, setNewTipoName] = useState("");

  const [editingStepDateId, setEditingStepDateId] = useState<string | number | null>(null);
  const [tempStepDate, setTempStepDate] = useState("");

  // Group steps by their "tipo"
  const groupedSteps = useMemo(() => {
    const passos = projeto.passos || [];
    const definedTypes = projeto.tipos_tarefas || ["Planejamento", "Execução", "Revisão", "Geral"];

    const groups: { [tipo: string]: PassoProjeto[] } = {};

    // Ensure all project defined types appear even if empty
    definedTypes.forEach((t) => {
      groups[t] = [];
    });

    // Populate steps
    passos.forEach((passo) => {
      const t = passo.tipo && passo.tipo.trim() ? passo.tipo.trim() : "Geral";
      if (!groups[t]) {
        groups[t] = [];
      }
      groups[t].push(passo);
    });

    return groups;
  }, [projeto]);

  const allTypes = Object.keys(groupedSteps);

  const toggleCollapseType = (tipo: string) => {
    setCollapsedTypes((prev) => ({
      ...prev,
      [tipo]: !prev[tipo],
    }));
  };

  const handleExpandAll = () => setCollapsedTypes({});
  const handleCollapseAll = () => {
    const c: { [key: string]: boolean } = {};
    allTypes.forEach((t) => (c[t] = true));
    setCollapsedTypes(c);
  };

  const handleCreateStep = async (tipo: string) => {
    if (!newStepText.trim()) return;
    await onAddStepToType(projeto.id, newStepText.trim(), tipo, newStepDate);
    setNewStepText("");
    setNewStepDate("");
    setAddingStepToType(null);
  };

  const handleCreateNewTipo = async () => {
    if (!newTipoName.trim()) return;
    await onAddTipo(projeto.id, newTipoName.trim());
    setNewTipoName("");
    setIsAddingNewTipo(false);
  };

  const progresso = projeto.progresso_pct || 0;
  const totalPassos = projeto.passos?.length || 0;
  const passosConcluidos = projeto.passos?.filter((p) => p.concluido).length || 0;

  return (
    <div className="bg-slate-50/70 border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden flex flex-col">
      {/* Mind Map Canvas Toolbar */}
      <div className="px-5 py-3.5 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-1.5">
              <span>Mapa Mental do Projeto</span>
              <span className="text-[11px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                {allTypes.length} Ramos de Tarefas
              </span>
            </h4>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Zoom controls */}
          <div className="flex items-center bg-slate-100 rounded-xl p-1 text-slate-600">
            <button
              onClick={() => setZoom((z) => Math.max(60, z - 10))}
              className="p-1.5 hover:bg-white hover:text-slate-900 rounded-lg transition-colors cursor-pointer"
              title="Reduzir zoom"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[11px] font-bold px-2 text-slate-700 min-w-[42px] text-center">
              {zoom}%
            </span>
            <button
              onClick={() => setZoom((z) => Math.min(140, z + 10))}
              className="p-1.5 hover:bg-white hover:text-slate-900 rounded-lg transition-colors cursor-pointer"
              title="Aumentar zoom"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setZoom(100)}
              className="p-1.5 hover:bg-white hover:text-slate-900 rounded-lg transition-colors cursor-pointer border-l border-slate-200 ml-0.5"
              title="Resetar zoom para 100%"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Expand/Collapse All */}
          <div className="hidden sm:flex items-center gap-1">
            <button
              onClick={handleExpandAll}
              className="px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              Expandir
            </button>
            <button
              onClick={handleCollapseAll}
              className="px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              Recolher
            </button>
          </div>

          {/* Add New Type Button */}
          <button
            onClick={() => setIsAddingNewTipo(true)}
            className="px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Tipo / Ramo</span>
          </button>

          {/* Edit Project Button */}
          <button
            onClick={() => onOpenEditProjectModal(projeto)}
            className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
            title="Editar Título e Descrição do Projeto"
          >
            <Edit3 className="w-3.5 h-3.5 text-indigo-600" />
            <span>Editar Projeto</span>
          </button>
        </div>
      </div>

      {/* New Tipo / Branch Input Bar */}
      {isAddingNewTipo && (
        <div className="px-5 py-2.5 bg-indigo-50/60 border-b border-indigo-100 flex items-center gap-2 animate-in slide-in-from-top-2 duration-150">
          <span className="text-xs font-bold text-indigo-900">Novo Ramo (Tipo de Tarefa):</span>
          <input
            type="text"
            autoFocus
            value={newTipoName}
            onChange={(e) => setNewTipoName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleCreateNewTipo();
              } else if (e.key === "Escape") {
                setIsAddingNewTipo(false);
              }
            }}
            placeholder="Ex: Arquitetura, Conteúdo, Jurídico, Vendas..."
            className="px-3 py-1 text-xs bg-white border border-indigo-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 text-slate-900 placeholder:text-slate-400 flex-1 max-w-xs"
          />
          <button
            onClick={handleCreateNewTipo}
            className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold cursor-pointer"
          >
            Adicionar
          </button>
          <button
            onClick={() => setIsAddingNewTipo(false)}
            className="px-2 py-1 text-slate-500 hover:text-slate-700 text-xs cursor-pointer"
          >
            Cancelar
          </button>
        </div>
      )}

      {/* Mind Map Interactive Canvas */}
      <div className="p-6 overflow-x-auto min-h-[460px] flex items-start select-none bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
        <div
          style={{ transform: `scale(${zoom / 100})`, transformOrigin: "top left" }}
          className="transition-transform duration-150 ease-out flex items-start gap-8 sm:gap-14 min-w-max"
        >
          {/* ================================================================= */}
          {/* LEVEL 0: ROOT / CENTRAL NODE (O PROJETO) */}
          {/* ================================================================= */}
          <div className="relative group shrink-0 w-80">
            <div className="bg-white rounded-2xl border-2 border-indigo-400 p-5 shadow-lg shadow-indigo-500/10 space-y-4 hover:shadow-xl hover:border-indigo-500 transition-all ring-4 ring-indigo-500/10">
              {/* Top Row: Category + Status */}
              <div className="flex items-center justify-between gap-2">
                <span className="px-2.5 py-0.5 rounded-lg text-[11px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200">
                  {projeto.categoria}
                </span>

                <div className="flex items-center gap-1.5">
                  <span
                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${
                      projeto.status === "Concluído"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : projeto.status === "Pausado"
                        ? "bg-amber-50 text-amber-700 border border-amber-200"
                        : "bg-blue-50 text-blue-700 border border-blue-200"
                    }`}
                  >
                    {projeto.status === "Concluído" ? (
                      <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                    ) : (
                      <Clock className="w-3 h-3 text-blue-500" />
                    )}
                    {projeto.status}
                  </span>
                </div>
              </div>

              {/* Title & Description */}
              <div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 leading-snug tracking-tight">
                  {projeto.titulo}
                </h3>
                {projeto.descricao ? (
                  <p className="text-xs text-slate-500 mt-1 line-clamp-3 leading-relaxed">
                    {projeto.descricao}
                  </p>
                ) : (
                  <p className="text-xs text-slate-400 italic mt-1">
                    Sem descrição detalhada. Clique no botão de editar para adicionar.
                  </p>
                )}
              </div>

              {/* Progress Bar & Percentage */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700">Progresso Geral</span>
                  <span className="font-black text-indigo-600 text-sm">{progresso}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden border border-slate-200/60">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      progresso === 100
                        ? "bg-emerald-500"
                        : progresso > 50
                        ? "bg-indigo-600"
                        : "bg-blue-500"
                    }`}
                    style={{ width: `${progresso}%` }}
                  ></div>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-0.5">
                  <span>
                    {passosConcluidos} de {totalPassos} tarefas feitas
                  </span>
                  {projeto.data_limite && (
                    <span className="flex items-center gap-1 font-medium text-slate-500">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      Prazo: {formatBrDate(projeto.data_limite)}
                    </span>
                  )}
                </div>
              </div>

              {/* Action Buttons for Project Node */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <button
                  onClick={() => onOpenEditProjectModal(projeto)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-indigo-700 hover:bg-indigo-50 flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Alterar título, descrição e prazo deste projeto"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Editar Título & Descrição</span>
                </button>

                <button
                  onClick={() => onDeleteProject(projeto.id, projeto.titulo)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                  title="Excluir este projeto"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Connecting dot on the right edge */}
            <div className="absolute top-1/2 -right-3 -translate-y-1/2 w-6 h-6 rounded-full bg-indigo-600 border-4 border-white shadow-md flex items-center justify-center text-white z-10">
              <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
            </div>
          </div>

          {/* ================================================================= */}
          {/* LEVEL 1: TASK TYPES / BRANCHES (OS TIPOS DE TAREFAS DENTRO DELE) */}
          {/* ================================================================= */}
          <div className="flex flex-col gap-6 relative">
            {allTypes.length === 0 ? (
              <div className="bg-white border-2 border-dashed border-slate-300 rounded-2xl p-6 text-center w-72">
                <p className="text-xs text-slate-500 mb-2">Nenhum ramo de tarefas cadastrado ainda.</p>
                <button
                  onClick={() => setIsAddingNewTipo(true)}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold cursor-pointer"
                >
                  + Criar Primeiro Ramo
                </button>
              </div>
            ) : (
              allTypes.map((tipo) => {
                const stepsOfType = groupedSteps[tipo] || [];
                const color = getColorForType(tipo);
                const isCollapsed = Boolean(collapsedTypes[tipo]);
                const completedStepsCount = stepsOfType.filter((s) => s.concluido).length;
                const isAllDone = stepsOfType.length > 0 && completedStepsCount === stepsOfType.length;

                return (
                  <div key={tipo} className="flex items-start gap-6 sm:gap-10 relative">
                    {/* Branch Line (Left connector from project) */}
                    <div
                      className="hidden sm:block absolute -left-10 top-6 w-10 h-0.5"
                      style={{ backgroundColor: color.line }}
                    ></div>

                    {/* TYPE NODE CARD */}
                    <div className="w-72 shrink-0 relative group">
                      <div
                        className={`rounded-2xl border-2 ${color.border} ${color.bg} p-4 shadow-sm hover:shadow-md transition-all space-y-3`}
                      >
                        {/* Header of Type Node */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color.line }}></span>
                            <h4 className="text-xs sm:text-sm font-black text-slate-900 truncate">
                              {tipo}
                            </h4>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${color.badge}`}>
                              {completedStepsCount}/{stepsOfType.length}
                            </span>
                            <button
                              onClick={() => toggleCollapseType(tipo)}
                              className="p-1 text-slate-500 hover:text-slate-800 rounded-md hover:bg-white/80 transition-colors cursor-pointer"
                              title={isCollapsed ? "Expandir tarefas" : "Recolher tarefas"}
                            >
                              {isCollapsed ? (
                                <ChevronRight className="w-3.5 h-3.5" />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </div>

                        {/* Progress mini-bar */}
                        <div className="w-full bg-white/80 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              isAllDone ? "bg-emerald-500" : color.accent
                            }`}
                            style={{
                              width: `${
                                stepsOfType.length > 0
                                  ? Math.round((completedStepsCount / stepsOfType.length) * 100)
                                  : 0
                              }%`,
                            }}
                          ></div>
                        </div>

                        {/* Quick action: + Tarefa neste tipo */}
                        <div className="flex items-center justify-between pt-1">
                          <button
                            onClick={() => {
                              setAddingStepToType(tipo);
                              setCollapsedTypes((prev) => ({ ...prev, [tipo]: false }));
                            }}
                            className="px-2.5 py-1 rounded-lg text-xs font-bold text-slate-800 hover:text-indigo-600 bg-white/90 hover:bg-white border border-slate-200/80 flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                          >
                            <Plus className="w-3 h-3 text-indigo-600" />
                            <span>+ Tarefa</span>
                          </button>

                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => onDeleteTipo(projeto.id, tipo)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded-md hover:bg-white/80 transition-colors cursor-pointer"
                              title="Excluir este tipo de tarefa"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Right connecting dot to leaf tasks */}
                      {stepsOfType.length > 0 && !isCollapsed && (
                        <div
                          className="hidden sm:flex absolute top-6 -right-3 -translate-y-1/2 w-5 h-5 rounded-full border-2 border-white shadow-xs items-center justify-center text-white z-10"
                          style={{ backgroundColor: color.line }}
                        >
                          <span className="w-1 h-1 rounded-full bg-white"></span>
                        </div>
                      )}
                    </div>

                    {/* ================================================================= */}
                    {/* LEVEL 2: LEAF NODES (AS TAREFAS / PASSOS DENTRO DESTE TIPO) */}
                    {/* ================================================================= */}
                    {!isCollapsed && (
                      <div className="flex flex-col gap-2.5 w-80 shrink-0 relative">
                        {/* Connecting vertical trunk line */}
                        {stepsOfType.length > 1 && (
                          <div
                            className="hidden sm:block absolute -left-5 top-5 bottom-5 w-0.5"
                            style={{ backgroundColor: color.line + "60" }}
                          ></div>
                        )}

                        {/* Inline form to add step to this specific type */}
                        {addingStepToType === tipo && (
                          <div className="p-3 bg-white rounded-xl border-2 border-indigo-400 shadow-md space-y-2 animate-in fade-in duration-150">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-bold uppercase text-indigo-700">
                                Nova Tarefa em: {tipo}
                              </span>
                              <button
                                onClick={() => setAddingStepToType(null)}
                                className="text-slate-400 hover:text-slate-600 text-xs font-bold"
                              >
                                ✕
                              </button>
                            </div>
                            <input
                              type="text"
                              autoFocus
                              value={newStepText}
                              onChange={(e) => setNewStepText(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  handleCreateStep(tipo);
                                }
                              }}
                              placeholder="O que precisa ser feito..."
                              className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 text-slate-900"
                            />
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1">
                                <Calendar className="w-3 h-3 text-slate-400" />
                                <input
                                  type="date"
                                  value={newStepDate}
                                  onChange={(e) => setNewStepDate(e.target.value)}
                                  className="text-xs bg-transparent border-none focus:outline-hidden text-slate-700 cursor-pointer"
                                />
                              </div>
                              <button
                                onClick={() => handleCreateStep(tipo)}
                                className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold cursor-pointer"
                              >
                                Salvar
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Steps of this type */}
                        {stepsOfType.length === 0 && addingStepToType !== tipo ? (
                          <div className="p-3 bg-white/70 border border-dashed border-slate-200 rounded-xl text-center">
                            <p className="text-[11px] text-slate-400 italic mb-1.5">
                              Nenhuma tarefa adicionada neste ramo ainda.
                            </p>
                            <button
                              onClick={() => setAddingStepToType(tipo)}
                              className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                            >
                              + Adicionar Tarefa
                            </button>
                          </div>
                        ) : (
                          stepsOfType.map((step) => {
                            const isEditingDate = editingStepDateId === step.id;

                            return (
                              <div
                                key={step.id}
                                className={`group/step relative rounded-xl border p-3 transition-all ${
                                  step.concluido
                                    ? "bg-slate-50/80 border-slate-200/70 text-slate-400 shadow-none"
                                    : "bg-white border-slate-200/90 text-slate-900 shadow-2xs hover:border-slate-300 hover:shadow-xs"
                                }`}
                              >
                                {/* Left horizontal line connector */}
                                <div
                                  className="hidden sm:block absolute -left-5 top-1/2 -translate-y-1/2 w-5 h-0.5"
                                  style={{ backgroundColor: color.line + "80" }}
                                ></div>

                                <div className="flex items-start justify-between gap-2.5">
                                  {/* Checkbox & Step Title */}
                                  <label className="flex items-start gap-2.5 flex-1 min-w-0 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={step.concluido}
                                      onChange={() => onToggleStep(projeto.id, step)}
                                      className="mt-0.5 w-4 h-4 text-indigo-600 rounded-md border-slate-300 focus:ring-indigo-500 cursor-pointer shrink-0"
                                    />
                                    <span
                                      className={`text-xs font-semibold leading-snug break-words ${
                                        step.concluido ? "line-through text-slate-400 font-normal" : "text-slate-800"
                                      }`}
                                    >
                                      {step.titulo}
                                    </span>
                                  </label>

                                  {/* Delete Step Button */}
                                  <button
                                    onClick={() => onDeleteStep(projeto.id, step.id)}
                                    className="opacity-60 group-hover/step:opacity-100 p-1 text-slate-300 hover:text-rose-600 rounded-md transition-colors cursor-pointer shrink-0"
                                    title="Excluir tarefa"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>

                                {/* Step Footer: Prazo e Mudar de Ramo */}
                                <div className="flex items-center justify-between gap-1.5 pt-2 mt-1.5 border-t border-slate-100 text-[11px]">
                                  {/* Prazo Editor (won't close unexpectedly) */}
                                  {isEditingDate ? (
                                    <div className="flex items-center gap-1 bg-white border border-indigo-400 rounded-lg p-1 shadow-md ring-2 ring-indigo-500/20 z-20">
                                      <input
                                        type="date"
                                        value={tempStepDate}
                                        autoFocus
                                        onChange={(e) => setTempStepDate(e.target.value)}
                                        onKeyDown={(e) => {
                                          if (e.key === "Enter") {
                                            e.preventDefault();
                                            onUpdateStepDate(projeto.id, step.id, tempStepDate);
                                            setEditingStepDateId(null);
                                          } else if (e.key === "Escape") {
                                            setEditingStepDateId(null);
                                          }
                                        }}
                                        className="text-[11px] px-1 py-0.5 border border-slate-200 rounded-md focus:outline-hidden text-slate-800 cursor-pointer"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => {
                                          onUpdateStepDate(projeto.id, step.id, tempStepDate);
                                          setEditingStepDateId(null);
                                        }}
                                        className="px-1.5 py-0.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-[10px] font-semibold cursor-pointer"
                                      >
                                        Salvar
                                      </button>
                                      {step.data_limite && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            onUpdateStepDate(projeto.id, step.id, "");
                                            setEditingStepDateId(null);
                                          }}
                                          className="px-1 py-0.5 text-rose-600 hover:bg-rose-50 rounded-md text-[10px]"
                                          title="Remover data"
                                        >
                                          Limpar
                                        </button>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() => setEditingStepDateId(null)}
                                        className="p-1 text-slate-400 hover:text-slate-600 text-[10px]"
                                      >
                                        ✕
                                      </button>
                                    </div>
                                  ) : step.data_limite ? (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingStepDateId(step.id);
                                        setTempStepDate(step.data_limite || "");
                                      }}
                                      className="font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-1.5 py-0.5 rounded-md flex items-center gap-1 transition-colors cursor-pointer"
                                      title="Clique para alterar o prazo"
                                    >
                                      <Calendar className="w-3 h-3 text-indigo-500" />
                                      <span>{formatBrDate(step.data_limite)}</span>
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingStepDateId(step.id);
                                        setTempStepDate("");
                                      }}
                                      className="text-slate-400 hover:text-indigo-600 flex items-center gap-1 transition-colors cursor-pointer"
                                      title="Definir prazo"
                                    >
                                      <Calendar className="w-3 h-3" />
                                      <span>+ Prazo</span>
                                    </button>
                                  )}

                                  {/* Change Type Dropdown */}
                                  <select
                                    value={step.tipo || "Geral"}
                                    onChange={(e) => onUpdateStepType(projeto.id, step.id, e.target.value)}
                                    className="text-[10px] text-slate-500 bg-slate-50 border border-slate-200/80 rounded-md px-1.5 py-0.5 focus:outline-hidden hover:bg-slate-100 cursor-pointer"
                                    title="Mover esta tarefa para outro tipo"
                                  >
                                    {allTypes.map((t) => (
                                      <option key={t} value={t}>
                                        {t}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
