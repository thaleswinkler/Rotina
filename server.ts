import express from "express";
import path from "path";
import fs from "fs";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Increase payload limit for base64 audio uploads
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// ---------------------------------------------------------------------------
// Database persistence (JSON store aligned with SQLite schema)
// ---------------------------------------------------------------------------
const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "rotina_pro_db.json");

interface Tarefa {
  id: number;
  titulo: string;
  descricao: string;
  categoria: string;
  prioridade: "Alta" | "Média" | "Baixa";
  data_vencimento: string; // YYYY-MM-DD
  status: "Pendente" | "Concluída";
  criado_em: string;
}

interface PassoProjeto {
  id: number;
  projeto_id: number;
  titulo: string;
  concluido: boolean;
  ordem: number;
  data_limite?: string;
}

interface Projeto {
  id: number;
  titulo: string;
  descricao: string;
  categoria: string;
  data_limite: string;
  status: "Em Andamento" | "Concluído" | "Pausado";
  criado_em: string;
  passos: PassoProjeto[];
}

interface DBStore {
  nextId: number;
  nextPassoId: number;
  categorias: string[];
  tarefas: Tarefa[];
  projetos: Projeto[];
}

function getTodayString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getNextWeekString(): string {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getNextMonthString(): string {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatProject(p: Projeto) {
  const passos = p.passos || [];
  const total = passos.length;
  const concluidos = passos.filter((passo) => passo.concluido).length;
  const progresso = total > 0 ? Math.round((concluidos / total) * 100) : p.status === "Concluído" ? 100 : 0;
  return {
    ...p,
    passos,
    total_passos: total,
    passos_concluidos: concluidos,
    progresso_pct: progresso,
  };
}

function loadDB(): DBStore {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, "utf-8");
      const parsed = JSON.parse(data);
      if (!parsed.projetos) parsed.projetos = [];
      if (!parsed.nextPassoId) parsed.nextPassoId = 100;
      return parsed;
    }
  } catch (err) {
    console.error("Erro ao ler banco local, criando padrão:", err);
  }

  const initialDB: DBStore = {
    nextId: 4,
    nextPassoId: 10,
    categorias: ["Trabalho", "Pessoal", "Estudos", "Saúde", "Finanças", "Projetos"],
    tarefas: [
      {
        id: 1,
        titulo: "Revisar apresentação de metas trimestrais",
        descricao: "Alinhar KPIs e métricas com os líderes de equipe antes da reunião geral.",
        categoria: "Trabalho",
        prioridade: "Alta",
        data_vencimento: getTodayString(),
        status: "Pendente",
        criado_em: new Date().toISOString(),
      },
      {
        id: 2,
        titulo: "Corrida matinal de 5km",
        descricao: "Treino cardiovascular leve na pista do parque.",
        categoria: "Saúde",
        prioridade: "Média",
        data_vencimento: getTodayString(),
        status: "Concluída",
        criado_em: new Date(Date.now() - 3600000).toISOString(),
      },
      {
        id: 3,
        titulo: "Estudar módulo de Inteligência Artificial e Gemini",
        descricao: "Assistir às aulas de Function Calling e áudio multimodal com Python.",
        categoria: "Estudos",
        prioridade: "Alta",
        data_vencimento: getNextWeekString(),
        status: "Pendente",
        criado_em: new Date().toISOString(),
      },
    ],
    projetos: [
      {
        id: 1,
        titulo: "Lançamento da Nova Plataforma Web",
        descricao: "Reformulação completa do produto digital com integração multimodal e design responsivo.",
        categoria: "Trabalho",
        data_limite: getNextMonthString(),
        status: "Em Andamento",
        criado_em: new Date().toISOString(),
        passos: [
          { id: 1, projeto_id: 1, titulo: "Mapear requisitos de produto e arquitetura", concluido: true, ordem: 1 },
          { id: 2, projeto_id: 1, titulo: "Criar protótipos de alta fidelidade e design system", concluido: true, ordem: 2 },
          { id: 3, projeto_id: 1, titulo: "Desenvolver endpoints da API e integração Gemini", concluido: false, ordem: 3 },
          { id: 4, projeto_id: 1, titulo: "Executar testes de usabilidade com usuários beta", concluido: false, ordem: 4 },
          { id: 5, projeto_id: 1, titulo: "Deploy em produção e validação final", concluido: false, ordem: 5 },
        ],
      },
      {
        id: 2,
        titulo: "Plano de Saúde e Condicionamento Físico",
        descricao: "Rotina de hábitos saudáveis, reeducação alimentar e preparação para meia maratona.",
        categoria: "Saúde",
        data_limite: getNextWeekString(),
        status: "Em Andamento",
        criado_em: new Date().toISOString(),
        passos: [
          { id: 6, projeto_id: 2, titulo: "Consulta com nutricionista e avaliação de bioimpedância", concluido: true, ordem: 1 },
          { id: 7, projeto_id: 2, titulo: "Montar planilha de treinos aeróbicos semanais", concluido: true, ordem: 2 },
          { id: 8, projeto_id: 2, titulo: "Comprar suplementação recomendada e tênis de rodagem", concluido: true, ordem: 3 },
          { id: 9, projeto_id: 2, titulo: "Completar treino longo de 15km sem interrupções", concluido: false, ordem: 4 },
        ],
      },
    ],
  };

  saveDB(initialDB);
  return initialDB;
}

