import React, { useState } from "react";
import {
  CheckCircle2,
  Clock,
  ListTodo,
  TrendingUp,
  Sparkles,
  FolderKanban,
  HardDrive,
  Cloud,
  LogIn,
  LogOut,
  User as UserIcon,
  Smartphone,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { MetricSummary, UserProfile } from "../types";

interface HeaderProps {
  metrics: MetricSummary;
  hasGeminiKey: boolean;
  onOpenBackupModal: (tab?: "backup" | "celular" | "computador") => void;
  user: UserProfile | null;
  onLoginGoogle: () => Promise<void>;
  onLogout: () => Promise<void>;
  isSyncing: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  metrics,
  hasGeminiKey,
  onOpenBackupModal,
  user,
  onLoginGoogle,
  onLogout,
  isSyncing,
}) => {
  // Collapsed state for mobile & desktop to free up screen real estate
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("rotinapro_header_collapsed");
      if (saved !== null) return saved === "true";
      // Default to collapsed on mobile screens (< 768px) so content is immediately visible
      return window.innerWidth < 768;
    }
    return false;
  });

  const toggleCollapsed = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        localStorage.setItem("rotinapro_header_collapsed", String(next));
      }
      return next;
    });
  };

  const dataHoje = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());

  const dataFormatada = dataHoje.charAt(0).toUpperCase() + dataHoje.slice(1);

  return (
    <header className="bg-white border-b border-slate-200 relative shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        {/* Top brand & status row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-500 flex items-center justify-center text-white shadow-sm font-black text-lg sm:text-xl shrink-0">
                ⚡
              </div>
              <div>
                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                  <h1 className="text-lg sm:text-2xl font-bold tracking-tight text-slate-900">
                    Rotina PRO
                  </h1>
                  <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                    Tarefas & Projetos
                  </span>
                  {metrics.totalMercadoPendentes !== undefined && metrics.totalMercadoPendentes > 0 && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] sm:text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 shadow-2xs">
                      🛒 {metrics.totalMercadoPendentes} a comprar
                    </span>
                  )}
                </div>
                <p className="text-[11px] sm:text-sm text-slate-500 capitalize">
                  {dataFormatada}
                </p>
              </div>
            </div>

            {/* Toggle Button for Mobile (Right aligned next to header) */}
            <button
              onClick={toggleCollapsed}
              className="sm:hidden flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer shrink-0"
              title={isCollapsed ? "Expandir métricas e ações" : "Recolher tela superior"}
            >
              {isCollapsed ? (
                <>
                  <ChevronDown className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Métricas</span>
                </>
              ) : (
                <>
                  <ChevronUp className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Recolher</span>
                </>
              )}
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2">
            {/* Desktop / Expanded Action Buttons */}
            {(!isCollapsed || (typeof window !== "undefined" && window.innerWidth >= 640)) && (
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                {/* Realtime Cloud Sync Badge */}
                <div
                  className="flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200"
                  title="Sincronização em tempo real via Firebase Firestore ativa"
                >
                  <Cloud className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
                  <span className="font-semibold">Nuvem Ativa</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                </div>

                {/* User Profile or Mobile Access */}
                {user && !user.isAnonymous ? (
                  <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg text-xs bg-slate-50 border border-slate-200 text-slate-700">
                    {user.photoURL ? (
                      <img
                        src={user.photoURL}
                        alt={user.displayName || "Usuário"}
                        className="w-5 h-5 rounded-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <UserIcon className="w-4 h-4 text-slate-500" />
                    )}
                    <span className="max-w-[100px] truncate font-medium">
                      {user.displayName || user.email?.split("@")[0] || "Usuário"}
                    </span>
                    <button
                      onClick={onLogout}
                      className="p-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                      title="Sair da conta Google"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => onOpenBackupModal("celular")}
                    className="flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 shadow-2xs hover:border-indigo-300 transition-colors cursor-pointer"
                    title="Acessar no celular via QR Code ou link direto sincronizado"
                  >
                    <Smartphone className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Acessar no Celular</span>
                  </button>
                )}

                <button
                  onClick={() => onOpenBackupModal("backup")}
                  className="flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-2xs hover:border-slate-300 transition-colors cursor-pointer"
                  title="Acessar no celular, computador e gerenciar backup do banco"
                >
                  <HardDrive className="w-3.5 h-3.5 text-slate-500" />
                  <span>Backup</span>
                </button>

                <div
                  className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border ${
                    hasGeminiKey
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-amber-50 text-amber-700 border-amber-200"
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>
                    {hasGeminiKey ? "Gemini AI Conectado" : "Gemini AI: Modo Local"}
                  </span>
                </div>
              </div>
            )}

            {/* Desktop Toggle Button */}
            <button
              onClick={toggleCollapsed}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
              title={isCollapsed ? "Expandir métricas" : "Recolher painel superior para ganhar espaço"}
            >
              {isCollapsed ? (
                <>
                  <ChevronDown className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Ver Métricas</span>
                </>
              ) : (
                <>
                  <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
                  <span>Recolher</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* 4 Metric Cards (Collapsible) */}
        {!isCollapsed && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 mt-3 pt-3 border-t border-slate-100 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="bg-slate-50 rounded-xl p-3 sm:p-3.5 border border-slate-200/80 flex items-center gap-2.5 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-blue-100/80 text-blue-700 flex items-center justify-center shrink-0">
                <ListTodo className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] sm:text-xs font-medium text-slate-500 truncate">
                  Tarefas Pendentes
                </div>
                <div className="text-base sm:text-xl font-bold text-slate-900">
                  {metrics.pendentes}{" "}
                  <span className="text-[10px] sm:text-xs font-normal text-slate-400">
                    / {metrics.total}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-3 sm:p-3.5 border border-slate-200/80 flex items-center gap-2.5 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-emerald-100/80 text-emerald-700 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] sm:text-xs font-medium text-slate-500 truncate">
                  Taxa de Tarefas
                </div>
                <div className="text-base sm:text-xl font-bold text-slate-900">
                  {metrics.taxa}%
                </div>
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-3 sm:p-3.5 border border-slate-200/80 flex items-center gap-2.5 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-purple-100/80 text-purple-700 flex items-center justify-center shrink-0">
                <FolderKanban className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] sm:text-xs font-medium text-slate-500 truncate">
                  Projetos Ativos
                </div>
                <div className="text-base sm:text-xl font-bold text-slate-900">
                  {metrics.projetosEmAndamento || 0}{" "}
                  <span className="text-[10px] sm:text-xs font-normal text-slate-400">
                    em curso
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-3 sm:p-3.5 border border-slate-200/80 flex items-center gap-2.5 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-indigo-100/80 text-indigo-700 flex items-center justify-center shrink-0">
                <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] sm:text-xs font-medium text-slate-500 truncate">
                  Progresso Projetos
                </div>
                <div className="text-base sm:text-xl font-bold text-slate-900">
                  {metrics.mediaProgressoProjetos || 0}%
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

