
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  fetchEmployees, fetchNews, fetchSystems, fetchMeetingRooms, fetchGlobalSettings, 
  fetchDepartments, fetchUnits, markNotificationAsRead, clearAllNotifications
} from '../services/firebaseService';
import { Employee, NewsArticle, SystemTool, MeetingRoom, Appointment, OrganizationDepartment, OrganizationUnit, Notification, ContentBlock } from '../types';
import { LogIn, ExternalLink, Mail, HelpCircle, Ticket, Tag, ChevronRight, ChevronLeft, Cake, PartyPopper, CalendarDays, Loader2, Calendar, MapPin, User, LayoutDashboard, Users, Search, Phone, Building2, PhoneCall, Filter, Bell, X, Megaphone, ChevronUp, ChevronDown, Clock, ArrowUpCircle, MessageSquare } from 'lucide-react';
import { db } from '../services/firebaseConfig';
import { collection, query, where, onSnapshot, getDocs, orderBy } from 'firebase/firestore';
import Logo from '../components/Logo';
import { useAuth } from '../contexts/AuthContext'; 

// --- Componentes Auxiliares ---
const WhatsAppIcon = ({ size = 18, className = "" }: { size?: number, className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M3 21l1.65-3.8a9 9 0 1 1 3.4 2.9L3 21" />
    <path d="M9 10a.5.5 0 0 0 1 0V9a.5.5 0 0 0-1 0v1a5 5 0 0 0 5 5h1a.5.5 0 0 0 0-1h-1a.5.5 0 0 0 0 1" />
  </svg>
);

const formatRoleName = (name: string) => {
  if (!name) return '';
  const particles = ['de', 'do', 'da', 'dos', 'das', 'e', 'em', 'com', 'para'];
  const romanNumerals = ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x'];
  const acronyms = ['ti', 'rh', 'sesmt', 'dp', 'it', 'ceo', 'cfo', 'coo', 'cto', 'adm', 'qhse', 'comex'];
  
  return name
    .toLowerCase()
    .split(' ')
    .filter(word => word.length > 0)
    .map((word, index) => {
      if (index > 0 && particles.includes(word)) return word;
      if (romanNumerals.includes(word) || acronyms.includes(word)) return word.toUpperCase();
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
};

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
    return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(date);
  } catch (e) { return isoString; }
};

const generateTimeSlots = () => {
  const slots = [];
  for (let hour = 8; hour <= 18; hour++) {
    slots.push(`${String(hour).padStart(2, '0')}:00`);
    slots.push(`${String(hour).padStart(2, '0')}:30`);
  }
  return slots;
};

const ALL_TIME_SLOTS = generateTimeSlots();

const renderNewsBlock = (block: ContentBlock) => {
  switch (block.type) {
    case 'header':
      return <h3 key={block.id} className="text-xl md:text-2xl font-black text-slate-800 mt-6 mb-3 leading-tight">{block.content}</h3>;
    case 'image':
      return <img key={block.id} src={block.content} alt="" className="w-full rounded-2xl shadow-md my-6" />;
    case 'quote':
      return (
        <blockquote key={block.id} className="border-l-4 border-emerald-500 pl-4 py-3 italic my-6 bg-slate-50 text-lg text-slate-600 rounded-r-xl">
          "{block.content}"
        </blockquote>
      );
    case 'button':
      return (
        <div key={block.id} className="my-8 text-center">
           <a href={block.url} target="_blank" rel="noopener noreferrer" className="inline-block transition-all hover:scale-105 shadow-lg hover:shadow-xl px-8 py-3 font-bold uppercase tracking-wider bg-emerald-600 text-white rounded-xl text-sm no-underline">
              {block.content}
           </a>
        </div>
      );
    case 'side-by-side':
      return (
        <div key={block.id} className={`flex flex-col md:flex-row gap-6 items-center my-8 ${block.style?.layoutDirection === 'row-reverse' ? 'md:flex-row-reverse' : ''}`}>
           <div className="w-full md:w-1/2">
              <img src={block.url} alt="" className="w-full rounded-xl shadow-sm object-cover" />
           </div>
           <div className="w-full md:w-1/2 text-slate-600 leading-relaxed text-base">
                {block.content}
             </div>
          </div>
        );
      default:
        return <p key={block.id} className="text-base md:text-lg leading-relaxed text-slate-600 whitespace-pre-wrap mb-4">{block.content}</p>;
    }
  };
  
  const VisitorPortal: React.FC = () => {
    const { currentUser, globalSettings, loading: authLoading } = useAuth();
    const navigate = useNavigate();
    
    const [selectedCategory, setSelectedCategory] = useState('Todas');
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [newsList, setNewsList] = useState<NewsArticle[]>([]);
    const [systems, setSystems] = useState<SystemTool[]>([]);
    const [rooms, setRooms] = useState<MeetingRoom[]>([]);
    const [units, setUnits] = useState<OrganizationUnit[]>([]);
    const [todaysAppointments, setTodaysAppointments] = useState<Appointment[]>([]);
    const [departmentsList, setDepartmentsList] = useState<OrganizationDepartment[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [expandedNewsId, setExpandedNewsId] = useState<string | null>(null);
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isNotifOpen, setIsNotifOpen] = useState(false);
    const notifRef = useRef<HTMLDivElement>(null);
  
    const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    const [expandedRooms, setExpandedRooms] = useState<Set<string>>(new Set());
  
    const [searchTerm, setSearchTerm] = useState('');
    const [deptFilter, setDeptFilter] = useState('All');
    const [unitFilter, setUnitFilter] = useState('All');
  
    useEffect(() => {
      if (!currentUser) return;
      const q = query(collection(db, "notifications"), where("userId", "==", currentUser.id), orderBy("createdAt", "desc"));
      return onSnapshot(q, (snapshot) => {
        setNotifications(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification)));
      });
    }, [currentUser]);
  
    useEffect(() => {
      const loadData = async () => {
        setIsLoading(true);
        try {
          const todayStr = new Date().toISOString().split('T')[0];
          const [empData, newsData, sysData, roomsData, deptsData, unitsData] = await Promise.all([
            fetchEmployees(), fetchNews(), fetchSystems(), fetchMeetingRooms(), fetchDepartments(), fetchUnits()
          ]);
          const appSnapshot = await getDocs(query(collection(db, "appointments"), where("date", "==", todayStr)));
          const apps = appSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Appointment));
          
          // Filtra notícias: Públicas e Publicadas apenas
          const publishedNews = newsData.filter(n => n.published && n.isPublic === true);
          setEmployees(empData);
          setNewsList(publishedNews);
          setSystems(sysData);
          setRooms(roomsData);
          setUnits(unitsData);
          setTodaysAppointments(apps);
          setDepartmentsList(deptsData);
  
          if (publishedNews.length > 0) {
              setExpandedNewsId(publishedNews[0].id);
          }
  
        } catch (error) { console.error("Erro ao carregar portal:", error); } 
        finally { setIsLoading(false); }
      };
      loadData();
    }, []);
  
    const unreadCount = notifications.filter(n => !n.read).length;
  
    const handleNotificationClick = async (notif: Notification) => {
      if (!notif.read) await markNotificationAsRead(notif.id);
      setIsNotifOpen(false);
      if (notif.link) {
          if (notif.type === 'chat' && notif.senderId) navigate(notif.link, { state: { openChatWith: notif.senderId } });
          else navigate(notif.link);
      }
    };
  
    const toggleRoomExpansion = (roomId: string) => {
      setExpandedRooms(prev => {
         const newSet = new Set(prev);
         if (newSet.has(roomId)) newSet.delete(roomId);
         else newSet.add(roomId);
         return newSet;
      });
    };
  
    const handlePrevMonth = () => setSelectedMonth(prev => (prev === 0 ? 11 : prev - 1));
    const handleNextMonth = () => setSelectedMonth(prev => (prev === 11 ? 0 : prev + 1));
  
    const filteredEmployees = useMemo(() => {
      if (!globalSettings?.publicDirectory) return [];
      let list = employees.filter(e => e.showInPublicDirectory !== false);
      if (searchTerm.trim()) {
        const lowerTerm = searchTerm.toLowerCase();
        list = list.filter(e => e.name.toLowerCase().includes(lowerTerm) || (e.extension && e.extension.includes(lowerTerm)) || e.department.toLowerCase().includes(lowerTerm) || e.role.toLowerCase().includes(lowerTerm));
      }
      if (deptFilter !== 'All') list = list.filter(e => e.department === deptFilter);
      if (unitFilter !== 'All') list = list.filter(e => e.unit === unitFilter);
      return list.sort((a, b) => a.name.localeCompare(b.name));
    }, [employees, searchTerm, deptFilter, unitFilter, globalSettings]);
  
    const categories = useMemo(() => {
      const cats = new Set(newsList.map(n => n.category));
      return ['Todas', ...Array.from(cats)];
    }, [newsList]);
  
    const birthdayData = useMemo(() => {
      const today = new Date();
      const currentDay = today.getDate();
      const currentMonth = today.getMonth(); 
      const isCurrentMonth = selectedMonth === currentMonth;

      const monthBirthdays = employees.filter(emp => {
        if (!emp.birthday) return false;
        const m = parseInt(emp.birthday.split('-')[1]);
        return m === selectedMonth + 1;
      }).sort((a, b) => {
        const dayA = parseInt(a.birthday.split('-')[2]);
        const dayB = parseInt(b.birthday.split('-')[2]);
        return dayA - dayB;
      });

      if (!isCurrentMonth) {
        return {
          isCurrentMonth,
          todaysBirthdays: [],
          pastBirthdays: [],
          upcomingBirthdays: monthBirthdays
        };
      }

      return {
        isCurrentMonth,
        todaysBirthdays: monthBirthdays.filter(e => parseInt(e.birthday.split('-')[2]) === currentDay),
        pastBirthdays: monthBirthdays.filter(e => parseInt(e.birthday.split('-')[2]) < currentDay),
        upcomingBirthdays: monthBirthdays.filter(e => parseInt(e.birthday.split('-')[2]) > currentDay)
      };
    }, [employees, selectedMonth]);
  
    const getRoomInfo = (room: MeetingRoom) => {
      const now = new Date();
      const dayOfWeek = now.getDay();
      const currentTime = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false });
      
      const isSaturday = dayOfWeek === 6;
      const isSunday = dayOfWeek === 0;
      const isClosedForWeekend = (isSaturday && !room.worksSaturday) || (isSunday && !room.worksSunday);
      const isOutsideHours = currentTime < (room.startTime || '08:00') || currentTime >= (room.endTime || '18:00');
      const isClosed = isClosedForWeekend || isOutsideHours;
  
      const roomApps = todaysAppointments.filter(a => a.roomId === room.id).sort((a, b) => {
          const [hA, mA] = a.time.split(':').map(Number);
          const [hB, mB] = b.time.split(':').map(Number);
          return (hA * 60 + mA) - (hB * 60 + mB);
      });
      const currentMeeting = roomApps.find(a => {
        const [h, m] = a.time.split(':').map(Number);
        const appStart = new Date(); appStart.setHours(h, m, 0, 0);
        const appEnd = new Date(appStart); appEnd.setMinutes(appStart.getMinutes() + 30);
        return now >= appStart && now < appEnd;
      });
      return { isOccupied: !!currentMeeting && !isClosed, isClosed, currentMeeting, schedule: roomApps };
    };
  
    const filteredNews = useMemo(() => {
      if (selectedCategory === 'Todas') return newsList;
      return newsList.filter(n => n.category === selectedCategory);
    }, [selectedCategory, newsList]);
  
    if (isLoading || authLoading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="flex flex-col items-center gap-4"><Logo className="h-10 w-auto animate-pulse" /><div className="flex items-center gap-2 text-emerald-700 font-medium"><Loader2 className="animate-spin" /> Carregando portal...</div></div></div>;
  
    // Configurações Dinâmicas do Hero
    const heroTitle = globalSettings?.welcomeTitle || 'Bem-vindo ao iRamais Hub';
    const heroDesc = globalSettings?.welcomeDescription || 'Gestão inteligente de ramais, reservas de salas, notícias corporativas e acesso unificado aos sistemas da empresa.';
    
    // Novo: Lógica de degradê opcional
    const heroBg = globalSettings?.welcomeBannerImage 
      ? (globalSettings.welcomeDisableOverlay 
          ? `url(${globalSettings.welcomeBannerImage}) center/cover`
          : `linear-gradient(to right, ${globalSettings.welcomePrimaryColor || '#065f46'}CC, ${globalSettings.welcomeSecondaryColor || '#115e59'}CC), url(${globalSettings.welcomeBannerImage}) center/cover`)
      : `linear-gradient(to right, ${globalSettings.welcomePrimaryColor || '#065f46'}, ${globalSettings.welcomeSecondaryColor || '#115e59'})`;
    
    // Classes de Alinhamento
    const alignClass = globalSettings?.welcomeTextAlignment === 'left' ? 'text-left items-start' : 
                       globalSettings?.welcomeTextAlignment === 'right' ? 'text-right items-end' : 
                       'text-center items-center';

    return (
      <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
        <header className="bg-slate-900 text-white shadow-lg sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <Logo className="h-10 w-auto" />
            {currentUser ? (
              <div className="flex items-center gap-6">
                <div className="relative" ref={notifRef}>
                  <button onClick={() => setIsNotifOpen(!isNotifOpen)} className={`p-2 transition-colors rounded-full relative ${isNotifOpen ? 'bg-emerald-50/20 text-emerald-400' : 'text-slate-400 hover:text-emerald-400'}`}><Bell size={22} />{unreadCount > 0 && <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-slate-900 animate-pulse"></span>}</button>
                  {isNotifOpen && (
                    <div className="absolute right-0 mt-3 w-80 bg-white rounded-2xl shadow-xl border border-slate-200 z-[100] overflow-hidden animate-fade-in text-slate-900">
                      <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50"><h3 className="font-bold text-slate-700 text-sm">Notificações</h3>{notifications.length > 0 && <button onClick={() => clearAllNotifications(currentUser.id)} className="text-[10px] text-slate-400 hover:text-red-500 font-bold uppercase tracking-widest">Limpar tudo</button>}</div>
                      <div className="max-h-[350px] overflow-y-auto custom-scrollbar">
                        {notifications.length > 0 ? notifications.map(notif => (
                          <div key={notif.id} onClick={() => handleNotificationClick(notif)} className={`p-4 border-b border-slate-50 cursor-pointer hover:bg-slate-50 transition-colors ${!notif.read ? 'bg-emerald-50/30' : ''}`}><div className="flex gap-3"><div className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${!notif.read ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-300'}`}></div><div className="flex-1"><div className="flex justify-between items-start"><p className="text-sm leading-tight font-bold text-slate-800">{notif.title}</p><span className="text-[10px] text-slate-400 whitespace-nowrap ml-2">{new Date(notif.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span></div><p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">{notif.message}</p></div></div></div>
                        )) : <div className="p-12 text-center text-slate-400"><Bell size={32} className="mx-auto mb-2 opacity-10" /><p className="text-xs font-medium">Nenhuma notificação por aqui.</p></div>}
                      </div>
                      <div className="p-3 bg-slate-50 text-center border-t border-slate-100"><Link to="/tasks" onClick={() => setIsNotifOpen(false)} className="text-[10px] font-black uppercase text-emerald-600 hover:underline tracking-widest">Ver todas as tarefas</Link></div>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-3"><div className="flex items-center gap-3"><img src={currentUser.avatar} className="w-10 h-10 rounded-full border-2 border-emerald-500 object-cover shadow-lg" /><div className="text-left hidden sm:block"><p className="text-[9px] uppercase font-black text-slate-500 mb-0.5">Olá,</p><p className="text-sm font-bold text-white">{currentUser.name.split(' ')[0]}</p></div></div><Link to="/dashboard" className="flex items-center gap-2 text-xs md:text-sm font-bold bg-emerald-600 hover:bg-emerald-500 px-5 py-2.5 rounded-full shadow-lg border border-emerald-500"><LayoutDashboard size={18} /><span className="hidden md:inline">Ir para Dashboard</span></Link></div>
              </div>
            ) : (
              <Link to="/login" className="flex items-center gap-2 text-sm font-medium bg-white/10 hover:bg-white/20 px-4 py-2 rounded-full transition-colors"><LogIn size={16} />Área do Colaborador</Link>
            )}
          </div>
        </header>
  
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">
          {/* HERO SECTION PERSONALIZÁVEL */}
          {(globalSettings?.showWelcomeSection !== false) && (
            <section 
              className={`rounded-[2.5rem] p-6 md:p-10 shadow-2xl relative overflow-hidden flex flex-col justify-center min-h-[240px] ${alignClass}`}
              style={{ background: heroBg }}
            >
              <div className="relative z-10 max-w-4xl">
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-black mb-4 tracking-tight drop-shadow-md text-white">
                  {heroTitle}
                </h1>
                <p className="text-white text-base md:text-lg lg:text-xl opacity-90 leading-relaxed font-medium drop-shadow-sm whitespace-pre-wrap">
                  {heroDesc}
                </p>
              </div>
              <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl -mr-32 -mt-32"></div>
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-black/5 rounded-full blur-2xl -ml-24 -mb-24"></div>
            </section>
          )}
  
          {globalSettings?.publicDirectory && (
            <section className="bg-white rounded-[2rem] shadow-sm border border-slate-200 p-6 md:p-10 animate-fade-in">
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-10 border-b border-slate-100 pb-8">
                <div>
                  <h2 className="text-3xl font-black text-slate-800 flex items-center gap-3 tracking-tight">
                    <Phone className="text-emerald-600" size={32} /> Diretório de Pessoas
                  </h2>
                  <p className="text-slate-500 mt-1 font-medium">Encontre contatos e ramais de todos os colaboradores em tempo real</p>
                </div>
                <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                  <div className="relative w-full sm:w-72 lg:w-80">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                    <input type="text" placeholder="Buscar por nome ou ramal..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 w-full text-slate-900 shadow-inner" />
                  </div>
                  <div className="relative flex-1 min-w-[140px]">
                    <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} className="w-full px-4 py-3.5 bg-white border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 appearance-none pr-10 shadow-sm">
                      <option value="All">Departamentos</option>
                      {departmentsList.map(dept => (<option key={dept.id} value={dept.name}>{dept.name}</option>))}
                    </select>
                    <Filter className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
                  </div>
                  <div className="relative flex-1 min-w-[140px]">
                    <select value={unitFilter} onChange={(e) => setUnitFilter(e.target.value)} className="w-full px-4 py-3.5 bg-white border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 appearance-none pr-10 shadow-sm">
                      <option value="All">Unidades</option>
                      {units.map(unit => (<option key={unit.id} value={unit.name}>{unit.name}</option>))}</select>
                    <MapPin className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 max-h-[700px] overflow-y-auto custom-scrollbar p-2">
                {filteredEmployees.map(emp => (
                  <div key={emp.id} className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 flex flex-col items-center text-center transition-all hover:shadow-2xl hover:-translate-y-2 group relative">
                    
                    <div className="w-24 h-24 mb-4 relative">
                      <img 
                        src={emp.avatar} 
                        alt={emp.name} 
                        className="w-full h-full rounded-full object-cover border-4 border-slate-50 group-hover:border-emerald-50 transition-colors shadow-md"
                      />
                      <div className="absolute bottom-1 right-1 w-5 h-5 bg-emerald-500 rounded-full border-2 border-white shadow-sm" title="Online"></div>
                    </div>
                    
                    <h3 className="font-bold text-lg text-slate-900 leading-tight mb-1">{emp.name}</h3>
                    {globalSettings?.showRolePublicly && emp.showRole !== false && (
                      <p className="text-emerald-600 text-sm font-bold mb-2">{formatRoleName(emp.role)}</p>
                    )}
                    
                    <div className="flex flex-col items-center gap-1.5 mb-6">
                      <p className="text-slate-400 text-xs flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-full font-medium">
                        <Building2 size={12} className="text-slate-400" /> {emp.department}
                      </p>
                      {emp.unit && (
                        <p className="text-slate-400 text-[10px] flex items-center gap-1.5 font-bold uppercase tracking-widest">
                          <MapPin size={10} className="text-slate-300" /> {emp.unit}
                        </p>
                      )}
                    </div>

                    <div className="w-full space-y-3 mt-auto">
                      
                      {emp.extension ? (
                        <SwipeToCall extension={emp.extension} />
                      ) : (
                        <div className="h-12 flex items-center justify-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-400 text-[10px] uppercase font-black tracking-widest">
                           Sem Ramal
                        </div>
                      )}

                      <div className="flex gap-2">
                        {/* Botão de Chat Condicional */}
                        {!currentUser ? (
                          <button 
                            disabled 
                            className="flex-1 flex items-center justify-center py-2.5 bg-slate-100 text-slate-400 rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-200 cursor-not-allowed group-hover:bg-slate-200 transition-all shadow-sm"
                            title="Faça login para utilizar o chat corporativo"
                          >
                            <MessageSquare size={16} className="mr-2" /> Chat
                          </button>
                        ) : (
                          <button 
                            onClick={() => navigate('/directory', { state: { openChatWith: emp.id } })}
                            className="flex-1 flex items-center justify-center py-2.5 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-900/20 flex items-center gap-2"
                          >
                            <MessageSquare size={16} /> Chat
                          </button>
                        )}
                        
                        {emp.whatsapp && (
                          <a 
                            href={`https://wa.me/${emp.whatsapp.replace(/\D/g, '')}`} 
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center p-2.5 border border-emerald-200 bg-emerald-50 rounded-xl text-green-600 hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
                            title="WhatsApp"
                          >
                            <WhatsAppIcon size={18} />
                          </a>
                        )}

                        <a 
                          href={`mailto:${emp.email}`} 
                          className="flex items-center justify-center p-2.5 border border-slate-200 rounded-xl text-slate-400 hover:bg-emerald-600 hover:text-white hover:border-emerald-600 transition-all shadow-sm"
                          title="Enviar E-mail"
                        >
                          <Mail size={18} />
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
                
                {filteredEmployees.length === 0 && (
                  <div className="col-span-full py-20 text-center text-slate-400 bg-slate-50 rounded-[2rem] border border-dashed border-slate-200">
                    <Search size={40} className="mx-auto mb-4 opacity-10" />
                    <p className="font-bold text-lg">Nenhum colaborador encontrado.</p>
                  </div>
                )}
              </div>
            </section>
          )}
  
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            <div className="lg:col-span-2 space-y-10">
              {globalSettings?.showNewsPublicly && (
                <>
                  <div className="flex items-center justify-between border-l-8 border-emerald-600 pl-4"><h2 className="text-3xl font-black text-slate-800 tracking-tight">{selectedCategory === 'Todas' ? 'Mural Corporativo' : `Notícias: ${selectedCategory}`}</h2>{selectedCategory !== 'Todas' && <button onClick={() => setSelectedCategory('Todas')} className="text-sm font-black uppercase text-emerald-600 hover:underline tracking-widest">Ver todas</button>}</div>
                  
                  <div className="space-y-6">
                      {filteredNews.length > 0 ? filteredNews.map(news => {
                          const isExpanded = expandedNewsId === news.id;
                          
                          // Lógica de Avatar do Autor no Portal do Visitante
                          const authorEmp = employees.find(e => e.name === news.author);
                          const authorAvatarUrl = news.authorAvatar || authorEmp?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(news.author)}&background=0d9488&color=fff`;

                          return (
                              <div key={news.id} id={`news-${news.id}`} className={`bg-white rounded-[2rem] p-0 shadow-sm border transition-all duration-500 overflow-hidden ${isExpanded ? 'border-emerald-200 ring-4 ring-emerald-50 shadow-xl' : 'border-slate-100 hover:shadow-md'}`}>
                                  <div className={`flex flex-col md:flex-row ${isExpanded ? 'bg-slate-50/50' : ''}`}>
                                      <div className={`h-48 md:h-auto md:w-1/3 bg-slate-200 relative shrink-0 transition-all duration-500 ${isExpanded ? 'md:h-72' : ''}`}>
                                          <img src={news.thumbnail} alt={news.title} className="w-full h-full object-cover" />
                                          {isExpanded && (
                                              <div className="absolute inset-0 bg-black/20 flex items-center justify-center md:hidden">
                                                  <span className="bg-white/90 px-4 py-2 rounded-full text-xs font-bold text-slate-800">Visualizando Comunicado</span>
                                              </div>
                                          )}
                                      </div>
                                      <div className="p-6 md:p-8 md:w-2/3 flex flex-col justify-center">
                                          <div className="flex items-center gap-2 text-xs text-slate-500 mb-3">
                                              <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full font-black uppercase tracking-wider text-[9px]">{news.category}</span>
                                              <span className="font-bold text-slate-400">{formatNewsDate(news.date)}</span>
                                          </div>
                                          <h4 className={`font-black text-slate-900 leading-tight mb-3 transition-all ${isExpanded ? 'text-2xl md:text-3xl' : 'text-xl'}`}>{news.title}</h4>
                                          
                                          {!isExpanded && (
                                              <p className="text-slate-500 text-sm line-clamp-2 mb-6 font-medium">
                                                  {news.blocks.find(b => b.type === 'paragraph')?.content || 'Clique para ler mais...'}
                                              </p>
                                          )}
  
                                          <div className="flex gap-4 items-center">
                                              {news.externalUrl ? (
                                                  <a href={news.externalUrl} target="_blank" rel="noopener noreferrer" className="bg-emerald-600 text-white px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 flex items-center gap-2">Acessar Notícia <ExternalLink size={14}/></a>
                                              ) : (
                                                  <button 
                                                      onClick={() => setExpandedNewsId(isExpanded ? null : news.id)} 
                                                      className={`font-black text-xs uppercase tracking-widest flex items-center gap-2 transition-all px-6 py-2.5 rounded-xl shadow-sm ${isExpanded ? 'bg-slate-200 text-slate-700 hover:bg-slate-300' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'}`}
                                                  >
                                                      {isExpanded ? <><ChevronUp size={16}/> Recolher</> : <><ChevronDown size={16}/> Ler Comunicado</>}
                                                  </button>
                                              )}
                                          </div>
                                      </div>
                                  </div>
  
                                  {/* CONTEÚDO EXPANDIDO */}
                                  {isExpanded && (
                                      <div className="p-6 md:p-12 animate-fade-in bg-white">
                                          <div className="flex items-center gap-4 mb-10 pb-6 border-b border-slate-50">
                                              <div className="w-14 h-14 rounded-full overflow-hidden border-4 border-emerald-50 shadow-md shrink-0">
                                                 <img src={authorAvatarUrl} alt={news.author} className="w-full h-full object-cover" />
                                              </div>
                                              <div>
                                                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Autor da Publicação</p>
                                                  <p className="text-lg font-bold text-slate-700 leading-none">{news.author}</p>
                                              </div>
                                          </div>
                                          
                                          <div className="max-w-none space-y-2">
                                              {news.blocks.map(block => renderNewsBlock(block))}
                                          </div>
  
                                          <div className="mt-12 pt-8 border-t border-slate-100 flex justify-center">
                                              <button 
                                                  onClick={() => {
                                                      setExpandedNewsId(null);
                                                      document.getElementById(`news-${news.id}`)?.scrollIntoView({ behavior: 'smooth' });
                                                  }}
                                                  className="group flex flex-col items-center gap-2 text-slate-300 hover:text-emerald-600 transition-all"
                                              >
                                                  <ArrowUpCircle size={40} className="group-hover:scale-110 transition-transform" />
                                                  <span className="text-[10px] font-black uppercase tracking-widest">Fechar Visualização</span>
                                              </button>
                                          </div>
                                      </div>
                                  )}
                              </div>
                          );
                      }) : (
                          <div className="p-20 text-center bg-slate-100 rounded-[2.5rem] text-slate-400 border border-slate-200 border-dashed">
                              <Megaphone size={48} className="mx-auto mb-4 opacity-10" />
                              <p className="font-bold">Nenhuma notícia encontrada nesta categoria.</p>
                          </div>
                      )}
                  </div>
                </>
              )}
            </div>
  
            <div className="space-y-10">
              {globalSettings?.showNewsPublicly && (
                <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-8"><h3 className="font-black text-slate-800 mb-6 flex items-center gap-3 uppercase tracking-tighter text-sm"><Tag size={18} className="text-emerald-600" /> Categorias</h3><div className="space-y-2">{categories.length > 1 ? categories.map(cat => (<button key={cat} onClick={() => { setSelectedCategory(cat); setExpandedNewsId(null); }} className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-sm font-bold transition-all ${selectedCategory === cat ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200' : 'text-slate-600 hover:bg-slate-50'}`}><span>{cat}</span>{selectedCategory === cat && <ChevronRight size={16} />}</button>)) : <p className="text-sm text-slate-400 italic">Sem categorias disponíveis.</p>}</div></div>
              )}
  
              {globalSettings?.showRoomsPublicly && (
                <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="font-black text-slate-800 flex items-center gap-3 uppercase tracking-tighter text-sm">
                      <Calendar size={18} className="text-indigo-600" /> Agenda de Salas
                    </h3>
                    <span className="text-[10px] font-black uppercase bg-slate-100 text-slate-500 px-3 py-1 rounded-full">Hoje</span>
                  </div>
                  <div className="space-y-4">
                    {rooms.length > 0 ? rooms.map(room => { 
                      const { isOccupied, isClosed, schedule } = getRoomInfo(room); 
                      const isExpanded = expandedRooms.has(room.id);
                      const unit = units.find(u => u.id === room.unitId);
                      
                      const roomStartTime = room.startTime || '08:00';
                      const roomEndTime = room.endTime || '18:00';
                      const filteredSlots = ALL_TIME_SLOTS.filter(slot => slot >= roomStartTime && slot < roomEndTime);
  
                      return (
                        <div key={room.id} className="border border-slate-100 rounded-2xl p-4 bg-slate-50/50 hover:bg-white hover:shadow-md transition-all shadow-sm">
                          <div className="flex items-center justify-between mb-2 cursor-pointer select-none" onClick={() => toggleRoomExpansion(room.id)}>
                            <div className="flex items-center gap-3">
                              <MapPin size={16} className="text-slate-400" />
                              <div>
                                  <span className="text-sm font-bold text-slate-800 block leading-tight">{room.name}</span>
                                  <span className="text-[10px] text-slate-400 font-bold uppercase">{unit?.name || 'SEDE'}</span>
                              </div>
                              {isClosed ? (
                                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border bg-slate-100 text-slate-500 border-slate-200">Fechado</span>
                              ) : (
                                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${isOccupied ? 'bg-red-50 text-red-600 border-red-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                                  {isOccupied ? 'Ocupada' : 'Livre'}
                                </span>
                              )}
                            </div>
                            <div className="text-slate-400">{isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}</div>
                          </div>
                          {isExpanded && (
                            <div className="mt-4 animate-fade-in space-y-4">
                              <div className="flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                                  <span>Agenda Hoje:</span>
                                  <span className="flex items-center gap-1"><Clock size={10}/> {roomStartTime} - {roomEndTime}</span>
                              </div>
                              <div className="grid grid-cols-1 gap-3 max-h-[400px] overflow-y-auto custom-scrollbar pr-1">
                                {filteredSlots.map(time => { 
                                  const appointment = schedule.find(a => a.time === time); 
                                  const isSlotOccupied = !!appointment; 
                                  const [h, m] = time.split(':').map(Number);
                                  const now = new Date();
                                  const isPast = now.getHours() > h || (now.getHours() === h && now.getMinutes() >= m + 30);
                                  
                                  if (isSlotOccupied) {
                                    const pList = appointment.participants || [];
                                    return (
                                      <div key={time} className={`flex flex-col border rounded-xl p-3.5 shadow-sm ${isPast ? 'bg-slate-100 border-slate-200 opacity-60 grayscale-[50%]' : 'bg-red-50 border-red-100'}`}>
                                        <div className={`flex justify-between items-center mb-2`}>
                                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${isPast ? 'bg-slate-200 text-slate-600' : 'bg-red-100 text-red-700'}`}>{time}</span>
                                          
                                          <div className={`flex items-center gap-1.5 text-[9px] font-black uppercase ${isPast ? 'text-slate-500' : 'text-red-700'}`}>
                                              <span className="truncate max-w-[100px]">{appointment.userName}</span>
                                              <User size={12} className={isPast ? 'text-slate-400' : 'text-red-500'} />
                                          </div>
                                        </div>
  
                                        <div className="mb-2">
                                           <p className={`text-[10px] font-black uppercase leading-tight tracking-tight ${isPast ? 'text-slate-500' : 'text-slate-800'}`}>
                                               {appointment.subject}
                                           </p>
                                        </div>
  
                                        {pList.length > 0 && (
                                          <div className="pt-1.5 mt-1 border-t border-black/5">
                                              <p className={`text-[8px] italic leading-tight ${isPast ? 'text-slate-400' : 'text-slate-500'}`}>Convidados: {pList.join(', ')}</p>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  }
                                  return (
                                    <div key={time} className={`flex items-center justify-between border rounded-xl p-2 px-3 ${isPast || isClosed ? 'bg-slate-100 border-slate-200 opacity-50' : 'bg-emerald-50 border-emerald-100'}`}>
                                      <span className="text-[10px] font-bold text-slate-400">{time}</span>
                                      <span className="text-[8px] uppercase tracking-wide text-slate-400 font-bold">{isClosed ? 'Fechado' : (isPast ? 'Encerrado' : 'Livre')}</span>
                                    </div>
                                  ); 
                                })}
                              </div>
                              {currentUser && (
                                <button 
                                  onClick={() => navigate('/meeting-rooms', { state: { selectedRoomId: room.id } })} 
                                  className="w-full py-3 bg-emerald-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-emerald-200 hover:bg-emerald-700 hover:-translate-y-0.5 transition-all"
                                >
                                  Reservar Agora
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      ); 
                    }) : <p className="text-sm text-slate-400 text-center py-4">Nenhuma sala cadastrada.</p>}
                  </div>
                </div>
              )}
  
              {globalSettings?.showBirthdaysPublicly && (
                <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden"><div className="p-6 border-b border-slate-50 bg-slate-50/50 flex flex-col justify-between gap-4"><h3 className="font-black text-slate-800 flex items-center gap-3 uppercase tracking-tighter text-sm"><Cake size={18} className="text-pink-500" /> Aniversariantes</h3><div className="flex items-center justify-between bg-white rounded-2xl p-1.5 border border-slate-100 shadow-inner">
                <button onClick={handlePrevMonth} className="p-2 hover:bg-slate-50 rounded-xl transition-all text-slate-400 hover:text-emerald-600">
                  <ChevronLeft size={20} />
                </button>
                <span className="text-xs font-black text-emerald-700 uppercase tracking-[0.2em]">{months[selectedMonth]}</span><button onClick={handleNextMonth} className="p-2 hover:bg-slate-50 rounded-xl transition-all text-slate-400 hover:text-emerald-600"><ChevronRight size={20} /></button></div></div><div className="p-6"><div className="space-y-5 max-h-[450px] overflow-y-auto pr-1 custom-scrollbar">
                
                {/* SEÇÃO HOJE */}
                {birthdayData.todaysBirthdays.length > 0 && (
                  <div className="space-y-3 animate-fade-in mb-8">
                    <p className="text-[10px] font-black text-orange-600 uppercase tracking-[0.2em] flex items-center gap-2 mb-4">
                      <PartyPopper size={14} className="animate-bounce" /> É HOJE!
                    </p>
                    {birthdayData.todaysBirthdays.map(emp => (
                      <div key={emp.id} className="flex items-center gap-4 p-4 bg-white rounded-[2rem] relative group overflow-hidden shadow-xl border border-pink-100 border-l-4 border-l-pink-500 hover:scale-[1.02] transition-all">
                        <div className="w-14 h-14 rounded-full border-2 border-slate-50 shadow-md overflow-hidden shrink-0">
                          <img src={emp.avatar} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-black text-slate-800 truncate uppercase tracking-tight">{emp.name}</p>
                          <p className="text-[10px] text-slate-400 truncate font-bold uppercase">{emp.department}</p>
                        </div>
                        <div className="text-2xl drop-shadow-sm">🎂</div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="space-y-4">
                  {/* SEÇÃO DENTRO DO MÊS (PASSADOS) */}
                  {birthdayData.isCurrentMonth && birthdayData.pastBirthdays.length > 0 && (
                    <div className="space-y-2">
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Aconteceu este mês</p>
                       {birthdayData.pastBirthdays.map(emp => (
                         <div key={emp.id} className="flex items-center gap-4 p-3 hover:bg-slate-50 transition-all border border-transparent hover:border-slate-100 rounded-2xl">
                            <img src={emp.avatar} className="w-10 h-10 rounded-full border-2 border-slate-100 object-cover" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-slate-800 truncate uppercase tracking-tight">{emp.name}</p>
                              <p className="text-[10px] text-slate-400 font-bold uppercase">{emp.department}</p>
                            </div>
                            <div className="text-[10px] font-black text-slate-400 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100 shadow-sm">DIA {emp.birthday.split('-')[2]}</div>
                         </div>
                       ))}
                    </div>
                  )}

                  {/* SEÇÃO PRÓXIMOS */}
                  {(birthdayData.upcomingBirthdays.length > 0 || (!birthdayData.isCurrentMonth && birthdayData.upcomingBirthdays.length > 0)) && (
                    <div className="space-y-2 pt-2">
                      <p className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em] mb-4">Próximos deste mês</p>
                      {birthdayData.upcomingBirthdays.map(emp => (
                        <div key={emp.id} className="flex items-center gap-4 p-3 hover:bg-slate-50 rounded-2xl transition-all border border-transparent hover:border-slate-100">
                          <img src={emp.avatar} className="w-10 h-10 rounded-full border-2 border-white shadow-sm object-cover" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-slate-800 truncate uppercase tracking-tight">{emp.name}</p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase">{emp.department}</p>
                          </div>
                          <div className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100 shadow-sm">DIA {emp.birthday.split('-')[2]}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {birthdayData.todaysBirthdays.length === 0 && birthdayData.pastBirthdays.length === 0 && birthdayData.upcomingBirthdays.length === 0 && (
                    <div className="text-center py-12 text-slate-300">
                      <Calendar size={40} className="mx-auto mb-3 opacity-10" />
                      <p className="text-sm font-bold uppercase tracking-widest">Vazio</p>
                    </div>
                  )}
                </div>
              </div></div></div>
              )}
            </div>
          </div>
  
          <section className="bg-slate-900 rounded-[3rem] p-10 md:p-16 text-white flex flex-col md:flex-row items-center justify-between gap-10 relative overflow-hidden shadow-2xl"><div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-600/5 rounded-full blur-[100px] -mr-64 -mt-64 pointer-events-none"></div><div className="relative z-10 text-center md:text-left"><h3 className="text-3xl font-black mb-4 flex items-center justify-center md:justify-start gap-4 tracking-tighter"><HelpCircle className="text-emerald-400" size={32} /> Central de TI</h3><p className="text-slate-400 text-lg max-w-md leading-relaxed">Nossa equipe de tecnologia está pronta para auxiliar em qualquer demanda técnica ou operacional.</p></div><div className="relative z-10 flex flex-col lg:flex-row gap-6 w-full md:w-auto"><div className="flex items-center gap-5 bg-white/5 border border-white/10 px-8 py-6 rounded-[2rem] flex-1 lg:flex-none hover:bg-white/10 transition-all cursor-default shadow-inner"><div className="bg-emerald-500/20 p-4 rounded-2xl text-emerald-400 shadow-lg"><Mail size={28} /> </div><div><p className="text-[10px] text-emerald-500 uppercase tracking-[0.2em] font-black mb-1">Contato</p><p className="font-bold text-lg text-white">TI Suporte</p></div></div><a href="https://sisos.intermaritima.com.br/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-5 bg-emerald-600 px-8 py-6 rounded-[2rem] flex-1 lg:flex-none hover:bg-emerald-700 transition-all cursor-pointer group shadow-xl shadow-emerald-900/40"><div className="bg-white/20 p-4 rounded-2xl text-white shadow-lg"><Ticket size={28} /> </div><div><p className="text-[10px] text-white/60 uppercase tracking-[0.2em] font-black mb-1">Chamados</p><p className="font-black text-xl text-white uppercase tracking-tight">SISOS</p></div></a></div></section>
        </main>
  
        <footer className="bg-white border-t border-slate-100 mt-20 py-12"><div className="max-w-7xl mx-auto px-4 text-center"><Logo className="h-8 w-auto mx-auto mb-6" /><p className="text-slate-400 text-xs font-bold uppercase tracking-[0.3em]">&copy; {new Date().getFullYear()} Intermarítima Portos e Logística S/A</p></div></footer>
      </div>
    );
  };
  
  export default VisitorPortal;
