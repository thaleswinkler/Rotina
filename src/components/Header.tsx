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
  Sun,
  Moon,
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
  theme?: "light" | "dark";
  onToggleTheme?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  metrics,
  hasGeminiKey,
  onOpenBackupModal,
  user,
  onLoginGoogle,
  onLogout,
  isSyncing,
  theme = "light",
  onToggleTheme,
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
    <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 relative shadow-2xs transition-colors duration-150">
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
                  <h1 className="text-lg sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                    Rotina PRO
                  </h1>
                  <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800">
                    Tarefas & Projetos
                  </span>
                  {metrics.totalMercadoPendentes !== undefined && metrics.totalMercadoPendentes > 0 && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] sm:text-xs font-bold bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 shadow-2xs">
                      🛒 {metrics.totalMercadoPendentes} a comprar
                    </span>
                  )}
                </div>
                <p className="text-[11px] sm:text-sm text-slate-500 dark:text-slate-400 capitalize">
                  {dataFormatada}
                </p>
              </div>
            </div>

            {/* Mobile Actions: Theme & Collapse */}
            <div className="flex items-center gap-1.5 sm:hidden">
              {onToggleTheme && (
                <button
                  onClick={onToggleTheme}
                  className="p-1.5 rounded-xl text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 cursor-pointer"
                  title={theme === "dark" ? "Mudar para modo claro" : "Mudar para modo escuro"}
                >
                  {theme === "dark" ? (
                    <Sun className="w-4 h-4 text-amber-400" />
                  ) : (
                    <Moon className="w-4 h-4 text-indigo-600" />
                  )}
                </button>
              )}

              <button
                onClick={toggleCollapsed}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer shrink-0"
                title={isCollapsed ? "Expandir métricas e ações" : "Recolher tela superior"}
              >
                {isCollapsed ? (
                  <>
                    <ChevronDown className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    <span>Métricas</span>
                  </>
                ) : (
                  <>
                    <ChevronUp className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    <span>Recolher</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2">
            {/* Desktop / Expanded Action Buttons */}
            {(!isCollapsed || (typeof window !== "undefined" && window.innerWidth >= 640)) && (
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                {/* Theme Toggle Button */}
                {onToggleTheme && (
                  <button
                    onClick={onToggleTheme}
                    className="flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                    title={theme === "dark" ? "Mudar para modo claro" : "Mudar para modo escuro"}
                  >
                    {theme === "dark" ? (
                      <>
                        <Sun className="w-3.5 h-3.5 text-amber-400" />
                        <span className="hidden sm:inline">Modo Claro</span>
                      </>
                    ) : (
                      <>
                        <Moon className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                        <span className="hidden sm:inline">Modo Escuro</span>
                      </>
                    )}
                  </button>
                )}

                {/* Realtime Cloud Sync Badge */}
                <div
                  className="flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-medium bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                  title="Sincronização em tempo real via Firebase Firestore ativa"
                >
                  <Cloud className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 animate-pulse" />
                  <span className="font-semibold">Nuvem Ativa</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                </div>

                {/* User Profile or Mobile Access */}
                {user && !user.isAnonymous ? (
                  <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200">
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
                    className="flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 shadow-2xs hover:border-indigo-300 transition-colors cursor-pointer"
                    title="Acessar no celular via QR Code ou link direto sincronizado"
                  >
                    <Smartphone className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    <span>Acessar no Celular</span>
                  </button>
                )}

                <button
                  onClick={() => onOpenBackupModal("backup")}
                  className="flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-semibold bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 shadow-2xs hover:border-slate-300 transition-colors cursor-pointer"
                  title="Acessar no celular, computador e gerenciar backup do banco"
                >
                  <HardDrive className="w-3.5 h-3.5 text-slate-500" />
                  <span>Backup</span>
                </button>

                <div
                  className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border ${
                    hasGeminiKey
                      ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                      : "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800"
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
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              title={isCollapsed ? "Expandir métricas" : "Recolher painel superior para ganhar espaço"}
            >
              {isCollapsed ? (
                <>
                  <ChevronDown className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span>Ver Métricas</span>
                </>
              ) : (
                <>
                  <ChevronUp className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                  <span>Recolher</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* 4 Metric Cards (Collapsible) */}
        {!isCollapsed && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="bg-slate-50 dark:bg-slate-800/80 rounded-xl p-3 sm:p-3.5 border border-slate-200/80 dark:border-slate-700 flex items-center gap-2.5 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-blue-100/80 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 flex items-center justify-center shrink-0">
                <ListTodo className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] sm:text-xs font-medium text-slate-500 dark:text-slate-400 truncate">
                  Tarefas Pendentes
                </div>
                <div className="text-base sm:text-xl font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                  {metrics.pendentes}{" "}
                  <span className="text-[10px] sm:text-xs font-normal text-slate-400">
                    / {metrics.total}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/80 rounded-xl p-3 sm:p-3.5 border border-slate-200/80 dark:border-slate-700 flex items-center gap-2.5 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-emerald-100/80 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] sm:text-xs font-medium text-slate-500 dark:text-slate-400 truncate">
                  Taxa de Tarefas
                </div>
                <div className="text-base sm:text-xl font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                  {metrics.taxa}%
                </div>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/80 rounded-xl p-3 sm:p-3.5 border border-slate-200/80 dark:border-slate-700 flex items-center gap-2.5 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-purple-100/80 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 flex items-center justify-center shrink-0">
                <FolderKanban className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] sm:text-xs font-medium text-slate-500 dark:text-slate-400 truncate">
                  Projetos Ativos
                </div>
                <div className="text-base sm:text-xl font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                  {metrics.projetosEmAndamento || 0}{" "}
                  <span className="text-[10px] sm:text-xs font-normal text-slate-400">
                    em curso
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/80 rounded-xl p-3 sm:p-3.5 border border-slate-200/80 dark:border-slate-700 flex items-center gap-2.5 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-indigo-100/80 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 flex items-center justify-center shrink-0">
                <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] sm:text-xs font-medium text-slate-500 dark:text-slate-400 truncate">
                  Progresso Projetos
                </div>
                <div className="text-base sm:text-xl font-bold text-slate-900 dark:text-slate-100 tabular-nums">
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