function saveDB(store: DBStore) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(store, null, 2), "utf-8");
  } catch (err) {
    console.error("Erro ao gravar banco de dados local:", err);
  }
}

// ---------------------------------------------------------------------------
// Gemini AI Setup
// ---------------------------------------------------------------------------
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// ---------------------------------------------------------------------------
// API Routes
// ---------------------------------------------------------------------------

// Check status & API key configuration
app.get("/api/status", (req, res) => {
  const hasGeminiKey = Boolean(process.env.GEMINI_API_KEY);
  res.json({
    status: "ok",
    hasGeminiKey,
    time: new Date().toISOString(),
  });
});

// List all tasks
app.get("/api/tasks", (req, res) => {
  const db = loadDB();
  res.json(db.tarefas);
});

// Create task
app.post("/api/tasks", (req, res) => {
  const { titulo, descricao, categoria, prioridade, data_vencimento } = req.body;
  if (!titulo || !titulo.trim()) {
    return res.status(400).json({ error: "O título da tarefa é obrigatório." });
  }

  const db = loadDB();
  const validPriorities: ("Alta" | "Média" | "Baixa")[] = ["Alta", "Média", "Baixa"];
  const finalPriority = validPriorities.includes(prioridade) ? prioridade : "Média";

  const novaTarefa: Tarefa = {
    id: db.nextId++,
    titulo: titulo.trim(),
    descricao: (descricao || "").trim(),
    categoria: categoria || db.categorias[0] || "Pessoal",
    prioridade: finalPriority,
    data_vencimento: data_vencimento || getTodayString(),
    status: "Pendente",
    criado_em: new Date().toISOString(),
  };

  db.tarefas.unshift(novaTarefa);
  saveDB(db);

  res.status(201).json(novaTarefa);
});

// Update task (toggle status or edit)
app.put("/api/tasks/:id", (req, res) => {
  const taskId = parseInt(req.params.id, 10);
  const db = loadDB();
  const index = db.tarefas.findIndex((t) => t.id === taskId);

  if (index === -1) {
    return res.status(404).json({ error: "Tarefa não encontrada." });
  }

  const existing = db.tarefas[index];
  const { titulo, descricao, categoria, prioridade, data_vencimento, status } = req.body;

  if (status !== undefined) {
    existing.status = status === "Concluída" ? "Concluída" : "Pendente";
  }
  if (titulo !== undefined) existing.titulo = titulo.trim();
  if (descricao !== undefined) existing.descricao = descricao.trim();
  if (categoria !== undefined) existing.categoria = categoria.trim();
  if (prioridade !== undefined) existing.prioridade = prioridade;
  if (data_vencimento !== undefined) existing.data_vencimento = data_vencimento;

  db.tarefas[index] = existing;
  saveDB(db);

  res.json(existing);
});

