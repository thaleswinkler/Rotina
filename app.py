"""
=============================================================================
ROTINA PRO - GESTÃO INTELIGENTE DE ROTINA, TAREFAS E PROJETOS
=============================================================================
Desenvolvido com Python, Streamlit, SQLite e Google Gemini AI.
Permite gestão de tarefas, projetos com múltiplos passos e porcentagem de
conclusão, visão 'Em Breve' dividida por categorias, além de inserção por voz.

Execução:
    pip install -r requirements.txt
    export GEMINI_API_KEY="sua_chave_aqui"  # ou configure em .streamlit/secrets.toml
    streamlit run app.py
=============================================================================
"""

import os
import json
import sqlite3
import datetime
from typing import List, Dict, Any, Optional
import streamlit as st
from audio_recorder_streamlit import audio_recorder
import google.generativeai as genai

# =============================================================================
# 1. CONFIGURAÇÕES DA PÁGINA
# =============================================================================
st.set_page_config(
    page_title="Rotina PRO | Gestão de Tarefas e Projetos",
    page_icon="⚡",
    layout="wide",
    initial_sidebar_state="expanded"
)

# =============================================================================
# 2. BANCO DE DADOS (SQLite)
# =============================================================================
DB_FILE = "rotina_pro.db"

def get_db_connection():
    """Cria e retorna uma conexão com o banco SQLite."""
    conn = sqlite3.connect(DB_FILE, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """Inicializa as tabelas de tarefas, categorias, projetos e passos."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Tabela principal de tarefas
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS tarefas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            titulo TEXT NOT NULL,
            descricao TEXT,
            categoria TEXT NOT NULL,
            prioridade TEXT NOT NULL,
            data_vencimento TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'Pendente',
            criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Tabela de categorias dinâmicas
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS categorias (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT UNIQUE NOT NULL
        )
    """)

    # Tabela de Projetos
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS projetos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            titulo TEXT NOT NULL,
            descricao TEXT,
            categoria TEXT NOT NULL,
            data_limite TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'Em Andamento',
            criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Tabela de Passos/Etapas dos Projetos
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS passos_projeto (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            projeto_id INTEGER NOT NULL,
            titulo TEXT NOT NULL,
            concluido INTEGER NOT NULL DEFAULT 0,
            ordem INTEGER NOT NULL DEFAULT 0,
            FOREIGN KEY (projeto_id) REFERENCES projetos(id) ON DELETE CASCADE
        )
    """)

    # Categorias padrão iniciais
    categorias_iniciais = ["Trabalho", "Pessoal", "Estudos", "Saúde", "Finanças", "Projetos"]
    for cat in categorias_iniciais:
        cursor.execute("INSERT OR IGNORE INTO categorias (nome) VALUES (?)", (cat,))

    # Seed inicial de projeto se vazio
    cursor.execute("SELECT COUNT(*) as qtd FROM projetos")
    if cursor.fetchone()["qtd"] == 0:
        hoje = datetime.date.today()
        prazo1 = (hoje + datetime.timedelta(days=30)).strftime("%Y-%m-%d")
        cursor.execute("""
            INSERT INTO projetos (titulo, descricao, categoria, data_limite, status)
            VALUES (?, ?, ?, ?, 'Em Andamento')
        """, ("Lançamento da Plataforma Web", "Reformulação digital com rotinas automatizadas", "Trabalho", prazo1))
        proj_id1 = cursor.lastrowid
        
        passos1 = [
            ("Mapear requisitos e regras de negócio", 1),
            ("Criar protótipos de alta fidelidade", 1),
            ("Desenvolver backend e integração de voz", 0),
            ("Homologar com usuários beta", 0),
            ("Deploy final e monitoramento", 0)
        ]
        for idx, (p_tit, p_conc) in enumerate(passos1):
            cursor.execute("""
                INSERT INTO passos_projeto (projeto_id, titulo, concluido, ordem)
                VALUES (?, ?, ?, ?)
            """, (proj_id1, p_tit, p_conc, idx + 1))

    conn.commit()
    conn.close()

# Executa inicialização do banco
init_db()

# =============================================================================
# 3. OPERAÇÕES DE DADOS (CRUD) - TAREFAS
# =============================================================================
def listar_tarefas(filtro_status: str = "Todos", filtro_categoria: str = "Todas", data_filtro: Optional[str] = None) -> List[sqlite3.Row]:
    """Recupera tarefas do banco com suporte a múltiplos filtros."""
    conn = get_db_connection()
    cursor = conn.cursor()
    query = "SELECT * FROM tarefas WHERE 1=1"
    params = []

    if filtro_status and filtro_status != "Todos":
        query += " AND status = ?"
        params.append(filtro_status)

    if filtro_categoria and filtro_categoria != "Todas":
        query += " AND categoria = ?"
        params.append(filtro_categoria)

    if data_filtro:
        query += " AND data_vencimento = ?"
        params.append(data_filtro)

    query += " ORDER BY CASE prioridade WHEN 'Alta' THEN 1 WHEN 'Média' THEN 2 WHEN 'Baixa' THEN 3 ELSE 4 END, data_vencimento ASC"
    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()
    return rows

def criar_tarefa(titulo: str, descricao: str, categoria: str, prioridade: str, data_vencimento: str) -> int:
    """Insere uma nova tarefa no banco de dados SQLite."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO tarefas (titulo, descricao, categoria, prioridade, data_vencimento, status)
        VALUES (?, ?, ?, ?, ?, 'Pendente')
    """, (titulo.strip(), (descricao or "").strip(), categoria, prioridade, data_vencimento))
    task_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return task_id

def alternar_status_tarefa(task_id: int, novo_status: str):
    """Alterna o status da tarefa entre 'Pendente' e 'Concluída'."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE tarefas SET status = ? WHERE id = ?", (novo_status, task_id))
    conn.commit()
    conn.close()

