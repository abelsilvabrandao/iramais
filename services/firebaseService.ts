
import { 
  collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy, setDoc, getDoc, where 
} from "firebase/firestore";
import { db } from "./firebaseConfig";
import { Employee, OrganizationUnit, OrganizationDepartment, Task, UserRole, SystemTool, NewsArticle, GlobalSettings, Appointment, MeetingRoom } from "../types";

// --- Helpers ---
const getAvatar = (data: any, name: string) => {
  if (data.photoBase64) return data.photoBase64;
  if (data.photoUrl) return data.photoUrl;
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0d9488&color=fff`;
};

// --- SETTINGS (Coleção: 'settings', Doc: 'general') ---

export const fetchGlobalSettings = async (): Promise<GlobalSettings> => {
  try {
    const docRef = doc(db, "settings", "general");
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return docSnap.data() as GlobalSettings;
    } else {
      // Default settings
      return { publicDirectory: true }; // Default changed to true based on user feedback to show by default
    }
  } catch (error) {
    console.error("Erro ao buscar configurações:", error);
    return { publicDirectory: true };
  }
};

export const updateGlobalSettings = async (settings: Partial<GlobalSettings>): Promise<void> => {
  try {
    const docRef = doc(db, "settings", "general");
    await setDoc(docRef, settings, { merge: true });
  } catch (error) {
    console.error("Erro ao salvar configurações:", error);
    throw error;
  }
};


// --- EMPLOYEES (Coleção: 'people') ---

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
        role: data.role || data.cargo || 'Colaborador',
        systemRole: data.systemRole || UserRole.USER, // Default to USER if missing
        department: data.sector || data.department || 'Geral',
        unit: data.unit || '',
        extension: data.extension || data.ramal || '',
        whatsapp: data.whatsapp || '',
        email: data.email || '',
        avatar: getAvatar(data, data.name || 'User'),
        birthday: data.birthday || '', 
        showRole: data.showRole !== undefined ? data.showRole : true,
        showInPublicDirectory: data.showInPublicDirectory !== undefined ? data.showInPublicDirectory : true // Default true
      } as Employee;
    });
  } catch (error) {
    console.error("Erro ao buscar colaboradores:", error);
    return [];
  }
};

export const addEmployee = async (employee: Partial<Employee>, photoFile?: string): Promise<void> => {
  try {
    const docData = {
      uid: employee.uid || null,
      name: employee.name,
      role: employee.role,
      cargo: employee.role,
      systemRole: employee.systemRole || UserRole.USER,
      sector: employee.department,
      department: employee.department,
      unit: employee.unit,
      extension: employee.extension,
      ramal: employee.extension,
      whatsapp: employee.whatsapp,
      email: employee.email,
      birthday: employee.birthday,
      showRole: employee.showRole ?? true, 
      showInPublicDirectory: employee.showInPublicDirectory ?? true, // Default true on create
      photoBase64: photoFile || null,
      createdAt: new Date().toISOString()
    };
    await addDoc(collection(db, "people"), docData);
  } catch (error) {
    console.error("Erro ao adicionar colaborador:", error);
    throw error;
  }
};

export const updateEmployee = async (id: string, employee: Partial<Employee>, photoFile?: string): Promise<void> => {
  try {
    const docRef = doc(db, "people", id);
    
    // Constrói objeto dinamicamente para evitar undefined e preservar campos existentes
    const docData: any = {
      updatedAt: new Date().toISOString()
    };
    
    if (employee.uid !== undefined) docData.uid = employee.uid;
    if (employee.name !== undefined) docData.name = employee.name;
    
    if (employee.role !== undefined) {
       docData.role = employee.role;
       docData.cargo = employee.role;
    }
    
    if (employee.systemRole !== undefined) docData.systemRole = employee.systemRole;
    
    if (employee.department !== undefined) {
       docData.department = employee.department;
       docData.sector = employee.department;
    }
    
    if (employee.unit !== undefined) docData.unit = employee.unit;
    
    if (employee.extension !== undefined) {
       docData.extension = employee.extension;
       docData.ramal = employee.extension;
    }
    
    if (employee.whatsapp !== undefined) docData.whatsapp = employee.whatsapp;
    if (employee.email !== undefined) docData.email = employee.email;
    if (employee.birthday !== undefined) docData.birthday = employee.birthday;
    
    if (employee.showRole !== undefined) docData.showRole = employee.showRole;
    if (employee.showInPublicDirectory !== undefined) docData.showInPublicDirectory = employee.showInPublicDirectory;

    if (photoFile) {
      docData.photoBase64 = photoFile;
    }

    await updateDoc(docRef, docData);
  } catch (error) {
    console.error("Erro ao atualizar colaborador:", error);
    throw error;
  }
};

export const removeEmployee = async (id: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, "people", id));
  } catch (error) {
    console.error("Erro ao remover colaborador:", error);
    throw error;
  }
};

// --- UNITS (Coleção: 'units') ---

export const fetchUnits = async (): Promise<OrganizationUnit[]> => {
  try {
    const snapshot = await getDocs(collection(db, "units"));
    return snapshot.docs.map(doc => ({
      id: doc.id,
      name: doc.data().name,
      address: doc.data().address || doc.data().cnpj || ''
    }));
  } catch (error) {
    console.error("Erro ao buscar unidades:", error);
    return [];
  }
};

export const addUnit = async (unit: OrganizationUnit): Promise<void> => {
  await addDoc(collection(db, "units"), {
    name: unit.name,
    address: unit.address
  });
};

export const updateUnit = async (unit: OrganizationUnit): Promise<void> => {
  const docRef = doc(db, "units", unit.id);
  await updateDoc(docRef, {
    name: unit.name,
    address: unit.address
  });
};

export const removeUnit = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, "units", id));
};

// --- DEPARTMENTS/SECTORS (Coleção: 'sectors') ---

export const fetchDepartments = async (): Promise<OrganizationDepartment[]> => {
  try {
    const snapshot = await getDocs(collection(db, "sectors"));
    return snapshot.docs.map(doc => ({
      id: doc.id,
      name: doc.data().name,
    }));
  } catch (error) {
    console.error("Erro ao buscar setores:", error);
    return [];
  }
};

export const addDepartment = async (dept: OrganizationDepartment): Promise<void> => {
  await addDoc(collection(db, "sectors"), {
    name: dept.name
  });
};

export const updateDepartment = async (dept: OrganizationDepartment): Promise<void> => {
  const docRef = doc(db, "sectors", dept.id);
  await updateDoc(docRef, { name: dept.name });
};

export const removeDepartment = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, "sectors", id));
};

// --- TASKS (Coleção: 'tasks') ---

export const fetchTasks = async (): Promise<Task[]> => {
  try {
    const snapshot = await getDocs(collection(db, "tasks"));
    return snapshot.docs.map(doc => ({
      id: doc.id,
      title: doc.data().title,
      description: doc.data().description,
      assigneeId: doc.data().assigneeId,
      status: doc.data().status,
      dueDate: doc.data().dueDate
    } as Task));
  } catch (error) {
    console.error("Erro ao buscar tarefas:", error);
    return [];
  }
};

export const addTask = async (task: Partial<Task>): Promise<void> => {
  try {
    const safeTask = {
      title: task.title,
      description: task.description || '',
      assigneeId: task.assigneeId || '',
      status: task.status,
      dueDate: task.dueDate,
      createdAt: new Date().toISOString()
    };
    
    await addDoc(collection(db, "tasks"), safeTask);
  } catch (error) {
    console.error("Erro ao criar tarefa:", error);
    throw error;
  }
};

export const updateTask = async (id: string, task: Partial<Task>): Promise<void> => {
  const docRef = doc(db, "tasks", id);
  // Remove undefined fields
  const updateData: any = { ...task };
  Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);
  
  await updateDoc(docRef, updateData);
};

export const deleteTask = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, "tasks", id));
};

// --- SYSTEMS (Coleção: 'systems') ---

export const fetchSystems = async (): Promise<SystemTool[]> => {
  try {
    const snapshot = await getDocs(collection(db, "systems"));
    return snapshot.docs.map(doc => ({
      id: doc.id,
      name: doc.data().name,
      description: doc.data().description,
      url: doc.data().url,
      logo: doc.data().logo,
      category: doc.data().category,
      allowedDepartments: doc.data().allowedDepartments || ['Todos']
    } as SystemTool));
  } catch (error) {
    console.error("Erro ao buscar sistemas:", error);
    return [];
  }
};

export const addSystem = async (system: Partial<SystemTool>): Promise<void> => {
  await addDoc(collection(db, "systems"), {
    name: system.name,
    description: system.description,
    url: system.url,
    logo: system.logo,
    category: system.category,
    allowedDepartments: system.allowedDepartments
  });
};

export const updateSystem = async (id: string, system: Partial<SystemTool>): Promise<void> => {
  const docRef = doc(db, "systems", id);
  await updateDoc(docRef, { ...system });
};

export const removeSystem = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, "systems", id));
};

// --- NEWS (Coleção: 'news') ---

export const fetchNews = async (): Promise<NewsArticle[]> => {
  try {
    const q = query(collection(db, "news"), orderBy("date", "desc"));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        title: data.title,
        author: data.author,
        date: data.date,
        category: data.category || 'Geral',
        thumbnail: data.thumbnail,
        blocks: data.blocks || [],
        published: data.published,
        externalUrl: data.externalUrl
      } as NewsArticle;
    });
  } catch (error) {
    console.error("Erro ao buscar notícias:", error);
    return [];
  }
};

export const addNews = async (article: Partial<NewsArticle>): Promise<void> => {
  try {
    // Sanitize data to prevent undefined values
    const safeArticle = {
      title: article.title || '',
      author: article.author || 'Comunicação',
      date: article.date || new Date().toISOString(),
      category: article.category || 'Geral',
      thumbnail: article.thumbnail || '',
      blocks: article.blocks || [],
      published: article.published ?? true,
      externalUrl: article.externalUrl || null,
      createdAt: new Date().toISOString()
    };

    await addDoc(collection(db, "news"), safeArticle);
  } catch (error) {
    console.error("Erro ao publicar notícia:", error);
    throw error;
  }
};

export const updateNews = async (id: string, article: Partial<NewsArticle>): Promise<void> => {
  const docRef = doc(db, "news", id);
  // Ensure undefined values are not passed
  const updateData: any = { 
    ...article,
    updatedAt: new Date().toISOString()
  };
  
  // Clean undefined from updateData if any
  Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);

  await updateDoc(docRef, updateData);
};

export const deleteNews = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, "news", id));
};

// --- MEETING ROOMS (Coleção: 'meetingRooms') ---

export const fetchMeetingRooms = async (): Promise<MeetingRoom[]> => {
  try {
    const snapshot = await getDocs(collection(db, "meetingRooms"));
    return snapshot.docs.map(doc => ({
      id: doc.id,
      name: doc.data().name,
      capacity: doc.data().capacity,
      features: doc.data().features || []
    } as MeetingRoom));
  } catch (error) {
    console.error("Erro ao buscar salas de reunião:", error);
    return [];
  }
};

export const addMeetingRoom = async (room: Partial<MeetingRoom>): Promise<void> => {
  try {
    await addDoc(collection(db, "meetingRooms"), {
      name: room.name,
      capacity: Number(room.capacity),
      features: room.features || []
    });
  } catch (error) {
    console.error("Erro ao adicionar sala:", error);
    throw error;
  }
};

export const updateMeetingRoom = async (id: string, room: Partial<MeetingRoom>): Promise<void> => {
  try {
    const docRef = doc(db, "meetingRooms", id);
    await updateDoc(docRef, {
      name: room.name,
      capacity: Number(room.capacity),
      features: room.features
    });
  } catch (error) {
    console.error("Erro ao atualizar sala:", error);
    throw error;
  }
};

export const deleteMeetingRoom = async (id: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, "meetingRooms", id));
  } catch (error) {
    console.error("Erro ao excluir sala:", error);
    throw error;
  }
};

// --- APPOINTMENTS (Coleção: 'appointments') ---

export const createAppointment = async (appointment: Omit<Appointment, 'id'>): Promise<void> => {
  const docId = `${appointment.roomId}_${appointment.date}_${appointment.time.replace(':', '-')}`;
  
  try {
    await setDoc(doc(db, "appointments", docId), {
      ...appointment,
      createdAt: new Date().toISOString()
    });
  } catch (error) {
    console.error("Erro ao criar agendamento:", error);
    throw new Error("Horário provavelmente já ocupado ou erro de conexão.");
  }
};

export const updateAppointment = async (id: string, updates: Partial<Appointment>): Promise<void> => {
  try {
    const docRef = doc(db, "appointments", id);
    await updateDoc(docRef, { ...updates });
  } catch (error) {
    console.error("Erro ao atualizar agendamento:", error);
    throw error;
  }
};

export const deleteAppointment = async (appointmentId: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, "appointments", appointmentId));
  } catch (error) {
    console.error("Erro ao cancelar agendamento:", error);
    throw error;
  }
};
