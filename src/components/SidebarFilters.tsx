import React, { useState } from "react";
import { Filter, Tag, Plus, Calendar, Search, X, CheckCircle2, Clock, Layers } from "lucide-react";
import { Prioridade, StatusTarefa } from "../types";

interface SidebarFiltersProps {
  statusFiltro: "Todos" | StatusTarefa;
  setStatusFiltro: (s: "Todos" | StatusTarefa) => void;
  categoriaFiltro: string;
  setCategoriaFiltro: (c: string) => void;
  prioridadeFiltro: "Todas" | Prioridade;
  setPrioridadeFiltro: (p: "Todas" | Prioridade) => void;
  dataFiltro: string;
  setDataFiltro: (d: string) => void;
  busca: string;
  setBusca: (b: string) => void;
  categorias: string[];
  onAddCategoria: (nome: string) => Promise<void>;
}

export const SidebarFilters: React.FC<SidebarFiltersProps> = ({
  statusFiltro,
  setStatusFiltro,
  categoriaFiltro,
  setCategoriaFiltro,
  prioridadeFiltro,
  setPrioridadeFiltro,
  dataFiltro,
  setDataFiltro,
  busca,
  setBusca,
  categorias,
  onAddCategoria,
}) => {
  const [novaCat, setNovaCat] = useState("");
  const [addingCat, setAddingCat] = useState(false);

  const handleCriarCategoria = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novaCat.trim()) return;
    setAddingCat(true);
    try {
      await onAddCategoria(novaCat.trim());
      setNovaCat("");
    } finally {
      setAddingCat(false);
    }
  };

  const getTodayISO = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };

  const limparFiltros = () => {
    setStatusFiltro("Todos");
    setCategoriaFiltro("Todas");
    setPrioridadeFiltro("Todas");
    setDataFiltro("");
    setBusca("");
  };

  const temFiltroAtivo =
    statusFiltro !== "Todos" ||
    categoriaFiltro !== "Todas" ||
    prioridadeFiltro !== "Todas" ||
    dataFiltro !== "" ||
    busca.trim() !== "";

  return (
    <aside className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-slate-800 font-semibold text-sm">
          <Filter className="w-4 h-4 text-indigo-600" />
          <span>Filtros do Sistema</span>
        </div>
        {temFiltroAtivo && (
          <button
            onClick={limparFiltros}
            className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1 cursor-pointer"
          >
            <X className="w-3 h-3" />
            Limpar
          </button>
        )}
      </div>

      {/* Busca por texto */}
      <div>
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5 block">
          Buscar Tarefa
        </label>
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Título ou palavra-chave..."
            className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800 placeholder-slate-400"
          />
        </div>
      </div>

      {/* Status */}
      <div>
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2 block">
          Status da Tarefa
        </label>
        <div className="grid grid-cols-3 gap-1.5 bg-slate-100 p-1 rounded-xl">
          {(["Todos", "Pendente", "Concluída"] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFiltro(st)}
              className={`py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer text-center ${
                statusFiltro === st
                  ? "bg-white text-slate-900 shadow-xs font-semibold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Categoria */}
      <div>
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center justify-between">
          <span>Categoria</span>
          <span className="text-[11px] text-slate-400 lowercase font-normal">
            {categorias.length} cadastradas
          </span>
        </label>
        <select
          value={categoriaFiltro}
          onChange={(e) => setCategoriaFiltro(e.target.value)}
          className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800"
        >
          <option value="Todas">Todas as Categorias</option>
          {categorias.map((cat) => (
            <option key={cat} value={cat}>
              📂 {cat}
            </option>
          ))}
        </select>
      </div>

      {/* Prioridade */}
      <div>
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2 block">
          Prioridade
        </label>
        <div className="grid grid-cols-4 gap-1.5">
          {(["Todas", "Alta", "Média", "Baixa"] as const).map((p) => {
            const isSelected = prioridadeFiltro === p;
            let color = "hover:bg-slate-50 text-slate-700 border-slate-200";
            if (isSelected) {
              if (p === "Alta") color = "bg-rose-50 border-rose-300 text-rose-700 font-semibold";
              else if (p === "Média") color = "bg-amber-50 border-amber-300 text-amber-800 font-semibold";
              else if (p === "Baixa") color = "bg-emerald-50 border-emerald-300 text-emerald-800 font-semibold";
              else color = "bg-indigo-50 border-indigo-300 text-indigo-700 font-semibold";
            }
            return (
              <button
                key={p}
                onClick={() => setPrioridadeFiltro(p)}
                className={`py-1.5 text-xs rounded-lg border text-center transition-all cursor-pointer ${color}`}
              >
                {p}
              </button>
            );
          })}
        </div>
      </div>

      {/* Data de Vencimento */}
      <div>
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5 block">
          Data de Vencimento
        </label>
        <div className="flex items-center gap-2 mb-2">
          <input
            type="date"
            value={dataFiltro}
            onChange={(e) => setDataFiltro(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800"
          />
          {dataFiltro && (
            <button
              onClick={() => setDataFiltro("")}
              className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              title="Limpar filtro de data"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="flex gap-1.5">
          <button
            onClick={() => setDataFiltro(getTodayISO())}
            className={`flex-1 py-1 text-xs rounded-lg border text-center cursor-pointer transition-colors ${
              dataFiltro === getTodayISO()
                ? "bg-indigo-50 border-indigo-200 text-indigo-700 font-medium"
                : "border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            Hoje
          </button>
          <button
            onClick={() => {
              const d = new Date();
              d.setDate(d.getDate() + 1);
              setDataFiltro(
                `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
              );
            }}
            className="flex-1 py-1 text-xs rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-center cursor-pointer"
          >
            Amanhã
          </button>
        </div>
      </div>

      <hr className="border-slate-100" />

      {/* Adicionar Categoria */}
      <div>
        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
          <Tag className="w-3.5 h-3.5" />
          <span>Criar Nova Categoria</span>
        </div>
        <form onSubmit={handleCriarCategoria} className="space-y-2">
          <input
            type="text"
            value={novaCat}
            onChange={(e) => setNovaCat(e.target.value)}
            placeholder="Ex: Marketing, Viagens..."
            className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800"
          />
          <button
            type="submit"
            disabled={addingCat || !novaCat.trim()}
            className="w-full py-2 px-3 text-xs font-semibold bg-slate-800 hover:bg-slate-900 disabled:opacity-50 text-white rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Adicionar Categoria</span>
          </button>
        </form>
      </div>
    </aside>
  );
};
