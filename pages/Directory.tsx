
import React, { useState, useEffect, useRef } from 'react';
import { fetchEmployees, fetchDepartments, fetchUnits } from '../services/firebaseService';
import { Search, Phone, Mail, Building2, MessageSquare, Send, X, Minimize2, PhoneCall, ChevronRight, MapPin, Loader2 } from 'lucide-react';
import { Employee, ChatMessage, OrganizationDepartment, OrganizationUnit } from '../types';

// Simple WhatsApp SVG Icon component
const WhatsAppIcon = ({ size = 18, className = "" }: { size?: number, className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M3 21l1.65-3.8a9 9 0 1 1 3.4 2.9L3 21" />
    <path d="M9 10a.5.5 0 0 0 1 0V9a.5.5 0 0 0-1 0v1a5 5 0 0 0 5 5h1a.5.5 0 0 0 0-1h-1a.5.5 0 0 0 0 1" />
  </svg>
);

// --- Componente Deslizante para Ligar ---
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

const Directory: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departmentsList, setDepartmentsList] = useState<OrganizationDepartment[]>([]);
  const [unitsList, setUnitsList] = useState<OrganizationUnit[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [deptFilter, setDeptFilter] = useState('All');
  const [unitFilter, setUnitFilter] = useState('All');
  
  // Chat State
  const [activeChat, setActiveChat] = useState<Employee | null>(null);
  const [isChatMinimized, setIsChatMinimized] = useState(false);
  const [messageInput, setMessageInput] = useState('');
  const [chatHistory, setChatHistory] = useState<Record<string, ChatMessage[]>>({});
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Load Data
  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      try {
        const [emp, dept, unit] = await Promise.all([fetchEmployees(), fetchDepartments(), fetchUnits()]);
        setEmployees(emp);
        setDepartmentsList(dept);
        setUnitsList(unit);
      } catch (error) {
        console.error("Erro ao carregar diretório", error);
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, []);

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = emp.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (emp.extension && emp.extension.includes(searchTerm)) ||
                          emp.role.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept = deptFilter === 'All' || emp.department === deptFilter;
    const matchesUnit = unitFilter === 'All' || (emp.unit && emp.unit === unitFilter);
    
    return matchesSearch && matchesDept && matchesUnit;
  });

  const cleanWhatsAppNumber = (phone: string) => phone.replace(/\D/g, '');

  // --- Chat Logic ---
  const handleOpenChat = (employee: Employee) => {
    setActiveChat(employee);
    setIsChatMinimized(false);
    if (!chatHistory[employee.id]) {
        setChatHistory(prev => ({
            ...prev,
            [employee.id]: [
                { id: 'sys-1', senderId: employee.id, text: `Olá, sou ${employee.name.split(' ')[0]}. Como posso ajudar?`, timestamp: new Date() }
            ]
        }));
    }
  };

  const handleSendMessage = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!messageInput.trim() || !activeChat) return;

    const newMessage: ChatMessage = {
        id: Date.now().toString(),
        senderId: 'me',
        text: messageInput,
        timestamp: new Date()
    };

    setChatHistory(prev => ({
        ...prev,
        [activeChat.id]: [...(prev[activeChat.id] || []), newMessage]
    }));
    setMessageInput('');

    setTimeout(() => {
        const reply: ChatMessage = {
            id: (Date.now() + 1).toString(),
            senderId: activeChat.id,
            text: "Recebi sua mensagem! Estou verificando aqui e já te retorno.",
            timestamp: new Date()
        };
        setChatHistory(prev => ({
            ...prev,
            [activeChat.id]: [...(prev[activeChat.id] || []), reply]
        }));
    }, 2500);
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, activeChat, isChatMinimized]);

  if (isLoading) return <div className="flex justify-center p-12 text-slate-500"><Loader2 className="animate-spin mr-2" /> Carregando ramais...</div>;

  return (
    <div className="space-y-6 relative min-h-[calc(100vh-140px)]">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Diretório de Pessoas</h2>
          <p className="text-slate-500 text-sm">Encontre contatos e ramais de todos os colaboradores</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 sm:flex-none">
            <Search className="absolute left-3 top-3 text-slate-400 w-4 h-4" />
            <input 
              type="text" 
              placeholder="Buscar por nome ou ramal..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 w-full sm:w-64 text-slate-900"
            />
          </div>
          
          <select 
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900"
          >
            <option value="All">Todos Departamentos</option>
            {departmentsList.map(dept => (
              <option key={dept.id} value={dept.name}>{dept.name}</option>
            ))}
          </select>

          <select 
            value={unitFilter}
            onChange={(e) => setUnitFilter(e.target.value)}
            className="px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900"
          >
            <option value="All">Todas Unidades</option>
            {unitsList.map(unit => (
              <option key={unit.id} value={unit.name}>{unit.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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
                 <button 
                    onClick={() => handleOpenChat(emp)}
                    className="flex-1 flex items-center justify-center gap-2 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700 transition-colors shadow-sm shadow-emerald-200"
                 >
                    <MessageSquare size={16} /> Chat
                 </button>
                 
                 {emp.whatsapp && (
                    <a 
                      href={`https://wa.me/${cleanWhatsAppNumber(emp.whatsapp)}`} 
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center p-2 border border-green-200 bg-green-50 rounded-lg text-green-600 hover:bg-green-100 transition-colors"
                      title="WhatsApp"
                    >
                      <WhatsAppIcon size={18} />
                    </a>
                 )}

                 <a 
                    href={`mailto:${emp.email}`} 
                    className="flex items-center justify-center p-2 border border-slate-200 rounded-lg text-slate-400 hover:bg-slate-50 hover:text-emerald-600 transition-colors"
                    title="Enviar E-mail"
                 >
                    <Mail size={18} />
                 </a>
              </div>
            </div>
          </div>
        ))}
        {filteredEmployees.length === 0 && (
          <div className="col-span-full py-12 text-center text-slate-500">
            Nenhum colaborador encontrado com os filtros atuais.
          </div>
        )}
      </div>

      {/* --- Floating Chat Window --- */}
      {activeChat && (
        <div className={`fixed bottom-0 right-4 w-80 bg-white rounded-t-xl shadow-2xl border border-slate-200 z-50 flex flex-col transition-all duration-300 ${isChatMinimized ? 'h-14' : 'h-[450px]'}`}>
            <div 
                className="bg-emerald-600 text-white p-3 rounded-t-xl flex items-center justify-between cursor-pointer"
                onClick={() => setIsChatMinimized(!isChatMinimized)}
            >
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <img src={activeChat.avatar} alt="" className="w-8 h-8 rounded-full border border-white/30" />
                        <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-400 rounded-full border border-emerald-600"></div>
                    </div>
                    <div>
                        <p className="text-sm font-bold leading-tight">{activeChat.name}</p>
                        <p className="text-[10px] text-emerald-100 leading-tight">{activeChat.role}</p>
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    <button className="p-1 hover:bg-emerald-700 rounded"><Minimize2 size={14}/></button>
                    <button 
                        onClick={(e) => { e.stopPropagation(); setActiveChat(null); }} 
                        className="p-1 hover:bg-emerald-700 rounded"
                    >
                        <X size={14}/>
                    </button>
                </div>
            </div>

            {!isChatMinimized && (
                <>
                    <div className="flex-1 bg-slate-50 p-4 overflow-y-auto custom-scrollbar flex flex-col gap-3">
                        <div className="text-center text-xs text-slate-400 my-2">
                            Início da conversa com {activeChat.name}
                        </div>
                        {chatHistory[activeChat.id]?.map((msg) => (
                            <div 
                                key={msg.id} 
                                className={`max-w-[85%] p-3 rounded-2xl text-sm ${
                                    msg.senderId === 'me' 
                                    ? 'bg-emerald-600 text-white self-end rounded-br-none' 
                                    : 'bg-white border border-slate-200 text-slate-700 self-start rounded-bl-none shadow-sm'
                                }`}
                            >
                                <p>{msg.text}</p>
                                <p className={`text-[9px] mt-1 text-right ${msg.senderId === 'me' ? 'text-emerald-200' : 'text-slate-400'}`}>
                                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>
                            </div>
                        ))}
                        <div ref={chatEndRef} />
                    </div>

                    <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-slate-100 flex gap-2">
                        <input 
                            type="text" 
                            value={messageInput}
                            onChange={(e) => setMessageInput(e.target.value)}
                            placeholder="Digite uma mensagem..."
                            className="flex-1 bg-slate-100 border-none rounded-full px-4 py-2 text-sm focus:ring-2 focus:ring-emerald-500 text-slate-900"
                        />
                        <button 
                            type="submit" 
                            disabled={!messageInput.trim()}
                            className="p-2 bg-emerald-600 text-white rounded-full hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <Send size={18} />
                        </button>
                    </form>
                </>
            )}
        </div>
      )}

    </div>
  );
};

export default Directory;
