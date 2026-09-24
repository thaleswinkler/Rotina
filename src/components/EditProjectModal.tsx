import React, { useState, useEffect } from "react";
import { X, FolderKanban, Save, Calendar, Tag, AlertCircle, CheckCircle2, Clock, PauseCircle } from "lucide-react";
import { Projeto, StatusProjeto } from "../types";

interface EditProjectModalProps {
  isOpen: boolean;
  projeto: Projeto | null;
  categorias: string[];
  onClose: () => void;
  onSave: (id: string | number, updates: Partial<Projeto>) => Promise<void>;
}

export const EditProjectModal: React.FC<EditProjectModalProps> = ({
  isOpen,
  projeto,
  categorias,
  onClose,
  onSave,
}) => {
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [categoria, setCategoria] = useState("");
  const [dataLimite, setDataLimite] = useState("");
  const [status, setStatus] = useState<StatusProjeto>("Em Andamento");
  const [tiposTarefas, setTiposTarefas] = useState<string[]>([]);
  const [novoTipoInput, setNovoTipoInput] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (projeto) {
      setTitulo(projeto.titulo || "");
      setDescricao(projeto.descricao || "");
      setCategoria(projeto.categoria || categorias[0] || "Trabalho");
      setDataLimite(projeto.data_limite || "");
      setStatus(projeto.status || "Em Andamento");
      setTiposTarefas(
        projeto.tipos_tarefas && projeto.tipos_tarefas.length > 0
          ? projeto.tipos_tarefas
          : ["Planejamento", "Execução", "Revisão", "Geral"]
      );
    }
  }, [projeto, categorias]);

  if (!isOpen || !projeto) return null;

  const handleAddTipo = () => {
    const trimmed = novoTipoInput.trim();
    if (!trimmed) return;
    if (!tiposTarefas.includes(trimmed)) {
      setTiposTarefas([...tiposTarefas, trimmed]);
    }
    setNovoTipoInput("");
  };

  const handleRemoveTipo = (tipoToRemove: string) => {
    setTiposTarefas(tiposTarefas.filter((t) => t !== tipoToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim()) return;

    setIsSaving(true);
    try {
      await onSave(projeto.id, {
        titulo: titulo.trim(),
        descricao: descricao.trim(),
        categoria,
        data_limite: dataLimite,
        status,
        tipos_tarefas: tiposTarefas,
      });
      onClose();
    } catch (err) {
      console.error("Erro ao salvar alterações no projeto:", err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-100 text-indigo-700">
              <FolderKanban className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Editar Projeto</h3>
              <p className="text-xs text-slate-500">Altere título, descrição, prazo e categorias</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Título */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Título do Projeto *
            </label>
            <input
              type="text"
              required
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Nome do projeto..."
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 font-medium"
            />
          </div>

          {/* Descrição */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Descrição / Metas do Projeto
            </label>
            <textarea
              rows={3}
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Descreva os objetivos, entregas ou notas deste projeto..."
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 resize-none"
            />
          </div>

          {/* Categoria, Status e Prazo */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Categoria
              </label>
              <select
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                className="w-full px-3 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800"
              >
                {categorias.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as StatusProjeto)}
                className="w-full px-3 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800"
              >
                <option value="Em Andamento">Em Andamento</option>
                <option value="Concluído">Concluído</option>
                <option value="Pausado">Pausado</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Prazo Limite
              </label>
              <input
                type="date"
                value={dataLimite}
                onChange={(e) => setDataLimite(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800 cursor-pointer"
              />
            </div>
          </div>

          {/* Tipos de Tarefas / Fases dentro do Projeto */}
          <div className="pt-2 border-t border-slate-100">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center justify-between">
              <span>Tipos de Tarefas no Projeto (Ramos do Mapa Mental)</span>
              <span className="text-[11px] text-slate-400 font-normal">Ex: Planejamento, Design, Dev</span>
            </label>

            <div className="flex flex-wrap gap-1.5 mb-2.5">
              {tiposTarefas.map((tipo) => (
                <span
                  key={tipo}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200"
                >
                  <span>{tipo}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveTipo(tipo)}
                    className="text-indigo-400 hover:text-rose-600 transition-colors cursor-pointer text-xs font-bold ml-0.5"
                    title="Remover este tipo"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={novoTipoInput}
                onChange={(e) => setNovoTipoInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddTipo();
                  }
                }}
                placeholder="Adicionar novo tipo/fase (ex: Testes, Marketing)..."
                className="flex-1 px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 placeholder:text-slate-400"
              />
              <button
                type="button"
                onClick={handleAddTipo}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold cursor-pointer shrink-0 transition-colors"
              >
                + Tipo
              </button>
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-sm transition-all disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? "Salvando..." : "Salvar Alterações"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