// Delete task
app.delete("/api/tasks/:id", (req, res) => {
  const taskId = parseInt(req.params.id, 10);
  const db = loadDB();
  const initialLen = db.tarefas.length;
  db.tarefas = db.tarefas.filter((t) => t.id !== taskId);

  if (db.tarefas.length === initialLen) {
    return res.status(404).json({ error: "Tarefa não encontrada." });
  }

  saveDB(db);
  res.json({ success: true, id: taskId });
});

// List categories
app.get("/api/categories", (req, res) => {
  const db = loadDB();
  res.json(db.categorias);
});

// Add category
app.post("/api/categories", (req, res) => {
  const { nome } = req.body;
  if (!nome || !nome.trim()) {
    return res.status(400).json({ error: "O nome da categoria é obrigatório." });
  }

  const db = loadDB();
  const nomeLimpo = nome.trim();
  if (!db.categorias.includes(nomeLimpo)) {
    db.categorias.push(nomeLimpo);
    saveDB(db);
  }

  res.json(db.categorias);
});

// ---------------------------------------------------------------------------
// Project Routes (Projetos & Passos)
// ---------------------------------------------------------------------------

// List projects
app.get("/api/projects", (req, res) => {
  const db = loadDB();
  const formatted = (db.projetos || []).map(formatProject);
  res.json(formatted);
});

// Create project
app.post("/api/projects", (req, res) => {
  const { titulo, descricao, categoria, data_limite, passos } = req.body;
  if (!titulo || !titulo.trim()) {
    return res.status(400).json({ error: "O título do projeto é obrigatório." });
  }

  const db = loadDB();
  const projectId = db.nextId++;

  const passosCriados: PassoProjeto[] = [];
  if (Array.isArray(passos)) {
    passos.forEach((pText: string | { titulo: string; data_limite?: string; concluido?: boolean }, idx: number) => {
      const texto = typeof pText === "string" ? pText.trim() : (pText?.titulo || "").trim();
      const prazoEtapa = typeof pText === "object" && pText?.data_limite ? pText.data_limite : "";
      if (texto) {
        passosCriados.push({
          id: db.nextPassoId++,
          projeto_id: projectId,
          titulo: texto,
          concluido: typeof pText === "object" ? Boolean(pText.concluido) : false,
          ordem: idx + 1,
          data_limite: prazoEtapa,
        });
      }
    });
  }

  const novoProjeto: Projeto = {
    id: projectId,
    titulo: titulo.trim(),
    descricao: (descricao || "").trim(),
    categoria: categoria || db.categorias[0] || "Trabalho",
    data_limite: data_limite || getNextMonthString(),
    status: "Em Andamento",
    criado_em: new Date().toISOString(),
    passos: passosCriados,
  };

  if (!db.projetos) db.projetos = [];
  db.projetos.unshift(novoProjeto);
  saveDB(db);

  res.status(201).json(formatProject(novoProjeto));
});

// Update project
app.put("/api/projects/:id", (req, res) => {
  const projectId = parseInt(req.params.id, 10);
  const db = loadDB();
  const index = (db.projetos || []).findIndex((p) => p.id === projectId);

  if (index === -1) {
    return res.status(404).json({ error: "Projeto não encontrado." });
  }

  const existing = db.projetos[index];
  const { titulo, descricao, categoria, data_limite, status } = req.body;

  if (titulo !== undefined) existing.titulo = titulo.trim();
  if (descricao !== undefined) existing.descricao = descricao.trim();
  if (categoria !== undefined) existing.categoria = categoria.trim();
  if (data_limite !== undefined) existing.data_limite = data_limite;
  if (status !== undefined) existing.status = status;

  db.projetos[index] = existing;
  saveDB(db);

  res.json(formatProject(existing));
});

