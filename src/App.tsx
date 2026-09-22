import React, { useState, useEffect, useMemo } from "react";
import {
  ListTodo,
  PenTool,
  Mic,
  Code2,
  FolderKanban,
  CalendarClock,
  CheckCircle2,
  Plus,
} from "lucide-react";
import { Tarefa, Projeto, PassoProjeto, Prioridade, StatusTarefa, MetricSummary, UserProfile } from "./types";
import { Header } from "./components/Header";
import { SidebarFilters } from "./components/SidebarFilters";
import { TaskCard } from "./components/TaskCard";
import { ManualInsertForm } from "./components/ManualInsertForm";
import { VoiceInsertTab } from "./components/VoiceInsertTab";
import { PythonCodeTab } from "./components/PythonCodeTab";
import { EditTaskModal } from "./components/EditTaskModal";
import { ProjectsTab } from "./components/ProjectsTab";
import { UpcomingTab } from "./components/UpcomingTab";
import { SyncAndBackupModal } from "./components/SyncAndBackupModal";
import {
  subscribeToAuth,
  subscribeToTarefasFirestore,
  subscribeToProjetosFirestore,
  subscribeToCategoriasFirestore,
  loginWithGoogle,
  logoutUser,
  loginAnonymously,
  addTarefaFirestore,
  updateTarefaFirestore,
  deleteTarefaFirestore,
  addCategoriaFirestore,
  seedFirestoreIfEmpty,
  syncLocalServerToFirestore,
  togglePassoFirestore,
} from "./lib/firebase";

