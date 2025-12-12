
export enum UserRole {
  ADMIN = 'ADMIN',
  COMMUNICATION = 'COMMUNICATION',
  USER = 'USER'
}

export enum TaskStatus {
  TODO = 'TODO',
  IN_PROGRESS = 'IN_PROGRESS',
  DONE = 'DONE'
}

export interface GlobalSettings {
  publicDirectory: boolean; // Controls if directory is visible on Visitor Portal
}

export interface OrganizationUnit {
  id: string;
  name: string;
  address?: string;
}

export interface OrganizationDepartment {
  id: string;
  name: string;
}

export interface Employee {
  id: string;
  uid?: string; // Firebase Auth UID
  name: string;
  role: string; // Job Title (e.g. "Analista")
  systemRole: UserRole; // System Permission (e.g. ADMIN)
  department: string;
  unit?: string;
  extension: string;
  whatsapp?: string;
  email: string;
  avatar: string;
  birthday: string; // ISO date string YYYY-MM-DD
  showRole?: boolean;
  showInPublicDirectory?: boolean; // New: Controls visibility on Visitor Portal
}

export interface Task {
  id: string;
  title: string;
  description: string;
  assigneeId: string;
  status: TaskStatus;
  dueDate: string;
}

// News Builder Types
export type BlockType = 'header' | 'paragraph' | 'image' | 'quote' | 'button';

export interface StyleConfig {
  color?: string;
  backgroundColor?: string;
  fontSize?: string;
  fontWeight?: string;
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  padding?: string;
  borderRadius?: string; // New for buttons
}

export interface ContentBlock {
  id: string;
  type: BlockType;
  content: string; // Text content or Image URL
  url?: string; // Link destination for buttons
  style: StyleConfig;
}

export interface NewsArticle {
  id: string;
  title: string;
  author: string;
  date: string;
  category: string; 
  thumbnail: string;
  blocks: ContentBlock[];
  published: boolean;
  externalUrl?: string;
}

// Systems/Apps Types
export interface SystemTool {
  id: string;
  name: string;
  description: string;
  url: string;
  logo: string;
  category: string;
  allowedDepartments: string[]; // List of departments that can access this tool ('Todos' for all)
}

// Chat Types
export interface ChatMessage {
  id: string;
  senderId: string; // 'me' or employeeId
  text: string;
  timestamp: Date;
}

// Meeting Room Types
export interface MeetingRoom {
  id: string;
  name: string;
  capacity: number;
  features: string[]; // e.g. ['TV', 'Ar Condicionado']
}

export interface Appointment {
  id: string;
  roomId: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:00
  userId: string;
  userName: string; // Snapshot of name at booking time
  subject: string;
  participants?: string[]; // New: List of participant names
  createdAt: string;
}
