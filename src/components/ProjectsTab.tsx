import React, { useState } from "react";
import {
  FolderKanban,
  Plus,
  CheckCircle2,
  Calendar,
  Trash2,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Tag,
  Clock,
  Layers,
  Edit3,
  Network,
  LayoutList,
  SlidersHorizontal,
  X,
  Check,
} from "lucide-react";
import { Projeto, PassoProjeto, StatusProjeto } from "../types";
import {
  addProjetoFirestore,
  updateProjetoFirestore,
  deleteProjetoFirestore,
  addPassoFirestore,
  updatePassoFirestore,
  togglePassoFirestore,
  deletePassoFirestore,
} from "../lib/firebase";
import { ProjectMindMap } from "./ProjectMindMap";
import { EditProjectModal } from "./EditProjectModal";

interface ProjectsTabProps {
  projetos: Projeto[];
  categorias: string[];
  hasGeminiKey: boolean;
  onRefreshProjetos: () => Promise<void>;
  onSetProjetos?: React.Dispatch<React.SetStateAction<Projeto[]>>;
  onShowToast: (text: string, type?: "success" | "info") => void;
}

const PRESET_TIPOS = [
  "Planejamento",
  "Design & UX",
  "Desenvolvimento",
  "Execução",
  "Testes & Validação",
  "Lançamento & Marketing",
  "Financeiro",
  "Revisão",
  "Geral",
];

const formatBrDate = (dateStr?: string) => {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
};