export default function App() {
  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [projetos, setProjetos] = useState<Projeto[]>([]);
  const [categorias, setCategorias] = useState<string[]>([
    "Trabalho",
    "Pessoal",
    "Estudos",
    "Saúde",
    "Finanças",
    "Projetos",
  ]);
  const [hasGeminiKey, setHasGeminiKey] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // Tabs: 'tarefas' | 'projetos' | 'em_breve' | 'manual' | 'voz' | 'python'
  const [activeTab, setActiveTab] = useState<
    "tarefas" | "projetos" | "em_breve" | "manual" | "voz" | "python"
  >("tarefas");

  // Filters for tasks
  const [statusFiltro, setStatusFiltro] = useState<"Todos" | StatusTarefa>("Todos");
  const [categoriaFiltro, setCategoriaFiltro] = useState<string>("Todas");
  const [prioridadeFiltro, setPrioridadeFiltro] = useState<"Todas" | Prioridade>("Todas");
  const [dataFiltro, setDataFiltro] = useState<string>("");
  const [busca, setBusca] = useState<string>("");

  // Edit modal
  const [editingTask, setEditingTask] = useState<Tarefa | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Backup & sync modal
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);

  // Toast feedback
  const [toast, setToast] = useState<{ text: string; type: "success" | "info" } | null>(null);

  const showToast = (text: string, type: "success" | "info" = "success") => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Check Gemini Key status
  const carregarStatusGemini = async () => {
    try {
      const res = await fetch("/api/status");
      const data = await res.json();
      setHasGeminiKey(Boolean(data.hasGeminiKey));
    } catch {
      // Silent fail
    }
  };

  useEffect(() => {
    carregarStatusGemini();

    // 1. Subscribe to Firebase Auth
    const unsubAuth = subscribeToAuth((userProfile) => {
      setCurrentUser(userProfile);
      if (!userProfile) {
        // Auto-authenticate anonymously for instantaneous write access
        loginAnonymously().catch(() => {});
      }
    });

    // 2. Real-time Firestore sync
    let hasSeeded = false;

    // Load initial data from local server database right away so user sees their tasks immediately
    Promise.all([
      fetch("/api/tasks").then((r) => r.json()).catch(() => []),
      fetch("/api/projects").then((r) => r.json()).catch(() => []),
      fetch("/api/categories").then((r) => r.json()).catch(() => []),
    ]).then(([localTasks, localProjs, localCats]) => {
      if (Array.isArray(localTasks) && localTasks.length > 0) {
        setTarefas((curr) => (curr.length === 0 ? localTasks : curr));
      }
      if (Array.isArray(localProjs) && localProjs.length > 0) {
        setProjetos((curr) => (curr.length === 0 ? localProjs : curr));
      }
      if (Array.isArray(localCats) && localCats.length > 0) {
        setCategorias((curr) => (curr.length === 0 ? localCats : curr));
      }
    });

    const unsubTarefas = subscribeToTarefasFirestore(
      async (firestoreTarefas) => {
        if (firestoreTarefas.length > 0) {
          // Found real cloud tasks! Set them immediately
          setTarefas(firestoreTarefas);
          setLoading(false);
        } else if (!hasSeeded) {
          // Only if Firestore is truly empty, don't overwrite blindly
          hasSeeded = true;
          setLoading(false);
        } else {
          setLoading(false);
        }
      },
      async (err) => {
        console.warn("Firestore snapshot offline/error, carregando do servidor:", err);
        try {
          const res = await fetch("/api/tasks");
          const data = await res.json();
          if (Array.isArray(data)) setTarefas(data);
        } catch {}
        setLoading(false);
      }
    );

    const unsubProjetos = subscribeToProjetosFirestore(
      (firestoreProjetos) => {
        if (firestoreProjetos.length > 0) {
          setProjetos(firestoreProjetos);
        } else {
          carregarProjetos();
        }
      },
      () => {
        carregarProjetos();
      }
    );

    const unsubCats = subscribeToCategoriasFirestore((firestoreCats) => {
      if (firestoreCats.length > 0) {
        setCategorias(firestoreCats);
      }
    });

    return () => {
      unsubAuth();
      unsubTarefas();
      unsubProjetos();
      unsubCats();
    };
  }, []);

  const carregarProjetos = async () => {
    try {
      const res = await fetch("/api/projects");
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        setProjetos((prev) => (prev.length === 0 ? data : prev));
      }
    } catch {
      // Ignored
    }
  };

  // Filtered Tasks calculation
  const tarefasFiltradas = useMemo(() => {
    return tarefas.filter((t) => {
      if (statusFiltro !== "Todos" && t.status !== statusFiltro) return false;
      if (categoriaFiltro !== "Todas" && t.categoria !== categoriaFiltro) return false;
      if (prioridadeFiltro !== "Todas" && t.prioridade !== prioridadeFiltro) return false;
      if (dataFiltro && t.data_vencimento !== dataFiltro) return false;
      if (busca.trim()) {
        const q = busca.toLowerCase();
        const matchTitulo = t.titulo.toLowerCase().includes(q);
        const matchDesc = (t.descricao || "").toLowerCase().includes(q);
        if (!matchTitulo && !matchDesc) return false;
      }
      return true;
    });
  }, [tarefas, statusFiltro, categoriaFiltro, prioridadeFiltro, dataFiltro, busca]);

  // Metrics calculation
  const metrics: MetricSummary = useMemo(() => {
    const total = tarefas.length;
    const concluidas = tarefas.filter((t) => t.status === "Concluída").length;
    const pendentes = total - concluidas;
    const taxa = total > 0 ? Math.round((concluidas / total) * 100) : 0;

    const totalProjetos = projetos.length;
    const projetosEmAndamento = projetos.filter((p) => p.status !== "Concluído").length;
    const mediaProgressoProjetos =
      totalProjetos > 0
        ? Math.round(
            projetos.reduce((acc, p) => acc + (p.progresso_pct || 0), 0) / totalProjetos
          )
        : 0;

    return {
      total,
      concluidas,
      pendentes,
      taxa,
      totalProjetos,
      projetosEmAndamento,
      mediaProgressoProjetos,
    };
  }, [tarefas, projetos]);

  // Handler: Toggle Task Status
  const handleToggleStatus = async (id: string | number, currentStatus: "Pendente" | "Concluída") => {
    const novoStatus = currentStatus === "Pendente" ? "Concluída" : "Pendente";
    setTarefas((prev) =>
      prev.map((t) => (String(t.id) === String(id) ? { ...t, status: novoStatus } : t))
    );

    try {
      await updateTarefaFirestore(id, { status: novoStatus });
      fetch(`/api/tasks/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: novoStatus }),
      }).catch(() => {});
      showToast(
        novoStatus === "Concluída"
          ? "🎉 Tarefa concluída na nuvem!"
          : "Tarefa reaberta.",
        "success"
      );
    } catch {
      setTarefas((prev) =>
        prev.map((t) => (String(t.id) === String(id) ? { ...t, status: currentStatus } : t))
      );
    }
  };

  // Handler: Toggle Project Step
  const handleToggleProjectStep = async (projectId: string | number, step: PassoProjeto) => {
    // Optimistic UI update
    setProjetos((prev) =>
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
        showToast("✅ Etapa concluída!", "success");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Handler: Delete Task
  const handleDeleteTask = async (id: string | number) => {
    const previous = [...tarefas];
    setTarefas((prev) => prev.filter((t) => String(t.id) !== String(id)));

    try {
      await deleteTarefaFirestore(id);
      fetch(`/api/tasks/${id}`, { method: "DELETE" }).catch(() => {});
      showToast("Tarefa excluída da nuvem.", "info");
    } catch {
      setTarefas(previous);
      alert("Erro ao excluir tarefa.");
    }
  };

  // Handler: Create Task manually
  const handleCreateTask = async (novaTarefa: {
    titulo: string;
    descricao: string;
    categoria: string;
    prioridade: Prioridade;
    data_vencimento: string;
  }) => {
    setIsSyncing(true);
    try {
      await addTarefaFirestore(novaTarefa, currentUser?.uid);
      fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(novaTarefa),
      }).catch(() => {});
      showToast("✅ Tarefa salva na nuvem!");
    } catch (err: any) {
      console.error(err);
      throw new Error(err.message || "Erro ao criar tarefa.");
    } finally {
      setIsSyncing(false);
    }
  };

  // Handler: Add Category
  const handleAddCategory = async (nome: string) => {
    try {
      await addCategoriaFirestore(nome);
      fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome }),
      }).catch(() => {});
      showToast(`Categoria '${nome}' salva na nuvem!`);
    } catch (err: any) {
      console.error(err);
      throw new Error(err.message || "Erro ao adicionar categoria.");
    }
  };

  // Handler: Save Edited Task
  const handleSaveEditedTask = async (id: string | number, updated: Partial<Tarefa>) => {
    try {
      await updateTarefaFirestore(id, updated);
      fetch(`/api/tasks/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      }).catch(() => {});
      showToast("Tarefa atualizada na nuvem!");
    } catch (err: any) {
      console.error(err);
      throw new Error(err.message || "Erro ao atualizar tarefa.");
    }
  };

  // Handler: Voice task created
  const handleVoiceTaskCreated = async (nova: Tarefa) => {
    try {
      await addTarefaFirestore(
        {
          titulo: nova.titulo,
          descricao: nova.descricao || "",
          categoria: nova.categoria,
          prioridade: nova.prioridade,
          data_vencimento: nova.data_vencimento,
        },
        currentUser?.uid
      );
      showToast("🎉 Tarefa gravada por voz e salva na nuvem!");
    } catch (err) {
      console.error(err);
      setTarefas((prev) => [nova, ...prev]);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 flex flex-col font-sans">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 text-xs font-semibold animate-in fade-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toast.text}</span>
        </div>
      )}

      {/* Header with metrics for Tasks and Projects */}
      <Header
        metrics={metrics}
        hasGeminiKey={hasGeminiKey}
        onOpenBackupModal={() => setIsBackupModalOpen(true)}
        user={currentUser}
        onLoginGoogle={async () => {
          try {
            await loginWithGoogle();
            showToast("Conectado com sucesso com a conta Google!");
          } catch (err: any) {
            console.error("Erro no login:", err);
            if (err?.code === "auth/unauthorized-domain") {
              alert(
                "O projeto 'practical-tracer-6ghtt' é gerenciado pelo Google AI Studio e não permite adicionar domínios externos (como o Render). Mas você não precisa fazer login com Google para salvar suas tarefas: a sincronização e leitura com o Firebase já funcionam automaticamente em tempo real para todos os seus dispositivos!"
              );
            } else {
              alert(err?.message || "Não foi possível conectar com o Google no momento.");
            }
          }
        }}
        onLogout={async () => {
          try {
            await logoutUser();
            showToast("Desconectado da conta Google.", "info");
          } catch (err: any) {
            console.error("Erro no logout:", err);
          }
        }}
        isSyncing={isSyncing}
      />

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full flex-1">
        {/* Navigation Tabs */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-0 mb-6 overflow-x-auto gap-2">
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={() => setActiveTab("tarefas")}
              className={`py-3 px-3 sm:px-3.5 text-xs sm:text-sm font-semibold rounded-t-xl transition-all flex items-center gap-2 border-b-2 cursor-pointer shrink-0 ${
                activeTab === "tarefas"
                  ? "border-indigo-600 text-indigo-600 bg-white"
                  : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-200/50"
              }`}
            >
              <ListTodo className="w-4 h-4" />
              <span>📑 Tarefas</span>
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[11px] bg-slate-100 text-slate-600 font-bold">
                {tarefas.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("projetos")}
              className={`py-3 px-3 sm:px-3.5 text-xs sm:text-sm font-semibold rounded-t-xl transition-all flex items-center gap-2 border-b-2 cursor-pointer shrink-0 ${
                activeTab === "projetos"
                  ? "border-indigo-600 text-indigo-600 bg-white"
                  : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-200/50"
              }`}
            >
              <FolderKanban className="w-4 h-4 text-purple-600" />
              <span>📁 Projetos & Etapas</span>
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[11px] bg-purple-100 text-purple-700 font-bold">
                {projetos.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("em_breve")}
              className={`py-3 px-3 sm:px-3.5 text-xs sm:text-sm font-semibold rounded-t-xl transition-all flex items-center gap-2 border-b-2 cursor-pointer shrink-0 ${
                activeTab === "em_breve"
                  ? "border-indigo-600 text-indigo-600 bg-white"
                  : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-200/50"
              }`}
            >
              <CalendarClock className="w-4 h-4 text-amber-600" />
              <span>⏳ Em Breve</span>
              <span className="text-[10px] uppercase tracking-wider bg-amber-100 text-amber-800 font-bold px-1.5 py-0.5 rounded">
                Por Data
              </span>
            </button>

            <button
              onClick={() => setActiveTab("manual")}
              className={`py-3 px-3 sm:px-3.5 text-xs sm:text-sm font-semibold rounded-t-xl transition-all flex items-center gap-2 border-b-2 cursor-pointer shrink-0 ${
                activeTab === "manual"
                  ? "border-indigo-600 text-indigo-600 bg-white"
                  : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-200/50"
              }`}
            >
              <PenTool className="w-4 h-4" />
              <span>✍️ Nova Tarefa</span>
            </button>

            <button
              onClick={() => setActiveTab("voz")}
              className={`py-3 px-3 sm:px-3.5 text-xs sm:text-sm font-semibold rounded-t-xl transition-all flex items-center gap-2 border-b-2 cursor-pointer shrink-0 ${
                activeTab === "voz"
                  ? "border-indigo-600 text-indigo-600 bg-white"
                  : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-200/50"
              }`}
            >
              <Mic className="w-4 h-4 text-indigo-600" />
              <span>🎙️ Por Voz</span>
            </button>

            <button
              onClick={() => setActiveTab("python")}
              className={`py-3 px-3 sm:px-3.5 text-xs sm:text-sm font-semibold rounded-t-xl transition-all flex items-center gap-2 border-b-2 cursor-pointer shrink-0 ${
                activeTab === "python"
                  ? "border-indigo-600 text-indigo-600 bg-white"
                  : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-200/50"
              }`}
            >
              <Code2 className="w-4 h-4" />
              <span>🐍 Python (app.py)</span>
            </button>
          </div>

          <div className="hidden md:flex items-center gap-2">
            <button
              onClick={() => setActiveTab("projetos")}
              className="py-1.5 px-3 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Novo Projeto</span>
            </button>
          </div>
        </div>

        {/* Tab 1: Tasks List & Filters */}
        {activeTab === "tarefas" && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
            <div className="lg:col-span-1">
              <SidebarFilters
                statusFiltro={statusFiltro}
                setStatusFiltro={setStatusFiltro}
                categoriaFiltro={categoriaFiltro}
                setCategoriaFiltro={setCategoriaFiltro}
                prioridadeFiltro={prioridadeFiltro}
                setPrioridadeFiltro={setPrioridadeFiltro}
                dataFiltro={dataFiltro}
                setDataFiltro={setDataFiltro}
                busca={busca}
                setBusca={setBusca}
                categorias={categorias}
                onAddCategoria={handleAddCategory}
              />
            </div>

            <div className="lg:col-span-3 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2">
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-slate-900">
                    Tarefas Cadastradas
                  </h2>
                  <span className="text-xs font-semibold text-slate-500 bg-slate-200/80 px-2 py-0.5 rounded-full">
                    {tarefasFiltradas.length} visíveis
                  </span>
                </div>
              </div>

              {loading ? (
                <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
                  <div className="inline-block w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-3"></div>
                  <p className="text-xs font-medium text-slate-500">
                    Carregando dados...
                  </p>
                </div>
              ) : tarefasFiltradas.length === 0 ? (
                <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 shadow-xs">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3">
                    <ListTodo className="w-7 h-7" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mb-1">
                    Nenhuma tarefa encontrada
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto mb-5">
                    Não há tarefas correspondentes aos filtros selecionados. Crie uma nova tarefa agora ou ajuste os filtros.
                  </p>
                  <div className="flex items-center justify-center gap-3">
                    <button
                      onClick={() => setActiveTab("voz")}
                      className="px-4 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Mic className="w-4 h-4" />
                      <span>Gravar por Voz</span>
                    </button>
                    <button
                      onClick={() => setActiveTab("manual")}
                      className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Inserir Manualmente</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {tarefasFiltradas.map((tarefa) => (
                    <TaskCard
                      key={tarefa.id}
                      tarefa={tarefa}
                      onToggleStatus={handleToggleStatus}
                      onDelete={handleDeleteTask}
                      onEdit={(t) => {
                        setEditingTask(t);
                        setIsEditModalOpen(true);
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Projects & Steps */}
        {activeTab === "projetos" && (
          <ProjectsTab
            projetos={projetos}
            categorias={categorias}
            hasGeminiKey={hasGeminiKey}
            onRefreshProjetos={carregarProjetos}
            onSetProjetos={setProjetos}
            onShowToast={showToast}
          />
        )}

        {/* Tab 3: Upcoming / Em Breve (Grouped by Category) */}
        {activeTab === "em_breve" && (
          <UpcomingTab
            tarefas={tarefas}
            projetos={projetos}
            categorias={categorias}
            onToggleTaskStatus={handleToggleStatus}
            onToggleProjectStep={handleToggleProjectStep}
            onNavigateToTab={(tab) => {
              if (tab === "tarefas") setActiveTab("tarefas");
              else if (tab === "projetos") setActiveTab("projetos");
              else if (tab === "manual") setActiveTab("manual");
            }}
          />
        )}

        {/* Tab 4: Manual Task Insertion */}
        {activeTab === "manual" && (
          <ManualInsertForm
            categorias={categorias}
            onSubmit={handleCreateTask}
            onSwitchToVoiceTab={() => setActiveTab("voz")}
          />
        )}

        {/* Tab 5: Voice Insertion with Gemini */}
        {activeTab === "voz" && (
          <VoiceInsertTab
            hasGeminiKey={hasGeminiKey}
            categorias={categorias}
            onTaskCreated={handleVoiceTaskCreated}
            onNavigateToTasks={() => setActiveTab("tarefas")}
          />
        )}

        {/* Tab 6: Python Code & Terminal Execution */}
        {activeTab === "python" && <PythonCodeTab />}
      </main>

      {/* Edit Modal */}
      <EditTaskModal
        tarefa={editingTask}
        categorias={categorias}
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingTask(null);
        }}
        onSave={handleSaveEditedTask}
      />

      {/* Sync & Backup Modal */}
      <SyncAndBackupModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
        onDataRestored={async () => {
          try {
            const [tasksRes, projRes, catRes] = await Promise.all([
              fetch("/api/tasks"),
              fetch("/api/projects"),
              fetch("/api/categories"),
            ]);
            const t = await tasksRes.json();
            const p = await projRes.json();
            const c = await catRes.json();
            if (Array.isArray(t)) setTarefas(t);
            if (Array.isArray(p)) setProjetos(p);
            if (Array.isArray(c)) setCategorias(c);
            await seedFirestoreIfEmpty(
              Array.isArray(t) ? t : [],
              Array.isArray(p) ? p : [],
              Array.isArray(c) ? c : []
            );
          } catch (err) {
            console.error("Erro ao sincronizar dados restaurados:", err);
          }
        }}
        onShowToast={showToast}
      />
    </div>
  );
}
