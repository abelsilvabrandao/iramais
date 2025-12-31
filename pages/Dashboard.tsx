
import React, { useState, useEffect, useMemo } from 'react';
import { fetchNews, fetchEmployees, fetchTasks, fetchMeetingRooms, fetchUnits } from '../services/firebaseService';
import { db } from '../services/firebaseConfig';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { Employee, NewsArticle, Task, MeetingRoom, Appointment, TaskStatus, OrganizationUnit, ContentBlock } from '../types';
import { Calendar, TrendingUp, Megaphone, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Loader2, X, MapPin, Clock, User, Users, Cake, PartyPopper, CalendarDays, Building2, Quote, ExternalLink, ArrowUpCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const generateTimeSlots = () => {
  const slots = [];
  for (let hour = 8; hour <= 17; hour++) {
    slots.push(`${String(hour).padStart(2, '0')}:00`);
    slots.push(`${String(hour).padStart(2, '0')}:30`);
  }
  return slots;
};

const TIME_SLOTS = generateTimeSlots();

const Dashboard: React.FC = () => {
  const { currentUser, globalSettings } = useAuth();

  const [newsList, setNewsList] = useState<NewsArticle[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [rooms, setRooms] = useState<MeetingRoom[]>([]);
  const [units, setUnits] = useState<OrganizationUnit[]>([]);
  const [todaysAppointments, setTodaysAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedNewsId, setExpandedNewsId] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [expandedRooms, setExpandedRooms] = useState<Set<string>>(new Set());

  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  useEffect(() => {
    const loadDashboardData = async () => {
      setIsLoading(true);
      try {
        const todayStr = new Date().toISOString().split('T')[0];
        const [newsData, employeesData, tasksData, roomsData, unitsData] = await Promise.all([
          fetchNews(),
          fetchEmployees(),
          fetchTasks(),
          fetchMeetingRooms(),
          fetchUnits()
        ]);

        const q = query(collection(db, "appointments"), where("date", "==", todayStr));
        const appSnapshot = await getDocs(q);
        const apps = appSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Appointment));
        
        setNewsList(newsData.filter(n => n.published));
        setEmployees(employeesData);
        setTasks(tasksData);
        setRooms(roomsData);
        setUnits(unitsData);
        setTodaysAppointments(apps);
      } catch (error) {
        console.error("Erro ao carregar dashboard:", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadDashboardData();
  }, []);

  const handlePrevMonth = () => setSelectedMonth(prev => (prev === 0 ? 11 : prev - 1));
  const handleNextMonth = () => setSelectedMonth(prev => (prev === 11 ? 0 : prev + 1));

  const toggleRoomExpansion = (roomId: string) => {
    setExpandedRooms(prev => {
       const newSet = new Set(prev);
       if (newSet.has(roomId)) newSet.delete(roomId);
       else newSet.add(roomId);
       return newSet;
    });
  };

  const isBirthdayToday = useMemo(() => {
    if (!currentUser?.birthday) return false;
    const today = new Date();
    const [_, m, d] = currentUser.birthday.split('-').map(Number);
    return today.getMonth() + 1 === m && today.getDate() === d;
  }, [currentUser]);

  const birthdayData = useMemo(() => {
    const today = new Date();
    const currentDay = today.getDate();
    const currentMonth = today.getMonth();

    const monthBirthdays = employees.filter(emp => {
      if (!emp.birthday) return false;
      const m = parseInt(emp.birthday.split('-')[1]);
      return m === selectedMonth + 1;
    }).sort((a, b) => {
      const dayA = parseInt(a.birthday.split('-')[2]);
      const dayB = parseInt(b.birthday.split('-')[2]);
      return dayA - dayB;
    });

    const isCurrentMonth = selectedMonth === currentMonth;

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

  const myPendingTasks = useMemo(() => {
    if (!currentUser) return 0;
    return tasks.filter(t => t.assigneeId === currentUser.id && t.status !== TaskStatus.DONE).length;
  }, [tasks, currentUser]);

  const departmentPendingTasks = useMemo(() => {
    if (!currentUser) return 0;
    return tasks.filter(t => t.status !== TaskStatus.DONE && t.creatorDepartment === currentUser.department).length;
  }, [tasks, currentUser]);

  const getRoomInfo = (room: MeetingRoom) => {
    const now = new Date();
    const dayOfWeek = now.getDay(); 
    const currentTime = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false });
    
    const isSaturday = dayOfWeek === 6;
    const isSunday = dayOfWeek === 0;
    const worksOnSaturday = !!room.worksSaturday;
    const worksOnSunday = !!room.worksSunday;
    
    const isClosedForWeekend = (isSaturday && !worksOnSaturday) || (isSunday && !worksOnSunday);
    const isOutsideHours = currentTime < (room.startTime || '08:00') || currentTime >= (room.endTime || '18:00');
    const isClosed = isClosedForWeekend || isOutsideHours;

    const roomApps = todaysAppointments.filter(a => a.roomId === room.id).sort((a, b) => {
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
      isOccupied: !!currentMeeting && !isClosed, 
      isClosed,
      currentMeeting, 
      schedule: roomApps 
    };
  };

  const formatDate = (isoString: string) => {
    if (!isoString) return '';
    return new Date(isoString).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <div className="flex flex-col items-center gap-2 text-emerald-600">
           <Loader2 className="animate-spin" size={48} />
           <span className="font-medium">Carregando dashboard...</span>
        </div>
      </div>
    );
  }

  // Lógica de grid adaptável baseada na visibilidade lateral
  const showSidebar = (globalSettings?.dashboardShowRooms || globalSettings?.dashboardShowBirthdays);

  return (
    <div className="space-y-6 animate-fade-in relative">
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-3xl font-bold mb-2">Bem-vindo(a), {currentUser?.name.split(' ')[0]}!</h2>
          <p className="text-emerald-100 max-w-2xl text-lg leading-relaxed">
            Você tem <span className="font-bold text-white border-b border-emerald-400">{myPendingTasks} tarefas</span> atribuídas a você.
            <span className="block sm:inline sm:ml-2">
              No setor <span className="font-bold text-white">{currentUser?.department}</span>, existem <span className="font-bold text-white">{departmentPendingTasks} pendências</span> no total.
            </span>
          </p>

          {isBirthdayToday && (
            <div className="mt-8 flex flex-col md:flex-row items-center md:items-start gap-6 bg-white/15 backdrop-blur-xl p-6 md:p-8 rounded-[2rem] border border-white/30 animate-fade-in shadow-2xl max-w-4xl ring-1 ring-white/20">
              <div className="relative shrink-0">
                <div className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-white shadow-2xl overflow-hidden relative z-10">
                  <img src={currentUser?.avatar} alt={currentUser?.name} className="w-full h-full object-cover" />
                </div>
                <div className="absolute -top-4 -right-2 text-5xl md:text-6xl drop-shadow-lg z-20 animate-bounce select-none" title="Feliz Aniversário!">
                  🥳
                </div>
                <div className="absolute -top-6 -left-2 text-4xl drop-shadow-md z-20 animate-pulse select-none opacity-80">
                  ✨
                </div>
                <div className="absolute inset-0 bg-pink-400/30 blur-2xl rounded-full animate-pulse"></div>
              </div>

              <div className="text-center md:text-left space-y-4">
                <h3 className="text-2xl md:text-3xl font-black text-white tracking-tight drop-shadow-sm">
                  🎉 Feliz aniversário! 🎉
                </h3>
                <div className="space-y-4 text-emerald-50 text-sm md:text-base leading-relaxed font-medium">
                  <p>Desejamos um novo ciclo cheio de saúde, realizações e crescimento pessoal e profissional. Conte com a Intermarítima para seguir construindo grandes resultados juntos. ✨</p>
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
      </div>

      <div className={`grid grid-cols-1 ${showSidebar ? 'lg:grid-cols-3' : 'lg:grid-cols-1'} gap-6`}>
        {globalSettings?.dashboardShowNews && (
          <div className={`${showSidebar ? 'lg:col-span-2' : 'lg:col-span-1'} space-y-6`}>
            <div className="flex items-center justify-between">
               <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                 <Megaphone className="text-emerald-600" size={24} /> Mural de Notícias
               </h3>
               <Link to="/news-editor" className="text-sm text-emerald-600 font-medium hover:underline">Ver todas / Criar</Link>
            </div>

            <div className="space-y-4">
              {newsList.length > 0 ? (
                newsList.map(news => {
                  const isExpanded = expandedNewsId === news.id;
                  
                  // Lógica de Avatar do Autor
                  const authorEmp = employees.find(e => e.name === news.author);
                  const authorAvatarUrl = news.authorAvatar || authorEmp?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(news.author)}&background=0d9488&color=fff`;

                  return (
                    <div key={news.id} className={`bg-white rounded-2xl p-0 shadow-sm border transition-all duration-500 overflow-hidden ${isExpanded ? 'border-emerald-200 ring-1 ring-emerald-50' : 'border-slate-100 hover:shadow-md'}`}>
                      <div className={`flex flex-col md:flex-row ${isExpanded ? 'bg-slate-50/50' : ''}`}>
                        <div className={`h-48 md:h-auto md:w-1/3 bg-slate-200 relative shrink-0 transition-all duration-500 ${isExpanded ? 'md:h-64' : ''}`}>
                            <img src={news.thumbnail} alt={news.title} className="w-full h-full object-cover" />
                            {isExpanded && (
                              <div className="absolute inset-0 bg-black/20 flex items-center justify-center md:hidden">
                                 <span className="bg-white/90 px-4 py-2 rounded-full text-xs font-bold text-slate-800">Visualizando Comunicado</span>
                              </div>
                            )}
                        </div>
                        <div className="p-6 md:w-2/3 flex flex-col justify-center">
                          <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
                            <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded font-bold uppercase tracking-wider text-[10px]">{news.category}</span>
                            <span>{formatDate(news.date)}</span>
                          </div>
                          <h4 className={`text-lg font-bold text-slate-900 leading-tight mb-2 transition-all ${isExpanded ? 'text-xl md:text-2xl' : ''}`}>{news.title}</h4>
                          
                          {!isExpanded && (
                             <p className="text-slate-600 text-sm line-clamp-2 mb-4">
                               {news.blocks.find(b => b.type === 'paragraph')?.content || 'Clique para ler mais...'}
                             </p>
                          )}

                          <div className="flex gap-4 items-center">
                             {news.externalUrl ? (
                               <a href={news.externalUrl} target="_blank" rel="noopener noreferrer" className="text-emerald-600 font-semibold text-sm hover:text-emerald-800 flex items-center gap-1">Ler Notícia Completa <ExternalLink size={14}/></a>
                             ) : (
                               <button 
                                 onClick={() => setExpandedNewsId(isExpanded ? null : news.id)} 
                                 className={`font-bold text-sm flex items-center gap-2 transition-all px-4 py-2 rounded-lg ${isExpanded ? 'bg-slate-200 text-slate-700 hover:bg-slate-300' : 'text-emerald-600 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100'}`}
                               >
                                 {isExpanded ? <><ChevronUp size={16}/> Recolher Leitura</> : <><ChevronDown size={16}/> Ler Comunicado</>}
                               </button>
                             )}
                          </div>
                        </div>
                      </div>

                      {/* EXPANDED CONTENT AREA */}
                      {isExpanded && (
                        <div className="p-6 md:p-10 border-t border-slate-100 animate-fade-in bg-white">
                           <div className="flex items-center gap-4 mb-8 pb-4 border-b border-slate-50">
                              <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-emerald-100 shadow-sm shrink-0">
                                 <img src={authorAvatarUrl} alt={news.author} className="w-full h-full object-cover" />
                              </div>
                              <div>
                                 <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Autor da Publicação</p>
                                 <p className="text-sm font-bold text-slate-700 leading-none">{news.author}</p>
                              </div>
                           </div>
                           
                           <div className="max-w-none prose prose-slate">
                              {news.blocks.map(block => renderNewsBlock(block))}
                           </div>

                           <div className="mt-10 pt-6 border-t border-slate-100 flex justify-center">
                              <button 
                                onClick={() => {
                                  setExpandedNewsId(null);
                                  window.scrollTo({ top: document.getElementById(`news-${news.id}`)?.offsetTop || 0, behavior: 'smooth' });
                                }}
                                className="group flex flex-col items-center gap-2 text-slate-400 hover:text-emerald-600 transition-all"
                              >
                                 <ArrowUpCircle size={32} className="group-hover:scale-110 transition-transform" />
                                 <span className="text-[10px] font-black uppercase tracking-widest">Fechar Visualização</span>
                              </button>
                           </div>
                        </div>
                      )}
                      <div id={`news-${news.id}`} />
                    </div>
                  );
                })
              ) : (
                <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 border-dashed text-slate-400">
                  <Megaphone size={48} className="mx-auto mb-4 opacity-20" />
                  <p>Nenhuma notícia publicada recentemente.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {showSidebar && (
          <div className="space-y-6">
            {globalSettings?.dashboardShowRooms && (
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <Calendar size={20} className="text-indigo-600" /> Status das Salas
                  </h3>
                  <Link to="/meeting-rooms" className="text-xs text-indigo-600 hover:underline">Ver agenda</Link>
                </div>
                <div className="space-y-4">
                    {rooms.length > 0 ? rooms.map(room => {
                      const { isOccupied, isClosed, schedule } = getRoomInfo(room);
                      const isExpanded = expandedRooms.has(room.id);
                      const unit = units.find(u => u.id === room.unitId);
                      
                      return (
                        <div key={room.id} className="border border-slate-100 rounded-xl p-3 bg-slate-50/50">
                          <div className="flex items-center justify-between mb-2 cursor-pointer select-none" onClick={() => toggleRoomExpansion(room.id)}>
                              <div className="flex items-center gap-2">
                                <MapPin size={14} className="text-slate-400" />
                                <div>
                                    <span className="text-sm font-bold text-slate-700 block leading-tight">{room.name}</span>
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
                              <div className="text-slate-400 hover:text-slate-600 transition-colors">{isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</div>
                          </div>
                          {isExpanded && (
                              <div className="mt-3 animate-fade-in">
                                  <div className="flex justify-between items-center mb-2">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase">Agenda Hoje:</p>
                                    <span className="text-[9px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">{room.startTime || '08:00'} - {room.endTime || '18:00'}</span>
                                  </div>
                                  <div className="grid grid-cols-1 gap-2">
                                    {TIME_SLOTS.map(time => {
                                      const appointment = schedule.find(a => a.time === time);
                                      const isSlotOccupied = !!appointment;
                                      const [h, m] = time.split(':').map(Number);
                                      const now = new Date();
                                      
                                      const isWithinRoomHours = time >= (room.startTime || '08:00') && time < (room.endTime || '18:00');
                                      const isPast = now.getHours() > h || (now.getHours() === h && now.getMinutes() >= m + 30);
                                      
                                      if (isSlotOccupied) {
                                        const pList = appointment.participants || [];
                                        return (
                                          <div key={time} className={`flex flex-col border rounded-xl p-2.5 ${isPast ? 'bg-slate-100 border-slate-200 opacity-60 grayscale-[50%]' : 'bg-red-50 border-red-100 shadow-sm'}`}>
                                            <div className="flex justify-between items-center mb-2">
                                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${isPast ? 'bg-slate-200 text-slate-500' : 'bg-red-100 text-red-600'}`}>{time}</span>
                                                <div className="flex items-center gap-1 text-[9px] font-bold text-slate-500 truncate">
                                                    <User size={10} /> {appointment.userName}
                                                </div>
                                            </div>
                                            <p className="text-[10px] font-bold text-slate-800 line-clamp-1">{appointment.subject}</p>
                                            {pList.length > 0 && <p className="text-[8px] text-slate-400 mt-1 italic">+{pList.length} convidados</p>}
                                          </div>
                                        );
                                      }
                                      
                                      return (
                                        <div key={time} className={`flex items-center justify-between border rounded-xl p-2 px-3 ${isPast || isClosed || !isWithinRoomHours ? 'bg-slate-100 border-slate-200 opacity-50' : 'bg-emerald-50 border-emerald-100'}`}>
                                            <span className="text-[9px] font-bold text-slate-400">{time}</span>
                                            <span className="text-[8px] uppercase font-bold text-slate-400">{isClosed || !isWithinRoomHours ? 'Fechado' : (isPast ? 'Encerrado' : 'Livre')}</span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                  <Link 
                                    to="/meeting-rooms" 
                                    state={{ selectedRoomId: room.id }}
                                    className="mt-4 w-full py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-emerald-700 transition-all shadow-md shadow-emerald-100"
                                  >
                                    Reservar nesta sala
                                  </Link>
                              </div>
                          )}
                        </div>
                      ); 
                    }) : (
                      <p className="text-sm text-slate-400 text-center py-4">Nenhuma sala cadastrada.</p>
                    )}
                </div>
              </div>
            )}

            {globalSettings?.dashboardShowBirthdays && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-6 border-b border-slate-50 bg-slate-50/50 flex items-center justify-between">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <Cake size={20} className="text-pink-500" /> Aniversariantes
                  </h3>
                  <div className="flex items-center gap-1">
                    <button onClick={handlePrevMonth} className="p-1 hover:bg-white rounded-lg transition-colors text-slate-400 hover:text-emerald-600"><ChevronLeft size={18} /></button>
                    <span className="text-[10px] font-bold text-emerald-700 uppercase min-w-[70px] text-center">{months[selectedMonth]}</span>
                    <button onClick={handleNextMonth} className="p-1 hover:bg-white rounded-lg transition-colors text-slate-400 hover:text-emerald-600"><ChevronRight size={18} /></button>
                  </div>
                </div>
                <div className="p-4 space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar">
                  {birthdayData.todaysBirthdays.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest flex items-center gap-1.5 mb-3">
                        <PartyPopper size={14} className="animate-bounce" /> É hoje!
                      </p>
                      {birthdayData.todaysBirthdays.map(emp => (
                        <div key={emp.id} className="flex items-center gap-3 p-3 bg-gradient-to-r from-pink-50 to-orange-50 rounded-xl border border-pink-100 relative group overflow-hidden">
                          <img src={emp.avatar} className="w-10 h-10 rounded-full border-2 border-white shadow-sm object-cover" />
                          <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-slate-800 truncate">{emp.name}</p>
                              <p className="text-[10px] text-slate-500 truncate uppercase">{emp.department}</p>
                          </div>
                          <div className="text-xl">🎂</div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="space-y-4">
                    {birthdayData.isCurrentMonth && birthdayData.pastBirthdays.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest pt-2">Aconteceu este mês</p>
                        {birthdayData.pastBirthdays.map(emp => (
                          <div key={emp.id} className="flex items-center gap-3 p-2 hover:bg-slate-50 transition-all rounded-xl">
                            <img src={emp.avatar} className="w-8 h-8 rounded-full border border-slate-100 object-cover" />
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold text-slate-700 truncate">{emp.name}</p>
                                <p className="text-[9px] text-slate-400 truncate uppercase">{emp.department}</p>
                            </div>
                            <div className="text-[10px] font-black text-slate-400 bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-200">DIA {emp.birthday.split('-')[2]}</div>
                          </div>
                        ))}
                      </div>
                    )}

                    {(birthdayData.upcomingBirthdays.length > 0 || (!birthdayData.isCurrentMonth && birthdayData.upcomingBirthdays.length > 0)) && (
                      <div className="space-y-2">
                        <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest pt-2">Próximos do mês</p>
                        {birthdayData.upcomingBirthdays.map(emp => (
                          <div key={emp.id} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-xl transition-colors">
                            <img src={emp.avatar} className="w-8 h-8 rounded-full border border-slate-100 object-cover" />
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold text-slate-700 truncate">{emp.name}</p>
                                <p className="text-[9px] text-slate-400 truncate uppercase">{emp.department}</p>
                            </div>
                            <div className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100">DIA {emp.birthday.split('-')[2]}</div>
                          </div>
                        ))}
                      </div>
                    )}

                    {birthdayData.todaysBirthdays.length === 0 && birthdayData.pastBirthdays.length === 0 && birthdayData.upcomingBirthdays.length === 0 && (
                      <div className="text-center py-8 text-slate-300">
                        <CalendarDays size={32} className="mx-auto mb-2 opacity-20" />
                        <p className="text-xs font-bold uppercase tracking-widest">Sem registros</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
