
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { 
  fetchEmployees, fetchNews, fetchSystems, fetchMeetingRooms, fetchGlobalSettings, 
  fetchDepartments, fetchUnits 
} from '../services/firebaseService';
import { Employee, NewsArticle, SystemTool, MeetingRoom, Appointment, OrganizationDepartment, OrganizationUnit } from '../types';
import { LogIn, ExternalLink, Mail, HelpCircle, Ticket, Tag, ChevronRight, Cake, PartyPopper, CalendarDays, Loader2, Calendar, MapPin, User, LayoutDashboard, Users, Search, Phone, Building2, PhoneCall, Filter } from 'lucide-react';
import { db } from '../services/firebaseConfig';
import { collection, query, where, getDocs } from 'firebase/firestore';
import Logo from '../components/Logo';
import { useAuth } from '../contexts/AuthContext'; 

// --- Componentes Auxiliares do Diretório ---

// Simple WhatsApp SVG Icon component
const WhatsAppIcon = ({ size = 18, className = "" }: { size?: number, className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M3 21l1.65-3.8a9 9 0 1 1 3.4 2.9L3 21" />
    <path d="M9 10a.5.5 0 0 0 1 0V9a.5.5 0 0 0-1 0v1a5 5 0 0 0 5 5h1a.5.5 0 0 0 0-1h-1a.5.5 0 0 0 0 1" />
  </svg>
);

// Componente Deslizante para Ligar
const SwipeToCall = ({ extension }: { extension: string }) => {
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [completed, setCompleted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef(0);
  const currentDragXRef = useRef(0);

  const handleStart = (clientX: number) => {
    setIsDragging(true);
    startXRef.current = clientX;
    setCompleted(false);
  };

  const handleMove = (clientX: number) => {
    if (!isDragging || !containerRef.current || !buttonRef.current || completed) return;
    const containerWidth = containerRef.current.offsetWidth;
    const buttonWidth = buttonRef.current.offsetWidth;
    const maxDrag = containerWidth - buttonWidth;
    let newX = currentDragXRef.current + (clientX - startXRef.current);
    if (newX < 0) newX = 0;
    if (newX > maxDrag) newX = maxDrag;
    setDragX(newX);
  };

  const handleEnd = () => {
    if (!isDragging || !containerRef.current || !buttonRef.current) return;
    const containerWidth = containerRef.current.offsetWidth;
    const buttonWidth = buttonRef.current.offsetWidth;
    const maxDrag = containerWidth - buttonWidth;
    const threshold = maxDrag * 0.9; 

    if (dragX >= threshold) {
      setCompleted(true);
      setDragX(maxDrag);
      window.location.href = `tel:713879${extension}`;
      setTimeout(() => {
        setCompleted(false);
        setDragX(0);
        currentDragXRef.current = 0;
      }, 2000);
    } else {
      setDragX(0);
      currentDragXRef.current = 0;
    }
    setIsDragging(false);
  };

  const onMouseDown = (e: React.MouseEvent) => { handleStart(e.clientX); currentDragXRef.current = dragX; };
  const onMouseMove = (e: React.MouseEvent) => { if (isDragging) handleMove(e.clientX); };
  const onMouseUp = () => { handleEnd(); };
  const onMouseLeave = () => { if (isDragging) handleEnd(); };
  const onTouchStart = (e: React.TouchEvent) => { handleStart(e.touches[0].clientX); currentDragXRef.current = dragX; };
  const onTouchMove = (e: React.TouchEvent) => { if (isDragging) handleMove(e.touches[0].clientX); };
  const onTouchEnd = () => { handleEnd(); };

  return (
    <div 
      ref={containerRef}
      className={`relative h-12 rounded-full overflow-hidden select-none transition-colors duration-300 ${completed ? 'bg-green-500' : 'bg-slate-100 border border-slate-200'}`}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseLeave}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <div className={`absolute inset-0 flex items-center justify-center text-sm font-medium transition-opacity duration-300 ${isDragging ? 'opacity-50' : 'opacity-100'}`}>
        {completed ? (
          <span className="text-white font-bold flex items-center gap-2"><PhoneCall size={16}/> Ligando...</span>
        ) : (
          <span className="text-slate-500 flex items-center gap-2 pl-4">
             Ramal <span className="text-slate-800 font-bold">{extension}</span> <ChevronRight size={14} className="opacity-50"/>
          </span>
        )}
      </div>
      <div
        ref={buttonRef}
        style={{ transform: `translateX(${dragX}px)`, touchAction: 'none' }}
        className={`absolute top-1 bottom-1 w-10 h-10 rounded-full flex items-center justify-center shadow-md cursor-grab active:cursor-grabbing z-10 transition-colors duration-200 ${
          completed ? 'bg-white text-green-600' : 'bg-emerald-600 text-white left-1'
        }`}
        onMouseDown={onMouseDown}
        onTouchStart={onTouchStart}
      >
        <Phone size={18} className={completed ? 'animate-pulse' : ''} />
      </div>
    </div>
  );
};

const formatNewsDate = (isoString: string) => {
  if (!isoString) return '';
  try {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  } catch (e) {
    return isoString;
  }
};

// Gera horários de 30 em 30 minutos
const generateTimeSlots = () => {
  const slots = [];
  for (let hour = 8; hour <= 17; hour++) {
    slots.push(`${String(hour).padStart(2, '0')}:00`);
    slots.push(`${String(hour).padStart(2, '0')}:30`);
  }
  return slots;
};

const TIME_SLOTS = generateTimeSlots();

interface NewsCardProps {
  news: any;
  featured?: boolean;
}

const NewsCard: React.FC<NewsCardProps> = ({ news, featured = false }) => {
   const Wrapper = news.externalUrl ? 'a' : 'div';
   const props = news.externalUrl 
     ? { href: news.externalUrl, target: '_blank', rel: 'noopener noreferrer' } 
     : {};
   
   if (featured) {
     return (
       // @ts-ignore
       <Wrapper {...props} className="group cursor-pointer block">
          <div className="relative h-64 md:h-96 rounded-2xl overflow-hidden shadow-md bg-slate-200">
            <img src={news.thumbnail} alt={news.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/40 to-transparent flex flex-col justify-end p-6 md:p-8">
              <span className="bg-emerald-600 text-white text-xs font-bold px-3 py-1 rounded-full self-start mb-3">
                {news.category}
              </span>
              <h3 className="text-2xl md:text-3xl font-bold text-white mb-2 leading-tight">{news.title}</h3>
              <p className="text-slate-200 line-clamp-2 md:w-3/4 mb-2">
                  {news.blocks.find((b: any) => b.type === 'paragraph')?.content}
              </p>
              <span className="text-emerald-300 text-xs font-medium">
                {formatNewsDate(news.date)}
              </span>
            </div>
          </div>
       </Wrapper>
     );
   }

   return (
     // @ts-ignore
     <Wrapper {...props} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex gap-4 hover:shadow-md transition-shadow cursor-pointer block h-full">
        <div className="w-24 h-24 flex-shrink-0 bg-slate-200 rounded-lg overflow-hidden relative">
          <img src={news.thumbnail} alt={news.title} className="w-full h-full object-cover" />
        </div>
        <div className="flex flex-col justify-between flex-1 min-w-0">
          <div>
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded mb-1 inline-block">
              {news.category}
            </span>
            <h4 className="font-bold text-slate-800 line-clamp-2 text-sm md:text-base leading-snug mb-1">{news.title}</h4>
            <p className="text-xs text-slate-500 line-clamp-2">
               {news.blocks.find((b: any) => b.type === 'paragraph')?.content}
            </p>
          </div>
          <div className="mt-2">
            <span className="text-[10px] text-slate-400 block font-medium">
              {formatNewsDate(news.date)}
            </span>
          </div>
        </div>
     </Wrapper>
   );
};

const VisitorPortal: React.FC = () => {
  const { currentUser, loading: authLoading } = useAuth();
  
  const [selectedCategory, setSelectedCategory] = useState('Todas');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [newsList, setNewsList] = useState<NewsArticle[]>([]);
  const [systems, setSystems] = useState<SystemTool[]>([]);
  const [rooms, setRooms] = useState<MeetingRoom[]>([]);
  const [todaysAppointments, setTodaysAppointments] = useState<Appointment[]>([]);
  const [publicDirectoryEnabled, setPublicDirectoryEnabled] = useState(true);
  const [departmentsList, setDepartmentsList] = useState<OrganizationDepartment[]>([]);
  const [unitsList, setUnitsList] = useState<OrganizationUnit[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Search State for Public Directory
  const [searchTerm, setSearchTerm] = useState('');
  const [deptFilter, setDeptFilter] = useState('All');
  const [unitFilter, setUnitFilter] = useState('All');

  // Load Real Data
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const todayStr = new Date().toISOString().split('T')[0];

        // Parallel fetch
        const [empData, newsData, sysData, roomsData, settingsData, deptsData, unitsData] = await Promise.all([
          fetchEmployees(),
          fetchNews(),
          fetchSystems(),
          fetchMeetingRooms(),
          fetchGlobalSettings(),
          fetchDepartments(),
          fetchUnits()
        ]);

        const q = query(collection(db, "appointments"), where("date", "==", todayStr));
        const appSnapshot = await getDocs(q);
        const apps = appSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Appointment));

        setEmployees(empData);
        setNewsList(newsData.filter(n => n.published));
        setSystems(sysData);
        setRooms(roomsData);
        setTodaysAppointments(apps);
        setPublicDirectoryEnabled(settingsData.publicDirectory);
        setDepartmentsList(deptsData);
        setUnitsList(unitsData);

      } catch (error) {
        console.error("Erro ao carregar portal do visitante:", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  const cleanWhatsAppNumber = (phone: string) => phone.replace(/\D/g, '');

  // Filter Employees for Public Directory
  const filteredEmployees = useMemo(() => {
    if (!publicDirectoryEnabled) return [];
    
    // 1. Privacy Filter
    let list = employees.filter(e => e.showInPublicDirectory !== false);

    // 2. Search Filter
    if (searchTerm.trim()) {
      const lowerTerm = searchTerm.toLowerCase();
      list = list.filter(e => 
        e.name.toLowerCase().includes(lowerTerm) ||
        (e.extension && e.extension.includes(lowerTerm)) ||
        e.department.toLowerCase().includes(lowerTerm) ||
        e.role.toLowerCase().includes(lowerTerm)
      );
    }

    // 3. Department Filter
    if (deptFilter !== 'All') {
      list = list.filter(e => e.department === deptFilter);
    }

    // 4. Unit Filter
    if (unitFilter !== 'All') {
      list = list.filter(e => e.unit === unitFilter);
    }
    
    // Sort
    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [employees, searchTerm, deptFilter, unitFilter, publicDirectoryEnabled]);


  // Extract all categories from news
  const categories = useMemo(() => {
    const cats = new Set(newsList.map(n => n.category));
    return ['Todas', ...Array.from(cats)];
  }, [newsList]);

  // Birthday Logic
  const { todaysBirthdays, upcomingBirthdays } = useMemo(() => {
    const today = new Date();
    const currentDay = today.getDate();
    const currentMonth = today.getMonth() + 1;

    const relevantEmployees = employees.filter(emp => {
      if (!emp.birthday) return false;
      const [_, mStr] = emp.birthday.split('-');
      const m = parseInt(mStr);
      return m === currentMonth;
    });

    const todayList = relevantEmployees.filter(emp => {
      const [_, __, dStr] = emp.birthday.split('-');
      return parseInt(dStr) === currentDay;
    });

    const upcomingList = relevantEmployees.filter(emp => {
      const [_, __, dStr] = emp.birthday.split('-');
      return parseInt(dStr) > currentDay;
    }).sort((a, b) => {
      const dayA = parseInt(a.birthday.split('-')[2]);
      const dayB = parseInt(b.birthday.split('-')[2]);
      return dayA - dayB;
    });

    return { todaysBirthdays: todayList, upcomingBirthdays: upcomingList };
  }, [employees]);

  // Room Status Helper
  const getRoomInfo = (roomId: string) => {
    const now = new Date();
    const roomApps = todaysAppointments
      .filter(a => a.roomId === roomId)
      .sort((a, b) => {
        const [hA, mA] = a.time.split(':').map(Number);
        const [hB, mB] = b.time.split(':').map(Number);
        return (hA * 60 + mA) - (hB * 60 + mB);
      });

    const currentMeeting = roomApps.find(a => {
      const [h, m] = a.time.split(':').map(Number);
      const appStart = new Date();
      appStart.setHours(h, m, 0, 0);
      const appEnd = new Date(appStart);
      appEnd.setMinutes(appStart.getMinutes() + 30);
      return now >= appStart && now < appEnd;
    });

    return {
      isOccupied: !!currentMeeting,
      currentMeeting,
      schedule: roomApps
    };
  };

  const filteredNews = useMemo(() => {
    if (selectedCategory === 'Todas') return newsList;
    return newsList.filter(n => n.category === selectedCategory);
  }, [selectedCategory, newsList]);

  const featuredNews = filteredNews[0];
  const secondaryNews = filteredNews.slice(1, 3);
  const isFiltered = selectedCategory !== 'Todas';

  const todayDateDisplay = useMemo(() => {
    const date = new Date();
    const options: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
    const formatted = date.toLocaleDateString('pt-BR', options);
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  }, []);

  if (isLoading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <Logo className="h-12 w-auto animate-pulse" />
          <div className="flex items-center gap-2 text-emerald-700 font-medium">
            <Loader2 className="animate-spin" /> Carregando portal...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      
      {/* Top Navigation */}
      <header className="bg-slate-900 text-white shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <Logo className="h-10 w-auto" />
          </div>
          
          {currentUser ? (
            <Link to="/dashboard" className="flex items-center gap-3 group">
               <div className="text-right hidden sm:block">
                  <p className="text-xs text-slate-300">Olá,</p>
                  <p className="text-sm font-bold leading-none">{currentUser.name.split(' ')[0]}</p>
               </div>
               <div className="flex items-center gap-2 text-sm font-medium bg-emerald-600 hover:bg-emerald-500 px-4 py-2 rounded-full transition-colors shadow-lg shadow-emerald-900/50">
                  <LayoutDashboard size={16} />
                  Ir para Dashboard
               </div>
            </Link>
          ) : (
            <Link to="/login" className="flex items-center gap-2 text-sm font-medium bg-white/10 hover:bg-white/20 px-4 py-2 rounded-full transition-colors">
              <LogIn size={16} />
              Área do Colaborador
            </Link>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">
        
        {/* Hero Section */}
        <section className="bg-gradient-to-r from-emerald-700 to-teal-800 rounded-3xl p-8 md:p-12 text-center text-white shadow-xl relative overflow-hidden">
          <div className="relative z-10 max-w-2xl mx-auto">
            <h1 className="text-3xl md:text-4xl font-bold mb-4">Bem-vindo ao iRamais Hub</h1>
            <p className="text-emerald-100 text-lg">
              Gestão inteligente de ramais, reservas de salas, notícias corporativas e acesso unificado aos sistemas da empresa.
            </p>
          </div>
          
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full blur-3xl -ml-16 -mb-16"></div>
        </section>

        {/* --- RAMAIS PÚBLICOS / BUSCA DE COLABORADORES --- */}
        {publicDirectoryEnabled && (
          <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8 animate-fade-in">
             {/* Header do Diretório */}
             <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div>
                   <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                     <Phone className="text-emerald-600" /> Diretório de Pessoas
                   </h2>
                   <p className="text-slate-500 text-sm">Encontre contatos e ramais de todos os colaboradores</p>
                </div>
                
                {/* Filtros */}
                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                  <div className="relative flex-1 sm:flex-none w-full sm:w-64">
                    <Search className="absolute left-3 top-3 text-slate-400 w-4 h-4" />
                    <input 
                      type="text" 
                      placeholder="Buscar por nome ou ramal..." 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 w-full text-slate-900"
                    />
                  </div>
                  
                  <div className="flex gap-2 w-full sm:w-auto">
                    <div className="relative flex-1 sm:flex-none">
                       <select 
                        value={deptFilter}
                        onChange={(e) => setDeptFilter(e.target.value)}
                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 appearance-none pr-8"
                      >
                        <option value="All">Departamentos</option>
                        {departmentsList.map(dept => (
                          <option key={dept.id} value={dept.name}>{dept.name}</option>
                        ))}
                      </select>
                      <Filter className="absolute right-3 top-3 text-slate-400 w-3 h-3 pointer-events-none" />
                    </div>

                    <div className="relative flex-1 sm:flex-none">
                      <select 
                        value={unitFilter}
                        onChange={(e) => setUnitFilter(e.target.value)}
                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 appearance-none pr-8"
                      >
                        <option value="All">Unidades</option>
                        {unitsList.map(unit => (
                          <option key={unit.id} value={unit.name}>{unit.name}</option>
                        ))}
                      </select>
                      <MapPin className="absolute right-3 top-3 text-slate-400 w-3 h-3 pointer-events-none" />
                    </div>
                  </div>
                </div>
             </div>

             {/* Grid de Cards */}
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 max-h-[600px] overflow-y-auto custom-scrollbar p-1">
                {filteredEmployees.map(emp => (
                   <div key={emp.id} className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 flex flex-col items-center text-center transition-all hover:shadow-lg hover:-translate-y-1 group relative">
            
                      <div className="w-24 h-24 mb-4 relative">
                        <img 
                          src={emp.avatar} 
                          alt={emp.name} 
                          className="w-full h-full rounded-full object-cover border-4 border-slate-50 group-hover:border-emerald-50 transition-colors"
                        />
                        <div className="absolute bottom-1 right-1 w-5 h-5 bg-emerald-500 rounded-full border-2 border-white" title="Online"></div>
                      </div>
                      
                      <h3 className="font-bold text-lg text-slate-900">{emp.name}</h3>
                      {emp.showRole !== false && (
                        <p className="text-emerald-600 text-sm font-medium mb-1">{emp.role}</p>
                      )}
                      
                      <div className="flex flex-col items-center gap-1 mb-4">
                        <p className="text-slate-400 text-xs flex items-center gap-1 bg-slate-50 px-2 py-0.5 rounded">
                          <Building2 size={12} /> {emp.department}
                        </p>
                        {emp.unit && (
                          <p className="text-slate-400 text-[10px] flex items-center gap-1">
                            <MapPin size={10} /> {emp.unit}
                          </p>
                        )}
                      </div>

                      <div className="w-full space-y-3 mt-auto">
                        
                        {emp.extension ? (
                           <SwipeToCall extension={emp.extension} />
                        ) : (
                          <div className="h-12 flex items-center justify-center bg-slate-50 rounded-lg border border-dashed border-slate-200 text-slate-400 text-xs uppercase font-medium">
                             Sem Ramal
                          </div>
                        )}

                        <div className="flex gap-2">
                           {emp.whatsapp && (
                              <a 
                                href={`https://wa.me/${cleanWhatsAppNumber(emp.whatsapp)}`} 
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-1 flex items-center justify-center p-2 border border-green-200 bg-green-50 rounded-lg text-green-600 hover:bg-green-100 transition-colors"
                                title="WhatsApp"
                              >
                                <WhatsAppIcon size={18} /> <span className="ml-2 text-xs font-bold">WhatsApp</span>
                              </a>
                           )}

                           <a 
                              href={`mailto:${emp.email}`} 
                              className={`flex items-center justify-center p-2 border border-slate-200 rounded-lg text-slate-400 hover:bg-slate-50 hover:text-emerald-600 transition-colors ${!emp.whatsapp ? 'flex-1' : ''}`}
                              title="Enviar E-mail"
                           >
                              <Mail size={18} />
                           </a>
                        </div>
                      </div>
                   </div>
                ))}
                
                {filteredEmployees.length === 0 && (
                   <div className="col-span-full py-12 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                      <p className="font-medium">Nenhum colaborador encontrado.</p>
                      <p className="text-xs mt-1">Tente ajustar os filtros de busca.</p>
                   </div>
                )}
             </div>
          </section>
        )}

        {/* Content Grid: News & Widgets */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: News (2/3) */}
          <div className="lg:col-span-2 space-y-8">
            <div className="flex items-center justify-between border-l-4 border-emerald-600 pl-3">
              <h2 className="text-2xl font-bold text-slate-800">
                {selectedCategory === 'Todas' ? 'Destaques Corporativos' : `Notícias: ${selectedCategory}`}
              </h2>
              {isFiltered && (
                <button 
                  onClick={() => setSelectedCategory('Todas')} 
                  className="text-sm text-emerald-600 hover:underline"
                >
                  Ver todas
                </button>
              )}
            </div>
            
            {/* Featured Article */}
            {featuredNews ? (
              <NewsCard news={featuredNews} featured={true} />
            ) : (
              <div className="p-12 text-center bg-slate-100 rounded-xl text-slate-500 border border-slate-200 border-dashed">
                <p>Nenhuma notícia encontrada.</p>
                {selectedCategory !== 'Todas' && (
                   <button onClick={() => setSelectedCategory('Todas')} className="text-emerald-600 underline mt-2 text-sm">
                     Ver todas as categorias
                   </button>
                )}
              </div>
            )}

            {/* Other News Grid (Next 2 items) */}
            {secondaryNews.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {secondaryNews.map(news => (
                   <NewsCard key={news.id} news={news} />
                ))}
              </div>
            )}
          </div>

          {/* Right Column: Widgets (1/3) */}
          <div className="space-y-8">
            
            {/* Categories Widget */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
              <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Tag size={18} className="text-emerald-600" /> Acesso Rápido
              </h3>
              <div className="space-y-1">
                {categories.length > 1 ? (
                  categories.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                        selectedCategory === cat 
                          ? 'bg-emerald-50 text-emerald-700 font-bold' 
                          : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <span>{cat}</span>
                      {selectedCategory === cat && <ChevronRight size={14} />}
                    </button>
                  ))
                ) : (
                  <p className="text-sm text-slate-400 italic">Sem categorias disponíveis.</p>
                )}
              </div>
            </div>

            {/* Meeting Rooms Status Widget */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
               <div className="flex items-center justify-between mb-4">
                 <h3 className="font-bold text-slate-800 flex items-center gap-2">
                   <Calendar size={18} className="text-indigo-600" /> Status das Salas
                 </h3>
                 <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded">Hoje</span>
               </div>
               
               <div className="space-y-4">
                  {rooms.length > 0 ? rooms.map(room => {
                    const { isOccupied, currentMeeting, schedule } = getRoomInfo(room.id);
                    return (
                      <div key={room.id} className="border border-slate-100 rounded-xl p-3 bg-slate-50/50">
                         <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                               <MapPin size={14} className="text-slate-400" />
                               <span className="text-sm font-bold text-slate-700">{room.name}</span>
                            </div>
                            <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${isOccupied ? 'bg-red-50 text-red-600 border-red-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                              {isOccupied ? 'Ocupada Agora' : 'Livre Agora'}
                            </span>
                         </div>
                         
                         {/* Schedule Grid Detailed */}
                         <div className="mt-3">
                            <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Agenda Hoje:</p>
                            <div className="grid grid-cols-2 gap-2">
                              {TIME_SLOTS.map(time => {
                                 const appointment = schedule.find(a => a.time === time);
                                 const isSlotOccupied = !!appointment;
                                 const [h, m] = time.split(':').map(Number);
                                 const now = new Date();
                                 const isPast = now.getHours() > h || (now.getHours() === h && now.getMinutes() >= m + 30);

                                 if (isSlotOccupied) {
                                   const participantCount = appointment.participants?.length || 0;
                                   const participantInfo = participantCount > 0 ? ` (+ ${participantCount} convidados: ${appointment.participants?.join(', ')})` : '';
                                   
                                   const tooltip = isPast 
                                      ? `Encerrado: ${appointment.subject} - ${appointment.userName}${participantInfo}` 
                                      : `Ocupado por ${appointment.userName}: ${appointment.subject}${participantInfo}`;

                                   return (
                                     <div 
                                       key={time} 
                                       className={`flex flex-col border rounded p-1.5 ${isPast ? 'bg-slate-100 border-slate-200 opacity-60 grayscale-[50%]' : 'bg-red-50 border-red-100'}`}
                                       title={tooltip}
                                     >
                                       <div className={`flex justify-between items-center text-[10px] font-bold mb-0.5 ${isPast ? 'text-slate-500' : 'text-red-700'}`}>
                                          <span className="flex items-center gap-1">
                                            {time} {isPast && <span className="text-[8px] uppercase border border-slate-300 px-1 rounded bg-white">Encerrado</span>}
                                          </span>
                                          <User size={10} />
                                       </div>
                                       <span className={`text-[9px] truncate font-medium leading-tight ${isPast ? 'text-slate-500' : 'text-slate-700'}`}>
                                         {appointment.subject}
                                       </span>
                                       <span className="text-[8px] text-slate-500 truncate flex items-center gap-1">
                                         {appointment.userName.split(' ')[0]}
                                         {participantCount > 0 && (
                                           <span className="flex items-center gap-0.5 bg-white/50 px-1 rounded">
                                             <Users size={8} /> +{participantCount}
                                           </span>
                                         )}
                                       </span>
                                     </div>
                                   );
                                 }

                                 if (isPast) {
                                   return (
                                     <div key={time} className="flex items-center justify-between bg-slate-100 border border-slate-200 rounded p-1.5 opacity-50">
                                       <span className="text-[10px] font-bold text-slate-400">{time}</span>
                                       <span className="text-[8px] uppercase tracking-wide text-slate-400 font-bold">Encerrado</span>
                                     </div>
                                   );
                                 }

                                 return (
                                   <div 
                                     key={time} 
                                     className="flex items-center justify-between bg-emerald-50 border border-emerald-100 rounded p-1.5"
                                   >
                                     <span className="text-[10px] font-bold text-emerald-700">{time}</span>
                                     <span className="text-[8px] uppercase tracking-wide text-emerald-600/70 font-medium">Livre</span>
                                   </div>
                                 );
                              })}
                            </div>
                         </div>
                      </div>
                    );
                  }) : (
                    <p className="text-sm text-slate-400 text-center py-4">Nenhuma sala cadastrada.</p>
                  )}
               </div>
            </div>

            {/* Quick Access Systems */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
              <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                <ExternalLink size={18} className="text-emerald-600" /> Sistemas / Links
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {systems.length > 0 ? (
                  systems.slice(0, 6).map(sys => (
                    <a 
                      key={sys.id} 
                      href={sys.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex flex-col items-center justify-center p-3 rounded-xl bg-slate-50 hover:bg-emerald-50 hover:text-emerald-700 transition-colors group text-center border border-slate-50 hover:border-emerald-100"
                    >
                      <div className="w-8 h-8 rounded-lg overflow-hidden mb-2 shadow-sm bg-white">
                        <img src={sys.logo} alt="" className="w-full h-full object-cover" />
                      </div>
                      <span className="text-xs font-medium text-slate-600 group-hover:text-emerald-700 truncate w-full">{sys.name}</span>
                    </a>
                  ))
                ) : (
                  <p className="col-span-2 text-sm text-slate-400 text-center italic">Nenhum sistema público.</p>
                )}
              </div>
            </div>

            {/* Birthdays Widget - Organized */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
               <div className="p-4 border-b border-slate-50 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <Cake size={18} className="text-pink-500" /> Aniversariantes
                  </h3>
                  <div className="flex items-center gap-1.5 text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-wide bg-white px-3 py-1 rounded-full border border-slate-100 shadow-sm">
                     <CalendarDays size={12} className="text-emerald-500"/>
                     {todayDateDisplay}
                  </div>
               </div>
               
               <div className="divide-y divide-slate-50">
                  {/* Today Section */}
                  {todaysBirthdays.length > 0 && (
                    <div className="p-4 bg-gradient-to-r from-pink-50 via-orange-50 to-white">
                      <p className="text-xs font-bold text-orange-600 uppercase tracking-wider mb-3 flex items-center gap-1.5 animate-pulse">
                        <PartyPopper size={14} /> É o dia deles hoje!
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {todaysBirthdays.map(emp => (
                          <div key={emp.id} className="flex flex-col items-center bg-white/60 rounded-lg p-2 border border-orange-100 text-center">
                             <div className="relative mb-1">
                               <img src={emp.avatar} alt={emp.name} className="w-10 h-10 rounded-full border-2 border-orange-200 shadow-sm object-cover" />
                               <span className="absolute -bottom-1 -right-1 bg-orange-500 text-white text-[8px] p-0.5 rounded-full border border-white">🎁</span>
                             </div>
                             <div className="w-full">
                               <p className="text-xs font-bold text-slate-800 truncate w-full">{emp.name.split(' ')[0]}</p>
                               <p className="text-[10px] text-slate-500 truncate w-full">{emp.department}</p>
                             </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Upcoming Section */}
                  <div className="p-4">
                     <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                       <CalendarDays size={14} /> Próximos
                     </p>
                     {upcomingBirthdays.length > 0 ? (
                       <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                         {upcomingBirthdays.map(emp => (
                           <div key={emp.id} className="flex flex-col items-center bg-slate-50 rounded-lg p-2 border border-slate-100 hover:border-emerald-200 transition-colors group text-center">
                              <img src={emp.avatar} alt={emp.name} className="w-8 h-8 rounded-full border border-slate-200 mb-1 object-cover" />
                              <div className="w-full">
                                <p className="text-xs font-medium text-slate-700 truncate group-hover:text-emerald-700 transition-colors">{emp.name.split(' ')[0]}</p>
                                <p className="text-[10px] text-slate-400 truncate mb-1">{emp.department}</p>
                              </div>
                              <div className="text-[10px] font-bold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-100 w-full">
                                 Dia {emp.birthday.split('-')[2]}
                              </div>
                           </div>
                         ))}
                       </div>
                     ) : (
                       <p className="text-sm text-slate-400 italic py-2">Sem mais aniversários este mês.</p>
                     )}
                  </div>
               </div>
            </div>

          </div>
        </div>

        {/* IT Support Banner (Footer Style) */}
        <section className="bg-slate-900 rounded-2xl p-8 text-white flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-600/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

          <div className="relative z-10 text-center md:text-left">
            <h3 className="text-xl font-bold mb-2 flex items-center justify-center md:justify-start gap-2">
              <HelpCircle className="text-emerald-400" /> Precisa de Suporte TI?
            </h3>
            <p className="text-slate-400 text-sm max-w-md">
              Nossa equipe está disponível para ajudar com problemas de acesso, hardware ou software.
            </p>
          </div>
          
          <div className="relative z-10 flex flex-col lg:flex-row gap-4 w-full md:w-auto">
              <div className="flex items-center gap-4 bg-slate-800/50 border border-slate-700 px-6 py-4 rounded-xl flex-1 lg:flex-none hover:bg-slate-800 transition-colors cursor-default">
                <div className="bg-emerald-900/50 p-3 rounded-lg text-emerald-400">
                  <Mail size={24} /> 
                </div>
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">E-mail</p>
                  <p className="font-bold text-lg text-white">informatica@intermaritima.com.br</p>
                </div>
              </div>

              <a 
                href="https://sisos.intermaritima.com.br/" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="flex items-center gap-4 bg-slate-800/50 border border-slate-700 px-6 py-4 rounded-xl flex-1 lg:flex-none hover:bg-slate-800 transition-colors cursor-pointer group"
              >
                <div className="bg-emerald-900/50 p-3 rounded-lg text-emerald-400 group-hover:bg-emerald-800/50 group-hover:text-emerald-300 transition-colors">
                  <Ticket size={24} /> 
                </div>
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Chamados</p>
                  <p className="font-bold text-lg text-white">Acessar SISOS (GLPI)</p>
                </div>
              </a>
          </div>
        </section>

      </main>

      <footer className="bg-white border-t border-slate-200 mt-12 py-8">
        <div className="max-w-7xl mx-auto px-4 text-center text-slate-400 text-sm">
          &copy; {new Date().getFullYear()} Intermarítima. Todos os direitos reservados.
        </div>
      </footer>
    </div>
  );
};

export default VisitorPortal;
