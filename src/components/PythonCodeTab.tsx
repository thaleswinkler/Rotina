import React, { useState, useEffect } from "react";
import { Terminal, Download, Copy, Check, FileCode, Play, Sparkles } from "lucide-react";

export const PythonCodeTab: React.FC = () => {
  const [copied, setCopied] = useState(false);
  const [appPyContent, setAppPyContent] = useState<string>("");
  const [reqContent, setReqContent] = useState<string>("");

  useEffect(() => {
    fetch("/api/download/app-py")
      .then((res) => res.json())
      .then((data) => setAppPyContent(data.content || ""))
      .catch((err) => console.error(err));

    fetch("/api/download/requirements")
      .then((res) => res.json())
      .then((data) => setReqContent(data.content || ""))
      .catch((err) => console.error(err));
  }, []);

  const handleCopy = () => {
    if (!appPyContent) return;
    navigator.clipboard.writeText(appPyContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownloadAppPy = () => {
    const blob = new Blob([appPyContent], { type: "text/x-python" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "app.py";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadReq = () => {
    const blob = new Blob([reqContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "requirements.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Overview Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl">🐍</span>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                Código Completo em Python (Streamlit + SQLite + Gemini)
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-500">
              Arquivo único <code className="font-mono bg-slate-100 px-1 py-0.5 rounded text-indigo-700">app.py</code> pronto para execução local imediata com todas as especificações atendidas.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span className="text-emerald-700">Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-slate-500" />
                  <span>Copiar app.py</span>
                </>
              )}
            </button>

            <button
              onClick={handleDownloadAppPy}
              className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <Download className="w-4 h-4" />
              <span>Baixar app.py</span>
            </button>
          </div>
        </div>

        {/* Guia Rápido de Instalação e Execução */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Terminal className="w-4 h-4 text-indigo-600" />
                1. Dependências (pip)
              </span>
              <button
                onClick={handleDownloadReq}
                className="text-[11px] text-indigo-600 hover:underline flex items-center gap-1 font-medium"
              >
                <Download className="w-3 h-3" />
                requirements.txt
              </button>
            </div>
            <pre className="bg-slate-900 text-slate-200 p-3 rounded-lg text-xs font-mono overflow-x-auto">
{`pip install streamlit audio-recorder-streamlit google-generativeai`}
            </pre>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Play className="w-4 h-4 text-emerald-600" />
                2. Como Executar
              </span>
            </div>
            <pre className="bg-slate-900 text-emerald-400 p-3 rounded-lg text-xs font-mono overflow-x-auto">
{`# Linux / Mac / Windows:
export GEMINI_API_KEY="sua_chave_aqui"
streamlit run app.py`}
            </pre>
          </div>
        </div>
      </div>

      {/* Code viewer */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-lg">
        <div className="bg-slate-800/90 px-4 py-3 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-rose-500/80"></div>
              <div className="w-3 h-3 rounded-full bg-amber-500/80"></div>
              <div className="w-3 h-3 rounded-full bg-emerald-500/80"></div>
            </div>
            <span className="text-xs font-mono text-slate-300 font-semibold ml-2">
              app.py (Código Python Streamlit)
            </span>
          </div>

          <button
            onClick={handleCopy}
            className="text-xs text-slate-400 hover:text-slate-100 flex items-center gap-1 font-mono transition-colors"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>{copied ? "Copiado!" : "Copiar"}</span>
          </button>
        </div>

        <div className="p-4 overflow-x-auto max-h-[600px] text-xs font-mono leading-relaxed text-slate-200">
          <pre>{appPyContent || "Carregando código..."}</pre>
        </div>
      </div>
    </div>
  );
};
