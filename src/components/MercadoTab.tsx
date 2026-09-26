import React, { useState, useMemo, useRef } from "react";
import {
  ShoppingCart,
  Plus,
  Check,
  CheckCircle2,
  Trash2,
  Copy,
  Share2,
  RotateCcw,
  X,
  Search,
  Layers,
  Sparkles,
  Tag,
  ListFilter,
  CheckSquare,
  Square,
} from "lucide-react";
import { ItemMercado } from "../types";

interface MercadoTabProps {
  itens: ItemMercado[];
  onAddItem: (nome: string, categoria?: string, quantidade?: string) => Promise<void>;
  onToggleItem: (id: string | number, currentComprado: boolean) => Promise<void>;
  onDeleteItem: (id: string | number) => Promise<void>;
  onUpdateItem: (id: string | number, updates: Partial<ItemMercado>) => Promise<void>;
  onLimparComprados: () => Promise<void>;
  onShowToast: (text: string, type?: "success" | "info") => void;
}

// Predefined categories with representative emojis and colors
export const MERCADO_CATEGORIAS: {
  [key: string]: { emoji: string; color: string; bg: string; border: string };
} = {
  Alimentos: {
    emoji: "🥫",
    color: "text-amber-800",
    bg: "bg-amber-50",
    border: "border-amber-200",
  },
  "Hortifrúti & Feira": {
    emoji: "🍎",
    color: "text-emerald-800",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
  },
  "Laticínios & Frios": {
    emoji: "🧀",
    color: "text-blue-800",
    bg: "bg-blue-50",
    border: "border-blue-200",
  },
  "Carnes & Aves": {
    emoji: "🥩",
    color: "text-rose-800",
    bg: "bg-rose-50",
    border: "border-rose-200",
  },
  "Padaria & Massas": {
    emoji: "🍞",
    color: "text-orange-800",
    bg: "bg-orange-50",
    border: "border-orange-200",
  },
  Bebidas: {
    emoji: "🥤",
    color: "text-cyan-800",
    bg: "bg-cyan-50",
    border: "border-cyan-200",
  },
  "Limpeza & Higiene": {
    emoji: "🧼",
    color: "text-indigo-800",
    bg: "bg-indigo-50",
    border: "border-indigo-200",
  },
  Outros: {
    emoji: "📦",
    color: "text-slate-800",
    bg: "bg-slate-100",
    border: "border-slate-300",
  },
};

// Common fast-add suggestions when items run out at home
const ATALHOS_RAPIDOS = [
  { nome: "Café", cat: "Alimentos" },
  { nome: "Leite", cat: "Laticínios & Frios" },
  { nome: "Pão", cat: "Padaria & Massas" },
  { nome: "Ovos", cat: "Hortifrúti & Feira" },
  { nome: "Arroz", cat: "Alimentos" },
  { nome: "Feijão", cat: "Alimentos" },
  { nome: "Azeite", cat: "Alimentos" },
  { nome: "Manteiga", cat: "Laticínios & Frios" },
  { nome: "Queijo", cat: "Laticínios & Frios" },
  { nome: "Frutas", cat: "Hortifrúti & Feira" },
  { nome: "Detergente", cat: "Limpeza & Higiene" },
  { nome: "Papel Higiênico", cat: "Limpeza & Higiene" },
  { nome: "Sabonete", cat: "Limpeza & Higiene" },
  { nome: "Água mineral", cat: "Bebidas" },
];