export const ProjectsTab: React.FC<ProjectsTabProps> = ({
  projetos,
  categorias,
  hasGeminiKey,
  onRefreshProjetos,
  onSetProjetos,
  onShowToast,
}) => {
  // View mode: 'mindmap' (Mapa Mental) or 'list' (Lista / Fases)
  const [viewMode, setViewMode] = useState<"mindmap" | "list">("mindmap");

  // Selected project for Mind Map view (defaults to first project if available)
  const [selectedProjectId, setSelectedProjectId] = useState<string | number | null>(null);

  // Edit Project Modal state
  const [editingProject, setEditingProject] = useState<Projeto | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Novo Projeto Form State
  const [showNovoForm, setShowNovoForm] = useState(false);
  const [novoTitulo, setNovoTitulo] = useState("");
  const [novaDescricao, setNovaDescricao] = useState("");
  const [novaCategoria, setNovaCategoria] = useState(categorias[0] || "Trabalho");
  const [novoPrazo, setNovoPrazo] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split("T")[0];
  });
  const [novoPassoInput, setNovoPassoInput] = useState("");
  const [novoPassoTipo, setNovoPassoTipo] = useState("Planejamento");
  const [novoPassoPrazo, setNovoPassoPrazo] = useState("");
  const [passosTemp, setPassosTemp] = useState<
    Array<{ titulo: string; tipo: string; data_limite?: string }>
  >([]);
  const [isSuggestingWithAI, setIsSuggestingWithAI] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Inline add step per project in list view
  const [inlineStepInputs, setInlineStepInputs] = useState<{ [projectId: string]: string }>({});
  const [inlineStepTypes, setInlineStepTypes] = useState<{ [projectId: string]: string }>({});
  const [inlineStepDates, setInlineStepDates] = useState<{ [projectId: string]: string }>({});
  const [editingStepDate, setEditingStepDate] = useState<{
    projectId: string | number;
    stepId: string | number;
    tempDate: string;
  } | null>(null);

  // Filter state inside projects
  const [filtroCategoria, setFiltroCategoria] = useState<string>("Todas");
  const [filtroStatus, setFiltroStatus] = useState<string>("Todos");

  // Filtered projects
  const projetosFiltrados = projetos.filter((p) => {
    if (filtroCategoria !== "Todas" && p.categoria !== filtroCategoria) return false;
    if (filtroStatus !== "Todos" && p.status !== filtroStatus) return false;
    return true;
  });

  // Active project in mind map
  const activeMindMapProject =
    projetosFiltrados.find((p) => String(p.id) === String(selectedProjectId)) ||
    projetosFiltrados[0] ||
    null;

  // Add step to temp list in create form
  const handleAddPassoTemp = () => {
    if (!novoPassoInput.trim()) return;
    setPassosTemp((prev) => [
      ...prev,
      {
        titulo: novoPassoInput.trim(),
        tipo: novoPassoTipo || "Geral",
        data_limite: novoPassoPrazo || "",
      },
    ]);
    setNovoPassoInput("");
    setNovoPassoPrazo("");
  };

  const handleRemovePassoTemp = (index: number) => {
    setPassosTemp((prev) => prev.filter((_, idx) => idx !== index));
  };

  // AI Step Suggestion with types
  const handleSuggestStepsAI = async () => {
    if (!novoTitulo.trim()) {
      alert("Por favor, preencha ao menos o título do projeto para a IA sugerir os passos.");
      return;
    }
    setIsSuggestingWithAI(true);
    try {
      const res = await fetch("/api/projects/ai-suggest-steps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ titulo: novoTitulo, descricao: novaDescricao }),
      });
      if (!res.ok) throw new Error("Falha ao consultar Gemini.");
      const data = await res.json();
      if (Array.isArray(data.passos) && data.passos.length > 0) {
        const stepTypes = ["Planejamento", "Execução", "Execução", "Revisão", "Lançamento & Marketing"];
        const stepsObjs = data.passos.map((p: string, idx: number) => ({
          titulo: p,
          tipo: stepTypes[idx % stepTypes.length] || "Geral",
          data_limite: "",
        }));
        setPassosTemp((prev) => [...prev, ...stepsObjs]);
        onShowToast(`✨ Gemini sugeriu ${data.passos.length} etapas categorizadas!`, "success");
      }
    } catch (err: any) {
      alert(err.message || "Erro ao sugerir etapas com IA.");
    } finally {
      setIsSuggestingWithAI(false);
    }
  };

  // Submit Create Project
  const handleCriarProjeto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoTitulo.trim()) return;

    setIsSubmitting(true);
    try {
      const passosFinal = [...passosTemp];
      if (novoPassoInput.trim()) {
        passosFinal.push({
          titulo: novoPassoInput.trim(),
          tipo: novoPassoTipo || "Geral",
          data_limite: novoPassoPrazo || "",
        });
      }

      // Collect distinct types
      const distinctTypes = Array.from(
        new Set(["Planejamento", "Execução", "Revisão", "Geral", ...passosFinal.map((p) => p.tipo)])
      );

      const passosFormatados: PassoProjeto[] = passosFinal.map((p, idx) => ({
        id: `step_${Date.now()}_${idx}`,
        projeto_id: "",
        titulo: p.titulo,
        tipo: p.tipo || "Geral",
        concluido: false,
        ordem: idx + 1,
        data_limite: p.data_limite || "",
      }));

      const newDocId = await addProjetoFirestore({
        titulo: novoTitulo.trim(),
        descricao: novaDescricao.trim(),
        categoria: novaCategoria,
        data_limite: novoPrazo,
        status: "Em Andamento",
        passos: passosFormatados,
        tipos_tarefas: distinctTypes,
      });

      const novoProjItem: Projeto = {
        id: newDocId || `proj_${Date.now()}`,
        titulo: novoTitulo.trim(),
        descricao: novaDescricao.trim(),
        categoria: novaCategoria,
        data_limite: novoPrazo,
        status: "Em Andamento",
        criado_em: new Date().toISOString(),
        passos: passosFormatados,
        tipos_tarefas: distinctTypes,
        progresso_pct: 0,
        total_passos: passosFormatados.length,
        passos_concluidos: 0,
      };

      // Optimistic update
      onSetProjetos?.((prev) => [
        novoProjItem,
        ...prev.filter((p) => String(p.id) !== String(novoProjItem.id)),
      ]);
      setSelectedProjectId(novoProjItem.id);

      // Background sync with local server
      fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titulo: novoTitulo,
          descricao: novaDescricao,
          categoria: novaCategoria,
          data_limite: novoPrazo,
          passos: passosFormatados,
          tipos_tarefas: distinctTypes,
        }),
      }).catch(() => {});

      setNovoTitulo("");
      setNovaDescricao("");
      setPassosTemp([]);
      setNovoPassoInput("");
      setNovoPassoPrazo("");
      setShowNovoForm(false);
      onShowToast("🚀 Projeto salvo no mapa mental com sucesso!", "success");
    } catch (err: any) {
      alert(err.message || "Erro ao salvar projeto.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Update Project Details (Title, Description, Category, Deadline, Status)
  const handleSaveProjectDetails = async (id: string | number, updates: Partial<Projeto>) => {
    // Optimistic UI update
    onSetProjetos?.((prev) =>
      prev.map((p) => {
        if (String(p.id) !== String(id)) return p;
        return { ...p, ...updates };
      })
    );

    try {
      await updateProjetoFirestore(id, updates);
      fetch(`/api/projects/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      }).catch(() => {});
      onShowToast("✨ Projeto atualizado com sucesso!", "success");
    } catch (err) {
      console.error("Erro ao atualizar projeto:", err);
      alert("Falha ao salvar alterações no projeto.");
    }
  };

  // Toggle Step Completion
  const handleToggleStep = async (projectId: string | number, step: PassoProjeto) => {
    onSetProjetos?.((prev) =>
      prev.map((p) => {
        if (String(p.id) !== String(projectId)) return p;
        const updatedPassos = (p.passos || []).map((s) =>
          String(s.id) === String(step.id) ? { ...s, concluido: !s.concluido } : s
        );
        const concluidos = updatedPassos.filter((s) => s.concluido).length;
        const total = updatedPassos.length;
        return {
          ...p,
          passos: updatedPassos,
          passos_concluidos: concluidos,
          progresso_pct: total > 0 ? Math.round((concluidos / total) * 100) : 0,
        };
      })
    );

    try {
      const proj = projetos.find((p) => String(p.id) === String(projectId));
      if (proj) {
        await togglePassoFirestore(projectId, step.id, proj.passos);
      }
      fetch(`/api/projects/${projectId}/passos/${step.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ concluido: !step.concluido }),
      }).catch(() => {});
      if (!step.concluido) {
        onShowToast("✅ Tarefa concluída!", "success");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Update step deadline
  const handleUpdateStepDate = async (
    projectId: string | number,
    stepId: string | number,
    newDataLimite: string
  ) => {
    onSetProjetos?.((prev) =>
      prev.map((p) => {
        if (String(p.id) !== String(projectId)) return p;
        const updatedPassos = (p.passos || []).map((s) =>
          String(s.id) === String(stepId) ? { ...s, data_limite: newDataLimite } : s
        );
        return { ...p, passos: updatedPassos };
      })
    );

    try {
      const proj = projetos.find((p) => String(p.id) === String(projectId));
      if (proj) {
        await updatePassoFirestore(projectId, stepId, proj.passos, { data_limite: newDataLimite });
      }
      fetch(`/api/projects/${projectId}/passos/${stepId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data_limite: newDataLimite }),
      }).catch(() => {});
      onShowToast("📅 Prazo da etapa atualizado!", "success");
    } catch (err) {
      console.error(err);
    }
  };

  // Update step type (move step to another type)
  const handleUpdateStepType = async (
    projectId: string | number,
    stepId: string | number,
    novoTipo: string
  ) => {
    onSetProjetos?.((prev) =>
      prev.map((p) => {
        if (String(p.id) !== String(projectId)) return p;
        const updatedPassos = (p.passos || []).map((s) =>
          String(s.id) === String(stepId) ? { ...s, tipo: novoTipo } : s
        );
        return { ...p, passos: updatedPassos };
      })
    );

    try {
      const proj = projetos.find((p) => String(p.id) === String(projectId));
      if (proj) {
        await updatePassoFirestore(projectId, stepId, proj.passos, { tipo: novoTipo });
      }
      fetch(`/api/projects/${projectId}/passos/${stepId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo: novoTipo }),
      }).catch(() => {});
      onShowToast(`Tarefa movida para "${novoTipo}"!`, "info");
    } catch (err) {
      console.error(err);
    }
  };

  // Delete Step
  const handleDeleteStep = async (projectId: string | number, stepId: string | number) => {
    onSetProjetos?.((prev) =>
      prev.map((p) => {
        if (String(p.id) !== String(projectId)) return p;
        const updatedPassos = (p.passos || []).filter((s) => String(s.id) !== String(stepId));
        const concluidos = updatedPassos.filter((s) => s.concluido).length;
        const total = updatedPassos.length;
        return {
          ...p,
          passos: updatedPassos,
          passos_concluidos: concluidos,
          progresso_pct: total > 0 ? Math.round((concluidos / total) * 100) : 0,
        };
      })
    );

    try {
      const proj = projetos.find((p) => String(p.id) === String(projectId));
      if (proj) {
        await deletePassoFirestore(projectId, stepId, proj.passos);
      }
      fetch(`/api/projects/${projectId}/passos/${stepId}`, {
        method: "DELETE",
      }).catch(() => {});
      onShowToast("Tarefa removida.", "info");
    } catch (err) {
      console.error(err);
    }
  };

  // Add Step to Specific Type
  const handleAddStepToType = async (
    projectId: string | number,
    titulo: string,
    tipo: string,
    dataLimite?: string
  ) => {
    const newStep: PassoProjeto = {
      id: `step_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      projeto_id: projectId,
      titulo: titulo.trim(),
      tipo: tipo || "Geral",
      concluido: false,
      ordem: 999,
      data_limite: dataLimite || "",
    };

    onSetProjetos?.((prev) =>
      prev.map((p) => {
        if (String(p.id) !== String(projectId)) return p;
        const updatedPassos = [...(p.passos || []), newStep];
        const concluidos = updatedPassos.filter((s) => s.concluido).length;
        const total = updatedPassos.length;
        return {
          ...p,
          passos: updatedPassos,
          passos_concluidos: concluidos,
          progresso_pct: total > 0 ? Math.round((concluidos / total) * 100) : 0,
        };
      })
    );

    try {
      const proj = projetos.find((p) => String(p.id) === String(projectId));
      if (proj) {
        await addPassoFirestore(projectId, titulo, proj.passos, dataLimite, tipo);
      }
      fetch(`/api/projects/${projectId}/passos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ titulo, data_limite: dataLimite, tipo }),
      }).catch(() => {});
      onShowToast(`Tarefa adicionada em "${tipo}"!`, "success");
    } catch (err) {
      console.error(err);
    }
  };

  // Add new type/branch to project
  const handleAddTipo = async (projectId: string | number, novoTipo: string) => {
    const trimmed = novoTipo.trim();
    if (!trimmed) return;

    onSetProjetos?.((prev) =>
      prev.map((p) => {
        if (String(p.id) !== String(projectId)) return p;
        const currentTypes = p.tipos_tarefas || ["Planejamento", "Execução", "Revisão", "Geral"];
        if (currentTypes.includes(trimmed)) return p;
        return { ...p, tipos_tarefas: [...currentTypes, trimmed] };
      })
    );

    try {
      const proj = projetos.find((p) => String(p.id) === String(projectId));
      if (proj) {
        const currentTypes = proj.tipos_tarefas || ["Planejamento", "Execução", "Revisão", "Geral"];
        if (!currentTypes.includes(trimmed)) {
          const updated = [...currentTypes, trimmed];
          await updateProjetoFirestore(projectId, { tipos_tarefas: updated });
          fetch(`/api/projects/${projectId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ tipos_tarefas: updated }),
          }).catch(() => {});
        }
      }
      onShowToast(`Ramo "${trimmed}" criado no mapa mental!`, "success");
    } catch (err) {
      console.error(err);
    }
  };

  // Delete a type/branch from project
  const handleDeleteTipo = async (projectId: string | number, tipoToDelete: string) => {
    if (!confirm(`Deseja remover o tipo "${tipoToDelete}"? As tarefas deste tipo serão movidas para "Geral".`)) {
      return;
    }

    onSetProjetos?.((prev) =>
      prev.map((p) => {
        if (String(p.id) !== String(projectId)) return p;
        const updatedTypes = (p.tipos_tarefas || []).filter((t) => t !== tipoToDelete);
        const updatedPassos = (p.passos || []).map((s) =>
          s.tipo === tipoToDelete ? { ...s, tipo: "Geral" } : s
        );
        return { ...p, tipos_tarefas: updatedTypes, passos: updatedPassos };
      })
    );

    try {
      const proj = projetos.find((p) => String(p.id) === String(projectId));
      if (proj) {
        const updatedTypes = (proj.tipos_tarefas || []).filter((t) => t !== tipoToDelete);
        const updatedPassos = (proj.passos || []).map((s) =>
          s.tipo === tipoToDelete ? { ...s, tipo: "Geral" } : s
        );
        await updateProjetoFirestore(projectId, {
          tipos_tarefas: updatedTypes,
          passos: updatedPassos,
        });
      }
      onShowToast(`Ramo "${tipoToDelete}" removido.`, "info");
    } catch (err) {
      console.error(err);
    }
  };

  // Delete Project
  const handleDeleteProject = async (projectId: string | number, titulo: string) => {
    if (!confirm(`Deseja realmente excluir o projeto "${titulo}" e todas as suas etapas?`)) {
      return;
    }

    onSetProjetos?.((prev) => prev.filter((p) => String(p.id) !== String(projectId)));

    try {
      await deleteProjetoFirestore(projectId);
      fetch(`/api/projects/${projectId}`, { method: "DELETE" }).catch(() => {});
      onShowToast("Projeto excluído com sucesso.", "info");
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Banner & Main Actions */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">🧠</span>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">
              Projetos & Mapa Mental
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-500">
            Visualize seus projetos em formato de mapa mental, divida em tipos de tarefas e edite títulos e metas com facilidade.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* View Mode Toggle: Mapa Mental vs Lista */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setViewMode("mindmap")}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === "mindmap"
                  ? "bg-white text-indigo-700 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Network className="w-3.5 h-3.5 text-indigo-600" />
              <span>Mapa Mental</span>
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === "list"
                  ? "bg-white text-indigo-700 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <LayoutList className="w-3.5 h-3.5 text-indigo-600" />
              <span>Lista & Fases</span>
            </button>
          </div>

          <button
            onClick={() => setShowNovoForm((prev) => !prev)}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-semibold flex items-center gap-2 shadow-xs transition-colors cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>{showNovoForm ? "Fechar Formulário" : "Novo Projeto"}</span>
          </button>
        </div>
      </div>

      {/* Form Criar Novo Projeto */}
      {showNovoForm && (
        <div className="bg-white rounded-2xl border border-indigo-100 shadow-md p-6 animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FolderKanban className="w-4 h-4 text-indigo-600" />
              Lançar Novo Projeto
            </h3>
            <span className="text-xs text-slate-500">
              Defina o objetivo e os passos organizados por tipo
            </span>
          </div>

          <form onSubmit={handleCriarProjeto} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">
                  Título do Projeto *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Reforma do escritório, Lançamento do novo site, Certificação AWS..."
                  value={novoTitulo}
                  onChange={(e) => setNovoTitulo(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 placeholder:text-slate-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">
                  Categoria *
                </label>
                <select
                  value={novaCategoria}
                  onChange={(e) => setNovaCategoria(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 font-medium"
                >
                  {categorias.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">
                  Descrição / Metas do Projeto
                </label>
                <input
                  type="text"
                  placeholder="Resultados esperados, entregáveis ou notas contextuais..."
                  value={novaDescricao}
                  onChange={(e) => setNovaDescricao(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 placeholder:text-slate-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">
                  Prazo / Data Limite *
                </label>
                <input
                  type="date"
                  required
                  value={novoPrazo}
                  onChange={(e) => setNovoPrazo(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 cursor-pointer"
                />
              </div>
            </div>

            {/* Passos e Tipos de Tarefa */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <label className="text-xs font-bold uppercase text-slate-700 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-indigo-600" />
                  Passos & Tipos de Tarefas ({passosTemp.length})
                </label>

                <button
                  type="button"
                  onClick={handleSuggestStepsAI}
                  disabled={isSuggestingWithAI}
                  className="px-3 py-1.5 rounded-lg bg-indigo-100/70 hover:bg-indigo-200 text-indigo-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 disabled:opacity-50"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>
                    {isSuggestingWithAI ? "IA estruturando..." : "Sugerir com Gemini"}
                  </span>
                </button>
              </div>

              {/* Input for single step with Tipo selector */}
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  placeholder="Ex: Orçar materiais com 3 fornecedores..."
                  value={novoPassoInput}
                  onChange={(e) => setNovoPassoInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddPassoTemp();
                    }
                  }}
                  className="flex-1 px-3.5 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900"
                />

                <div className="flex flex-wrap items-center gap-1.5">
                  {/* Tipo de Tarefa */}
                  <select
                    value={novoPassoTipo}
                    onChange={(e) => setNovoPassoTipo(e.target.value)}
                    className="px-2.5 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-800 font-semibold focus:outline-hidden cursor-pointer"
                    title="Selecione o tipo de tarefa"
                  >
                    {PRESET_TIPOS.map((tp) => (
                      <option key={tp} value={tp}>
                        {tp}
                      </option>
                    ))}
                  </select>

                  <div
                    className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5"
                    title="Prazo opcional para este passo"
                  >
                    <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <input
                      type="date"
                      value={novoPassoPrazo}
                      onChange={(e) => setNovoPassoPrazo(e.target.value)}
                      className="text-xs bg-transparent border-none focus:outline-hidden text-slate-700 cursor-pointer"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleAddPassoTemp}
                    className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold cursor-pointer shrink-0"
                  >
                    + Passo
                  </button>
                </div>
              </div>

              {/* Steps pills list */}
              {passosTemp.length > 0 ? (
                <div className="space-y-1.5 pt-1">
                  {passosTemp.map((passo, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-4 h-4 rounded-full bg-slate-100 text-slate-500 text-[10px] font-bold flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-[10px] font-bold border border-indigo-200">
                          {passo.tipo}
                        </span>
                        <span className="font-medium text-slate-800">{passo.titulo}</span>
                        {passo.data_limite && (
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-semibold flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            {formatBrDate(passo.data_limite)}
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemovePassoTemp(idx)}
                        className="text-slate-400 hover:text-rose-600 font-bold px-1 cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">
                  Nenhum passo adicionado ainda. Digite acima ou clique em "Sugerir com Gemini".
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowNovoForm(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-100 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
              >
                <Plus className="w-4 h-4" />
                <span>{isSubmitting ? "Lançando..." : "Lançar Projeto"}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filter and Project Selector Row */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200">
        <div className="flex flex-wrap items-center gap-3">
          {/* Category Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase text-slate-500">Categoria:</span>
            <select
              value={filtroCategoria}
              onChange={(e) => setFiltroCategoria(e.target.value)}
              className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:outline-hidden cursor-pointer"
            >
              <option value="Todas">Todas as Categorias</option>
              {categorias.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase text-slate-500">Status:</span>
            <div className="flex gap-1 bg-slate-100 p-1 rounded-xl text-xs">
              {["Todos", "Em Andamento", "Concluído"].map((st) => (
                <button
                  key={st}
                  onClick={() => setFiltroStatus(st)}
                  className={`px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                    filtroStatus === st
                      ? "bg-white text-indigo-700 shadow-xs font-semibold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Project Switcher for Mind Map */}
        {viewMode === "mindmap" && projetosFiltrados.length > 1 && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500">Projeto no Mapa:</span>
            <select
              value={String(activeMindMapProject?.id || "")}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="px-3 py-1.5 text-xs bg-indigo-50/70 border border-indigo-200 rounded-lg text-indigo-900 font-bold focus:outline-hidden cursor-pointer"
            >
              {projetosFiltrados.map((p) => (
                <option key={p.id} value={String(p.id)}>
                  {p.titulo} ({p.progresso_pct}%)
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Main Content Area: Mind Map View OR List View */}
      {projetosFiltrados.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3">
            <FolderKanban className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-900 mb-1">
            Nenhum projeto encontrado
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto mb-4">
            Crie seu primeiro projeto para visualizar no mapa mental e acompanhar as etapas.
          </p>
          <button
            onClick={() => setShowNovoForm(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl cursor-pointer"
          >
            Criar Projeto Agora
          </button>
        </div>
      ) : viewMode === "mindmap" ? (
        /* =================================================================== */
        /* MIND MAP VIEW */
        /* =================================================================== */
        <div className="space-y-6">
          {activeMindMapProject ? (
            <ProjectMindMap
              key={activeMindMapProject.id}
              projeto={activeMindMapProject}
              categorias={categorias}
              onToggleStep={handleToggleStep}
              onUpdateStepDate={handleUpdateStepDate}
              onUpdateStepType={handleUpdateStepType}
              onDeleteStep={handleDeleteStep}
              onAddStepToType={handleAddStepToType}
              onAddTipo={handleAddTipo}
              onDeleteTipo={handleDeleteTipo}
              onOpenEditProjectModal={(proj) => {
                setEditingProject(proj);
                setIsEditModalOpen(true);
              }}
              onDeleteProject={handleDeleteProject}
            />
          ) : null}

          {/* Quick project switcher strip if multiple projects */}
          {projetosFiltrados.length > 1 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Outros Projetos para Visualizar no Mapa Mental:
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {projetosFiltrados.map((p) => {
                  const isSelected = String(p.id) === String(activeMindMapProject?.id);
                  return (
                    <div
                      key={p.id}
                      onClick={() => setSelectedProjectId(p.id)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                        isSelected
                          ? "bg-indigo-50/70 border-indigo-400 ring-2 ring-indigo-500/20 shadow-xs"
                          : "bg-white border-slate-200 hover:border-indigo-200 hover:bg-slate-50/60"
                      }`}
                    >
                      <div className="min-w-0">
                        <span className="text-[10px] font-bold uppercase text-slate-500">
                          {p.categoria}
                        </span>
                        <h5 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                          {p.titulo}
                        </h5>
                        <p className="text-[11px] text-slate-400">
                          {p.passos_concluidos} de {p.total_passos} tarefas feitas
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-base font-black text-indigo-600">
                          {p.progresso_pct}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* =================================================================== */
        /* LIST / PHASES VIEW (ORGANIZED BY TASK TYPES) */
        /* =================================================================== */
        <div className="space-y-4">
          {projetosFiltrados.map((proj) => {
            const progresso = proj.progresso_pct;
            const isCompleted = proj.status === "Concluído" || progresso === 100;
            const totalPassos = proj.passos?.length || 0;
            const passosConcluidos = proj.passos?.filter((p) => p.concluido).length || 0;

            // Group steps by type
            const definedTypes = proj.tipos_tarefas || ["Planejamento", "Execução", "Revisão", "Geral"];
            const stepsByType: { [t: string]: PassoProjeto[] } = {};
            definedTypes.forEach((t) => (stepsByType[t] = []));
            (proj.passos || []).forEach((s) => {
              const tp = s.tipo && s.tipo.trim() ? s.tipo.trim() : "Geral";
              if (!stepsByType[tp]) stepsByType[tp] = [];
              stepsByType[tp].push(s);
            });

            return (
              <div
                key={proj.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs hover:border-slate-300 transition-all space-y-4"
              >
                {/* Header of Project Card */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                        {proj.categoria}
                      </span>
                      {isCompleted ? (
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Concluído
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {proj.status}
                        </span>
                      )}
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        Prazo: {formatBrDate(proj.data_limite)}
                      </span>
                    </div>

                    <h3 className="text-base sm:text-lg font-bold text-slate-900">
                      {proj.titulo}
                    </h3>
                    {proj.descricao && (
                      <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                        {proj.descricao}
                      </p>
                    )}
                  </div>

                  {/* Actions & Progress */}
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <div className="text-2xl font-black tracking-tight text-slate-900">
                        {progresso}%
                      </div>
                      <div className="text-[11px] text-slate-400 font-medium">
                        {passosConcluidos} de {totalPassos} passos
                      </div>
                    </div>

                    {/* Button to view in Mind Map */}
                    <button
                      onClick={() => {
                        setSelectedProjectId(proj.id);
                        setViewMode("mindmap");
                      }}
                      className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                      title="Abrir no Mapa Mental"
                    >
                      <Network className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Ver Mapa</span>
                    </button>

                    {/* Edit Project Button */}
                    <button
                      onClick={() => {
                        setEditingProject(proj);
                        setIsEditModalOpen(true);
                      }}
                      className="p-2 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                      title="Editar título e descrição do projeto"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>

                    {/* Delete Project Button */}
                    <button
                      onClick={() => handleDeleteProject(proj.id, proj.titulo)}
                      className="p-2 text-slate-300 hover:text-rose-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                      title="Excluir projeto"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Animated Progress Bar */}
                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isCompleted
                        ? "bg-emerald-500"
                        : progresso > 50
                        ? "bg-indigo-600"
                        : "bg-blue-500"
                    }`}
                    style={{ width: `${progresso}%` }}
                  ></div>
                </div>

                {/* Steps Section Grouped by Types */}
                <div className="pt-2 border-t border-slate-100 space-y-4">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
                    <span>Etapas Divididas por Tipos de Tarefas:</span>
                    <span className="text-slate-400 font-normal">
                      {totalPassos - passosConcluidos} etapa(s) restante(s)
                    </span>
                  </div>

                  {/* Grouped lists */}
                  <div className="space-y-3">
                    {Object.keys(stepsByType).map((tipo) => {
                      const stepsList = stepsByType[tipo] || [];
                      if (stepsList.length === 0) return null;

                      return (
                        <div key={tipo} className="space-y-1.5">
                          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-500 bg-slate-50 px-2.5 py-1 rounded-md">
                            <span>{tipo}</span>
                            <span className="text-slate-400 font-medium">
                              {stepsList.filter((s) => s.concluido).length}/{stepsList.length}
                            </span>
                          </div>

                          <div className="space-y-1.5 pl-1">
                            {stepsList.map((step) => (
                              <div
                                key={step.id}
                                className={`flex items-center justify-between gap-2 px-3 py-2 rounded-xl border transition-all ${
                                  step.concluido
                                    ? "bg-slate-50/70 border-slate-200/60 text-slate-400"
                                    : "bg-white border-slate-200 text-slate-800 hover:border-slate-300"
                                }`}
                              >
                                <label className="flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={step.concluido}
                                    onChange={() => handleToggleStep(proj.id, step)}
                                    className="w-4 h-4 text-indigo-600 rounded-md border-slate-300 focus:ring-indigo-500 cursor-pointer shrink-0"
                                  />
                                  <span
                                    className={`text-xs sm:text-sm font-medium truncate ${
                                      step.concluido ? "line-through text-slate-400" : ""
                                    }`}
                                  >
                                    {step.titulo}
                                  </span>
                                </label>

                                <div className="flex items-center gap-1.5 shrink-0">
                                  {/* Prazo */}
                                  {editingStepDate?.projectId === proj.id &&
                                  editingStepDate?.stepId === step.id ? (
                                    <div className="flex items-center gap-1 bg-white border border-indigo-400 rounded-lg p-1 shadow-md ring-2 ring-indigo-500/20 z-10">
                                      <input
                                        type="date"
                                        value={editingStepDate.tempDate}
                                        autoFocus
                                        onChange={(e) => {
                                          const val = e.target.value;
                                          setEditingStepDate((prev) =>
                                            prev ? { ...prev, tempDate: val } : null
                                          );
                                        }}
                                        onKeyDown={(e) => {
                                          if (e.key === "Enter") {
                                            e.preventDefault();
                                            handleUpdateStepDate(
                                              proj.id,
                                              step.id,
                                              editingStepDate.tempDate
                                            );
                                            setEditingStepDate(null);
                                          } else if (e.key === "Escape") {
                                            setEditingStepDate(null);
                                          }
                                        }}
                                        className="text-xs px-1.5 py-0.5 border border-slate-200 rounded-md focus:outline-hidden text-slate-800 cursor-pointer"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => {
                                          handleUpdateStepDate(
                                            proj.id,
                                            step.id,
                                            editingStepDate.tempDate
                                          );
                                          setEditingStepDate(null);
                                        }}
                                        className="px-2 py-0.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-xs font-semibold cursor-pointer"
                                      >
                                        Salvar
                                      </button>
                                      {step.data_limite && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            handleUpdateStepDate(proj.id, step.id, "");
                                            setEditingStepDate(null);
                                          }}
                                          className="px-1.5 py-0.5 text-xs text-rose-600 hover:bg-rose-50 rounded-md"
                                        >
                                          Limpar
                                        </button>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() => setEditingStepDate(null)}
                                        className="p-1 text-slate-400 hover:text-slate-600 rounded-md cursor-pointer"
                                      >
                                        ✕
                                      </button>
                                    </div>
                                  ) : step.data_limite ? (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setEditingStepDate({
                                          projectId: proj.id,
                                          stepId: step.id,
                                          tempDate: step.data_limite || "",
                                        })
                                      }
                                      className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 flex items-center gap-1 transition-colors cursor-pointer"
                                    >
                                      <Calendar className="w-3 h-3 text-indigo-500" />
                                      <span>{formatBrDate(step.data_limite)}</span>
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setEditingStepDate({
                                          projectId: proj.id,
                                          stepId: step.id,
                                          tempDate: "",
                                        })
                                      }
                                      className="text-[11px] font-medium px-1.5 py-0.5 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-slate-100 transition-colors flex items-center gap-1 cursor-pointer"
                                    >
                                      <Calendar className="w-3 h-3" />
                                      <span>+ Prazo</span>
                                    </button>
                                  )}

                                  {/* Mudar tipo */}
                                  <select
                                    value={step.tipo || "Geral"}
                                    onChange={(e) =>
                                      handleUpdateStepType(proj.id, step.id, e.target.value)
                                    }
                                    className="text-[11px] text-slate-500 bg-slate-50 border border-slate-200 rounded-md px-1.5 py-0.5 cursor-pointer"
                                  >
                                    {PRESET_TIPOS.map((t) => (
                                      <option key={t} value={t}>
                                        {t}
                                      </option>
                                    ))}
                                  </select>

                                  <button
                                    onClick={() => handleDeleteStep(proj.id, step.id)}
                                    className="text-slate-300 hover:text-rose-500 p-1 transition-colors cursor-pointer"
                                    title="Remover etapa"
                                  >
                                    ✕
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Inline Add Step Form */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-2 border-t border-slate-100">
                    <input
                      type="text"
                      placeholder="Adicionar nova etapa a este projeto..."
                      value={inlineStepInputs[proj.id] || ""}
                      onChange={(e) =>
                        setInlineStepInputs((prev) => ({
                          ...prev,
                          [proj.id]: e.target.value,
                        }))
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          const text = (inlineStepInputs[proj.id] || "").trim();
                          const tp = inlineStepTypes[proj.id] || "Geral";
                          const dt = inlineStepDates[proj.id] || "";
                          if (text) {
                            handleAddStepToType(proj.id, text, tp, dt);
                            setInlineStepInputs((p) => ({ ...p, [proj.id]: "" }));
                          }
                        }
                      }}
                      className="flex-1 px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 placeholder:text-slate-400"
                    />

                    <select
                      value={inlineStepTypes[proj.id] || "Planejamento"}
                      onChange={(e) =>
                        setInlineStepTypes((prev) => ({
                          ...prev,
                          [proj.id]: e.target.value,
                        }))
                      }
                      className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700 cursor-pointer"
                    >
                      {PRESET_TIPOS.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>

                    <div className="flex items-center gap-1.5">
                      <div
                        className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl px-2 py-1"
                        title="Prazo opcional desta etapa"
                      >
                        <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <input
                          type="date"
                          value={inlineStepDates[proj.id] || ""}
                          onChange={(e) =>
                            setInlineStepDates((prev) => ({
                              ...prev,
                              [proj.id]: e.target.value,
                            }))
                          }
                          className="text-xs bg-transparent border-none focus:outline-hidden text-slate-700 cursor-pointer"
                        />
                      </div>
                      <button
                        onClick={() => {
                          const text = (inlineStepInputs[proj.id] || "").trim();
                          const tp = inlineStepTypes[proj.id] || "Geral";
                          const dt = inlineStepDates[proj.id] || "";
                          if (text) {
                            handleAddStepToType(proj.id, text, tp, dt);
                            setInlineStepInputs((p) => ({ ...p, [proj.id]: "" }));
                          }
                        }}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold cursor-pointer shrink-0 flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Adicionar</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Project Modal */}
      <EditProjectModal
        isOpen={isEditModalOpen}
        projeto={editingProject}
        categorias={categorias}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingProject(null);
        }}
        onSave={handleSaveProjectDetails}
      />
    </div>
  );
};
