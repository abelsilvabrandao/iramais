import React, { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { fetchEmployees, fetchNews, fetchSystems } from '../services/firebaseService';
import { Employee, NewsArticle, SystemTool } from '../types';
import { LogIn, ExternalLink, Mail, HelpCircle, Ticket, Tag, ChevronRight, Cake, PartyPopper, CalendarDays, Loader2 } from 'lucide-react';
import Logo from '../components/Logo';

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
  const [selectedCategory, setSelectedCategory] = useState('Todas');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [newsList, setNewsList] = useState<NewsArticle[]>([]);
  const [systems, setSystems] = useState<SystemTool[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load Real Data
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [empData, newsData, sysData] = await Promise.all([
          fetchEmployees(),
          fetchNews(),
          fetchSystems()
        ]);
        setEmployees(empData);
        setNewsList(newsData.filter(n => n.published)); // Only show published news
        setSystems(sysData);
      } catch (error) {
        console.error("Erro ao carregar portal do visitante:", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  // Extract all categories from news
  const categories = useMemo(() => {
    const cats = new Set(newsList.map(n => n.category));
    return ['Todas', ...Array.from(cats)];
  }, [newsList]);

  // Birthday Logic - Organized by Today vs Upcoming
  const { todaysBirthdays, upcomingBirthdays } = useMemo(() => {
    const today = new Date();
    const currentDay = today.getDate();
    const currentMonth = today.getMonth() + 1; // 1-12

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

  // Filter News based on category
  const filteredNews = useMemo(() => {
    if (selectedCategory === 'Todas') return newsList;
    return newsList.filter(n => n.category === selectedCategory);
  }, [selectedCategory, newsList]);

  // Determine layout content based on filtering
  const featuredNews = filteredNews[0]; // First item is always featured in the current filtered list
  const secondaryNews = filteredNews.slice(1, 3); // Next 2 items
  
  const isFiltered = selectedCategory !== 'Todas';

  // Date formatter for Birthday Header
  const todayDateDisplay = useMemo(() => {
    const date = new Date();
    const options: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
    const formatted = date.toLocaleDateString('pt-BR', options);
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  }, []);

  if (isLoading) {
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
          <Link to="/login" className="flex items-center gap-2 text-sm font-medium bg-white/10 hover:bg-white/20 px-4 py-2 rounded-full transition-colors">
            <LogIn size={16} />
            Área do Colaborador
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">
        
        {/* Hero Section */}
        <section className="bg-gradient-to-r from-emerald-700 to-teal-800 rounded-3xl p-8 md:p-12 text-center text-white shadow-xl relative overflow-hidden">
          <div className="relative z-10 max-w-2xl mx-auto">
            <h1 className="text-3xl md:text-4xl font-bold mb-4">Bem-vindo ao iRamais Hub</h1>
            <p className="text-emerald-100 text-lg">
              Seu ponto central de comunicação, notícias e acesso rápido aos sistemas corporativos.
            </p>
          </div>
          
          {/* Decorative Elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full blur-3xl -ml-16 -mb-16"></div>
        </section>

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
            
            {/* Categories Widget (Quick Access) */}
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
          {/* Background decoration */}
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
              {/* Email */}
              <div className="flex items-center gap-4 bg-slate-800/50 border border-slate-700 px-6 py-4 rounded-xl flex-1 lg:flex-none hover:bg-slate-800 transition-colors cursor-default">
                <div className="bg-emerald-900/50 p-3 rounded-lg text-emerald-400">
                  <Mail size={24} /> 
                </div>
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">E-mail</p>
                  <p className="font-bold text-lg text-white">informatica@intermaritima.com.br</p>
                </div>
              </div>

              {/* GLPI Link */}
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