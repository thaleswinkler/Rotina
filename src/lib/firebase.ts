import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDocs,
  deleteDoc,
  updateDoc,
  onSnapshot,
  query,
  orderBy,
  writeBatch,
  Unsubscribe,
} from "firebase/firestore";
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  signInAnonymously,
  onAuthStateChanged,
  signOut,
  User,
} from "firebase/auth";
import firebaseConfig from "../../firebase-applet-config.json";
import { Tarefa, Projeto, PassoProjeto, UserProfile, Prioridade, StatusTarefa, ItemMercado } from "../types";

// Initialize Firebase App
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firestore (support named database if configured)
export const db = firebaseConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

// Initialize Auth
export const auth = getAuth(app);

// Google Auth Provider
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

// ---------------------------------------------------------------------------
// Authentication Helpers
// ---------------------------------------------------------------------------
export async function loginWithGoogle(): Promise<User> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error: any) {
    console.error("Erro no login com Google:", error);
    throw error;
  }
}

export async function loginAnonymously(): Promise<User> {
  try {
    const result = await signInAnonymously(auth);
    return result.user;
  } catch (error: any) {
    console.error("Erro no login anônimo:", error);
    throw error;
  }
}

export async function logoutUser(): Promise<void> {
  await signOut(auth);
}

export function subscribeToAuth(callback: (user: UserProfile | null) => void): Unsubscribe {
  return onAuthStateChanged(auth, (user) => {
    if (user) {
      callback({
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        isAnonymous: user.isAnonymous,
      });
    } else {
      callback(null);
    }
  });
}

// ---------------------------------------------------------------------------
// Realtime Firestore Subscriptions
// ---------------------------------------------------------------------------

