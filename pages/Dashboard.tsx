
// ... imports remain the same
import React, { useState, useEffect } from 'react';
import { fetchNews, fetchEmployees, fetchTasks, fetchMeetingRooms } from '../services/firebaseService';
import { db } from '../services/firebaseConfig';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { Employee, NewsArticle, Task, MeetingRoom, Appointment } from '../types';
import { Calendar, TrendingUp, Megaphone, ChevronLeft, ChevronRight, Loader2, X, MapPin, Clock, User, Users } from 'lucide-react';
import { Link } from 'react-router-dom';

// Gera horários de 30 em 30 minutos (das 08:00 às 17:30) para visualização
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
  // State for Data
  const [newsList, setNewsList] = useState<NewsArticle[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [rooms, setRooms] = useState<MeetingRoom[]>([]);
  const [todaysAppointments, setTodaysAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // State for Reading News Modal
  const [selectedNews, setSelectedNews] = useState<NewsArticle | null>(null);

  // State for Month Navigation (0 = January, 11 = December)
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());

  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  // Load Data on Mount
  useEffect(() => {
    const loadDashboardData = async () => {
      setIsLoading(true);
      try {
        const todayStr = new Date().toISOString().split('T')[0];

        // Parallel fetch for standard data
        const [newsData, employeesData, tasksData, roomsData] = await Promise.all([
          fetchNews(),
          fetchEmployees(),
          fetchTasks(),
          fetchMeetingRooms()
        ]);

        // Specific fetch for Today's Appointments
        const q = query(collection(db, "appointments"), where("date", "==", todayStr));
        const appSnapshot = await getDocs(q);
        const apps = appSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Appointment));
        
        // Filter published news and sort by date descending
        setNewsList(newsData.filter(n => n.published));
        setEmployees(employeesData);
        setTasks(tasksData);
        setRooms(roomsData);
        setTodaysAppointments(apps);

      } catch (error) {
        console.error("Erro ao carregar dashboard:", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadDashboardData();
  }, []);

  const handlePrevMonth = () => {
    setSelectedMonth(prev => (prev === 0 ? 11 : prev - 1));
  };

  const handleNextMonth = () => {
    setSelectedMonth(prev => (prev === 11 ? 0 : prev + 1));
  };

  // Filter and Sort Birthdays based on selected month
  const birthdays = employees.filter(emp => {
    if (!emp.birthday) return false;
    const parts = emp.birthday.split('-');
    if (parts.length < 3) return false;
    const month = parseInt(parts[1]);
    return month === selectedMonth + 1; // compare 1-12 with 0-11 + 1
  }).sort((a, b) => {
    const dayA = parseInt(a.birthday.split('-')[2]);
    const dayB = parseInt(b.birthday.split('-')[2]);
    return dayA - dayB;
  });

  const pendingTasks = tasks.filter(t => t.status !== 'DONE').length;

  // Helper to get room status and today's schedule
  const getRoomInfo = (roomId: string) => {
    const now = new Date();
    
    // Sort appointments by time (Hours and Minutes)
    const roomApps = todaysAppointments
      .filter(a => a.roomId === roomId)
      .sort((a, b) => {
        const [hA, mA] = a.time.split(':').map(Number);
        const [hB, mB] = b.time.split(':').map(Number);
        return (hA * 60 + mA) - (hB * 60 + mB);
      });

    // Check if occupied right now (Assuming 30 min slots)
    const currentMeeting = roomApps.find(a => {
      const [h, m] = a.time.split(':').map(Number);
      const appStart = new Date();
      appStart.setHours(h, m, 0, 0);
      
      const appEnd = new Date(appStart);
      appEnd.setMinutes(appStart.getMinutes() + 30); // Assume 30 min duration for status check

      return now >= appStart && now < appEnd;
    });

    return {
      isOccupied: !!currentMeeting,
      currentMeeting,
      schedule: roomApps
    };
  };

  // Date formatter helper
  const formatDate = (isoString: string) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
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

  return (
    <div className="space-y-6 animate-fade-in relative">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-3xl font-bold mb-2">Bem-vindo de volta!</h2>
          <p className="text-emerald-100 max-w-xl">
            Você tem <span className="font-bold text-white">{pendingTasks} tarefas pendentes</span> no sistema. 
            O iRamais Hub está atualizado com as últimas informações.
          </p>
        </div>
        {/* Decorative circles */}
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* News Feed - Takes 2 columns */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
             <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
               <Megaphone className="text-emerald-600" size={24} />
               Mural de Notícias
             </h3>
             <Link to="/news-editor" className="text-sm text-emerald-600 font-medium hover:underline">Ver todas / Criar</Link>
          </div>

          <div className="space-y-4">
            {newsList.length > 0 ? (
              newsList.map(news => (
                <div key={news.id} className="bg-white rounded-2xl p-0 shadow-sm border border-slate-100 overflow-hidden hover:shadow-md transition-shadow flex flex-col md:flex-row">
                  <div className="h-48 md:h-auto md:w-1/3 bg-slate-200 relative shrink-0">
                      <img src={news.thumbnail} alt={news.title} className="w-full h-full object-cover" />
                  </div>
                  <div className="p-6 md:w-2/3 flex flex-col justify-center">
                    <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
                      <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded font-bold uppercase tracking-wider text-[10px]">{news.category}</span>
                      <span>{formatDate(news.date)}</span>
                    </div>
                    <h4 className="text-lg font-bold text-slate-900 mb-2 leading-tight">{news.title}</h4>
                    <p className="text-slate-600 text-sm line-clamp-2 mb-4">
                      {news.blocks.find(b => b.type === 'paragraph')?.content || 'Clique para ler mais...'}
                    </p>
                    
                    {news.externalUrl ? (
                      <a 
                        href={news.externalUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-emerald-600 font-semibold text-sm hover:text-emerald-800 self-start flex items-center gap-1"
                      >
                        Ler Notícia Completa &rarr;
                      </a>
                    ) : (
                      <button 
                        onClick={() => setSelectedNews(news)}
                        className="text-emerald-600 font-semibold text-sm hover:text-emerald-800 self-start flex items-center gap-1"
                      >
                        Ler Comunicado &rarr;
                      </button>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 border-dashed text-slate-400">
                <Megaphone size={48} className="mx-auto mb-4 opacity-20" />
                <p>Nenhuma notícia publicada recentemente.</p>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Widgets - Takes 1 column */}
        <div className="space-y-6">
          
          {/* Quick Stats */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
             <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
               <TrendingUp size={20} className="text-emerald-500" /> Indicadores
             </h3>
             <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 rounded-xl text-center">
                  <span className="block text-2xl font-bold text-slate-900">98%</span>
                  <span className="text-xs text-slate-500">Metas</span>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl text-center">
                  <span className="block text-2xl font-bold text-slate-900">12</span>
                  <span className="text-xs text-slate-500">Projetos</span>
                </div>
             </div>
          </div>

          {/* Meeting Rooms Status Widget (Detailed) */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
             <div className="flex items-center justify-between mb-4">
               <h3 className="font-bold text-slate-800 flex items-center gap-2">
                 <Calendar size={20} className="text-indigo-600" /> Status das Salas
               </h3>
               <Link to="/meeting-rooms" className="text-xs text-indigo-600 hover:underline">Ver agenda</Link>
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

          {/* Birthdays Widget with Navigation */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Calendar size={20} className="text-pink-500" /> Aniversariantes
              </h3>
            </div>
            
            {/* Month Navigator */}
            <div className="flex items-center justify-between bg-slate-50 rounded-lg p-1 mb-4">
              <button 
                onClick={handlePrevMonth}
                className="p-1 hover:bg-white hover:shadow-sm rounded-md transition-all text-slate-500"
              >
                <ChevronLeft size={18} />
              </button>
              <span className="text-sm font-bold text-emerald-700 uppercase tracking-wide">
                {months[selectedMonth]}
              </span>
              <button 
                onClick={handleNextMonth}
                className="p-1 hover:bg-white hover:shadow-sm rounded-md transition-all text-slate-500"
              >
                <ChevronRight size={18} />
              </button>
            </div>

            {birthdays.length > 0 ? (
              <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                {birthdays.map(emp => (
                  <div key={emp.id} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg transition-colors">
                    <img src={emp.avatar} alt={emp.name} className="w-10 h-10 rounded-full border-2 border-white shadow-sm object-cover" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{emp.name}</p>
                      <p className="text-xs text-slate-500 truncate">{emp.department}</p>
                    </div>
                    <div className="bg-pink-100 text-pink-700 text-xs font-bold px-2 py-1 rounded-md border border-pink-200 whitespace-nowrap">
                      Dia {emp.birthday.split('-')[2]}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-400">
                <Calendar size={32} className="mx-auto mb-2 opacity-20" />
                <p className="text-sm">Nenhum aniversariante em {months[selectedMonth]}.</p>
              </div>
            )}
          </div>

           {/* System Status */}
           <div className="bg-slate-900 p-6 rounded-2xl text-white">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                <span className="font-semibold text-sm">Sistema Operacional</span>
              </div>
              <p className="text-xs text-slate-400">
                Último backup: Hoje, 03:00 AM
              </p>
           </div>
        </div>
      </div>

      {/* --- NEWS READER MODAL --- */}
      {selectedNews && (
        <div 
          className="fixed inset-0 bg-slate-900/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm"
          onClick={() => setSelectedNews(null)}
        >
          <div 
            className="bg-white w-full max-w-3xl max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-fade-in"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header/Image */}
            <div className="h-48 md:h-64 bg-slate-200 relative shrink-0">
               <img src={selectedNews.thumbnail} alt={selectedNews.title} className="w-full h-full object-cover" />
               <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent"></div>
               
               <button 
                 onClick={() => setSelectedNews(null)}
                 className="absolute top-4 right-4 bg-black/20 hover:bg-black/40 backdrop-blur-md text-white p-2 rounded-full transition-colors z-10"
               >
                 <X size={20} />
               </button>

               <div className="absolute bottom-4 left-4 md:bottom-6 md:left-6">
                  <span className="bg-emerald-600 text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide shadow-sm border border-emerald-500">
                    {selectedNews.category}
                  </span>
               </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar">
               <div className="mb-8 border-b border-slate-100 pb-6">
                 <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-3 leading-tight">{selectedNews.title}</h2>
                 <div className="flex items-center gap-3 text-sm text-slate-500 font-medium">
                   <span>{formatDate(selectedNews.date)}</span>
                   <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                   <span>Publicado por: {selectedNews.author}</span>
                 </div>
               </div>
               
               <div className="space-y-6 text-slate-700">
                 {selectedNews.blocks.map(block => {
                   // Render logic matching the Editor's preview capability
                   switch (block.type) {
                     case 'header':
                       return <h3 key={block.id} style={block.style} className="font-bold text-xl md:text-2xl mb-2">{block.content}</h3>;
                     case 'image':
                       return (
                         <div key={block.id} className="my-4">
                           <img src={block.content} alt="" className="w-full rounded-xl shadow-sm border border-slate-100" />
                         </div>
                       );
                     case 'quote':
                       return (
                        <blockquote key={block.id} style={block.style} className="border-l-4 border-emerald-500 pl-4 py-2 italic bg-slate-50 rounded-r-lg my-4 text-slate-600">
                          "{block.content}"
                        </blockquote>
                       );
                     case 'button':
                       return (
                          <div key={block.id} className="text-center my-6">
                            <a 
                              href={block.url} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="inline-block transition-transform hover:scale-105 shadow-md hover:shadow-lg"
                              style={{
                                ...block.style,
                                display: 'inline-block',
                                textDecoration: 'none'
                              }}
                            >
                              {block.content}
                            </a>
                          </div>
                       );
                     default: // paragraph
                       return <p key={block.id} style={block.style} className="leading-relaxed whitespace-pre-wrap">{block.content}</p>;
                   }
                 })}
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
