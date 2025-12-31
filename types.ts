
export enum UserRole {
  MASTER = 'MASTER',
  ADMIN = 'ADMIN',
  COMMUNICATION = 'COMMUNICATION',
  USER = 'USER'
}

export enum TaskStatus {
  TODO = 'TODO',
  IN_PROGRESS = 'IN_PROGRESS',
  DONE = 'DONE'
}

export interface DeptTermsPermission {
  enabled: boolean;
  canCreateTemplates: boolean;
  canIssueTerms: boolean;
  canDelete: boolean;
  canReturn: boolean;
  canSeeAllSectors: boolean; 
}

export interface GlobalSettings {
  publicDirectory: boolean; 
  companyLogo?: string;
  showBirthdaysPublicly: boolean;
  showRoomsPublicly: boolean;
  showNewsPublicly: boolean;
  showRolePublicly: boolean;
  termsDeptPermissions?: Record<string, DeptTermsPermission>;
  // Novos campos de personalização do Welcome Section
  showWelcomeSection: boolean;
  welcomeTitle?: string;
  welcomeDescription?: string;
  welcomeBannerImage?: string;
  welcomePrimaryColor?: string;
  welcomeSecondaryColor?: string;
  welcomeTextAlignment?: 'left' | 'center' | 'right';
  welcomeDisableOverlay?: boolean;
  // Novos campos de visibilidade no Dashboard Interno
  dashboardShowRooms: boolean;
  dashboardShowNews: boolean;
  dashboardShowBirthdays: boolean;
  showRoleInternal: boolean;
}

export interface OrganizationUnit {
  id: string;
  name: string;
  image?: string; 
  site?: string;
  cnpj?: string;
  phone?: string;
  cep?: string;
  address?: string; 
  number?: string;
  complement?: string;
  neighborhood?: string; 
  city?: string;
  state?: string;
  certifications?: string[]; 
}

export interface OrganizationDepartment {
  id: string;
  name: string;
  description?: string;
}

export interface Employee {
  id: string;
  uid?: string; 
  name: string;
  role: string; 
  systemRole: UserRole; 
  department: string;
  unit?: string;
  extension: string;
  whatsapp?: string;
  email: string;
  avatar: string;
  birthday: string; 
  showRole?: boolean;
  showInPublicDirectory?: boolean; 
  signatureImage?: string; 
}

// --- TERMOS ---
export type TermType = 'entrega' | 'emprestimo' | 'devolucao';

export interface TableField {
  label: string;
  variable: string;
}

export type VariableMapping = 'none' | 'emp_name' | 'emp_role' | 'emp_dept' | 'doc_title' | 'doc_date' | 'doc_date_full' | 'emp_unit';

export interface CustomVariable {
  key: string;      
  label: string;    
  placeholder?: string;
  required?: boolean;
  mapping?: VariableMapping; 
  type?: 'text' | 'textarea'; 
}

export interface TermTemplate {
  id: string;
  name: string;
  title: string;
  type: TermType;
  responsibleDepartment: string; 
  content: string; 
  tableFields?: TableField[];
  customVariables: CustomVariable[];
  certificationImages?: string[]; 
  active: boolean;
  createdAt: string;
}

export interface Term {
  id: string;
  templateId: string;
  employeeId: string;
  employeeName: string;
  employeeCpf?: string;
  status: 'PENDENTE' | 'ASSINADO';
  type: TermType;
  data: Record<string, string>; 
  token: string; 
  issuerName?: string; 
  signedAt?: string;
  signatureImage?: string; 
  originalTermId?: string; 
  createdAt: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  assigneeId: string;
  status: TaskStatus;
  dueDate: string;
  creatorId?: string; 
  creatorDepartment?: string; 
  completedAt?: string | null; 
  completedBy?: string | null;
  signatureRequestId?: string; 
  termId?: string; 
}

export type BlockType = 'header' | 'paragraph' | 'image' | 'quote' | 'button' | 'side-by-side';

export interface StyleConfig {
  color?: string;
  backgroundColor?: string;
  fontSize?: string;
  fontWeight?: string;
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  padding?: string;
  borderRadius?: string; 
  layoutDirection?: 'row' | 'row-reverse';
}

export interface ContentBlock {
  id: string;
  type: BlockType;
  content: string; 
  url?: string; 
  style: StyleConfig;
}

export interface NewsArticle {
  id: string;
  title: string;
  author: string;
  authorUid: string;
  authorAvatar?: string;
  date: string;
  category: string; 
  thumbnail: string;
  blocks: ContentBlock[];
  published: boolean;
  isPublic: boolean;
  externalUrl?: string;
}

export interface SystemTool {
  id: string;
  name: string;
  description: string;
  url: string;
  logo: string;
  category: string;
  allowedDepartments: string[]; 
}

export interface ChatMessage {
  id: string;
  senderId: string; 
  receiverId: string;
  text: string;
  timestamp: string; 
  read: boolean;
  deleted?: boolean; 
}

export interface Notification {
  id: string;
  userId: string; 
  type: 'task' | 'chat' | 'system' | 'term';
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  link?: string; 
  senderId?: string; 
}

export interface MeetingRoom {
  id: string;
  name: string;
  capacity: number;
  features: string[]; 
  unitId?: string;
  startTime?: string;
  endTime?: string;
  worksSaturday?: boolean;
  worksSunday?: boolean;
}

export interface Appointment {
  id: string;
  roomId: string;
  date: string; 
  time: string; 
  userId: string;
  userName: string; 
  subject: string;
  participants?: string[]; 
  createdAt: string;
}

export interface SignatureData {
  name: string;
  email: string;
  unitId: string;
  sector: string;
  phones: {number: string, type: 'fixo' | 'celular'}[];
}

export interface SignatureLog {
  id: string;
  employeeName: string;
  employeeEmail: string;
  department: string;
  unitName: string;
  createdAt: string;
  generatedBy: string; 
  signatureData?: SignatureData; 
  origin: 'REQUEST' | 'MANUAL';
}

export interface SignatureRequest {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  status: 'PENDING' | 'COMPLETED'; 
  notes?: string;
  createdAt: string;
  completedAt?: string;
  completedBy?: string; 
  signatureData?: SignatureData;
  requestedData?: {
    name: string;
    email: string;
    sector: string;
    phoneFixed: string;
    phoneMobile: string;
  };
}