// Delete project
app.delete("/api/projects/:id", (req, res) => {
  const projectId = parseInt(req.params.id, 10);
  const db = loadDB();
  const initialLen = (db.projetos || []).length;
  db.projetos = (db.projetos || []).filter((p) => p.id !== projectId);

  if (db.projetos.length === initialLen) {
    return res.status(404).json({ error: "Projeto não encontrado." });
  }

  saveDB(db);
  res.json({ success: true, id: projectId });
});

// Add step to project
app.post("/api/projects/:id/passos", (req, res) => {
  const projectId = parseInt(req.params.id, 10);
  const { titulo, data_limite } = req.body;

  if (!titulo || !titulo.trim()) {
    return res.status(400).json({ error: "O título do passo é obrigatório." });
  }

  const db = loadDB();
  const project = (db.projetos || []).find((p) => p.id === projectId);

  if (!project) {
    return res.status(404).json({ error: "Projeto não encontrado." });
  }

  if (!project.passos) project.passos = [];

  const novoPasso: PassoProjeto = {
    id: db.nextPassoId++,
    projeto_id: projectId,
    titulo: titulo.trim(),
    concluido: false,
    ordem: project.passos.length + 1,
    data_limite: data_limite || "",
  };

  project.passos.push(novoPasso);
  saveDB(db);

  res.status(201).json(formatProject(project));
});

// Toggle or update step
app.put("/api/projects/:id/passos/:passoId", (req, res) => {
  const projectId = parseInt(req.params.id, 10);
  const passoId = parseInt(req.params.passoId, 10);
  const { concluido, titulo, data_limite } = req.body;

  const db = loadDB();
  const project = (db.projetos || []).find((p) => p.id === projectId);

  if (!project) {
    return res.status(404).json({ error: "Projeto não encontrado." });
  }

  const passo = (project.passos || []).find((p) => p.id === passoId);
  if (!passo) {
    return res.status(404).json({ error: "Passo não encontrado." });
  }

  if (concluido !== undefined) passo.concluido = Boolean(concluido);
  if (titulo !== undefined) passo.titulo = titulo.trim();
  if (data_limite !== undefined) passo.data_limite = data_limite;

  // Check if all steps are completed
  const allDone = project.passos.length > 0 && project.passos.every((p) => p.concluido);
  if (allDone && project.status === "Em Andamento") {
    project.status = "Concluído";
  } else if (!allDone && project.status === "Concluído") {
    project.status = "Em Andamento";
  }

  saveDB(db);
  res.json(formatProject(project));
});

// Delete step
app.delete("/api/projects/:id/passos/:passoId", (req, res) => {
  const projectId = parseInt(req.params.id, 10);
  const passoId = parseInt(req.params.passoId, 10);

  const db = loadDB();
  const project = (db.projetos || []).find((p) => p.id === projectId);

  if (!project) {
    return res.status(404).json({ error: "Projeto não encontrado." });
  }

  project.passos = (project.passos || []).filter((p) => p.id !== passoId);
  saveDB(db);

  res.json(formatProject(project));
});

// AI Step Breakdown Generator
app.post("/api/projects/ai-suggest-steps", async (req, res) => {
  try {
    const { titulo, descricao } = req.body;
    if (!titulo || !titulo.trim()) {
      return res.status(400).json({ error: "Informe o título do projeto para gerar os passos." });
    }

    const ai = getGeminiClient();
    if (!ai) {
      return res.status(503).json({ error: "Gemini API não configurada." });
    }

    const prompt = `Você é um especialista em gestão de projetos e produtividade ágil.
Dado o projeto:
Título: "${titulo}"
Descrição: "${descricao || 'Sem descrição adicional'}"

Gere uma lista de 4 a 6 passos ou etapas acionáveis, sequenciais e claros que faltam para executar este projeto com sucesso.
Retorne ESTRITAMENTE um array JSON de strings com os títulos das etapas.
Exemplo: ["Definir escopo detalhado", "Criar protótipo inicial", "Validar com usuários", "Lançar versão final"]`;

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
        },
      },
    });

    const parsed = JSON.parse(response.text || "[]");
    res.json({ passos: parsed });
  } catch (error: any) {
    console.error("Erro ao sugerir passos:", error);
    res.status(500).json({ error: error?.message || "Erro ao gerar passos com IA." });
  }
});

