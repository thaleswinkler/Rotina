import React, { useState, useRef } from "react";
import {
  Download,
  Upload,
  Smartphone,
  Laptop,
  Database,
  X,
  CheckCircle2,
  Copy,
  HardDrive,
  Cloud,
  RefreshCw,
} from "lucide-react";
import { syncLocalServerToFirestore } from "../lib/firebase";

interface SyncAndBackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataRestored: () => Promise<void>;
  onShowToast: (text: string, type?: "success" | "info") => void;
}

export const SyncAndBackupModal: React.FC<SyncAndBackupModalProps> = ({
  isOpen,
  onClose,
  onDataRestored,
  onShowToast,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<"backup" | "celular" | "computador">("backup");
  const [isRestoring, setIsRestoring] = useState(false);
  const [isSyncingServer, setIsSyncingServer] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const currentUrl = typeof window !== "undefined" && window.location ? window.location.href : "";

  const handleCopyUrl = () => {
    if (navigator?.clipboard && currentUrl) {
      navigator.clipboard.writeText(currentUrl);
      setCopiedUrl(true);
      onShowToast("Link copiado para a área de transferência!", "success");
      setTimeout(() => setCopiedUrl(false), 2500);
    }
  };

  const handleDownloadBackup = () => {
    window.open("/api/database/backup", "_blank");
    onShowToast("Download do backup do banco iniciado!", "success");
  };

  const handleForceSyncServerToCloud = async () => {
    try {
      setIsSyncingServer(true);
      const res = await syncLocalServerToFirestore(true);
      await onDataRestored();
      onShowToast(`✅ Sincronizado com a nuvem: ${res.tarefas} tarefas e ${res.projetos} projetos!`, "success");
    } catch (err: any) {
      alert("Erro ao enviar dados para a nuvem: " + (err?.message || "Verifique a conexão."));
    } finally {
      setIsSyncingServer(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsRestoring(true);
      const text = await file.text();
      const parsed = JSON.parse(text);

      const res = await fetch("/api/database/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Falha ao restaurar dados.");
      }

      // Also sync to cloud firestore so it reflects on all devices
      try {
        await syncLocalServerToFirestore(true);
      } catch (cloudErr) {
        console.warn("Aviso ao sincronizar backup restaurado para Firestore:", cloudErr);
      }

      await onDataRestored();
      onShowToast("✅ Banco de dados restaurado e sincronizado na nuvem!", "success");
      onClose();
    } catch (err: any) {
      alert(err.message || "Arquivo de backup inválido.");
    } finally {
      setIsRestoring(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                Acesso & Backup do Banco de Dados
              </h2>
              <p className="text-xs text-slate-500">
                Como usar no celular, no computador e salvar seus dados com segurança
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Tabs */}
        <div className="flex border-b border-slate-200 bg-white px-5 pt-3 gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveSubTab("backup")}
            className={`pb-3 px-3 text-xs sm:text-sm font-semibold flex items-center gap-2 border-b-2 cursor-pointer transition-colors shrink-0 ${
              activeSubTab === "backup"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <HardDrive className="w-4 h-4" />
            <span>Salvar / Backup do Banco</span>
          </button>

          <button
            onClick={() => setActiveSubTab("celular")}
            className={`pb-3 px-3 text-xs sm:text-sm font-semibold flex items-center gap-2 border-b-2 cursor-pointer transition-colors shrink-0 ${
              activeSubTab === "celular"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>Como Acessar no Celular</span>
          </button>

          <button
            onClick={() => setActiveSubTab("computador")}
            className={`pb-3 px-3 text-xs sm:text-sm font-semibold flex items-center gap-2 border-b-2 cursor-pointer transition-colors shrink-0 ${
              activeSubTab === "computador"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Laptop className="w-4 h-4" />
            <span>No Computador (Web & Python)</span>
          </button>
        </div>

        {/* Modal Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-slate-800">
          {/* TAB 1: SINCRONIZAÇÃO AUTOMÁTICA & BACKUP */}
          {activeSubTab === "backup" && (
            <div className="space-y-4">
              {/* Automated Firebase Banner */}
              <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-4 flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                  <Cloud className="w-4 h-4 animate-pulse" />
                </div>
                <div className="text-xs sm:text-sm text-emerald-950 flex-1">
                  <p className="font-bold mb-1 flex items-center gap-1.5">
                    <span>Sincronização 100% Automática Ativada (Firebase Firestore)</span>
                  </p>
                  <p className="text-emerald-900/80 leading-relaxed">
                    Você <strong>não precisa exportar nem importar arquivos manualmente</strong> para passar tarefas do celular para o computador! Toda criação, edição ou conclusão é salva instantaneamente na nuvem e sincronizada em tempo real.
                  </p>
                </div>
              </div>

              {/* Botão de Enviar Dados Locais para o Novo Projeto Firestore */}
              <div className="p-4 rounded-xl border border-indigo-200 bg-indigo-50/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-sm font-bold text-indigo-950 flex items-center gap-1.5">
                    <RefreshCw className="w-4 h-4 text-indigo-600" />
                    <span>Recuperar / Reenviar Dados Locais para a Nuvem</span>
                  </h4>
                  <p className="text-xs text-indigo-900/80 mt-0.5">
                    Trocou de projeto Firebase ou conectou uma conta nova e quer enviar as tarefas do banco local para a nuvem?
                  </p>
                </div>
                <button
                  onClick={handleForceSyncServerToCloud}
                  disabled={isSyncingServer}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-semibold flex items-center gap-2 shadow-xs transition-colors cursor-pointer shrink-0 disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncingServer ? "animate-spin" : ""}`} />
                  <span>{isSyncingServer ? "Sincronizando..." : "Sincronizar Agora"}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Download Backup */}
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex items-center gap-2 text-sm font-bold text-slate-900 mb-1">
                      <Download className="w-4 h-4 text-indigo-600" />
                      <span>Cópia de Segurança (.json)</span>
                    </div>
                    <p className="text-xs text-slate-500">
                      Opcional: Baixe um arquivo JSON com todas as suas tarefas e projetos se quiser manter um arquivo histórico físico no seu computador ou Google Drive.
                    </p>
                  </div>
                  <button
                    onClick={handleDownloadBackup}
                    className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Baixar Arquivo de Backup</span>
                  </button>
                </div>

                {/* Restore Backup */}
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex items-center gap-2 text-sm font-bold text-slate-900 mb-1">
                      <Upload className="w-4 h-4 text-emerald-600" />
                      <span>Restaurar de um Arquivo</span>
                    </div>
                    <p className="text-xs text-slate-500">
                      Caso tenha um backup antigo ou queira restaurar dados de outra máquina para a nuvem, selecione o arquivo abaixo.
                    </p>
                  </div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept=".json"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isRestoring}
                    className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <Upload className="w-4 h-4" />
                    <span>{isRestoring ? "Restaurando..." : "Importar Arquivo (.json)"}</span>
                  </button>
                </div>
              </div>

              {/* Local SQLite note */}
              <div className="p-3.5 bg-slate-100 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1">
                <p className="font-bold text-slate-800 flex items-center gap-1.5">
                  📁 E como funciona para quem roda o Python local (app.py)?
                </p>
                <p>
                  O script Python roda com banco relacional SQLite local no arquivo <strong className="text-slate-900 font-mono">rotina_pro.db</strong>. No navegador web, os dados são salvos diretamente no Firestore em tempo real.
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: COMO ACESSAR NO CELULAR */}
          {activeSubTab === "celular" && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
                <span className="text-xs font-bold uppercase text-indigo-600 tracking-wider">
                  Link Direto de Acesso
                </span>
                <p className="text-xs text-slate-500">
                  Abra este link no navegador do seu smartphone (Chrome ou Safari) para usar todas as funções, inclusive o microfone para criar tarefas por voz:
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={currentUrl}
                    className="flex-1 px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-700 font-mono select-all"
                  />
                  <button
                    onClick={handleCopyUrl}
                    className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                  >
                    {copiedUrl ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedUrl ? "Copiado!" : "Copiar"}</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Android Chrome */}
                <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
                  <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                    <span className="text-base">🤖</span>
                    <span>No Android (Google Chrome)</span>
                  </div>
                  <ol className="text-xs text-slate-600 space-y-1.5 list-decimal pl-4">
                    <li>Abra o link do aplicativo no <strong>Chrome</strong>.</li>
                    <li>Toque no menu de <strong>3 pontinhos</strong> no canto superior direito.</li>
                    <li>Selecione <strong>"Adicionar à tela inicial"</strong> ou <strong>"Instalar aplicativo"</strong>.</li>
                    <li>Pronto! Ele abre como um aplicativo nativo em tela cheia com ícone próprio.</li>
                  </ol>
                </div>

                {/* iPhone Safari */}
                <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
                  <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                    <span className="text-base">🍎</span>
                    <span>No iPhone (Safari)</span>
                  </div>
                  <ol className="text-xs text-slate-600 space-y-1.5 list-decimal pl-4">
                    <li>Abra o link do aplicativo no <strong>Safari</strong>.</li>
                    <li>Toque no botão <strong>Compartilhar</strong> (ícone com quadrado e seta para cima).</li>
                    <li>Role para baixo e toque em <strong>"Adicionar à Tela de Início"</strong>.</li>
                    <li>Toque em "Adicionar" no canto superior. O app aparecerá na tela do seu iPhone.</li>
                  </ol>
                </div>
              </div>

              <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  📶 Dica para quem roda o Python no PC e quer abrir no celular pelo Wi-Fi local:
                </p>
                <p className="leading-relaxed">
                  No terminal do seu PC, execute:{" "}
                  <code className="bg-white/80 px-1.5 py-0.5 rounded font-mono font-bold text-amber-800">
                    streamlit run app.py --server.address 0.0.0.0 --server.port 8501
                  </code>
                  . Depois, no celular conectado no mesmo Wi-Fi, acesse:{" "}
                  <code className="bg-white/80 px-1.5 py-0.5 rounded font-mono font-bold text-amber-800">
                    http://[IP_DO_SEU_COMPUTADOR]:8501
                  </code>
                  .
                </p>
              </div>
            </div>
          )}

          {/* TAB 3: NO COMPUTADOR */}
          {activeSubTab === "computador" && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Laptop className="w-4 h-4 text-indigo-600" />
                  Opção 1: Direto no Navegador (Web Cloud)
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Você pode abrir este sistema em qualquer navegador (Chrome, Edge, Firefox, Brave). Se quiser visualização em tela inteira sem abas, aperte <kbd className="px-1.5 py-0.5 bg-slate-200 text-slate-800 rounded text-[11px] font-mono">F11</kbd> ou instale como atalho de aplicativo no Chrome (<em>Menu &gt; Salvar e compartilhar &gt; Criar atalho</em>).
                </p>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span className="text-base">🐍</span>
                  Opção 2: Rodando localmente com Python (100% offline & SQLite)
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Se você quiser rodar o sistema no seu próprio computador sem depender de nuvem, baixe os arquivos da aba <strong>"🐍 Python (app.py)"</strong> e execute:
                </p>
                <div className="bg-slate-900 text-slate-200 p-3 rounded-xl font-mono text-xs space-y-1 overflow-x-auto">
                  <p className="text-emerald-400"># 1. Instale as dependências</p>
                  <p>pip install streamlit google-genai</p>
                  <p className="text-emerald-400 mt-2"># 2. Inicie o aplicativo com banco de dados SQLite local</p>
                  <p>streamlit run app.py</p>
                </div>
                <p className="text-xs text-slate-500">
                  O navegador abrirá automaticamente em <code className="text-indigo-600 font-bold">http://localhost:8501</code> e salvará tudo no arquivo <code className="text-slate-800 font-mono">rotina_pro.db</code>.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Rotina PRO • Armazenamento seguro e flexível
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold cursor-pointer transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