def excluir_tarefa(task_id: int):
    """Exclui permanentemente uma tarefa do banco de dados."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM tarefas WHERE id = ?", (task_id,))
    conn.commit()
    conn.close()

def obter_categorias() -> List[str]:
    """Retorna a lista de categorias cadastradas."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT nome FROM categorias ORDER BY nome ASC")
    rows = cursor.fetchall()
    conn.close()
    return [r["nome"] for r in rows]

def adicionar_categoria(nome_categoria: str):
    """Cria uma nova categoria personalizada."""
    if not nome_categoria or not nome_categoria.strip():
        return
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("INSERT OR IGNORE INTO categorias (nome) VALUES (?)", (nome_categoria.strip(),))
    conn.commit()
    conn.close()

# =============================================================================
# 4. OPERAÇÕES DE DADOS (CRUD) - PROJETOS E PASSOS
# =============================================================================
def listar_projetos(filtro_categoria: str = "Todas", filtro_status: str = "Todos") -> List[Dict[str, Any]]:
    """Lista todos os projetos enriquecidos com seus passos e porcentagem de conclusão."""
    conn = get_db_connection()
    cursor = conn.cursor()
    query = "SELECT * FROM projetos WHERE 1=1"
    params = []

    if filtro_categoria and filtro_categoria != "Todas":
        query += " AND categoria = ?"
        params.append(filtro_categoria)

    if filtro_status and filtro_status != "Todos":
        query += " AND status = ?"
        params.append(filtro_status)

    query += " ORDER BY data_limite ASC, id DESC"
    cursor.execute(query, params)
    projetos_rows = cursor.fetchall()

    lista_projetos = []
    for p in projetos_rows:
        proj_id = p["id"]
        cursor.execute("SELECT * FROM passos_projeto WHERE projeto_id = ? ORDER BY ordem ASC, id ASC", (proj_id,))
        passos_rows = cursor.fetchall()
        passos = [dict(r) for r in passos_rows]
        
        total_passos = len(passos)
        passos_concluidos = sum(1 for passo in passos if passo["concluido"])
        progresso = int((passos_concluidos / total_passos) * 100) if total_passos > 0 else (100 if p["status"] == "Concluído" else 0)

        proj_dict = dict(p)
        proj_dict["passos"] = passos
        proj_dict["total_passos"] = total_passos
        proj_dict["passos_concluidos"] = passos_concluidos
        proj_dict["progresso_pct"] = progresso
        lista_projetos.append(proj_dict)

    conn.close()
    return lista_projetos

