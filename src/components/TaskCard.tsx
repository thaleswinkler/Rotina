import React, { useState } from "react";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Trash2,
  Edit3,
  Calendar,
  Tag,
  AlertCircle,
  Clock,
} from "lucide-react";
import { Tarefa } from "../types";

interface TaskCardProps {
  tarefa: Tarefa;
  onToggleStatus: (id: string | number, currentStatus: "Pendente" | "Concluída") => void;
  onDelete: (id: string | number) => void;
  onEdit: (tarefa: Tarefa) => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({
  tarefa,
  onToggleStatus,
  onDelete,
  onEdit,
}) => {
  const [expanded, setExpanded] = useState(false);
  const isConcluida = tarefa.status === "Concluída";

  // Data helpers
  const hoje = new Date().toISOString().split("T")[0];
  const isVencida = !isConcluida && tarefa.data_vencimento < hoje;
  const isHoje = tarefa.data_vencimento === hoje;

  // Priority styling
  const getPrioridadeBadge = () => {
    switch (tarefa.prioridade) {
      case "Alta":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
            Alta
          </span>
        );
      case "Média":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
            Média
          </span>
        );
      case "Baixa":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            Baixa
          </span>
        );
    }
  };

  const formatarData = (isoDate: string) => {
    if (!isoDate) return "";
    const [ano, mes, dia] = isoDate.split("-");
    return `${dia}/${mes}/${ano}`;
  };

  return (
    <div
      className={`group rounded-2xl border transition-all duration-200 shadow-xs hover:shadow-md ${
        isConcluida
          ? "bg-slate-50/70 border-slate-200 opacity-80"
          : isVencida
          ? "bg-white border-rose-200/90 hover:border-rose-300"
          : "bg-white border-slate-200 hover:border-indigo-300"
      }`}
    >
      <div className="p-4 sm:p-5 flex items-start gap-3.5">
        {/* Checkbox button */}
        <button
          onClick={() => onToggleStatus(tarefa.id, tarefa.status)}
          className={`mt-0.5 w-6 h-6 rounded-lg border flex items-center justify-center transition-all cursor-pointer shrink-0 ${
            isConcluida
              ? "bg-emerald-600 border-emerald-600 text-white shadow-xs"
              : "border-slate-300 hover:border-indigo-600 bg-white hover:bg-indigo-50/50"
          }`}
          title={isConcluida ? "Marcar como pendente" : "Marcar como concluída"}
        >
          {isConcluida && <Check className="w-4 h-4 stroke-[3]" />}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            {getPrioridadeBadge()}

            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-700">
              <Tag className="w-3 h-3 text-slate-400" />
              {tarefa.categoria}
            </span>

            <span
              className={`inline-flex items-center gap-1 text-xs font-medium ${
                isVencida
                  ? "text-rose-600 font-semibold"
                  : isHoje
                  ? "text-amber-600 font-semibold"
                  : "text-slate-500"
              }`}
            >
              <Calendar className="w-3 h-3" />
              <span>{formatarData(tarefa.data_vencimento)}</span>
              {isVencida && (
                <span className="text-[10px] uppercase tracking-wider bg-rose-100 text-rose-700 px-1.5 py-0.2 rounded-sm">
                  Atrasada
                </span>
              )}
              {isHoje && !isConcluida && (
                <span className="text-[10px] uppercase tracking-wider bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded-sm">
                  Hoje
                </span>
              )}
            </span>
          </div>

          {/* Title */}
          <h3
            className={`text-base font-semibold leading-snug break-words ${
              isConcluida
                ? "line-through text-slate-400"
                : "text-slate-900"
            }`}
          >
            {tarefa.titulo}
          </h3>

          {/* Short preview if not expanded */}
          {tarefa.descricao && !expanded && (
            <p className="text-xs text-slate-500 mt-1 line-clamp-1">
              {tarefa.descricao}
            </p>
          )}

          {/* Expanded details */}
          {expanded && (
            <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-600 space-y-2">
              <div>
                <span className="font-semibold text-slate-700 block mb-0.5">
                  Descrição detalhada:
                </span>
                <p className="whitespace-pre-wrap leading-relaxed text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  {tarefa.descricao || "Nenhuma observação informada."}
                </p>
              </div>
              <div className="flex items-center gap-4 text-[11px] text-slate-400">
                <span>ID: #{tarefa.id}</span>
                <span>
                  Criada em:{" "}
                  {new Date(tarefa.criado_em).toLocaleString("pt-BR", {
                    dateStyle: "short",
                    timeStyle: "short",
                  })}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => onEdit(tarefa)}
            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
            title="Editar tarefa"
          >
            <Edit3 className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(tarefa.id)}
            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
            title="Excluir tarefa"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          {tarefa.descricao && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              title={expanded ? "Recolher detalhes" : "Expandir detalhes"}
            >
              {expanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
