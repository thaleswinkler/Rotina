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
  ShoppingCart,
} from "lucide-react";
import { Tarefa, Projeto, PassoProjeto, Prioridade, StatusTarefa, MetricSummary, UserProfile, ItemMercado } from "./types";
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
import { MercadoTab } from "./components/MercadoTab";
import {
  subscribeToAuth,
  subscribeToTarefasFirestore,
  subscribeToProjetosFirestore,
  subscribeToCategoriasFirestore,
  subscribeToMercadoFirestore,
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
  addItemMercadoFirestore,
  updateItemMercadoFirestore,
  deleteItemMercadoFirestore,
  limparCompradosMercadoFirestore,
} from "./lib/firebase";

export default function App() {
  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [projetos, setProjetos] = useState<Projeto[]>([]);
  const [mercadoItens, setMercadoItens] = useState<ItemMercado[]>([]);
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

  // Tabs: 'mercado' | 'em_breve' | 'projetos' | 'manual' | 'voz' | 'python'
  const [activeTab, setActiveTab] = useState<
    "mercado" | "em_breve" | "projetos" | "manual" | "voz" | "python"
  >("mercado");

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
  const [backupModalInitialTab, setBackupModalInitialTab] = useState<"backup" | "celular" | "computador">("celular");

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
      fetch("/api/mercado").then((r) => r.json()).catch(() => []),
    ])
      .then(([localTasks, localProjs, localCats, localMercado]) => {
        if (Array.isArray(localTasks) && localTasks.length > 0) {
          setTarefas((curr) => (curr.length === 0 ? localTasks : curr));
        }
        if (Array.isArray(localProjs) && localProjs.length > 0) {
          setProjetos((curr) => (curr.length === 0 ? localProjs : curr));
        }
        if (Array.isArray(localCats) && localCats.length > 0) {
          setCategorias((curr) => (curr.length === 0 ? localCats : curr));
        }
        if (Array.isArray(localMercado) && localMercado.length > 0) {
          setMercadoItens((curr) => (curr.length === 0 ? localMercado : curr));
        }
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });

    // Safety timeout: never let the UI stay in loading state more than 400ms
    const safetyTimer = setTimeout(() => {
      setLoading(false);
    }, 400);

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

    const unsubMercado = subscribeToMercadoFirestore((firestoreMercado) => {
      if (firestoreMercado.length > 0) {
        setMercadoItens(firestoreMercado);
      }
    });

    return () => {
      clearTimeout(safetyTimer);
      unsubAuth();
      unsubTarefas();
      unsubProjetos();
      unsubCats();
      unsubMercado();
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

    const totalMercadoPendentes = mercadoItens.filter((i) => !i.comprado).length;

    return {
      total,
      concluidas,
      pendentes,
      taxa,
      totalProjetos,
      projetosEmAndamento,
      mediaProgressoProjetos,
      totalMercadoPendentes,
    };
  }, [tarefas, projetos, mercadoItens]);

  // ---------------------------------------------------------------------------
  // Mercado Handlers
  // ---------------------------------------------------------------------------
  const handleAddItemMercado = async (nome: string, categoria?: string, quantidade?: string) => {
    const tempId = `mercado_${Date.now()}`;
    const novo: ItemMercado = {
      id: tempId,
      nome,
      categoria: categoria || "Alimentos",
      quantidade: quantidade || "1",
      comprado: false,
      criado_em: new Date().toISOString(),
      userId: currentUser?.uid || "anonymous",
    };

    setMercadoItens((prev) => [novo, ...prev]);

    fetch("/api/mercado", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome, categoria, quantidade }),
    }).catch(() => {});

    try {
      const docId = await addItemMercadoFirestore({ nome, categoria, quantidade }, currentUser?.uid);
      setMercadoItens((prev) => prev.map((i) => (i.id === tempId ? { ...i, id: docId } : i)));
    } catch (err) {
      console.warn("Firestore addItemMercado skipped:", err);
    }
  };

  const handleToggleItemMercado = async (id: string | number, currentComprado: boolean) => {
    const novoEstado = !currentComprado;
    setMercadoItens((prev) =>
      prev.map((i) => (String(i.id) === String(id) ? { ...i, comprado: novoEstado } : i))
    );

    fetch(`/api/mercado/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ comprado: novoEstado }),
    }).catch(() => {});

    try {
      await updateItemMercadoFirestore(id, { comprado: novoEstado });
    } catch (err) {
      console.warn("Firestore updateItemMercado skipped:", err);
    }

    if (novoEstado) {
      showToast("🛒 Item marcado como comprado!", "success");
    }
  };

  const handleDeleteItemMercado = async (id: string | number) => {
    setMercadoItens((prev) => prev.filter((i) => String(i.id) !== String(id)));

    fetch(`/api/mercado/${id}`, { method: "DELETE" }).catch(() => {});

    try {
      await deleteItemMercadoFirestore(id);
    } catch (err) {
      console.warn("Firestore deleteItemMercado skipped:", err);
    }
    showToast("Item removido da lista.", "info");
  };

  const handleUpdateItemMercado = async (id: string | number, updates: Partial<ItemMercado>) => {
    setMercadoItens((prev) =>
      prev.map((i) => (String(i.id) === String(id) ? { ...i, ...updates } : i))
    );

    fetch(`/api/mercado/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    }).catch(() => {});

    try {
      await updateItemMercadoFirestore(id, updates);
    } catch (err) {
      console.warn("Firestore updateItemMercado skipped:", err);
    }
  };

  const handleLimparCompradosMercado = async () => {
    const comprados = mercadoItens.filter((i) => i.comprado);
    if (comprados.length === 0) return;

    setMercadoItens((prev) => prev.filter((i) => !i.comprado));

    fetch("/api/mercado/clear-completed", { method: "POST" }).catch(() => {});

    try {
      await limparCompradosMercadoFirestore(mercadoItens);
      showToast(`✨ ${comprados.length} itens no carrinho limpos com sucesso!`, "info");
    } catch (err) {
      console.warn("Firestore clearMercado skipped:", err);
    }
  };

  // Handler: Toggle Task Status
  const handleToggleStatus = async (id: string | number, currentStatus: "Pendente" | "Concluída") => {
    const novoStatus = currentStatus === "Pendente" ? "Concluída" : "Pendente";
    setTarefas((prev) =>
      prev.map((t) => (String(t.id) === String(id) ? { ...t, status: novoStatus } : t))
    );

    // 1. Update server API
    fetch(`/api/tasks/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: novoStatus }),
    }).catch((e) => console.warn("Erro ao atualizar servidor:", e));

    // 2. Sync to Firestore in background
    try {
      await updateTarefaFirestore(id, { status: novoStatus });
    } catch (err) {
      console.warn("Firestore sync skipped:", err);
    }

    showToast(
      novoStatus === "Concluída"
        ? "🎉 Tarefa concluída!"
        : "Tarefa reaberta.",
      "success"
    );
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

    // 1. Update server API
    fetch(`/api/projects/${projectId}/passos/${step.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ concluido: !step.concluido }),
    }).catch((e) => console.warn("Erro ao atualizar passo no servidor:", e));

    // 2. Sync to Firestore in background
    try {
      const proj = projetos.find((p) => String(p.id) === String(projectId));
      if (proj) {
        await togglePassoFirestore(projectId, step.id, proj.passos);
      }
    } catch (err) {
      console.warn("Firestore step sync skipped:", err);
    }

    if (!step.concluido) {
      showToast("✅ Etapa concluída!", "success");
    }
  };

  // Handler: Delete Task
  const handleDeleteTask = async (id: string | number) => {
    setTarefas((prev) => prev.filter((t) => String(t.id) !== String(id)));

    // 1. Delete from server API
    fetch(`/api/tasks/${id}`, { method: "DELETE" }).catch((e) =>
      console.warn("Erro ao deletar tarefa no servidor:", e)
    );

    // 2. Delete from Firestore in background
    try {
      await deleteTarefaFirestore(id);
    } catch (err) {
      console.warn("Firestore delete skipped:", err);
    }
    showToast("Tarefa excluída.", "info");
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
      // 1. Save to server DB first
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(novaTarefa),
      });
      const created = await res.json().catch(() => null);

      if (created && created.id) {
        setTarefas((prev) => [created, ...prev.filter((t) => String(t.id) !== String(created.id))]);
      } else {
        const localTask: Tarefa = {
          ...novaTarefa,
          id: Date.now(),
          status: "Pendente",
          criado_em: new Date().toISOString(),
        };
        setTarefas((prev) => [localTask, ...prev]);
      }

      // 2. Sync to Firestore in background
      try {
        await addTarefaFirestore(novaTarefa, currentUser?.uid);
      } catch (err) {
        console.warn("Firestore add skipped:", err);
      }

      showToast("✅ Tarefa cadastrada com sucesso!");
    } catch (err: any) {
      console.error(err);
      throw new Error(err.message || "Erro ao criar tarefa.");
    } finally {
      setIsSyncing(false);
    }
  };

  // Handler: Add Category
  const handleAddCategory = async (nome: string) => {
    if (!categorias.includes(nome)) {
      setCategorias((prev) => [...prev, nome]);
    }
    fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome }),
    }).catch(console.error);

    try {
      await addCategoriaFirestore(nome);
    } catch (err) {
      console.warn("Firestore category skipped:", err);
    }
    showToast(`Categoria '${nome}' salva!`);
  };

  // Handler: Save Edited Task
  const handleSaveEditedTask = async (id: string | number, updated: Partial<Tarefa>) => {
    setTarefas((prev) =>
      prev.map((t) => (String(t.id) === String(id) ? { ...t, ...updated } : t))
    );

    fetch(`/api/tasks/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updated),
    }).catch(console.error);

    try {
      await updateTarefaFirestore(id, updated);
    } catch (err) {
      console.warn("Firestore update skipped:", err);
    }
    showToast("Tarefa atualizada com sucesso!");
  };

  // Handler: Voice task created
  const handleVoiceTaskCreated = async (nova: Tarefa) => {
    setTarefas((prev) => [nova, ...prev.filter((t) => String(t.id) !== String(nova.id))]);
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
    } catch (err) {
      console.warn("Firestore voice sync skipped:", err);
    }
    showToast("🎙️ Tarefa de voz cadastrada!", "success");
    setActiveTab("em_breve");
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
        onOpenBackupModal={(tab = "celular") => {
          setBackupModalInitialTab(tab);
          setIsBackupModalOpen(true);
        }}
        user={currentUser}
        onLoginGoogle={async () => {
          try {
            await loginWithGoogle();
            showToast("Conectado com sucesso com a conta Google!");
          } catch (err: any) {
            console.warn("Informação sobre login:", err);
            if (err?.code === "auth/unauthorized-domain") {
              setBackupModalInitialTab("celular");
              setIsBackupModalOpen(true);
              showToast("Seu banco de dados já sincroniza em tempo real sem precisar de login!", "info");
            } else {
              showToast(err?.message || "Não foi possível conectar com o Google no momento.", "info");
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
              onClick={() => setActiveTab("mercado")}
              className={`py-3 px-3 sm:px-3.5 text-xs sm:text-sm font-semibold rounded-t-xl transition-all flex items-center gap-2 border-b-2 cursor-pointer shrink-0 ${
                activeTab === "mercado"
                  ? "border-emerald-600 text-emerald-700 bg-white shadow-2xs"
                  : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-200/50"
              }`}
            >
              <ShoppingCart className="w-4 h-4 text-emerald-600" />
              <span>🛒 Mercado</span>
              {(metrics.totalMercadoPendentes || 0) > 0 ? (
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[11px] bg-rose-500 text-white font-black animate-pulse">
                  {metrics.totalMercadoPendentes}
                </span>
              ) : (
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[11px] bg-slate-100 text-slate-600 font-bold">
                  {mercadoItens.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("em_breve")}
              className={`py-3 px-3 sm:px-3.5 text-xs sm:text-sm font-semibold rounded-t-xl transition-all flex items-center gap-2 border-b-2 cursor-pointer shrink-0 ${
                activeTab === "em_breve"
                  ? "border-indigo-600 text-indigo-700 bg-white shadow-2xs font-bold"
                  : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-200/50"
              }`}
            >
              <CalendarClock className="w-4 h-4 text-indigo-600" />
              <span>📅 Em Breve</span>
              {metrics.pendentes > 0 ? (
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[11px] bg-indigo-100 text-indigo-700 font-bold">
                  {metrics.pendentes}
                </span>
              ) : (
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[11px] bg-slate-100 text-slate-600 font-bold">
                  0
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("projetos")}
              className={`py-3 px-3 sm:px-3.5 text-xs sm:text-sm font-semibold rounded-t-xl transition-all flex items-center gap-2 border-b-2 cursor-pointer shrink-0 ${
                activeTab === "projetos"
                  ? "border-indigo-600 text-indigo-600 bg-white font-bold"
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

        {/* Tab 0: Mercado & Lista de Compras */}
        {activeTab === "mercado" && (
          <MercadoTab
            itens={mercadoItens}
            onAddItem={handleAddItemMercado}
            onToggleItem={handleToggleItemMercado}
            onDeleteItem={handleDeleteItemMercado}
            onUpdateItem={handleUpdateItemMercado}
            onLimparComprados={handleLimparCompradosMercado}
            onShowToast={showToast}
          />
        )}

        {/* Tab 1: Em Breve (Full filters, strict date sorting, and direct task editing) */}
        {activeTab === "em_breve" && (
          <UpcomingTab
            tarefas={tarefas}
            projetos={projetos}
            categorias={categorias}
            onToggleTaskStatus={handleToggleStatus}
            onToggleProjectStep={handleToggleProjectStep}
            onEditTask={(tarefa) => {
              setEditingTask(tarefa);
              setIsEditModalOpen(true);
            }}
            onDeleteTask={handleDeleteTask}
            onCreateTask={handleCreateTask}
            onNavigateToTab={(tab) => {
              if (tab === "projetos") setActiveTab("projetos");
              else if (tab === "manual") setActiveTab("manual");
              else if (tab === "voz") setActiveTab("voz");
            }}
            onShowToast={showToast}
          />
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

        {/* Tab 3: Manual Task Insertion */}
        {activeTab === "manual" && (
          <ManualInsertForm
            categorias={categorias}
            onSubmit={handleCreateTask}
            onSwitchToVoiceTab={() => setActiveTab("voz")}
          />
        )}

        {/* Tab 4: Voice Insertion with Gemini */}
        {activeTab === "voz" && (
          <VoiceInsertTab
            hasGeminiKey={hasGeminiKey}
            categorias={categorias}
            onTaskCreated={handleVoiceTaskCreated}
            onNavigateToTasks={() => setActiveTab("em_breve")}
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
        initialTab={backupModalInitialTab}
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
