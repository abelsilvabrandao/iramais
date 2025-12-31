
import { Employee, Task, TaskStatus, NewsArticle, SystemTool, UserRole } from "./types";

// Helper to set a date relative to today for dynamic demo purposes
const getRelativeDate = (dayOffset: number) => {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const today = new Date();
const currentMonth = today.getMonth() + 1;
const currentYear = today.getFullYear();
const currentDay = today.getDate();

// Generates a date string for the current year
const getBirthdayDate = (dayOffset: number) => {
    const d = new Date();
    d.setDate(d.getDate() + dayOffset);
    return `${currentYear}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export const MOCK_EMPLOYEES: Employee[] = [
  // --- ANIVERSARIANTES DE HOJE (3 Pessoas) ---
  {
    id: '1',
    name: 'Abel Silva',
    role: 'Coordenador de TI',
    systemRole: UserRole.ADMIN,
    department: 'TI',
    extension: '1001',
    whatsapp: '5571999991001',
    email: 'abel.silva@intermaritima.com.br',
    avatar: 'https://ui-avatars.com/api/?name=Abel+Silva&background=0d9488&color=fff',
    birthday: getBirthdayDate(0), // HOJE
    showRole: true
  },
  {
    id: '6',
    name: 'Roberto Almeida',
    role: 'Analista de Logística',
    systemRole: UserRole.USER,
    department: 'Operações',
    extension: '3044',
    whatsapp: '5571999993044',
    email: 'roberto.almeida@intermaritima.com.br',
    avatar: 'https://picsum.photos/id/1005/200/200',
    birthday: getBirthdayDate(0), // HOJE
    showRole: true
  },
  {
    id: '7',
    name: 'Júlia Santos',
    role: 'Assistente Adm.',
    systemRole: UserRole.USER,
    department: 'Financeiro',
    extension: '4022',
    email: 'julia.santos@intermaritima.com.br',
    avatar: 'https://picsum.photos/id/342/200/200',
    birthday: getBirthdayDate(0), // HOJE
    showRole: true
  },

  // --- PRÓXIMOS ANIVERSARIANTES (Próximos 15 dias) ---
  {
    id: '2',
    name: 'Carlos Mendes',
    role: 'Dev Senior',
    systemRole: UserRole.USER,
    department: 'TI',
    extension: '2042',
    whatsapp: '5571999992042',
    email: 'carlos.mendes@intermaritima.com.br',
    avatar: 'https://picsum.photos/id/91/200/200',
    birthday: getBirthdayDate(2), // +2 dias
    showRole: true
  },
  {
    id: '8',
    name: 'Mariana Costa',
    role: 'Coord. Marketing',
    systemRole: UserRole.COMMUNICATION,
    department: 'Marketing',
    extension: '3100',
    email: 'mariana.costa@intermaritima.com.br',
    avatar: 'https://picsum.photos/id/832/200/200',
    birthday: getBirthdayDate(4), // +4 dias
    showRole: true
  },
  {
    id: '4',
    name: 'João Pereira',
    role: 'Coord. Financeiro',
    systemRole: UserRole.USER,
    department: 'Financeiro',
    extension: '4005',
    email: 'joao.pereira@intermaritima.com.br',
    avatar: 'https://picsum.photos/id/203/200/200',
    birthday: getBirthdayDate(7), // +7 dias
    showRole: true
  },
  {
    id: '9',
    name: 'Lucas Oliveira',
    role: 'Técnico de Seg.',
    systemRole: UserRole.USER,
    department: 'Segurança',
    extension: '5011',
    email: 'lucas.oliveira@intermaritima.com.br',
    avatar: 'https://picsum.photos/id/1012/200/200',
    birthday: getBirthdayDate(10), // +10 dias
    showRole: true
  },
  {
    id: '10',
    name: 'Patrícia Lima',
    role: 'Analista Fiscal',
    systemRole: UserRole.USER,
    department: 'Financeiro',
    extension: '4033',
    email: 'patricia.lima@intermaritima.com.br',
    avatar: 'https://picsum.photos/id/447/200/200',
    birthday: getBirthdayDate(12), // +12 dias
    showRole: true
  },
  {
    id: '11',
    name: 'Felipe Rocha',
    role: 'Operador',
    systemRole: UserRole.USER,
    department: 'Operações',
    extension: '3055',
    email: 'felipe.rocha@intermaritima.com.br',
    avatar: 'https://picsum.photos/id/1025/200/200',
    birthday: getBirthdayDate(15), // +15 dias
    showRole: true
  },

  // --- OUTROS ---
  {
    id: '3',
    name: 'Beatriz Costa',
    role: 'Analista Mkt',
    systemRole: UserRole.COMMUNICATION,
    department: 'Marketing',
    extension: '3010',
    whatsapp: '5571999993010',
    email: 'beatriz.costa@intermaritima.com.br',
    avatar: 'https://picsum.photos/id/129/200/200',
    birthday: '1995-02-10',
    showRole: true
  },
  {
    id: '5',
    name: 'Fernanda Lima',
    role: 'Designer UX',
    systemRole: UserRole.USER,
    department: 'Produto',
    extension: '2055',
    email: 'fernanda.lima@intermaritima.com.br',
    avatar: 'https://picsum.photos/id/338/200/200',
    birthday: '1993-07-30',
    showRole: true
  }
];

export const MOCK_TASKS: Task[] = [
  {
    id: 't1',
    title: 'Revisar Folha de Pagamento',
    description: 'Verificar horas extras e bonificações do mês corrente.',
    assigneeId: '1',
    status: TaskStatus.IN_PROGRESS,
    dueDate: '2023-11-30'
  },
  {
    id: 't2',
    title: 'Atualizar Servidor de Arquivos',
    description: 'Aplicar patches de segurança no servidor Linux principal.',
    assigneeId: '2',
    status: TaskStatus.TODO,
    dueDate: '2023-12-05'
  },
  {
    id: 't3',
    title: 'Campanha de Natal',
    description: 'Criar assets visuais para redes sociais.',
    assigneeId: '3',
    status: TaskStatus.DONE,
    dueDate: '2023-11-20'
  }
];

// Fix: Added missing required properties authorUid and isPublic for NewsArticle interface
export const MOCK_NEWS: NewsArticle[] = [
  {
    id: 'n5',
    title: 'Comunicado – Reajuste no Plano Odontológico MetLife',
    author: 'RH',
    authorUid: 'admin-rh-uid',
    date: '2023-11-24T09:00:00',
    category: 'Institucional',
    thumbnail: 'http://intranet.intermaritima.com.br/wp-content/uploads/2025/12/Comunicado-5-819x1024.jpg',
    published: true,
    isPublic: true,
    externalUrl: 'http://intranet.intermaritima.com.br/?p=6107',
    blocks: [
      {
        id: 'b1',
        type: 'paragraph',
        content: 'Informamos a todos os colaboradores sobre o reajuste anual do plano odontológico MetLife. Confira os novos valores e a tabela completa no link.',
        style: { fontSize: '16px', color: '#4b5563' }
      }
    ]
  },
  {
    id: 'n4',
    title: 'Treinamento Obrigatório de Segurança',
    author: 'SESMT',
    authorUid: 'admin-sesmt-uid',
    date: '2023-11-23T14:30:00',
    category: 'Segurança',
    thumbnail: 'https://picsum.photos/id/180/800/400',
    published: true,
    isPublic: true,
    blocks: [
      {
        id: 'b1',
        type: 'paragraph',
        content: 'Convocamos todos os colaboradores operacionais para o treinamento de reciclagem de NR-35 na próxima semana. A presença é obrigatória.',
        style: { fontSize: '16px', color: '#4b5563' }
      }
    ]
  },
  {
    id: 'n3',
    title: 'Confraternização de Final de Ano',
    author: 'RH',
    authorUid: 'admin-rh-uid',
    date: '2023-11-22T10:00:00',
    category: 'Eventos',
    thumbnail: 'https://picsum.photos/id/250/800/400',
    published: true,
    isPublic: true,
    blocks: [
      {
        id: 'b1',
        type: 'paragraph',
        content: 'Salve a data! Nossa festa anual será realizada no dia 15 de Dezembro. Teremos música ao vivo, sorteio de brindes e muito mais.',
        style: { fontSize: '16px', color: '#4b5563' }
      }
    ]
  },
  {
    id: 'n2',
    title: 'Manutenção Programada nos Servidores',
    author: 'TI',
    authorUid: 'admin-ti-uid',
    date: '2023-11-20T18:00:00',
    category: 'TI',
    thumbnail: 'https://picsum.photos/id/0/800/400',
    published: true,
    isPublic: true,
    blocks: [
      {
        id: 'b1',
        type: 'paragraph',
        content: 'Neste sábado, realizaremos uma manutenção programada das 14h às 18h. O acesso externo poderá ficar instável durante este período.',
        style: { fontSize: '16px', color: '#4b5563' }
      }
    ]
  },
  {
    id: 'n1',
    title: 'Novo Plano de Saúde',
    author: 'RH',
    authorUid: 'admin-rh-uid',
    date: '2023-10-25T08:00:00',
    category: 'RH',
    thumbnail: 'https://picsum.photos/id/48/800/400',
    published: true,
    isPublic: true,
    blocks: [
      {
        id: 'b1',
        type: 'header',
        content: 'Mudanças no Benefício a partir de Novembro',
        style: { fontSize: '24px', fontWeight: 'bold', color: '#1f2937' }
      },
      {
        id: 'b2',
        type: 'paragraph',
        content: 'Informamos a todos os colaboradores que a partir do próximo mês, passaremos a utilizar a nova operadora de saúde. Todos os cartões serão entregues até o dia 30.',
        style: { fontSize: '16px', color: '#4b5563' }
      }
    ]
  },
  {
    id: 'n6',
    title: 'Resultados Financeiros Q3',
    author: 'Financeiro',
    authorUid: 'admin-fin-uid',
    date: '2023-11-12T16:45:00',
    category: 'Financeiro',
    thumbnail: 'https://picsum.photos/id/160/800/400',
    published: true,
    isPublic: true,
    blocks: [
      {
        id: 'b1',
        type: 'paragraph',
        content: 'Apresentamos os resultados do terceiro trimestre, superando as expectativas em 15%. Agradecemos o empenho de todos.',
        style: { fontSize: '16px', color: '#4b5563' }
      }
    ]
  }
];

export const MOCK_SYSTEMS: SystemTool[] = [
  {
    id: 's1',
    name: 'Webmail Intermarítima',
    description: 'E-mail corporativo e agenda.',
    url: '#',
    logo: 'https://ui-avatars.com/api/?name=Web+Mail&background=047857&color=fff&size=128',
    category: 'Comunicação',
    allowedDepartments: ['Todos']
  },
  {
    id: 's2',
    name: 'Slack',
    description: 'Mensagens instantâneas e canais de equipe.',
    url: '#',
    logo: 'https://ui-avatars.com/api/?name=Slack&background=4a154b&color=fff&size=128',
    category: 'Comunicação',
    allowedDepartments: ['Todos']
  },
  {
    id: 's3',
    name: 'Jira Software',
    description: 'Gestão de projetos e rastreamento de tarefas.',
    url: '#',
    logo: 'https://ui-avatars.com/api/?name=Jira&background=0052cc&color=fff&size=128',
    category: 'Gestão',
    allowedDepartments: ['TI', 'Produto']
  },
  {
    id: 's4',
    name: 'Portal RH',
    description: 'Holerites, férias e benefícios.',
    url: '#',
    logo: 'https://ui-avatars.com/api/?name=Portal+RH&background=10b981&color=fff&size=128',
    category: 'RH',
    allowedDepartments: ['Todos']
  },
  {
    id: 's5',
    name: 'Salesforce',
    description: 'Gestão de relacionamento com clientes (CRM).',
    url: '#',
    logo: 'https://ui-avatars.com/api/?name=Salesforce&background=00a1e0&color=fff&size=128',
    category: 'Vendas',
    allowedDepartments: ['Vendas', 'Marketing']
  },
  {
    id: 's6',
    name: 'Confluence',
    description: 'Base de conhecimento e documentação.',
    url: '#',
    logo: 'https://ui-avatars.com/api/?name=Confluence&background=172b4d&color=fff&size=128',
    category: 'Gestão',
    allowedDepartments: ['TI', 'Produto', 'Marketing']
  },
  {
    id: 's7',
    name: 'GitHub',
    description: 'Repositório de código e versionamento.',
    url: '#',
    logo: 'https://ui-avatars.com/api/?name=GitHub&background=181717&color=fff&size=128',
    category: 'Desenvolvimento',
    allowedDepartments: ['TI']
  },
  {
    id: 's8',
    name: 'Figma',
    description: 'Design de interfaces e prototipagem.',
    url: '#',
    logo: 'https://ui-avatars.com/api/?name=Figma&background=f24e1e&color=fff&size=128',
    category: 'Design',
    allowedDepartments: ['Produto', 'Marketing']
  }
];
