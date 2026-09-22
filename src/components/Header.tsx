import React from "react";
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
} from "lucide-react";
import { MetricSummary, UserProfile } from "../types";

interface HeaderProps {
  metrics: MetricSummary;
  hasGeminiKey: boolean;
  onOpenBackupModal: () => void;
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
  const dataHoje = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());

  const dataFormatada = dataHoje.charAt(0).toUpperCase() + dataHoje.slice(1);

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
        {/* Top brand & status row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-500 flex items-center justify-center text-white shadow-sm font-black text-xl">
              ⚡
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                  Rotina PRO
                </h1>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                  Tarefas & Projetos
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 capitalize">
                {dataFormatada}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Realtime Cloud Sync Badge */}
            <div
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200"
              title="Sincronização em tempo real via Firebase Firestore ativa"
            >
              <Cloud className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
              <span className="font-semibold">Nuvem Ativa</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            </div>

            {/* Google Login / Account Info */}
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
                <span className="max-w-[110px] truncate font-medium">
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
                onClick={onLoginGoogle}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-2xs hover:border-slate-300 transition-colors cursor-pointer"
                title="Entrar com sua conta Google para sincronizar todos os seus dispositivos"
              >
                <LogIn className="w-3.5 h-3.5 text-indigo-600" />
                <span>Entrar com Google</span>
              </button>
            )}

            <button
              onClick={onOpenBackupModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-2xs hover:border-slate-300 transition-colors cursor-pointer"
              title="Acessar no celular, computador e gerenciar banco na nuvem"
            >
              <HardDrive className="w-3.5 h-3.5 text-indigo-600" />
              <span>Celular & Nuvem</span>
            </button>

            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border ${
                hasGeminiKey
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-amber-50 text-amber-700 border-amber-200"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>
                {hasGeminiKey
                  ? "Gemini AI Conectado"
                  : "Gemini AI: Modo Local"}
              </span>
            </div>
          </div>
        </div>

        {/* 4 Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200/80 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100/80 text-blue-700 flex items-center justify-center shrink-0">
              <ListTodo className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-medium text-slate-500">
                Tarefas Pendentes
              </div>
              <div className="text-lg sm:text-xl font-bold text-slate-900">
                {metrics.pendentes}{" "}
                <span className="text-xs font-normal text-slate-400">
                  / {metrics.total}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200/80 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-100/80 text-emerald-700 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-medium text-slate-500">
                Taxa de Tarefas
              </div>
              <div className="text-lg sm:text-xl font-bold text-slate-900">
                {metrics.taxa}%
              </div>
            </div>
          </div>

          <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200/80 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100/80 text-purple-700 flex items-center justify-center shrink-0">
              <FolderKanban className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-medium text-slate-500">
                Projetos Ativos
              </div>
              <div className="text-lg sm:text-xl font-bold text-slate-900">
                {metrics.projetosEmAndamento || 0}{" "}
                <span className="text-xs font-normal text-slate-400">
                  em curso
                </span>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200/80 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-100/80 text-indigo-700 flex items-center justify-center shrink-0">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-medium text-slate-500">
                Progresso Projetos
              </div>
              <div className="text-lg sm:text-xl font-bold text-slate-900">
                {metrics.mediaProgressoProjetos || 0}%
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