export const MercadoTab: React.FC<MercadoTabProps> = ({
  itens,
  onAddItem,
  onToggleItem,
  onDeleteItem,
  onUpdateItem,
  onLimparComprados,
  onShowToast,
}) => {
  const [novoItemNome, setNovoItemNome] = useState("");
  const [novoItemQtd, setNovoItemQtd] = useState("1");
  const [novoItemCat, setNovoItemCat] = useState("Alimentos");
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<"todos" | "pendentes" | "comprados">("todos");
  const [filtroCategoria, setFiltroCategoria] = useState<string>("todas");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-detect category based on item name keyword
  const autoDetectCategoria = (texto: string): string => {
    const t = texto.toLowerCase();
    if (t.includes("leite") || t.includes("queijo") || t.includes("iogurte") || t.includes("manteiga") || t.includes("requeijão") || t.includes("presunto") || t.includes("creme de leite")) {
      return "Laticínios & Frios";
    }
    if (t.includes("maçã") || t.includes("banana") || t.includes("tomate") || t.includes("cebola") || t.includes("batata") || t.includes("alface") || t.includes("fruta") || t.includes("legume") || t.includes("alho") || t.includes("ovo")) {
      return "Hortifrúti & Feira";
    }
    if (t.includes("carne") || t.includes("frango") || t.includes("peixe") || t.includes("bife") || t.includes("costela") || t.includes("linguiça") || t.includes("bacon")) {
      return "Carnes & Aves";
    }
    if (t.includes("pão") || t.includes("torrada") || t.includes("bolo") || t.includes("macarrão") || t.includes("biscoito") || t.includes("massa")) {
      return "Padaria & Massas";
    }
    if (t.includes("água") || t.includes("suco") || t.includes("refrigerante") || t.includes("cerveja") || t.includes("vinho") || t.includes("chá") || t.includes("café")) {
      return t.includes("café") ? "Alimentos" : "Bebidas";
    }
    if (t.includes("detergente") || t.includes("sabão") || t.includes("esponja") || t.includes("papel") || t.includes("desinfetante") || t.includes("shampoo") || t.includes("pasta") || t.includes("escova") || t.includes("amaciante")) {
      return "Limpeza & Higiene";
    }
    return "Alimentos";
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setNovoItemNome(val);
    if (val.trim().length >= 3) {
      const detected = autoDetectCategoria(val);
      setNovoItemCat(detected);
    }
  };

  // Quick submit to add item
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const nomeLimpo = novoItemNome.trim();
    if (!nomeLimpo) return;

    setIsSubmitting(true);
    try {
      await onAddItem(nomeLimpo, novoItemCat, novoItemQtd.trim() || "1");
      setNovoItemNome("");
      setNovoItemQtd("1");
      onShowToast(`🛒 "${nomeLimpo}" adicionado à lista!`, "success");
      inputRef.current?.focus();
    } catch (err: any) {
      alert("Erro ao adicionar item de mercado.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Add from Quick Shortcuts
  const handleQuickAdd = async (nome: string, cat: string) => {
    // Check if already in pending list
    const jaExiste = itens.find(
      (i) => !i.comprado && i.nome.toLowerCase() === nome.toLowerCase()
    );
    if (jaExiste) {
      onShowToast(`"${nome}" já está na sua lista!`, "info");
      return;
    }

    try {
      await onAddItem(nome, cat, "1");
      onShowToast(`🛒 "${nome}" adicionado!`, "success");
    } catch (err) {
      console.error(err);
    }
  };

  // Copy list formatted for WhatsApp
  const handleCopyWhatsApp = () => {
    const pendentes = itens.filter((i) => !i.comprado);
    if (pendentes.length === 0) {
      onShowToast("Nenhum item pendente para comprar!", "info");
      return;
    }

    let texto = `🛒 *LISTA DE MERCADO - ROTINA PRO*\n`;
    texto += `📅 _${new Date().toLocaleDateString("pt-BR")}_\n\n`;

    // Group by category
    const categoriasUsadas = Array.from(new Set(pendentes.map((i) => i.categoria || "Alimentos")));

    categoriasUsadas.forEach((cat) => {
      const itensDaCat = pendentes.filter((i) => (i.categoria || "Alimentos") === cat);
      const icon = MERCADO_CATEGORIAS[cat]?.emoji || "🔹";
      texto += `${icon} *${cat.toUpperCase()}*\n`;
      itensDaCat.forEach((it) => {
        texto += `  • [ ] ${it.nome}${it.quantidade && it.quantidade !== "1" ? ` (${it.quantidade})` : ""}\n`;
      });
      texto += `\n`;
    });

    texto += `Total: ${pendentes.length} itens a comprar.`;

    navigator.clipboard.writeText(texto);
    onShowToast("📋 Lista formatada copiada para o WhatsApp!", "success");
  };

  // Filtered items
  const itensFiltrados = useMemo(() => {
    return itens.filter((item) => {
      if (busca.trim()) {
        const q = busca.toLowerCase();
        const matchNome = item.nome.toLowerCase().includes(q);
        const matchCat = (item.categoria || "").toLowerCase().includes(q);
        if (!matchNome && !matchCat) return false;
      }
      if (filtroStatus === "pendentes" && item.comprado) return false;
      if (filtroStatus === "comprados" && !item.comprado) return false;
      if (filtroCategoria !== "todas" && item.categoria !== filtroCategoria) return false;
      return true;
    });
  }, [itens, busca, filtroStatus, filtroCategoria]);

  const totalPendentes = itens.filter((i) => !i.comprado).length;
  const totalComprados = itens.filter((i) => i.comprado).length;
  const totalGeral = itens.length;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Banner: Quick Capture Focused */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">🛒</span>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">
              Mercado & Lista de Compras
            </h2>
            {totalPendentes > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-rose-500 text-white shadow-xs">
                {totalPendentes} a comprar
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-slate-500">
            Percebeu que algo faltou em casa? Acrescente instantaneamente aqui. Marque os itens enquanto faz as compras.
          </p>
        </div>

        {/* Global List Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleCopyWhatsApp}
            className="px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-emerald-200 shadow-2xs"
            title="Copiar lista organizada para enviar no WhatsApp"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Copiar WhatsApp</span>
          </button>

          {totalComprados > 0 && (
            <button
              onClick={onLimparComprados}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Remover todos os itens que já foram marcados como comprados"
            >
              <Trash2 className="w-3.5 h-3.5 text-slate-500" />
              <span>Limpar Comprados ({totalComprados})</span>
            </button>
          )}
        </div>
      </div>

      {/* QUICK ADD BOX (Hero input where user types as soon as they notice something ran out) */}
      <div className="bg-white rounded-2xl border-2 border-indigo-400/80 shadow-md p-4 sm:p-5 space-y-3 ring-4 ring-indigo-500/10">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse"></span>
            Faltou o que em casa? Acrescente agora:
          </label>
          <span className="text-[11px] text-slate-400">
            Pressione <b>Enter</b> para salvar rapidamente
          </span>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
          {/* Main item input */}
          <div className="relative flex-1">
            <input
              ref={inputRef}
              type="text"
              required
              autoFocus
              value={novoItemNome}
              onChange={handleInputChange}
              placeholder="Ex: Café em pó, Azeite, Detergente, Ovos, Pão de queijo..."
              className="w-full px-4 py-3 text-sm sm:text-base font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 placeholder:text-slate-400"
            />
          </div>

          <div className="flex items-center gap-2">
            {/* Quantity */}
            <input
              type="text"
              value={novoItemQtd}
              onChange={(e) => setNovoItemQtd(e.target.value)}
              placeholder="Qtd (ex: 1, 2 kg)"
              className="w-24 px-3 py-3 text-xs sm:text-sm text-center font-medium bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800"
              title="Quantidade ou unidade (ex: 1, 2 un, 500g)"
            />

            {/* Category Select */}
            <select
              value={novoItemCat}
              onChange={(e) => setNovoItemCat(e.target.value)}
              className="px-3 py-3 text-xs sm:text-sm font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800 cursor-pointer max-w-[150px] sm:max-w-none"
            >
              {Object.keys(MERCADO_CATEGORIAS).map((cat) => (
                <option key={cat} value={cat}>
                  {MERCADO_CATEGORIAS[cat].emoji} {cat}
                </option>
              ))}
            </select>

            {/* Submit button */}
            <button
              type="submit"
              disabled={isSubmitting || !novoItemNome.trim()}
              className="px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs disabled:opacity-50 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Adicionar</span>
            </button>
          </div>
        </form>

        {/* 1-Tap Quick Shortcuts for Common Household Items */}
        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-[11px] font-bold text-slate-400 mr-1 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-500" />
            Mais comuns (1 toque):
          </span>
          {ATALHOS_RAPIDOS.map((at) => (
            <button
              key={at.nome}
              type="button"
              onClick={() => handleQuickAdd(at.nome, at.cat)}
              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 font-medium text-[11px] border border-slate-200/80 transition-colors cursor-pointer active:scale-95"
            >
              + {at.nome}
            </button>
          ))}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-wrap items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar itens na lista..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 text-slate-800"
          />
          {busca && (
            <button
              onClick={() => setBusca("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
            >
              ✕
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status Tabs */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setFiltroStatus("todos")}
              className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                filtroStatus === "todos"
                  ? "bg-white text-indigo-700 shadow-xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Todos ({totalGeral})
            </button>
            <button
              onClick={() => setFiltroStatus("pendentes")}
              className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                filtroStatus === "pendentes"
                  ? "bg-white text-rose-600 shadow-xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              A Comprar ({totalPendentes})
            </button>
            <button
              onClick={() => setFiltroStatus("comprados")}
              className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                filtroStatus === "comprados"
                  ? "bg-white text-emerald-700 shadow-xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              No Carrinho ({totalComprados})
            </button>
          </div>

          {/* Category Dropdown */}
          <select
            value={filtroCategoria}
            onChange={(e) => setFiltroCategoria(e.target.value)}
            className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:outline-hidden cursor-pointer"
          >
            <option value="todas">Todas as Seções</option>
            {Object.keys(MERCADO_CATEGORIAS).map((cat) => (
              <option key={cat} value={cat}>
                {MERCADO_CATEGORIAS[cat].emoji} {cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Shopping List Items */}
      {itensFiltrados.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3">
            <ShoppingCart className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-900 mb-1">
            {busca
              ? "Nenhum item encontrado com essa busca"
              : filtroStatus === "pendentes"
              ? "Tudo comprado! Nada pendente no momento 🎉"
              : "Sua lista de mercado está vazia"}
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto mb-4">
            Digite acima sempre que lembrar de algo que faltou para manter sua despensa abastecida.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Pending Items First */}
          {itensFiltrados.filter((i) => !i.comprado).length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                  Itens a Comprar ({itensFiltrados.filter((i) => !i.comprado).length})
                </h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {itensFiltrados
                  .filter((i) => !i.comprado)
                  .map((item) => {
                    const catInfo = MERCADO_CATEGORIAS[item.categoria] || MERCADO_CATEGORIAS.Alimentos;

                    return (
                      <div
                        key={item.id}
                        className="bg-white rounded-xl border border-slate-200/90 p-3.5 shadow-2xs hover:border-indigo-300 hover:shadow-xs transition-all flex items-center justify-between gap-3 group"
                      >
                        {/* Checkbox and Title */}
                        <div
                          onClick={() => onToggleItem(item.id, item.comprado)}
                          className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
                        >
                          <div className="w-5 h-5 rounded-lg border-2 border-slate-300 group-hover:border-indigo-600 flex items-center justify-center text-transparent transition-colors shrink-0">
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </div>

                          <div className="min-w-0">
                            <span className="text-sm font-bold text-slate-900 block truncate">
                              {item.nome}
                            </span>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${catInfo.bg} ${catInfo.color} ${catInfo.border} flex items-center gap-1`}
                              >
                                <span>{catInfo.emoji}</span>
                                <span>{item.categoria}</span>
                              </span>
                              {item.quantidade && item.quantidade !== "1" && (
                                <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                                  {item.quantidade}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => onDeleteItem(item.id)}
                            className="p-1.5 text-slate-300 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Remover da lista"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Already Bought Items */}
          {itensFiltrados.filter((i) => i.comprado).length > 0 && (
            <div className="space-y-2 pt-3 border-t border-slate-200/80">
              <div className="flex items-center justify-between px-1">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  Já no Carrinho / Comprados ({itensFiltrados.filter((i) => i.comprado).length})
                </h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {itensFiltrados
                  .filter((i) => i.comprado)
                  .map((item) => (
                    <div
                      key={item.id}
                      className="bg-slate-50/70 rounded-xl border border-slate-200/70 p-3 shadow-none flex items-center justify-between gap-3 text-slate-400 group"
                    >
                      <div
                        onClick={() => onToggleItem(item.id, item.comprado)}
                        className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
                      >
                        <div className="w-5 h-5 rounded-lg bg-emerald-500 border-2 border-emerald-500 flex items-center justify-center text-white shrink-0">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>

                        <div className="min-w-0">
                          <span className="text-sm line-through text-slate-400 block truncate">
                            {item.nome}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {item.quantidade && item.quantidade !== "1" ? `Qtd: ${item.quantidade} • ` : ""}
                            {item.categoria}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => onDeleteItem(item.id)}
                        className="p-1.5 text-slate-300 hover:text-rose-600 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
                        title="Remover"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
