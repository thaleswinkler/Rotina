import React, { useState } from "react";
import {
  FolderKanban,
  Plus,
  CheckCircle2,
  Circle,
  Calendar,
  Trash2,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Tag,
  AlertCircle,
  Clock,
  Layers,
  ArrowRight,
} from "lucide-react";
import { Projeto, PassoProjeto } from "../types";
import {
  addProjetoFirestore,
  deleteProjetoFirestore,
  addPassoFirestore,
  updatePassoFirestore,
  togglePassoFirestore,
  deletePassoFirestore,
} from "../lib/firebase";

interface ProjectsTabProps {
  projetos: Projeto[];
  categorias: string[];
  hasGeminiKey: boolean;
  onRefreshProjetos: () => Promise<void>;
  onSetProjetos?: React.Dispatch<React.SetStateAction<Projeto[]>>;
  onShowToast: (text: string, type?: "success" | "info") => void;
}

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
  const [novoPassoPrazo, setNovoPassoPrazo] = useState("");
  const [passosTemp, setPassosTemp] = useState<Array<{ titulo: string; data_limite?: string }>>([]);
  const [isSuggestingWithAI, setIsSuggestingWithAI] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Inline add step per project
  const [inlineStepInputs, setInlineStepInputs] = useState<{ [projectId: string]: string }>({});
  const [inlineStepDates, setInlineStepDates] = useState<{ [projectId: string]: string }>({});
  const [editingStepDate, setEditingStepDate] = useState<{
    projectId: string | number;
    stepId: string | number;
    tempDate: string;
  } | null>(null);

  // Filter state inside projects
  const [filtroCategoria, setFiltroCategoria] = useState<string>("Todas");
  const [filtroStatus, setFiltroStatus] = useState<string>("Todos");

  // Add step to temp list
  const handleAddPassoTemp = () => {
    if (!novoPassoInput.trim()) return;
    setPassosTemp((prev) => [
      ...prev,
      { titulo: novoPassoInput.trim(), data_limite: novoPassoPrazo || "" },
    ]);
    setNovoPassoInput("");
    setNovoPassoPrazo("");
  };

  const handleRemovePassoTemp = (index: number) => {
    setPassosTemp((prev) => prev.filter((_, idx) => idx !== index));
  };

  // AI Step Suggestion
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
        const stepsObjs = data.passos.map((p: string) => ({ titulo: p, data_limite: "" }));
        setPassosTemp((prev) => [...prev, ...stepsObjs]);
        onShowToast(`✨ Gemini sugeriu ${data.passos.length} etapas!`, "success");
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
        passosFinal.push({ titulo: novoPassoInput.trim(), data_limite: novoPassoPrazo || "" });
      }

      const passosFormatados: PassoProjeto[] = passosFinal.map((p, idx) => ({
        id: `step_${Date.now()}_${idx}`,
        projeto_id: "",
        titulo: p.titulo,
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
        progresso_pct: 0,
        total_passos: passosFormatados.length,
        passos_concluidos: 0,
      };

      // Optimistic update
      onSetProjetos?.((prev) => [novoProjItem, ...prev.filter((p) => String(p.id) !== String(novoProjItem.id))]);

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
        }),
      }).catch(() => {});
      
      setNovoTitulo("");
      setNovaDescricao("");
      setPassosTemp([]);
      setNovoPassoInput("");
      setNovoPassoPrazo("");
      setShowNovoForm(false);
      onShowToast("🚀 Projeto salvo na nuvem com sucesso!", "success");
    } catch (err: any) {
      alert(err.message || "Erro ao salvar projeto.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle Step Completion
  const handleToggleStep = async (projectId: string | number, step: PassoProjeto) => {
    // Optimistic update
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
        onShowToast("✅ Etapa concluída!", "success");
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
    // Optimistic update
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

  // Delete Step
  const handleDeleteStep = async (projectId: string | number, stepId: string | number) => {
    // Optimistic update
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
      onShowToast("Etapa removida.", "info");
    } catch (err) {
      console.error(err);
    }
  };

  // Inline Add Step to Existing Project
  const handleInlineAddStep = async (projectId: string | number) => {
    const text = (inlineStepInputs[String(projectId)] || "").trim();
    const dateLimit = inlineStepDates[String(projectId)] || "";
    if (!text) return;

    const newStep: PassoProjeto = {
      id: `step_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      projeto_id: projectId,
      titulo: text,
      concluido: false,
      ordem: 999,
      data_limite: dateLimit,
    };

    // Optimistic update
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

    setInlineStepInputs((prev) => ({ ...prev, [String(projectId)]: "" }));
    setInlineStepDates((prev) => ({ ...prev, [String(projectId)]: "" }));

    try {
      const proj = projetos.find((p) => String(p.id) === String(projectId));
      if (proj) {
        await addPassoFirestore(projectId, text, proj.passos, dateLimit);
      }
      fetch(`/api/projects/${projectId}/passos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ titulo: text, data_limite: dateLimit }),
      }).catch(() => {});
      onShowToast("Etapa adicionada ao projeto!", "success");
    } catch (err) {
      console.error(err);
    }
  };

  // Delete Project
  const handleDeleteProject = async (projectId: string | number, titulo: string) => {
    if (!confirm(`Deseja realmente excluir o projeto "${titulo}" e todas as suas etapas?`)) {
      return;
    }

    // Optimistic update
    onSetProjetos?.((prev) => prev.filter((p) => String(p.id) !== String(projectId)));

    try {
      await deleteProjetoFirestore(projectId);
      fetch(`/api/projects/${projectId}`, { method: "DELETE" }).catch(() => {});
      onShowToast("Projeto excluído com sucesso.", "info");
    } catch (err) {
      console.error(err);
    }
  };

  // Filtering
  const projetosFiltrados = projetos.filter((p) => {
    if (filtroCategoria !== "Todas" && p.categoria !== filtroCategoria) return false;
    if (filtroStatus !== "Todos" && p.status !== filtroStatus) return false;
    return true;
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Banner & Action */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">📁</span>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">
              Projetos & Etapas
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-500">
            Estruture projetos complexos em passos acionáveis e acompanhe a porcentagem real de conclusão.
          </p>
        </div>

        <button
          onClick={() => setShowNovoForm((prev) => !prev)}
          className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-semibold flex items-center gap-2 shadow-xs transition-colors cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>{showNovoForm ? "Fechar Formulário" : "Novo Projeto com Passos"}</span>
        </button>
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
              Defina o objetivo e os passos necessários
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
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900"
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
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900"
                />
              </div>
            </div>

            {/* Passos do Projeto */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <label className="text-xs font-bold uppercase text-slate-700 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-indigo-600" />
                  Passos que faltam executar ({passosTemp.length})
                </label>

                <button
                  type="button"
                  onClick={handleSuggestStepsAI}
                  disabled={isSuggestingWithAI}
                  className="px-3 py-1.5 rounded-lg bg-indigo-100/70 hover:bg-indigo-200 text-indigo-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 disabled:opacity-50"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>
                    {isSuggestingWithAI ? "IA estruturando..." : "Sugerir Etapas com Gemini"}
                  </span>
                </button>
              </div>

              {/* Input for single step */}
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
                <div className="flex items-center gap-1.5">
                  <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5" title="Prazo opcional para este passo">
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
                        <span className="font-medium text-slate-700">{passo.titulo}</span>
                        {passo.data_limite && (
                          <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-[10px] font-semibold border border-indigo-200 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
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
                  Nenhum passo adicionado ainda. Digite acima ou clique em "Sugerir Etapas com Gemini".
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

      {/* Filter Row */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase text-slate-500">Filtrar Categoria:</span>
          <select
            value={filtroCategoria}
            onChange={(e) => setFiltroCategoria(e.target.value)}
            className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:outline-hidden"
          >
            <option value="Todas">Todas as Categorias</option>
            {categorias.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

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

      {/* Project Cards Grid */}
      {projetosFiltrados.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3">
            <FolderKanban className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-900 mb-1">
            Nenhum projeto encontrado
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto mb-4">
            Crie seu primeiro projeto para acompanhar etapas e porcentagem de conclusão.
          </p>
          <button
            onClick={() => setShowNovoForm(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl cursor-pointer"
          >
            Criar Projeto Agora
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {projetosFiltrados.map((proj) => {
            const progresso = proj.progresso_pct;
            const isCompleted = proj.status === "Concluído" || progresso === 100;
            const totalPassos = proj.passos?.length || 0;
            const passosConcluidos = proj.passos?.filter((p) => p.concluido).length || 0;

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
                          Em Andamento
                        </span>
                      )}
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        Prazo: {proj.data_limite}
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

                  {/* Percentage Progress Gauge Badge */}
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <div className="text-2xl font-black tracking-tight text-slate-900">
                        {progresso}%
                      </div>
                      <div className="text-[11px] text-slate-400 font-medium">
                        {passosConcluidos} de {totalPassos} passos
                      </div>
                    </div>

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
                <div className="space-y-1">
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
                </div>

                {/* Steps Section */}
                <div className="pt-2 border-t border-slate-100 space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
                    <span>Etapas e Passos a Executar:</span>
                    <span className="text-slate-400 font-normal">
                      {totalPassos - passosConcluidos} etapa(s) restante(s)
                    </span>
                  </div>

                  {/* Steps List */}
                  {proj.passos && proj.passos.length > 0 ? (
                    <div className="space-y-1.5">
                      {proj.passos.map((step) => (
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
                            {/* Prazo da etapa */}
                            {editingStepDate?.projectId === proj.id && editingStepDate?.stepId === step.id ? (
                              <div className="flex items-center gap-1.5 bg-white border border-indigo-400 rounded-lg p-1 shadow-md ring-2 ring-indigo-500/20 z-10">
                                <input
                                  type="date"
                                  value={editingStepDate.tempDate}
                                  autoFocus
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setEditingStepDate((prev) => (prev ? { ...prev, tempDate: val } : null));
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      e.preventDefault();
                                      handleUpdateStepDate(proj.id, step.id, editingStepDate.tempDate);
                                      setEditingStepDate(null);
                                    } else if (e.key === "Escape") {
                                      setEditingStepDate(null);
                                    }
                                  }}
                                  className="text-xs px-1.5 py-0.5 border border-slate-200 rounded-md focus:outline-none focus:border-indigo-500 text-slate-800 cursor-pointer"
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleUpdateStepDate(proj.id, step.id, editingStepDate.tempDate);
                                    setEditingStepDate(null);
                                  }}
                                  className="px-2 py-0.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-xs font-semibold cursor-pointer shadow-xs transition-colors"
                                  title="Salvar prazo"
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
                                    className="px-1.5 py-0.5 text-xs text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                                    title="Remover prazo"
                                  >
                                    Limpar
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => setEditingStepDate(null)}
                                  className="p-1 text-slate-400 hover:text-slate-600 rounded-md cursor-pointer transition-colors"
                                  title="Cancelar"
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
                                title="Clique para alterar o prazo desta etapa"
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
                                title="Definir prazo para esta etapa"
                              >
                                <Calendar className="w-3 h-3" />
                                <span>+ Prazo</span>
                              </button>
                            )}

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
                  ) : (
                    <p className="text-xs text-slate-400 italic py-1">
                      Nenhuma etapa cadastrada ainda para este projeto.
                    </p>
                  )}

                  {/* Inline Add Step Form */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
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
                          handleInlineAddStep(proj.id);
                        }
                      }}
                      className="flex-1 px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 placeholder:text-slate-400"
                    />
                    <div className="flex items-center gap-1.5">
                      <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl px-2 py-1" title="Prazo opcional desta etapa">
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
                        onClick={() => handleInlineAddStep(proj.id)}
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
    </div>
  );
};
