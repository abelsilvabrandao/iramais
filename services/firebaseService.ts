import { 
  collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy, setDoc, getDoc, where, onSnapshot, writeBatch, Unsubscribe
} from "firebase/firestore";
import { db } from "./firebaseConfig";
import { 
  Employee, OrganizationUnit, OrganizationDepartment, Task, TaskStatus, UserRole, 
  SystemTool, NewsArticle, GlobalSettings, Appointment, MeetingRoom, Notification, 
  ChatMessage, SignatureLog, SignatureRequest, SignatureData, TermTemplate, Term 
} from "../types";

// --- Helpers ---
const getAvatar = (data: any, name: string) => {
  if (data.photoBase64) return data.photoBase64;
  if (data.photoUrl) return data.photoUrl;
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0d9488&color=fff`;
};

const sanitizeData = (data: any): any => {
  if (data === undefined) return null;
  if (data === null) return null;
  if (Array.isArray(data)) return data.map(item => sanitizeData(item));
  if (typeof data === 'object') {
    const sanitized: any = {};
    Object.keys(data).forEach(key => {
      sanitized[key] = sanitizeData(data[key]);
    });
    return sanitized;
  }
  return data;
};

const safeDelete = async (collectionName: string, id: string) => {
  if (!id || typeof id !== 'string') {
    throw new Error("ID do registro inválido.");
  }
  try {
    const docRef = doc(db, collectionName, id.trim());
    await deleteDoc(docRef);
    return true;
  } catch (error: any) {
    throw error;
  }
};

// Helper para gerar um código de verificação robusto (Hash)
const generateSecureHash = () => {
  const chars = '0123456789ABCDEF';
  let result = '';
  for (let i = 0; i < 24; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
    if ((i + 1) % 6 === 0 && i !== 23) result += '-';
  }
  return result;
};

// --- REAL-TIME SUBSCRIBERS ---

export const subscribeTermTemplates = (callback: (templates: TermTemplate[]) => void): Unsubscribe => {
  return onSnapshot(collection(db, "term_templates"), (snapshot) => {
    callback(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as TermTemplate)));
  });
};

export const subscribeTerms = (callback: (terms: Term[]) => void, employeeId?: string): Unsubscribe => {
  const q = employeeId 
    ? query(collection(db, "terms"), where("employeeId", "==", employeeId))
    : query(collection(db, "terms"), orderBy("createdAt", "desc"));
    
  return onSnapshot(q, (snapshot) => {
    let data = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Term));
    if (employeeId) {
      data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    callback(data);
  });
};

export const subscribeUnits = (callback: (units: OrganizationUnit[]) => void): Unsubscribe => {
  return onSnapshot(collection(db, "units"), (snapshot) => {
    callback(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as OrganizationUnit)));
  });
};

export const subscribeDepartments = (callback: (depts: OrganizationDepartment[]) => void): Unsubscribe => {
  return onSnapshot(collection(db, "sectors"), (snapshot) => {
    callback(snapshot.docs.map(d => ({ id: d.id, name: d.data().name } as OrganizationDepartment)));
  });
};

export const subscribeEmployees = (callback: (emps: Employee[]) => void): Unsubscribe => {
  return onSnapshot(collection(db, "people"), (snapshot) => {
    callback(snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        uid: data.uid,
        name: data.name || '',
        role: data.role || 'Colaborador',
        systemRole: data.systemRole || UserRole.USER,
        department: data.sector || data.department || 'Geral',
        unit: data.unit || '',
        extension: data.extension || '',
        whatsapp: data.whatsapp || '',
        email: data.email || '',
        avatar: getAvatar(data, data.name || 'User'),
        birthday: data.birthday || '', 
        showRole: data.showRole !== undefined ? data.showRole : true,
        showInPublicDirectory: data.showInPublicDirectory !== undefined ? data.showInPublicDirectory : true,
        signatureImage: data.signatureImage || ''
      } as Employee;
    }));
  });
};

export const subscribeSystems = (callback: (systems: SystemTool[]) => void): Unsubscribe => {
  return onSnapshot(collection(db, "systems"), (snapshot) => {
    callback(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as SystemTool)));
  });
};

// --- SIGNATURE REAL-TIME SUBSCRIBERS ---

export const subscribeSignatureUnits = (callback: (units: OrganizationUnit[]) => void): Unsubscribe => {
  return onSnapshot(collection(db, "units_assinatura"), (snapshot) => {
    callback(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as OrganizationUnit)));
  });
};

export const subscribeSignatureSectors = (callback: (sectors: OrganizationDepartment[]) => void): Unsubscribe => {
  return onSnapshot(collection(db, "sectors_assinatura"), (snapshot) => {
    callback(snapshot.docs.map(d => ({ id: d.id, name: d.data().name, description: d.data().description || '' } as OrganizationDepartment)));
  });
};

export const subscribeSignatureRequests = (callback: (requests: SignatureRequest[]) => void, userId?: string): Unsubscribe => {
  const q = userId 
    ? query(collection(db, "signature_requests"), where("userId", "==", userId))
    : query(collection(db, "signature_requests"), orderBy("createdAt", "desc"));
    
  return onSnapshot(q, (snapshot) => {
    let data = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as SignatureRequest));
    if (userId) {
      data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    callback(data);
  });
};

export const subscribeSignatureLogs = (callback: (logs: SignatureLog[]) => void): Unsubscribe => {
  const q = query(collection(db, "signature_logs"), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as SignatureLog)));
  });
};

// --- SETTINGS ---
export const fetchGlobalSettings = async (): Promise<GlobalSettings> => {
  try {
    const docRef = doc(db, "settings", "general");
    const docSnap = await getDoc(docRef);
    // Fix: Added missing required properties to default GlobalSettings object to match the interface
    return docSnap.exists() ? docSnap.data() as GlobalSettings : { 
      publicDirectory: true,
      showBirthdaysPublicly: true,
      showRoomsPublicly: true,
      showNewsPublicly: true,
      showRolePublicly: true,
      showWelcomeSection: true,
      dashboardShowRooms: true,
      dashboardShowNews: true,
      dashboardShowBirthdays: true,
      showRoleInternal: true
    };
  } catch (error) {
    // Fix: Added missing required properties to default GlobalSettings object to match the interface
    return { 
      publicDirectory: true,
      showBirthdaysPublicly: true,
      showRoomsPublicly: true,
      showNewsPublicly: true,
      showRolePublicly: true,
      showWelcomeSection: true,
      dashboardShowRooms: true,
      dashboardShowNews: true,
      dashboardShowBirthdays: true,
      showRoleInternal: true
    };
  }
};

export const updateGlobalSettings = async (settings: Partial<GlobalSettings>): Promise<void> => {
  const docRef = doc(db, "settings", "general");
  await setDoc(docRef, sanitizeData(settings), { merge: true });
};

// --- EMPLOYEES ---
export const fetchEmployees = async (): Promise<Employee[]> => {
  try {
    const q = query(collection(db, "people")); 
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        uid: data.uid,
        name: data.name || '',
        role: data.role || 'Colaborador',
        systemRole: data.systemRole || UserRole.USER,
        department: data.sector || data.department || 'Geral',
        unit: data.unit || '',
        extension: data.extension || '',
        whatsapp: data.whatsapp || '',
        email: data.email || '',
        avatar: getAvatar(data, data.name || 'User'),
        birthday: data.birthday || '', 
        showRole: data.showRole !== undefined ? data.showRole : true,
        showInPublicDirectory: data.showInPublicDirectory !== undefined ? data.showInPublicDirectory : true,
        signatureImage: data.signatureImage || ''
      } as Employee;
    });
  } catch (error) {
    return [];
  }
};

export const addEmployee = async (employee: Partial<Employee>, photoFile?: string): Promise<void> => {
  const docData = sanitizeData({ ...employee, photoBase64: photoFile || null, createdAt: new Date().toISOString() });
  await addDoc(collection(db, "people"), docData);
};

export const updateEmployee = async (id: string, employee: Partial<Employee>, photoFile?: string): Promise<void> => {
  const docRef = doc(db, "people", id);
  const docData = sanitizeData({ ...employee, photoBase64: photoFile || undefined, updatedAt: new Date().toISOString() });
  await updateDoc(docRef, docData);
};

export const removeEmployee = async (id: string): Promise<void> => {
  await safeDelete("people", id);
};

// --- NOTIFICATIONS ---
export const createNotification = async (notification: Omit<Notification, 'id'>) => {
  try {
    await addDoc(collection(db, "notifications"), sanitizeData({ ...notification, read: false, createdAt: new Date().toISOString() }));
  } catch (error) {
    console.error("Erro ao criar notificação:", error);
  }
};

export const markNotificationAsRead = async (id: string) => {
  await updateDoc(doc(db, "notifications", id), { read: true });
};

export const clearAllNotifications = async (userId: string) => {
  const q = query(collection(db, "notifications"), where("userId", "==", userId));
  const snapshot = await getDocs(q);
  const promises = snapshot.docs.map(d => deleteDoc(d.ref));
  await Promise.all(promises);
};

// --- CHAT ---
export const sendChatMessage = async (senderId: string, receiverId: string, text: string, senderName: string) => {
  await addDoc(collection(db, "messages"), sanitizeData({
    senderId, receiverId, text, timestamp: new Date().toISOString(), read: false, deleted: false, participants: [senderId, receiverId] 
  }));
  await createNotification({
    userId: receiverId, type: 'chat', title: `Nova mensagem de ${senderName}`, message: text.substring(0, 50) + (text.length > 50 ? '...' : ''), read: false, createdAt: new Date().toISOString(), link: '/directory', senderId
  });
};

export const markChatAsRead = async (userId: string, senderId: string) => {
  const q = query(collection(db, "messages"), where("receiverId", "==", userId), where("senderId", "==", senderId), where("read", "==", false));
  const snapshot = await getDocs(q);
  const batch = writeBatch(db);
  snapshot.docs.forEach(d => { batch.update(d.ref, { read: true }); });
  await batch.commit();
};

export const deleteChatMessage = async (id: string) => {
  await updateDoc(doc(db, "messages", id), { deleted: true });
};

// --- GENERAL ORGANIZATION ---
export const fetchUnits = async (): Promise<OrganizationUnit[]> => {
  const snapshot = await getDocs(collection(db, "units"));
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as OrganizationUnit));
};

export const addUnit = async (unit: OrganizationUnit) => await addDoc(collection(db, "units"), sanitizeData(unit));
export const updateUnit = async (unit: OrganizationUnit) => { 
  const {id, ...d} = unit; 
  await updateDoc(doc(db, "units", id!), sanitizeData(d)); 
};
export const removeUnit = async (id: string) => await safeDelete("units", id);

export const fetchDepartments = async (): Promise<OrganizationDepartment[]> => {
  const snapshot = await getDocs(collection(db, "sectors"));
  return snapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name }));
};

export const addDepartment = async (dept: OrganizationDepartment) => await addDoc(collection(db, "sectors"), { name: dept.name });
export const updateDepartment = async (dept: OrganizationDepartment) => await updateDoc(doc(db, "sectors", dept.id), { name: dept.name });
export const removeDepartment = async (id: string) => await safeDelete("sectors", id);

// --- TERMOS DE TI ---

export const fetchTermTemplates = async (): Promise<TermTemplate[]> => {
  const snapshot = await getDocs(collection(db, "term_templates"));
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TermTemplate));
};

export const addTermTemplate = async (template: Omit<TermTemplate, 'id'>) => {
  await addDoc(collection(db, "term_templates"), sanitizeData({ ...template, createdAt: new Date().toISOString() }));
};

export const updateTermTemplate = async (id: string, updates: Partial<TermTemplate>) => {
  await updateDoc(doc(db, "term_templates", id), sanitizeData(updates));
};

export const removeTermTemplate = async (id: string) => await safeDelete("term_templates", id);

export const addTerm = async (term: Omit<Term, 'id' | 'status' | 'createdAt' | 'token'>) => {
  const token = generateSecureHash();
  const docRef = await addDoc(collection(db, "terms"), sanitizeData({
    ...term,
    status: 'PENDENTE',
    token,
    createdAt: new Date().toISOString()
  }));

  // Notificar Colaborador
  await createNotification({
    userId: term.employeeId,
    type: 'term',
    title: 'Novo Termo para Assinatura',
    message: `Um novo termo de ${term.type} foi emitido para você.`,
    read: false,
    createdAt: new Date().toISOString(),
    link: '/signatures'
  });

  return docRef.id;
};

export const signTerm = async (id: string, cpf: string, signatureImage: string) => {
  await updateDoc(doc(db, "terms", id), {
    status: 'ASSINADO',
    employeeCpf: cpf,
    signatureImage,
    signedAt: new Date().toISOString()
  });
};

export const removeTerm = async (id: string) => await safeDelete("terms", id);

// --- SIGNATURES ---
export const fetchSignatureUnits = async (): Promise<OrganizationUnit[]> => {
  const snapshot = await getDocs(collection(db, "units_assinatura"));
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as OrganizationUnit));
};

export const addSignatureUnit = async (unit: Partial<OrganizationUnit>) => {
  const { id, ...data } = unit;
  return await addDoc(collection(db, "units_assinatura"), sanitizeData(data));
};

export const updateSignatureUnit = async (id: string, data: Partial<OrganizationUnit>) => {
  await updateDoc(doc(db, "units_assinatura", id), sanitizeData(data));
};

export const removeSignatureUnit = async (id: string) => await safeDelete("units_assinatura", id);

export const fetchSignatureSectors = async (): Promise<OrganizationDepartment[]> => {
  const snapshot = await getDocs(collection(db, "sectors_assinatura"));
  /* Fix: Correct map parameter usage from 'd' to 'doc' to resolve 'Cannot find name d' */
  return snapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name, description: doc.data().description || '' }));
};

export const addSignatureSector = async (dept: Partial<OrganizationDepartment>) => {
  return await addDoc(collection(db, "sectors_assinatura"), sanitizeData({ name: dept.name, description: dept.description || '' }));
};

export const updateSignatureSector = async (id: string, data: Partial<OrganizationDepartment>) => {
  await updateDoc(doc(db, "sectors_assinatura", id), sanitizeData(data));
};

export const removeSignatureSector = async (id: string) => await safeDelete("sectors_assinatura", id);

export const addSignatureLog = async (log: Omit<SignatureLog, 'id'>) => {
  await addDoc(collection(db, "signature_logs"), sanitizeData(log));
};

export const fetchSignatureLogs = async (): Promise<SignatureLog[]> => {
  const q = query(collection(db, "signature_logs"), orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SignatureLog));
};

export const removeSignatureLog = async (id: string) => await safeDelete("signature_logs", id);

export const addSignatureRequest = async (request: Omit<SignatureRequest, 'id' | 'status' | 'createdAt'>) => {
  const sigRef = await addDoc(collection(db, "signature_requests"), sanitizeData({ 
    ...request, 
    status: 'PENDING', 
    createdAt: new Date().toISOString() 
  }));

  await addDoc(collection(db, "tasks"), sanitizeData({
    title: `Assinatura: ${request.userName}`,
    description: `Solicitação de assinatura de e-mail iniciada por ${request.userName}. Notas: ${request.notes || 'Sem observações'}`,
    assigneeId: '', 
    status: TaskStatus.TODO,
    dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], 
    creatorId: request.userId,
    creatorDepartment: 'TI', 
    createdAt: new Date().toISOString(),
    signatureRequestId: sigRef.id 
  }));

  const tiQuery = query(collection(db, "people"), where("department", "==", "TI"));
  const tiSnapshot = await getDocs(tiQuery);
  tiSnapshot.forEach(tiDoc => {
    createNotification({
      userId: tiDoc.id, type: 'system', title: 'Nova Solicitação de Assinatura', 
      message: `${request.userName} solicitou uma assinatura de e-mail.`, 
      read: false, createdAt: new Date().toISOString(), link: '/admin-signatures'
    });
  });
};

export const updateSignatureRequestStatus = async (id: string, status: 'COMPLETED', adminName: string, userId: string, signatureData?: SignatureData) => {
  if (!id) throw new Error("ID inválido");
  
  const docRef = doc(db, "signature_requests", id);
  await updateDoc(docRef, sanitizeData({ 
    status, 
    completedAt: new Date().toISOString(), 
    completedBy: adminName, 
    signatureData: signatureData || null 
  }));

  try {
      const tasksQuery = query(
          collection(db, "tasks"), 
          where("signatureRequestId", "==", id)
      );
      const tasksSnapshot = await getDocs(tasksQuery);
      
      if (!tasksSnapshot.empty) {
          const taskDoc = tasksSnapshot.docs[0];
          const adminPersonQuery = query(collection(db, "people"), where("name", "==", adminName));
          const adminPersonSnap = await getDocs(adminPersonQuery);
          const adminId = !adminPersonSnap.empty ? adminPersonSnap.docs[0].id : null;

          await updateDoc(doc(db, "tasks", taskDoc.id), {
              status: TaskStatus.DONE,
              completedAt: new Date().toISOString(),
              completedBy: adminId
          });
      }
  } catch (err) {
      console.error("Erro ao fechar tarefa de assinatura:", err);
  }

  if (userId) {
    await createNotification({
      userId, type: 'system', title: 'Assinatura Concluída', message: 'Sua assinatura de e-mail está pronta.', read: false, createdAt: new Date().toISOString(), link: '/signatures'
    });
  }
};

export const fetchSignatureRequests = async (userId?: string): Promise<SignatureRequest[]> => {
  try {
    const q = userId 
      ? query(collection(db, "signature_requests"), where("userId", "==", userId))
      : query(collection(db, "signature_requests"), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SignatureRequest))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    return [];
  }
};

export const removeSignatureRequest = async (id: string) => await safeDelete("signature_requests", id);

// --- TASKS ---
export const fetchTasks = async (): Promise<Task[]> => {
  const snapshot = await getDocs(collection(db, "tasks"));
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task));
};

export const addTask = async (task: Partial<Task>): Promise<void> => {
  await addDoc(collection(db, "tasks"), sanitizeData({ ...task, completedAt: null, completedBy: null, createdAt: new Date().toISOString() }));
};

export const updateTask = async (id: string, task: Partial<Task>): Promise<void> => {
  await updateDoc(doc(db, "tasks", id), sanitizeData(task));
};

export const deleteTask = async (id: string): Promise<void> => {
  await safeDelete("tasks", id);
};

// --- SYSTEMS ---
export const fetchSystems = async (): Promise<SystemTool[]> => {
  const snapshot = await getDocs(collection(db, "systems"));
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SystemTool));
};

export const fetchEquipments = async (): Promise<any[]> => {
  const snapshot = await getDocs(collection(db, "equipments"));
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const addSystem = async (system: Partial<SystemTool>): Promise<void> => {
  await addDoc(collection(db, "systems"), sanitizeData(system));
};

export const updateSystem = async (id: string, system: Partial<SystemTool>): Promise<void> => {
  await updateDoc(doc(db, "systems", id), sanitizeData(system));
};

export const removeSystem = async (id: string): Promise<void> => {
  await safeDelete("systems", id);
};

// --- NEWS ---
export const fetchNews = async (): Promise<NewsArticle[]> => {
  const q = query(collection(db, "news"), orderBy("date", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as NewsArticle));
};

export const addNews = async (article: Partial<NewsArticle>): Promise<void> => {
  await addDoc(collection(db, "news"), sanitizeData({ ...article, createdAt: new Date().toISOString() }));
};

export const updateNews = async (id: string, article: Partial<NewsArticle>): Promise<void> => {
  await updateDoc(doc(db, "news", id), sanitizeData(article));
};

export const deleteNews = async (id: string): Promise<void> => {
  await safeDelete("news", id);
};

// --- MEETING ROOMS ---
export const fetchMeetingRooms = async (): Promise<MeetingRoom[]> => {
  const snapshot = await getDocs(collection(db, "meetingRooms"));
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MeetingRoom));
};

export const addMeetingRoom = async (room: Partial<MeetingRoom>): Promise<void> => {
  await addDoc(collection(db, "meetingRooms"), sanitizeData({ ...room, capacity: Number(room.capacity) }));
};

export const updateMeetingRoom = async (id: string, room: Partial<MeetingRoom>): Promise<void> => {
  await updateDoc(doc(db, "meetingRooms", id), sanitizeData({ ...room, capacity: Number(room.capacity) }));
};

export const deleteMeetingRoom = async (id: string): Promise<void> => {
  await safeDelete("meetingRooms", id);
};

// --- APPOINTMENTS ---
export const createAppointment = async (appointment: Omit<Appointment, 'id'>): Promise<void> => {
  const docId = `${appointment.roomId}_${appointment.date}_${appointment.time.replace(':', '-')}`;
  await setDoc(doc(db, "appointments", docId), sanitizeData({ ...appointment, createdAt: new Date().toISOString() }));
};

export const updateAppointment = async (id: string, updates: Partial<Appointment>): Promise<void> => {
  await updateDoc(doc(db, "appointments", id), sanitizeData(updates));
};

export const deleteAppointment = async (appointmentId: string): Promise<void> => {
  await safeDelete("appointments", appointmentId);
};