def criar_projeto(titulo: str, descricao: str, categoria: str, data_limite: str, lista_passos: List[str]) -> int:
    """Cria um novo projeto com seus passos/etapas iniciais."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO projetos (titulo, descricao, categoria, data_limite, status)
        VALUES (?, ?, ?, ?, 'Em Andamento')
    """, (titulo.strip(), (descricao or "").strip(), categoria, data_limite))
    proj_id = cursor.lastrowid

    for idx, p_texto in enumerate(lista_passos):
        texto = p_texto.strip()
        if texto:
            cursor.execute("""
                INSERT INTO passos_projeto (projeto_id, titulo, concluido, ordem)
                VALUES (?, ?, 0, ?)
            """, (proj_id, texto, idx + 1))

    conn.commit()
    conn.close()
    return proj_id

def adicionar_passo_projeto(projeto_id: int, titulo_passo: str):
    """Adiciona uma nova etapa a um projeto existente."""
    if not titulo_passo.strip():
        return
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT MAX(ordem) as max_ordem FROM passos_projeto WHERE projeto_id = ?", (projeto_id,))
    res = cursor.fetchone()
    nova_ordem = (res["max_ordem"] or 0) + 1

    cursor.execute("""
        INSERT INTO passos_projeto (projeto_id, titulo, concluido, ordem)
        VALUES (?, ?, 0, ?)
    """, (projeto_id, titulo_passo.strip(), nova_ordem))
    conn.commit()
    conn.close()

def alternar_passo_projeto(passo_id: int, novo_concluido: bool, projeto_id: int):
    """Marca ou desmarca um passo de projeto e atualiza o status geral do projeto se necessário."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE passos_projeto SET concluido = ? WHERE id = ?", (1 if novo_concluido else 0, passo_id))
    
    # Avalia se todos os passos foram concluídos
    cursor.execute("SELECT concluido FROM passos_projeto WHERE projeto_id = ?", (projeto_id,))
    todos_passos = cursor.fetchall()
    if todos_passos and all(r["concluido"] == 1 for r in todos_passos):
        cursor.execute("UPDATE projetos SET status = 'Concluído' WHERE id = ?", (projeto_id,))
    else:
        cursor.execute("UPDATE projetos SET status = 'Em Andamento' WHERE id = ?", (projeto_id,))

    conn.commit()
    conn.close()

def excluir_passo_projeto(passo_id: int):
    """Remove uma etapa de um projeto."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM passos_projeto WHERE id = ?", (passo_id,))
    conn.commit()
    conn.close()

def excluir_projeto(projeto_id: int):
    """Exclui um projeto e todas as suas etapas."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM passos_projeto WHERE projeto_id = ?", (projeto_id,))
    cursor.execute("DELETE FROM projetos WHERE id = ?", (projeto_id,))
    conn.commit()
    conn.close()

# =============================================================================
# 5. INTEGRAÇÃO INTELIGENTE COM GEMINI (ÁUDIO E SUGESTÃO DE PASSOS)
# =============================================================================
def obter_chave_gemini() -> Optional[str]:
    """Busca a chave nos segredos do Streamlit ou variáveis de ambiente."""
    if hasattr(st, "secrets") and "GEMINI_API_KEY" in st.secrets:
        return st.secrets["GEMINI_API_KEY"]
    return os.environ.get("GEMINI_API_KEY")

def processar_audio_com_gemini(audio_bytes: bytes, mime_type: str = "audio/wav", categorias_validas: List[str] = None) -> Optional[Dict[str, Any]]:
    """Envia o áudio para o Gemini e extrai os campos estruturados."""
    api_key = obter_chave_gemini()
    if not api_key:
        st.error("⚠️ Chave de API do Gemini não encontrada! Configure GEMINI_API_KEY.")
        return None

    genai.configure(api_key=api_key)
    if not categorias_validas:
        categorias_validas = ["Trabalho", "Pessoal", "Estudos", "Saúde", "Finanças"]

    hoje = datetime.date.today().strftime("%Y-%m-%d")
    prompt = f"""
Você é o assistente inteligente do aplicativo 'Rotina PRO'.
Sua função é escutar a gravação de áudio do usuário e extrair exatamente UMA tarefa a ser adicionada.

Data atual de referência: {hoje}