export function subscribeToTarefasFirestore(
  onUpdate: (tarefas: Tarefa[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const colRef = collection(db, "tarefas");

  return onSnapshot(
    colRef,
    (snapshot) => {
      const items: Tarefa[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as Tarefa;
        items.push({
          ...data,
          id: docSnap.id,
        });
      });
      // Sort client-side by criado_em descending so no compound index is needed
      items.sort((a, b) => (b.criado_em || "").localeCompare(a.criado_em || ""));
      onUpdate(items);
    },
    (error) => {
      console.error("Erro no onSnapshot de tarefas:", error);
      if (onError) onError(error);
    }
  );
}

export function subscribeToProjetosFirestore(
  onUpdate: (projetos: Projeto[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const colRef = collection(db, "projetos");

  return onSnapshot(
    colRef,
    (snapshot) => {
      const items: Projeto[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as any;
        const passos: PassoProjeto[] = Array.isArray(data.passos) ? data.passos : [];
        const passosConcluidos = passos.filter((p) => p.concluido).length;
        const totalPassos = passos.length;
        const progresso = totalPassos > 0 ? Math.round((passosConcluidos / totalPassos) * 100) : 0;

        items.push({
          ...data,
          id: docSnap.id,
          passos,
          total_passos: totalPassos,
          passos_concluidos: passosConcluidos,
          progresso_pct: progresso,
        });
      });
      items.sort((a, b) => (b.criado_em || "").localeCompare(a.criado_em || ""));
      onUpdate(items);
    },
    (error) => {
      console.error("Erro no onSnapshot de projetos:", error);
      if (onError) onError(error);
    }
  );
}

export function subscribeToCategoriasFirestore(
  onUpdate: (categorias: string[]) => void
): Unsubscribe {
  const colRef = collection(db, "categorias");
  return onSnapshot(colRef, (snapshot) => {
    const defaultCats = ["Trabalho", "Pessoal", "Estudos", "Saúde", "Finanças", "Projetos"];
    if (snapshot.empty) {
      onUpdate(defaultCats);
      return;
    }
    const cats: string[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      if (data.nome && !cats.includes(data.nome)) {
        cats.push(data.nome);
      }
    });
    // Ensure defaults are present
    defaultCats.forEach((c) => {
      if (!cats.includes(c)) cats.push(c);
    });
    onUpdate(cats);
  });
}

export function subscribeToMercadoFirestore(
  onUpdate: (itens: ItemMercado[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const colRef = collection(db, "mercado");
  return onSnapshot(
    colRef,
    (snapshot) => {
      const items: ItemMercado[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as ItemMercado;
        items.push({
          ...data,
          id: docSnap.id,
        });
      });
      // Sort: Pendentes first, then by criado_em descending
      items.sort((a, b) => {
        if (a.comprado !== b.comprado) {
          return a.comprado ? 1 : -1;
        }
        return (b.criado_em || "").localeCompare(a.criado_em || "");
      });
      onUpdate(items);
    },
    (error) => {
      console.error("Erro no onSnapshot do mercado:", error);
      if (onError) onError(error);
    }
  );
}

// ---------------------------------------------------------------------------
// Firestore Mutation Actions (Auto-sync to Cloud)
// ---------------------------------------------------------------------------

export async function addItemMercadoFirestore(
  item: {
    nome: string;
    categoria?: string;
    quantidade?: string;
  },
  userId?: string
): Promise<string> {
  const colRef = collection(db, "mercado");
  const newDoc = doc(colRef);
  const data: ItemMercado = {
    id: newDoc.id,
    nome: item.nome.trim(),
    categoria: item.categoria || "Alimentos",
    quantidade: item.quantidade || "1",
    comprado: false,
    criado_em: new Date().toISOString(),
    userId: userId || auth.currentUser?.uid || "anonymous",
  };
  await setDoc(newDoc, data);
  return newDoc.id;
}

export async function updateItemMercadoFirestore(
  id: string | number,
  updates: Partial<ItemMercado>
): Promise<void> {
  const docRef = doc(db, "mercado", String(id));
  await updateDoc(docRef, updates);
}

export async function deleteItemMercadoFirestore(id: string | number): Promise<void> {
  const docRef = doc(db, "mercado", String(id));
  await deleteDoc(docRef);
}

export async function limparCompradosMercadoFirestore(itens: ItemMercado[]): Promise<void> {
  const batch = writeBatch(db);
  const comprados = itens.filter((i) => i.comprado);
  comprados.forEach((item) => {
    const docRef = doc(db, "mercado", String(item.id));
    batch.delete(docRef);
  });
  await batch.commit();
}

export async function addTarefaFirestore(
  tarefa: {
    titulo: string;
    categoria: string;
    prioridade: Prioridade;
    data_vencimento: string;
    descricao?: string;
    status?: StatusTarefa;
    criado_em?: string;
  },
  userId?: string
): Promise<string> {
  const colRef = collection(db, "tarefas");
  const newDoc = doc(colRef);
  const data = {
    ...tarefa,
    descricao: tarefa.descricao || "",
    status: tarefa.status || "Pendente",
    id: newDoc.id,
    userId: userId || auth.currentUser?.uid || "anonymous",
    criado_em: tarefa.criado_em || new Date().toISOString(),
  };
  await setDoc(newDoc, data);
  return newDoc.id;
}

export async function updateTarefaFirestore(
  id: string | number,
  updates: Partial<Tarefa>
): Promise<void> {
  const docRef = doc(db, "tarefas", String(id));
  await updateDoc(docRef, updates);
}

export async function deleteTarefaFirestore(id: string | number): Promise<void> {
  const docRef = doc(db, "tarefas", String(id));
  await deleteDoc(docRef);
}

export async function addProjetoFirestore(
  projeto: {
    titulo: string;
    descricao?: string;
    categoria: string;
    data_limite?: string;
    status?: string;
    passos?: PassoProjeto[];
    tipos_tarefas?: string[];
    criado_em?: string;
  },
  userId?: string
): Promise<string> {
  const colRef = collection(db, "projetos");
  const newDoc = doc(colRef);
  const data = {
    ...projeto,
    descricao: projeto.descricao || "",
    status: projeto.status || "Em Andamento",
    data_limite: projeto.data_limite || "",
    passos: projeto.passos || [],
    tipos_tarefas: projeto.tipos_tarefas || ["Planejamento", "Execução", "Revisão", "Geral"],
    id: newDoc.id,
    userId: userId || auth.currentUser?.uid || "anonymous",
    criado_em: projeto.criado_em || new Date().toISOString(),
  };
  await setDoc(newDoc, data);
  return newDoc.id;
}

export async function updateProjetoFirestore(
  id: string | number,
  updates: Partial<Projeto>
): Promise<void> {
  const docRef = doc(db, "projetos", String(id));
  await updateDoc(docRef, updates);
}

export async function deleteProjetoFirestore(id: string | number): Promise<void> {
  const docRef = doc(db, "projetos", String(id));
  await deleteDoc(docRef);
}

export async function addPassoFirestore(
  projetoId: string | number,
  passoTitulo: string,
  currentPassos: PassoProjeto[],
  dataLimite?: string,
  tipo?: string
): Promise<void> {
  const newPasso: PassoProjeto = {
    id: `step_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    projeto_id: projetoId,
    titulo: passoTitulo,
    concluido: false,
    ordem: currentPassos.length + 1,
    data_limite: dataLimite || "",
    tipo: tipo || "Geral",
  };
  const updatedPassos = [...currentPassos, newPasso];
  await updateProjetoFirestore(projetoId, { passos: updatedPassos });
}

export async function updatePassoFirestore(
  projetoId: string | number,
  passoId: string | number,
  currentPassos: PassoProjeto[],
  updates: Partial<PassoProjeto>
): Promise<void> {
  const updatedPassos = currentPassos.map((p) =>
    String(p.id) === String(passoId) ? { ...p, ...updates } : p
  );
  await updateProjetoFirestore(projetoId, { passos: updatedPassos });
}

export async function togglePassoFirestore(
  projetoId: string | number,
  passoId: string | number,
  currentPassos: PassoProjeto[]
): Promise<void> {
  const updatedPassos = currentPassos.map((p) =>
    String(p.id) === String(passoId) ? { ...p, concluido: !p.concluido } : p
  );
  await updateProjetoFirestore(projetoId, { passos: updatedPassos });
}

export async function deletePassoFirestore(
  projetoId: string | number,
  passoId: string | number,
  currentPassos: PassoProjeto[]
): Promise<void> {
  const updatedPassos = currentPassos.filter((p) => String(p.id) !== String(passoId));
  await updateProjetoFirestore(projetoId, { passos: updatedPassos });
}

export async function addCategoriaFirestore(nome: string): Promise<void> {
  const id = nome.toLowerCase().replace(/\s+/g, "_");
  const docRef = doc(db, "categorias", id);
  await setDoc(docRef, {
    nome,
    userId: auth.currentUser?.uid || "anonymous",
  });
}

export async function syncLocalServerToFirestore(forceOverride = false): Promise<{ tarefas: number; projetos: number }> {
  try {
    const [tasksRes, projRes, catRes] = await Promise.all([
      fetch("/api/tasks"),
      fetch("/api/projects"),
      fetch("/api/categories"),
    ]);
    const initialTasks = await tasksRes.json();
    const initialProjs = await projRes.json();
    const initialCats = await catRes.json();

    const tasksList = Array.isArray(initialTasks) ? initialTasks : [];
    const projsList = Array.isArray(initialProjs) ? initialProjs : [];
    const catsList = Array.isArray(initialCats) ? initialCats : [];

    const colRef = collection(db, "tarefas");
    const snapshot = await getDocs(colRef);
    if (!forceOverride && !snapshot.empty) {
      return { tarefas: snapshot.size, projetos: 0 };
    }

    const currentUid = auth.currentUser?.uid || "anonymous";

    // Write all tasks
    const taskPromises = tasksList.map(async (t) => {
      const docId = String(t.id || Date.now());
      const tDoc = doc(db, "tarefas", docId);
      await setDoc(
        tDoc,
        {
          id: docId,
          titulo: t.titulo || "",
          descricao: t.descricao || "",
          categoria: t.categoria || "Trabalho",
          prioridade: t.prioridade || "Média",
          data_vencimento: t.data_vencimento || new Date().toISOString().slice(0, 10),
          status: t.status || "Pendente",
          criado_em: t.criado_em || new Date().toISOString(),
          userId: currentUid,
        },
        { merge: true }
      );
    });

    // Write all projects
    const projPromises = projsList.map(async (p) => {
      const docId = String(p.id || Date.now());
      const pDoc = doc(db, "projetos", docId);
      await setDoc(
        pDoc,
        {
          id: docId,
          titulo: p.titulo || "",
          descricao: p.descricao || "",
          categoria: p.categoria || "Trabalho",
          data_limite: p.data_limite || "",
          status: p.status || "Em Andamento",
          criado_em: p.criado_em || new Date().toISOString(),
          passos: Array.isArray(p.passos) ? p.passos : [],
          userId: currentUid,
        },
        { merge: true }
      );
    });

    // Write categories
    const catPromises = catsList.map(async (cat: string) => {
      const id = cat.toLowerCase().replace(/\s+/g, "_");
      const cDoc = doc(db, "categorias", id);
      await setDoc(cDoc, { nome: cat, userId: currentUid }, { merge: true });
    });

    await Promise.all([...taskPromises, ...projPromises, ...catPromises]);

    return { tarefas: tasksList.length, projetos: projsList.length };
  } catch (err) {
    console.error("Erro ao sincronizar dados do servidor para o Firestore:", err);
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Seed initial data to Firestore if completely empty
// ---------------------------------------------------------------------------
export async function seedFirestoreIfEmpty(
  initialTarefas: any[],
  initialProjetos: any[],
  initialCategorias: string[]
): Promise<boolean> {
  try {
    const colRef = collection(db, "tarefas");
    const snapshot = await getDocs(colRef);
    if (!snapshot.empty) {
      return false; // already has data in cloud
    }

    const batch = writeBatch(db);

    // Seed Tarefas
    initialTarefas.forEach((t) => {
      const tDoc = doc(db, "tarefas", String(t.id));
      batch.set(tDoc, {
        ...t,
        id: String(t.id),
      });
    });

    // Seed Projetos
    initialProjetos.forEach((p) => {
      const pDoc = doc(db, "projetos", String(p.id));
      batch.set(pDoc, {
        ...p,
        id: String(p.id),
      });
    });

    // Seed Categorias
    initialCategorias.forEach((cat) => {
      const id = cat.toLowerCase().replace(/\s+/g, "_");
      const cDoc = doc(db, "categorias", id);
      batch.set(cDoc, { nome: cat });
    });

    await batch.commit();
    return true;
  } catch (error) {
    console.error("Aviso ao semear Firestore inicial:", error);
    return false;
  }
}