// Upcoming items grouped by category
app.get("/api/summary/upcoming", (req, res) => {
  const db = loadDB();
  const categorias = db.categorias || [];

  const grouped = categorias.map((cat) => {
    const tarefasPendentes = (db.tarefas || []).filter(
      (t) => t.categoria === cat && t.status === "Pendente"
    );
    const projetosEmAndamento = (db.projetos || [])
      .filter((p) => p.categoria === cat && p.status !== "Concluído")
      .map(formatProject);

    return {
      categoria: cat,
      tarefas: tarefasPendentes,
      projetos: projetosEmAndamento,
      totalPendencias: tarefasPendentes.length + projetosEmAndamento.length,
    };
  });

  res.json(grouped);
});

// Process audio with Gemini AI
app.post("/api/tasks/ai-audio", async (req, res) => {
  try {
    const { audioBase64, mimeType } = req.body;

    if (!audioBase64) {
      return res.status(400).json({ error: "Nenhum dado de áudio fornecido." });
    }

    const ai = getGeminiClient();
    if (!ai) {
      return res.status(503).json({
        error: "Chave GEMINI_API_KEY não configurada no servidor. Configure-a no painel de Segredos.",
      });
    }

    const db = loadDB();
    const categoriasValidas = db.categorias;
    const hoje = getTodayString();

    const cleanMime = mimeType || "audio/wav";
    // Strip header if data URI provided (e.g. data:audio/webm;base64,...)
    const base64Data = audioBase64.includes(";base64,")
      ? audioBase64.split(";base64,")[1]
      : audioBase64;

    const prompt = `
Você é o assistente inteligente do aplicativo 'Rotina PRO'.
Sua função é escutar a gravação de áudio do usuário e extrair exatamente UMA tarefa a ser adicionada.

Data atual de referência: ${hoje}

INSTRUÇÕES OBRIGATÓRIAS:
1. Retorne ESTRITAMENTE um objeto JSON válido.
2. Formato:
{
  "titulo": "Título curto e claro da tarefa",
  "descricao": "Detalhes ou contexto mencionado no áudio",
  "categoria": "Uma das categorias disponíveis",
  "prioridade": "Alta" | "Média" | "Baixa",
  "data_vencimento": "YYYY-MM-DD"
}

REGRAS:
- Categorias disponíveis no sistema: ${categoriasValidas.join(", ")}. Se o áudio não indicar claramente, escolha a mais adequada ou '${categoriasValidas[0] || "Pessoal"}'.
- Prioridades aceitas: 'Alta', 'Média' ou 'Baixa'. (Se for urgente, 'Alta'; rotina normal, 'Média'; tarefas secundárias, 'Baixa').
- data_vencimento: Se a pessoa disser 'hoje', use ${hoje}. Se disser 'amanhã', calcule a data de amanhã. Se não falar data, use ${hoje}. Formato estrito: YYYY-MM-DD.
`;

    const audioPart = {
      inlineData: {
        mimeType: cleanMime,
        data: base64Data,
      },
    };

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: [
        {
          parts: [audioPart, { text: prompt }],
        },
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            titulo: { type: Type.STRING },
            descricao: { type: Type.STRING },
            categoria: { type: Type.STRING },
            prioridade: { type: Type.STRING },
            data_vencimento: { type: Type.STRING },
          },
          required: ["titulo", "categoria", "prioridade", "data_vencimento"],
        },
      },
    });

    const responseText = response.text || "{}";
    let parsed: any = {};
    try {
      parsed = JSON.parse(responseText);
    } catch {
      // Clean possible markdown fences
      const clean = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
      parsed = JSON.parse(clean);
    }

    // Normalization & fallback
    const validPriorities: ("Alta" | "Média" | "Baixa")[] = ["Alta", "Média", "Baixa"];
    let prioridade: "Alta" | "Média" | "Baixa" = "Média";
    if (validPriorities.includes(parsed.prioridade)) {
      prioridade = parsed.prioridade;
    }

    let categoria = parsed.categoria;
    if (!categoriasValidas.includes(categoria)) {
      categoria = categoriasValidas[0] || "Pessoal";
    }

    const dataVenc = parsed.data_vencimento && /^\d{4}-\d{2}-\d{2}$/.test(parsed.data_vencimento)
      ? parsed.data_vencimento
      : hoje;

    const novaTarefa: Tarefa = {
      id: db.nextId++,
      titulo: parsed.titulo || "Tarefa gravada por voz",
      descricao: parsed.descricao || "",
      categoria,
      prioridade,
      data_vencimento: dataVenc,
      status: "Pendente",
      criado_em: new Date().toISOString(),
    };

    db.tarefas.unshift(novaTarefa);
    saveDB(db);

    return res.status(201).json({
      success: true,
      tarefa: novaTarefa,
      rawExtracted: parsed,
    });
  } catch (error: any) {
    console.error("Erro no processamento de áudio com Gemini:", error);
    return res.status(500).json({
      error: error?.message || "Erro desconhecido ao processar áudio com Gemini.",
    });
  }
});