Retorne ESTRITAMENTE um objeto JSON válido no formato:
{{
  "titulo": "Título curto e claro da tarefa",
  "descricao": "Detalhes ou contexto mencionado no áudio",
  "categoria": "Uma das categorias disponíveis ({', '.join(categorias_validas)})",
  "prioridade": "Alta | Média | Baixa",
  "data_vencimento": "YYYY-MM-DD"
}}
"""

    try:
        model = genai.GenerativeModel("gemini-1.5-flash")
        audio_part = {"mime_type": mime_type, "data": audio_bytes}

        response = model.generate_content(
            [audio_part, prompt],
            generation_config={"response_mime_type": "application/json"}
        )

        texto = response.text.strip()
        if texto.startswith("```"):
            linhas = texto.split("\n")
            if linhas[0].startswith("```"): linhas = linhas[1:]
            if linhas and linhas[-1].startswith("```"): linhas = linhas[:-1]
            texto = "\n".join(linhas).strip()

        dados = json.loads(texto)
        return {
            "titulo": dados.get("titulo", "Nova Tarefa"),
            "descricao": dados.get("descricao", ""),
            "categoria": dados.get("categoria", categorias_validas[0]),
            "prioridade": dados.get("prioridade", "Média"),
            "data_vencimento": dados.get("data_vencimento", hoje)
        }
    except Exception as e:
        st.error(f"Erro ao processar áudio: {str(e)}")
        return None

# =============================================================================
# 6. BARRA LATERAL (FILTROS E CATEGORIAS)
# =============================================================================
with st.sidebar:
    st.title("⚡ Rotina PRO")
    st.caption("Painel Diário: Tarefas, Projetos e Visão 'Em Breve'")
    st.markdown("---")

    st.subheader("🔍 Filtros Globais")
    filtro_status = st.radio("Status Tarefas:", ["Todos", "Pendente", "Concluída"], horizontal=True)

    categorias_disponiveis = obter_categorias()
    filtro_categoria = st.selectbox("Categoria:", ["Todas"] + categorias_disponiveis)

    usar_filtro_data = st.checkbox("Filtrar por Vencimento")
    filtro_data = None
    if usar_filtro_data:
        filtro_data = st.date_input("Data:", value=datetime.date.today()).strftime("%Y-%m-%d")

    st.markdown("---")
    st.subheader("🏷️ Gerenciar Categorias")
    with st.form("form_nova_categoria", clear_on_submit=True):
        nova_cat = st.text_input("Nova Categoria:")
        btn_cat = st.form_submit_button("Criar Categoria")
        if btn_cat and nova_cat:
            adicionar_categoria(nova_cat)
            st.success(f"Categoria '{nova_cat}' adicionada!")
            st.rerun()

# =============================================================================
# 7. MÉTRICAS DO CABEÇALHO
# =============================================================================
todas_tarefas = listar_tarefas()
total_tarefas = len(todas_tarefas)
total_concluidas = sum(1 for t in todas_tarefas if t["status"] == "Concluída")
total_pendentes = total_tarefas - total_concluidas
taxa_tarefas = round((total_concluidas / total_tarefas * 100), 1) if total_tarefas > 0 else 0.0

todos_projetos = listar_projetos()
projetos_ativos = sum(1 for p in todos_projetos if p["status"] != "Concluído")
media_progresso = round(sum(p["progresso_pct"] for p in todos_projetos) / len(todos_projetos), 1) if todos_projetos else 0.0

col1, col2, col3, col4 = st.columns(4)
col1.metric("📋 Tarefas Pendentes", f"{total_pendentes} / {total_tarefas}")
col2.metric("✅ Taxa Tarefas", f"{taxa_tarefas}%")
col3.metric("📁 Projetos Ativos", f"{projetos_ativos} projetos")
col4.metric("📊 Progresso Médio Projetos", f"{media_progresso}%")

st.markdown("---")

# =============================================================================
# 8. ABAS PRINCIPAIS DO SISTEMA
# =============================================================================
tab_tarefas, tab_projetos, tab_em_breve, tab_manual, tab_voz = st.tabs([
    "📑 Tarefas",
    "📁 Projetos & Etapas",
    "⏳ Em Breve (Por Categorias)",
    "✍️ Inserção Manual",
    "🎙️ Criar por Voz"
])

# -----------------------------------------------------------------------------
# ABA 1: TAREFAS
# -----------------------------------------------------------------------------
with tab_tarefas:
    tarefas_filtradas = listar_tarefas(filtro_status, filtro_categoria, filtro_data)

    if not tarefas_filtradas:
        st.info("Nenhuma tarefa cadastrada para os filtros selecionados.")
    else:
        st.markdown(f"**Exibindo {len(tarefas_filtradas)} tarefa(s):**")
        for tarefa in tarefas_filtradas:
            prioridade = tarefa["prioridade"]
            cor_pri = "🔴 Alta" if prioridade == "Alta" else ("🟡 Média" if prioridade == "Média" else "🟢 Baixa")
            icone = "✅" if tarefa["status"] == "Concluída" else "⏳"
            
            titulo_card = f"{icone} **{tarefa['titulo']}** | {cor_pri} | 📂 {tarefa['categoria']} | 📅 {tarefa['data_vencimento']}"
            with st.expander(titulo_card, expanded=(tarefa["status"] == "Pendente")):
                st.write(tarefa["descricao"] if tarefa["descricao"] else "*Sem descrição adicional.*")
                
                c1, c2, _ = st.columns([3, 2, 7])
                with c1:
                    novo_st = "Concluída" if tarefa["status"] == "Pendente" else "Pendente"
                    label_btn = "Marcar Concluída" if tarefa["status"] == "Pendente" else "Reabrir Tarefa"
                    if st.button(label_btn, key=f"t_st_{tarefa['id']}"):
                        alternar_status_tarefa(tarefa["id"], novo_st)
                        st.rerun()
                with c2:
                    if st.button("🗑️ Excluir", key=f"t_del_{tarefa['id']}"):
                        excluir_tarefa(tarefa["id"])
                        st.rerun()

# -----------------------------------------------------------------------------
# ABA 2: PROJETOS COM PASSOS E PORCENTAGEM DE CONCLUSÃO
# -----------------------------------------------------------------------------
with tab_projetos:
    st.subheader("📁 Projetos em Andamento")
    st.caption("Cadastre projetos complexos, quebre em etapas e acompanhe o percentual de conclusão.")

    # Formulário para criar novo projeto
    with st.expander("➕ Criar Novo Projeto com Passos", expanded=False):
        with st.form("form_novo_projeto", clear_on_submit=True):
            p_tit = st.text_input("Título do Projeto *", placeholder="Ex: Reforma do Escritório")
            p_desc = st.text_area("Descrição / Objetivos do Projeto", placeholder="Metas e resultados esperados...")
            
            col_p1, col_p2 = st.columns(2)
            with col_p1:
                p_cat = st.selectbox("Categoria *", obter_categorias(), key="proj_cat_select")
            with col_p2:
                prazo_padrao = datetime.date.today() + datetime.timedelta(days=30)
                p_prazo = st.date_input("Data Limite / Prazo *", value=prazo_padrao)

            st.markdown("**Passos / Etapas Iniciais (um por linha):**")
            p_passos_raw = st.text_area(
                "Liste as etapas que faltam executar:",
                placeholder="Passo 1: Orçamento com fornecedores\nPasso 2: Comprar materiais\nPasso 3: Iniciar pintura e acabamento",
                help="Cada linha preenchida se tornará um passo com checkbox de conclusão"
            )

            btn_criar_proj = st.form_submit_button("🚀 Lançar Projeto", use_container_width=True)
            if btn_criar_proj:
                if not p_tit.strip():
                    st.error("O título do projeto é obrigatório!")
                else:
                    linhas_passos = [l for l in p_passos_raw.split("\n") if l.strip()]
                    criar_projeto(p_tit, p_desc, p_cat, p_prazo.strftime("%Y-%m-%d"), linhas_passos)
                    st.success(f"Projeto '{p_tit}' criado com {len(linhas_passos)} passos!")
                    st.rerun()

    # Listagem de Projetos
    projetos_carregados = listar_projetos(filtro_categoria)
    if not projetos_carregados:
        st.info("Nenhum projeto cadastrado no momento.")
    else:
        for proj in projetos_carregados:
            progresso = proj["progresso_pct"]
            status_cor = "🟢 Concluído" if proj["status"] == "Concluído" else "🔵 Em Andamento"

            st.markdown("---")
            col_tit, col_badge = st.columns([4, 1])
            with col_tit:
                st.markdown(f"### {proj['titulo']}")
                st.caption(f"📂 {proj['categoria']} | 📅 Prazo: {proj['data_limite']} | Status: {status_cor}")
            with col_badge:
                st.metric("Conclusão", f"{progresso}%", f"{proj['passos_concluidos']}/{proj['total_passos']} passos")

            st.progress(progresso / 100.0)

            if proj["descricao"]:
                st.write(proj["descricao"])

            # Passos do projeto
            st.markdown("**Etapas do Projeto:**")
            if not proj["passos"]:
                st.caption("Nenhum passo cadastrado para este projeto.")
            else:
                for passo in proj["passos"]:
                    col_chk, col_p_del = st.columns([10, 1])
                    with col_chk:
                        marcado = st.checkbox(
                            passo["titulo"],
                            value=bool(passo["concluido"]),
                            key=f"passo_chk_{passo['id']}"
                        )
                        if marcado != bool(passo["concluido"]):
                            alternar_passo_projeto(passo["id"], marcado, proj["id"])
                            st.rerun()
                    with col_p_del:
                        if st.button("❌", key=f"p_del_step_{passo['id']}", help="Remover este passo"):
                            excluir_passo_projeto(passo["id"])
                            st.rerun()

            # Adicionar novo passo dinamicamente
            with st.form(key=f"form_add_step_{proj['id']}", clear_on_submit=True):
                col_n_step, col_btn_step = st.columns([4, 1])
                with col_n_step:
                    novo_passo_txt = st.text_input("Adicionar nova etapa:", placeholder="Ex: Agendar reunião de alinhamento", label_visibility="collapsed")
                with col_btn_step:
                    if st.form_submit_button("➕ Adicionar Passo"):
                        if novo_passo_txt.strip():
                            adicionar_passo_projeto(proj["id"], novo_passo_txt.strip())
                            st.rerun()

            # Exclusão do projeto
            if st.button("🗑️ Excluir Projeto Completo", key=f"del_proj_{proj['id']}"):
                excluir_projeto(proj["id"])
                st.warning(f"Projeto '{proj['titulo']}' excluído.")
                st.rerun()

# -----------------------------------------------------------------------------
# ABA 3: VISÃO "EM BREVE" DIVIDIDO POR CATEGORIAS
# -----------------------------------------------------------------------------
with tab_em_breve:
    st.subheader("⏳ Visão 'Em Breve' — Backlog por Categorias")
    st.caption("Visão panorâmica de tudo que falta concluir (tarefas pendentes + etapas de projetos em andamento) separado por cada categoria.")

    todas_as_cats = obter_categorias()
    
    # Filtro seletor opcional para focar em uma categoria ou ver todas
    cat_selecionada_eb = st.selectbox("Filtrar Categoria na Visão Em Breve:", ["Todas"] + todas_as_cats)
    cats_para_exibir = todas_as_cats if cat_selecionada_eb == "Todas" else [cat_selecionada_eb]

    for cat in cats_para_exibir:
        tarefas_pend_cat = [t for t in todas_tarefas if t["categoria"] == cat and t["status"] == "Pendente"]
        projetos_ativos_cat = [p for p in todos_projetos if p["categoria"] == cat and p["status"] != "Concluído"]

        total_pendencias = len(tarefas_pend_cat) + len(projetos_ativos_cat)

        with st.expander(f"📁 **{cat}** — {total_pendencias} pendência(s) ativa(s)", expanded=(total_pendencias > 0)):
            if total_pendencias == 0:
                st.success(f"🎉 Tudo em dia na categoria {cat}! Nenhuma tarefa pendente ou projeto em aberto.")
            else:
                col_eb1, col_eb2 = st.columns(2)

                # Coluna de Tarefas Pendentes
                with col_eb1:
                    st.markdown(f"#### ⏳ Tarefas Pendentes ({len(tarefas_pend_cat)})")
                    if not tarefas_pend_cat:
                        st.caption("Nenhuma tarefa individual pendente.")
                    else:
                        for t in tarefas_pend_cat:
                            pri_cor = "🔴" if t["prioridade"] == "Alta" else ("🟡" if t["prioridade"] == "Média" else "🟢")
                            st.markdown(f"- {pri_cor} **{t['titulo']}** *(Vence: {t['data_vencimento']})*")
                            if t["descricao"]:
                                st.caption(f"  └ {t['descricao']}")

                # Coluna de Projetos em Andamento e seus Passos Restantes
                with col_eb2:
                    st.markdown(f"#### 🚀 Projetos em Andamento ({len(projetos_ativos_cat)})")
                    if not projetos_ativos_cat:
                        st.caption("Nenhum projeto ativo nesta categoria.")
                    else:
                        for p in projetos_ativos_cat:
                            passos_restantes = [passo for passo in p["passos"] if not passo["concluido"]]
                            st.markdown(f"**{p['titulo']}** — `{p['progresso_pct']}% concluído` *(Prazo: {p['data_limite']})*")
                            st.progress(p["progresso_pct"] / 100.0)
                            
                            st.markdown(f"*Passos que faltam executar ({len(passos_restantes)}):*")
                            if not passos_restantes:
                                st.caption("  └ Todos os passos foram marcados como concluídos.")
                            else:
                                for passo in passos_restantes:
                                    st.markdown(f"  - ▫️ {passo['titulo']}")
                            st.markdown("")

# -----------------------------------------------------------------------------
# ABA 4: INSERÇÃO MANUAL
# -----------------------------------------------------------------------------
with tab_manual:
    st.subheader("✍️ Criar Nova Tarefa Manual")
    with st.form("form_insercao_manual_nova", clear_on_submit=True):
        col_m1, col_m2 = st.columns([3, 1])
        with col_m1:
            novo_titulo = st.text_input("Título da Tarefa *", placeholder="Ex: Entregar relatório de métricas")
        with col_m2:
            nova_prioridade = st.selectbox("Prioridade *", ["Média", "Alta", "Baixa"], index=0)

        nova_descricao = st.text_area("Descrição detalhada", placeholder="Informações extras...")

        col_m3, col_m4 = st.columns(2)
        with col_m3:
            todas_cats = obter_categorias()
            nova_categoria = st.selectbox("Categoria *", todas_cats)
        with col_m4:
            nova_data = st.date_input("Data de Vencimento *", value=datetime.date.today())

        submit_manual = st.form_submit_button("➕ Salvar Tarefa", use_container_width=True)
        if submit_manual:
            if not novo_titulo.strip():
                st.warning("O título da tarefa é obrigatório!")
            else:
                criar_tarefa(
                    titulo=novo_titulo,
                    descricao=nova_descricao,
                    categoria=nova_categoria,
                    prioridade=nova_prioridade,
                    data_vencimento=nova_data.strftime("%Y-%m-%d")
                )
                st.success("✅ Tarefa criada com sucesso!")
                st.rerun()

# -----------------------------------------------------------------------------
# ABA 5: CRIAÇÃO POR VOZ COM GEMINI AI
# -----------------------------------------------------------------------------
with tab_voz:
    st.subheader("🎙️ Criar Tarefa por Voz com Inteligência Artificial")
    st.markdown("Grave sua fala ou envie um arquivo de áudio para o **Gemini** estruturar a tarefa automaticamente.")

    chave_api = obter_chave_gemini()
    if not chave_api:
        st.warning("⚠️ Chave `GEMINI_API_KEY` não configurada no ambiente ou secrets.")

    col_v1, col_v2 = st.columns(2)
    with col_v1:
        st.markdown("##### Gravar Microfone")
        audio_gravado = audio_recorder(
            text="",
            recording_color="#e74c3c",
            neutral_color="#3498db",
            icon_name="microphone",
            icon_size="2x"
        )
        if audio_gravado:
            st.audio(audio_gravado, format="audio/wav")

    with col_v2:
        st.markdown("##### Upload de Áudio")
        arquivo_audio = st.file_uploader("Arquivo de áudio:", type=["wav", "mp3", "m4a", "ogg"])

    audio_para_processar = audio_gravado if audio_gravado else (arquivo_audio.read() if arquivo_audio else None)
    mime_selecionado = "audio/wav" if audio_gravado else (arquivo_audio.type if arquivo_audio else "audio/wav")

    if audio_para_processar and st.button("🚀 Processar com Gemini AI", type="primary", use_container_width=True):
        with st.spinner("🤖 Analisando áudio com IA..."):
            cats_atuais = obter_categorias()
            resultado = processar_audio_com_gemini(audio_para_processar, mime_selecionado, cats_atuais)
            if resultado:
                task_id = criar_tarefa(
                    titulo=resultado["titulo"],
                    descricao=resultado["descricao"],
                    categoria=resultado["categoria"],
                    prioridade=resultado["prioridade"],
                    data_vencimento=resultado["data_vencimento"]
                )
                st.success(f"🎉 Tarefa #{task_id} criada com sucesso via IA!")
                st.json(resultado)
                st.balloons()
