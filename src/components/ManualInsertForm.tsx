import React, { useState } from "react";
import { PlusCircle, Sparkles, Check, AlertCircle } from "lucide-react";
import { Prioridade } from "../types";

interface ManualInsertFormProps {
  categorias: string[];
  onSubmit: (novaTarefa: {
    titulo: string;
    descricao: string;
    categoria: string;
    prioridade: Prioridade;
    data_vencimento: string;
  }) => Promise<void>;
  onSwitchToVoiceTab?: () => void;
}

export const ManualInsertForm: React.FC<ManualInsertFormProps> = ({
  categorias,
  onSubmit,
  onSwitchToVoiceTab,
}) => {
  const getTodayISO = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };

  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [categoria, setCategoria] = useState(categorias[0] || "Trabalho");
  const [prioridade, setPrioridade] = useState<Prioridade>("Média");
  const [dataVencimento, setDataVencimento] = useState(getTodayISO());
  const [loading, setLoading] = useState(false);
  const [mensagemSucesso, setMensagemSucesso] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim()) {
      setErro("O título da tarefa é obrigatório!");
      return;
    }
    setErro(null);
    setLoading(true);

    try {
      await onSubmit({
        titulo: titulo.trim(),
        descricao: descricao.trim(),
        categoria,
        prioridade,
        data_vencimento: dataVencimento,
      });

      // Clear form
      setTitulo("");
      setDescricao("");
      setPrioridade("Média");
      setDataVencimento(getTodayISO());
      setMensagemSucesso(true);
      setTimeout(() => setMensagemSucesso(false), 3500);
    } catch (err: any) {
      setErro(err?.message || "Erro ao salvar tarefa");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs max-w-3xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6 pb-4 border-b border-slate-100">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <span>✍️</span> Inserção Manual de Tarefas
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Cadastre uma nova tarefa com todos os campos do banco de dados SQLite.
          </p>
        </div>

        {onSwitchToVoiceTab && (
          <button
            type="button"
            onClick={onSwitchToVoiceTab}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition-colors cursor-pointer self-start sm:self-auto"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Prefere falar? Use a Voz</span>
          </button>
        )}
      </div>

      {mensagemSucesso && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-2.5">
          <Check className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>Tarefa cadastrada com sucesso no banco de dados!</span>
        </div>
      )}

      {erro && (
        <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center gap-2.5">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{erro}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Titulo */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
            Título da Tarefa <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Ex: Entregar relatório trimestral de desempenho"
            className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900"
          />
        </div>

        {/* Categoria e Prioridade */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
              Categoria <span className="text-rose-500">*</span>
            </label>
            <select
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900"
            >
              {categorias.map((cat) => (
                <option key={cat} value={cat}>
                  📂 {cat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
              Prioridade <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(["Alta", "Média", "Baixa"] as const).map((p) => {
                const active = prioridade === p;
                let activeStyle = "border-slate-200 text-slate-600 bg-slate-50";
                if (active) {
                  if (p === "Alta") activeStyle = "bg-rose-50 border-rose-300 text-rose-700 font-semibold";
                  else if (p === "Média") activeStyle = "bg-amber-50 border-amber-300 text-amber-800 font-semibold";
                  else activeStyle = "bg-emerald-50 border-emerald-300 text-emerald-800 font-semibold";
                }
                return (
                  <button
                    type="button"
                    key={p}
                    onClick={() => setPrioridade(p)}
                    className={`py-2 px-2 text-xs rounded-xl border text-center transition-all cursor-pointer ${activeStyle}`}
                  >
                    {p === "Alta" ? "🔴 Alta" : p === "Média" ? "🟡 Média" : "🟢 Baixa"}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Data de Vencimento */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
            Data de Vencimento <span className="text-rose-500">*</span>
          </label>
          <input
            type="date"
            required
            value={dataVencimento}
            onChange={(e) => setDataVencimento(e.target.value)}
            className="w-full sm:w-1/2 px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900"
          />
        </div>

        {/* Descrição */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
            Descrição detalhada ou Anotações
          </label>
          <textarea
            rows={4}
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            placeholder="Contexto, links úteis, subtópicos ou passos necessários para concluir a tarefa..."
            className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900"
          ></textarea>
        </div>

        {/* Botão Submit */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-sm shadow-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>{loading ? "Salvando Tarefa..." : "➕ Salvar Tarefa"}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