// ---------------------------------------------------------------------------
// Database Backup & Restore Endpoints
// ---------------------------------------------------------------------------
app.get("/api/database/backup", (req, res) => {
  try {
    const db = loadDB();
    const fileName = `rotina_pro_backup_${new Date().toISOString().slice(0, 10)}.json`;
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.setHeader("Content-Type", "application/json");
    res.send(JSON.stringify(db, null, 2));
  } catch (error: any) {
    res.status(500).json({ error: "Erro ao gerar backup do banco de dados." });
  }
});

app.post("/api/database/restore", (req, res) => {
  try {
    const uploadedData = req.body;
    if (!uploadedData || typeof uploadedData !== "object") {
      return res.status(400).json({ error: "Arquivo de backup inválido." });
    }

    const currentDB = loadDB();
    const restoredDB: DBStore = {
      nextId: Math.max(uploadedData.nextId || 1, currentDB.nextId || 1),
      nextPassoId: Math.max(uploadedData.nextPassoId || 1, currentDB.nextPassoId || 1),
      categorias: Array.isArray(uploadedData.categorias) && uploadedData.categorias.length > 0
        ? uploadedData.categorias
        : currentDB.categorias,
      tarefas: Array.isArray(uploadedData.tarefas) ? uploadedData.tarefas : currentDB.tarefas,
      projetos: Array.isArray(uploadedData.projetos) ? uploadedData.projetos : currentDB.projetos,
    };

    saveDB(restoredDB);
    return res.json({
      success: true,
      message: "Banco de dados restaurado com sucesso!",
      totalTarefas: restoredDB.tarefas.length,
      totalProjetos: restoredDB.projetos.length,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || "Falha ao restaurar banco de dados." });
  }
});

// Provide source code for app.py and requirements.txt
app.get("/api/download/app-py", (req, res) => {
  const appPyPath = path.join(process.cwd(), "app.py");
  if (fs.existsSync(appPyPath)) {
    const content = fs.readFileSync(appPyPath, "utf-8");
    res.json({ content, filename: "app.py" });
  } else {
    res.status(404).json({ error: "app.py não encontrado" });
  }
});

app.get("/api/download/requirements", (req, res) => {
  const reqPath = path.join(process.cwd(), "requirements.txt");
  if (fs.existsSync(reqPath)) {
    const content = fs.readFileSync(reqPath, "utf-8");
    res.json({ content, filename: "requirements.txt" });
  } else {
    res.status(404).json({ error: "requirements.txt não encontrado" });
  }
});

// ---------------------------------------------------------------------------
// Vite Middleware setup for development & SPA static serving for production
// ---------------------------------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Rotina PRO server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
