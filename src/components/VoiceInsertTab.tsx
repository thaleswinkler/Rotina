import React, { useState, useRef, useEffect } from "react";
import {
  Mic,
  Square,
  UploadCloud,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCcw,
  Volume2,
  FileAudio,
  ArrowRight,
} from "lucide-react";
import { Tarefa } from "../types";

interface VoiceInsertTabProps {
  hasGeminiKey: boolean;
  categorias: string[];
  onTaskCreated: (tarefa: Tarefa) => void;
  onNavigateToTasks: () => void;
}

export const VoiceInsertTab: React.FC<VoiceInsertTabProps> = ({
  hasGeminiKey,
  categorias,
  onTaskCreated,
  onNavigateToTasks,
}) => {
  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordDuration, setRecordDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioMime, setAudioMime] = useState<string>("audio/webm");

  // File upload state
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  // Processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [resultadoExtracao, setResultadoExtracao] = useState<any | null>(null);
  const [tarefaCriada, setTarefaCriada] = useState<Tarefa | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Clean up object URLs
  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [audioUrl]);

  // Start recording
  const startRecording = async () => {
    try {
      setErro(null);
      setResultadoExtracao(null);
      setTarefaCriada(null);
      setUploadedFile(null);

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Determine supported mime type
      let mimeType = "audio/webm";
      if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
        mimeType = "audio/webm;codecs=opus";
      } else if (MediaRecorder.isTypeSupported("audio/mp4")) {
        mimeType = "audio/mp4";
      }

      setAudioMime(mimeType);
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);

        // Stop all tracks on the stream to release the mic
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordDuration(0);

      timerRef.current = window.setInterval(() => {
        setRecordDuration((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error("Erro ao acessar microfone:", err);
      setErro(
        "Não foi possível acessar o microfone. Verifique as permissões do seu navegador."
      );
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  // Reset audio
  const resetAudio = () => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioBlob(null);
    setAudioUrl(null);
    setUploadedFile(null);
    setResultadoExtracao(null);
    setTarefaCriada(null);
    setErro(null);
    setRecordDuration(0);
  };

  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    resetAudio();
    setUploadedFile(file);
    setAudioBlob(file);
    setAudioMime(file.type || "audio/wav");
    const url = URL.createObjectURL(file);
    setAudioUrl(url);
  };

  // Convert blob to base64
  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  // Send to Gemini backend
  const handleProcessarAudio = async () => {
    if (!audioBlob) {
      setErro("Nenhum áudio disponível para processar.");
      return;
    }

    setIsProcessing(true);
    setErro(null);
    setResultadoExtracao(null);
    setTarefaCriada(null);

    try {
      const base64Data = await blobToBase64(audioBlob);

      const response = await fetch("/api/tasks/ai-audio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audioBase64: base64Data,
          mimeType: audioMime,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Falha ao processar o áudio com o Gemini.");
      }

      setResultadoExtracao(data.rawExtracted);
      setTarefaCriada(data.tarefa);
      onTaskCreated(data.tarefa);
    } catch (err: any) {
      setErro(err.message || "Erro inesperado ao conectar com o serviço de IA.");
    } finally {
      setIsProcessing(false);
    }
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Friendly banner if key is not detected */}
      {!hasGeminiKey && (
        <div className="p-4 rounded-2xl bg-amber-50/90 border border-amber-200 text-amber-900 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs sm:text-sm">
            <p className="font-semibold mb-1">
              ⚠️ Chave da API Gemini não configurada no ambiente
            </p>
            <p className="text-amber-800 leading-relaxed">
              O aplicativo continuará funcionando perfeitamente para inserção manual e gerenciamento.
              Para habilitar o processamento de áudio com IA, certifique-se de configurar a variável{" "}
              <code className="bg-amber-100 px-1 py-0.5 rounded text-amber-950 font-mono">
                GEMINI_API_KEY
              </code>{" "}
              no painel de <strong>Settings &gt; Secrets</strong> do AI Studio.
            </p>
          </div>
        </div>
      )}

      {/* Main card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs">
        <div className="mb-6 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">🎙️</span>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">
              Criar Tarefa por Voz com Inteligência Artificial
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
            Fale naturalmente sua tarefa (exemplo:{" "}
            <em>
              "Preciso preparar a apresentação do projeto até amanhã de tarde com alta prioridade para o trabalho"
            </em>
            ). O <strong>Gemini AI</strong> identificará o título, descrição, categoria, prioridade e data de vencimento
            automaticamente!
          </p>
        </div>

        {/* Input Methods: Mic vs File */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
          {/* Opção A: Microfone */}
          <div className="rounded-2xl border border-slate-200 p-5 bg-slate-50/60 flex flex-col items-center text-center justify-between min-h-[220px]">
            <div>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100 mb-2">
                Opção A
              </span>
              <h3 className="font-semibold text-slate-900 text-sm mb-1">
                Gravar Microfone Direto
              </h3>
              <p className="text-xs text-slate-500">
                Grave um áudio de até 60 segundos com um toque.
              </p>
            </div>

            <div className="my-4 flex flex-col items-center gap-2">
              {isRecording ? (
                <button
                  type="button"
                  onClick={stopRecording}
                  className="w-16 h-16 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center shadow-lg shadow-rose-200 animate-pulse cursor-pointer transition-all"
                  title="Parar Gravação"
                >
                  <Square className="w-6 h-6 fill-current" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={startRecording}
                  className="w-16 h-16 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center shadow-lg shadow-indigo-200 cursor-pointer transition-all hover:scale-105"
                  title="Iniciar Gravação"
                >
                  <Mic className="w-7 h-7" />
                </button>
              )}

              <div className="text-xs font-semibold text-slate-700">
                {isRecording ? (
                  <span className="text-rose-600 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping"></span>
                    Gravando: {formatTimer(recordDuration)}
                  </span>
                ) : (
                  <span>Clique para Gravar</span>
                )}
              </div>
            </div>

            <div className="text-[11px] text-slate-400">
              Usa a API de Áudio do Navegador
            </div>
          </div>

          {/* Opção B: Upload de Arquivo */}
          <div className="rounded-2xl border border-slate-200 p-5 bg-slate-50/60 flex flex-col items-center text-center justify-between min-h-[220px]">
            <div>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-200 text-slate-700 mb-2">
                Opção B
              </span>
              <h3 className="font-semibold text-slate-900 text-sm mb-1">
                Enviar Arquivo de Áudio
              </h3>
              <p className="text-xs text-slate-500">
                Formatos suportados: .wav, .mp3, .m4a, .ogg, .webm
              </p>
            </div>

            <div className="my-4">
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*,.wav,.mp3,.m4a,.ogg,.webm"
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2.5 rounded-xl border border-slate-300 hover:border-indigo-400 bg-white hover:bg-indigo-50/50 text-slate-700 hover:text-indigo-600 text-xs font-semibold flex items-center gap-2 shadow-xs transition-all cursor-pointer"
              >
                <UploadCloud className="w-4 h-4 text-indigo-600" />
                <span>Escolher Arquivo do Dispositivo</span>
              </button>
            </div>

            <div className="text-[11px] text-slate-400">
              {uploadedFile ? `Arquivo: ${uploadedFile.name}` : "Grave no celular ou envie gravações externas"}
            </div>
          </div>
        </div>

        {/* Audio Player Preview */}
        {audioUrl && (
          <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100 flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
                <Volume2 className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-indigo-950">
                  {uploadedFile ? uploadedFile.name : "Áudio capturado pelo microfone"}
                </div>
                <div className="text-[11px] text-indigo-700">
                  Pronto para análise do Gemini
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              <audio controls src={audioUrl} className="h-9 max-w-full" />
              <button
                type="button"
                onClick={resetAudio}
                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                title="Descartar áudio"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Action Button */}
        {audioBlob && (
          <div className="pt-2">
            <button
              type="button"
              disabled={isProcessing}
              onClick={handleProcessarAudio}
              className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 disabled:opacity-60 text-white font-bold text-sm shadow-md shadow-indigo-100 flex items-center justify-center gap-2.5 transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>
                {isProcessing
                  ? "🤖 Ouvindo áudio e estruturando os dados da sua tarefa..."
                  : "🚀 Processar Áudio com Gemini AI"}
              </span>
            </button>
          </div>
        )}

        {/* Error message */}
        {erro && (
          <div className="mt-5 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Não foi possível processar o áudio:</p>
              <p className="text-rose-700 mt-0.5">{erro}</p>
            </div>
          </div>
        )}

        {/* Success Result */}
        {tarefaCriada && (
          <div className="mt-6 p-5 sm:p-6 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-emerald-900 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-emerald-950">
                    🎉 Tarefa criada automaticamente no SQLite com sucesso!
                  </h3>
                  <p className="text-xs text-emerald-700">
                    A IA transcreveu o áudio e identificou todas as propriedades.
                  </p>
                </div>
              </div>
              <button
                onClick={onNavigateToTasks}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
              >
                <span>Ver Tarefas</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Extracted preview card */}
            <div className="bg-white p-4 rounded-xl border border-emerald-200 shadow-xs space-y-2 text-slate-800">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                  Prioridade: {tarefaCriada.prioridade}
                </span>
                <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                  📂 {tarefaCriada.categoria}
                </span>
                <span className="text-xs text-slate-500">
                  📅 Vencimento: {tarefaCriada.data_vencimento}
                </span>
              </div>
              <h4 className="text-base font-bold text-slate-900">
                {tarefaCriada.titulo}
              </h4>
              {tarefaCriada.descricao && (
                <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  {tarefaCriada.descricao}
                </p>
              )}
            </div>

            {/* JSON Output Accordion as per prompt specification */}
            {resultadoExtracao && (
              <div>
                <span className="text-xs font-semibold text-emerald-900 block mb-1.5">
                  JSON retornado pelo Gemini AI:
                </span>
                <pre className="bg-slate-900 text-emerald-300 p-3.5 rounded-xl text-xs font-mono overflow-x-auto">
                  {JSON.stringify(resultadoExtracao, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
