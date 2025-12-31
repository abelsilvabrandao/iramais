
import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, CheckSquare, FileEdit, Menu, X, Bell, Search, LayoutGrid, LogOut, Settings, Shield, Building, Lock, User, Upload, Phone, MessageCircle, Calendar, Save, Loader2, Camera, Layout as LayoutIcon, Globe, MessageSquare, PenTool, FileText, ClipboardList, Signature } from 'lucide-react';
import Logo from './Logo';
import { useAuth } from '../contexts/AuthContext';
import { updateEmployee, addEmployee, markNotificationAsRead, clearAllNotifications } from '../services/firebaseService';
import { db } from '../services/firebaseConfig';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { Notification } from '../types';

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

const Layout: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser, logout, isAdmin, isCommunication, user, isMaster, globalSettings } = useAuth();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  
  const prevNotifIds = useRef<Set<string>>(new Set());
  const isFirstLoad = useRef(true);

  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: '',
    extension: '',
    whatsapp: '',
    birthday: '',
    avatar: '',
    signatureImage: ''
  });
  const [newPhotoFile, setNewPhotoFile] = useState<string | undefined>(undefined);
  const [newSignatureFile, setNewSignatureFile] = useState<string | undefined>(undefined);

  const isActive = (path: string) => location.pathname === path;

  useEffect(() => {
    if (!currentUser) return;

    const q = query(
      collection(db, "notifications"), 
      where("userId", "==", currentUser.id),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Notification[];
      
      if (isFirstLoad.current) {
        notifs.forEach(n => prevNotifIds.current.add(n.id));
        isFirstLoad.current = false;
      } else {
        const newUnreadNotifs = notifs.filter(n => !n.read && !prevNotifIds.current.has(n.id));
        if (newUnreadNotifs.length > 0) {
          prevNotifIds.current.add(newUnreadNotifs[0].id);
        }
      }
      setNotifications(notifs);
    });

    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotifOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      unsubscribe();
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [currentUser]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleNotificationClick = async (notif: Notification) => {
    if (!notif.read) {
      await markNotificationAsRead(notif.id);
    }
    setIsNotifOpen(false);
    if (notif.link) {
      if (notif.type === 'chat' && notif.senderId) {
        navigate(notif.link, { state: { openChatWith: notif.senderId } });
      } else {
        navigate(notif.link);
      }
    }
  };

  const handleClearNotifications = async () => {
    if (currentUser) {
      try {
        await clearAllNotifications(currentUser.id);
      } catch (error) {
        console.error("Erro ao limpar notificações:", error);
      }
    }
  };

  const handleLogout = async () => {
    navigate('/');
    setTimeout(async () => {
      await logout();
    }, 100);
  };

  const handleOpenProfile = () => {
    if (currentUser) {
      setProfileForm({
        name: currentUser.name,
        extension: currentUser.extension,
        whatsapp: currentUser.whatsapp || '',
        birthday: currentUser.birthday || '',
        avatar: currentUser.avatar,
        signatureImage: currentUser.signatureImage || ''
      });
      setNewPhotoFile(undefined);
      setNewSignatureFile(undefined);
      setIsProfileModalOpen(true);
      setIsSidebarOpen(false); 
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'signature') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const MAX_SIZE = type === 'avatar' ? 300 : 600; 
          if (width > height) { if (width > MAX_SIZE) { height *= MAX_SIZE / width; width = MAX_SIZE; } } 
          else { if (height > MAX_SIZE) { width *= MAX_SIZE / height; height = MAX_SIZE; } }
          canvas.width = width; canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          const compressedBase64 = canvas.toDataURL('image/png', 0.8);
          
          if (type === 'avatar') {
            setNewPhotoFile(compressedBase64);
            setProfileForm(prev => ({ ...prev, avatar: compressedBase64 }));
          } else {
            setNewSignatureFile(compressedBase64);
            setProfileForm(prev => ({ ...prev, signatureImage: compressedBase64 }));
          }
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = async () => {
    if (!currentUser) return;
    if (!profileForm.name) return alert("O nome é obrigatório.");
    setIsSavingProfile(true);
    try {
      const payload = {
        name: profileForm.name,
        extension: profileForm.extension,
        whatsapp: profileForm.whatsapp,
        birthday: profileForm.birthday,
        uid: user?.uid,
        signatureImage: profileForm.signatureImage
      };
      if (currentUser.id === 'temp' || !currentUser.id) { await addEmployee(payload, newPhotoFile); } 
      else { await updateEmployee(currentUser.id, payload, newPhotoFile); }
      alert("Perfil atualizado com sucesso!");
      setIsProfileModalOpen(false);
    } catch (error) {
      alert("Erro ao atualizar perfil.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  if (!currentUser) return null;

  const commonItems = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/directory', label: 'Ramais & Pessoas', icon: Users },
    { path: '/systems', label: 'Sistemas & Links', icon: LayoutGrid },
    { path: '/meeting-rooms', label: 'Salas de Reunião', icon: Calendar }, 
    { path: '/tasks', label: 'Tarefas', icon: CheckSquare },
    { path: '/signatures', label: 'Assinaturas & Termos', icon: PenTool }, 
  ];

  // Regra Atualizada: Vê se for Admin/Master OU se o setor do colaborador tiver a permissão 'enabled' na matriz
  const canSeeTermsMenu = isMaster || isAdmin || (globalSettings?.termsDeptPermissions?.[currentUser.department]?.enabled);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans text-slate-900 relative overflow-x-hidden">
      
      <div className="md:hidden flex items-center justify-between p-4 bg-white border-b shadow-sm z-30 relative sticky top-0">
        <div className="flex items-center gap-2"><Logo className="h-8 w-auto" /></div>
        <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg"><Menu /></button>
      </div>

      {isSidebarOpen && <div className="fixed inset-0 bg-slate-900/60 z-40 md:hidden backdrop-blur-sm transition-opacity" onClick={() => setIsSidebarOpen(false)}/>}

      <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-slate-900 text-slate-300 transition-transform duration-300 ease-in-out transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 md:static md:h-screen flex flex-col shadow-2xl md:shadow-none`}>
        <div className="flex md:hidden items-center justify-between p-4 border-b border-slate-800"><Logo className="h-8 w-auto brightness-0 invert" /><button onClick={() => setIsSidebarOpen(false)} className="p-2 text-slate-400 hover:text-white rounded-lg"><X size={24} /></button></div>
        <div className="p-6 hidden md:flex items-center justify-center"><Logo className="w-52 h-auto" /></div>

        <nav className="flex-1 px-4 py-6 space-y-6 overflow-y-auto custom-scrollbar">
          <div className="space-y-2">
            <p className="px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Menu Principal</p>
            {commonItems.map((item) => (
              <Link key={item.path} to={item.path} onClick={() => setIsSidebarOpen(false)} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${isActive(item.path) ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/20' : 'hover:bg-slate-800 hover:text-white'}`}><item.icon size={20} /><span className="font-medium">{item.label}</span></Link>
            ))}

            {isCommunication && (
              <Link to="/news-editor" onClick={() => setIsSidebarOpen(false)} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${isActive('/news-editor') ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/20' : 'hover:bg-slate-800 hover:text-white'}`}><FileEdit size={20} /><span className="font-medium">Criar Postagem</span></Link>
            )}
          </div>

          <div className="space-y-2">
              <p className="px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1"><Shield size={12} /> Administrativo</p>
              
              {isMaster && (
                <Link to="/admin-users" onClick={() => setIsSidebarOpen(false)} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${isActive('/admin-users') ? 'bg-slate-700 text-white border-l-4 border-emerald-500' : 'hover:bg-slate-800 hover:text-white'}`}><Lock size={20} /> <span>Gestão de Usuários</span></Link>
              )}

              {isAdmin && (
                <>
                  <Link to="/admin-employees" onClick={() => setIsSidebarOpen(false)} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${isActive('/admin-employees') ? 'bg-slate-700 text-white border-l-4 border-emerald-500' : 'hover:bg-slate-800 hover:text-white'}`}><Users size={20} /> <span>Gestão Colaboradores</span></Link>
                  <Link to="/admin-systems" onClick={() => setIsSidebarOpen(false)} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${isActive('/admin-systems') ? 'bg-slate-700 text-white border-l-4 border-emerald-500' : 'hover:bg-slate-800 hover:text-white'}`}><Settings size={20} /> <span>Gestão de Sistemas & Links</span></Link>
                  <Link to="/admin-rooms" onClick={() => setIsSidebarOpen(false)} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${isActive('/admin-rooms') ? 'bg-slate-700 text-white border-l-4 border-emerald-500' : 'hover:bg-slate-800 hover:text-white'}`}><LayoutIcon size={20} /> <span>Gestão Salas</span></Link>
                  <Link to="/admin-org" onClick={() => setIsSidebarOpen(false)} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${isActive('/admin-org') ? 'bg-slate-700 text-white border-l-4 border-emerald-500' : 'hover:bg-slate-800 hover:text-white'}`}><Building size={20} /> <span>Gestão Organizacional</span></Link>
                  <Link to="/admin-signatures" onClick={() => setIsSidebarOpen(false)} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${isActive('/admin-signatures') ? 'bg-slate-700 text-white border-l-4 border-emerald-500' : 'hover:bg-slate-800 hover:text-white'}`}><PenTool size={20} /> <span>Assinaturas de E-mail</span></Link>
                </>
              )}

              {canSeeTermsMenu && (
                <Link to="/admin-terms" onClick={() => setIsSidebarOpen(false)} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${isActive('/admin-terms') ? 'bg-slate-700 text-white border-l-4 border-emerald-500' : 'hover:bg-slate-800 hover:text-white'}`}><ClipboardList size={20} /> <span>Gestão de Termos</span></Link>
              )}
            </div>
        </nav>

        <div className="p-4 border-t border-slate-800 bg-slate-900">
          <div className="flex items-center gap-3 px-2 mb-4 group cursor-pointer" onClick={handleOpenProfile}>
            <div className="relative shrink-0"><img src={currentUser.avatar} className="w-10 h-10 rounded-full border-2 border-emerald-500 object-cover group-hover:border-white transition-colors"/><div className="absolute -bottom-1 -right-1 bg-slate-700 rounded-full p-0.5 border border-slate-900 opacity-0 group-hover:opacity-100 transition-opacity"><Settings size={10} className="text-white"/></div></div>
            <div className="flex-1 min-w-0 flex flex-col"><div className="flex items-center justify-between"><p className="text-sm font-semibold text-white leading-tight truncate group-hover:text-emerald-400 transition-colors">{currentUser.name.split(' ')[0]}</p></div><div className="flex flex-col gap-0.5 mt-1"><span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-300 border border-slate-700 inline-block truncate w-fit max-w-full">{formatRoleName(currentUser.role)}</span><span className="text-[10px] text-slate-400 truncate leading-tight pl-0.5">{currentUser.department}</span>{currentUser.unit && <span className="text-[9px] text-slate-500 truncate leading-tight pl-0.5">{currentUser.unit}</span>}</div></div>
          </div>
          <div className="grid grid-cols-2 gap-2"><button onClick={handleOpenProfile} className="flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"><Settings size={14} /><span>Editar</span></button><button onClick={handleLogout} className="flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-slate-400 hover:text-red-400 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"><LogOut size={14} /><span>Sair</span></button></div>
        </div>
      </aside>

      <main className={`flex-1 flex flex-col h-[calc(100vh-64px)] md:h-screen transition-all ${isSidebarOpen ? 'overflow-hidden' : 'overflow-y-auto'}`}>
        <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4"><h1 className="text-xl font-bold text-slate-800 hidden md:block">iRamais Hub</h1><Link to="/" className="flex items-center gap-2 text-xs md:text-sm font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-colors border border-emerald-100"><Globe size={16} /><span className="hidden sm:inline">Portal do Visitante</span><span className="sm:hidden">Início</span></Link></div>
            <div className="flex items-center gap-4 w-full md:w-auto justify-end">
              <div className="relative hidden md:block"><Search className="absolute left-3 top-2.5 text-slate-400 w-4 h-4" /><input type="text" placeholder="Pesquisar no iRamais Hub..." className="pl-9 pr-4 py-2 bg-slate-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 w-64"/></div>
              <div className="relative" ref={notifRef}>
                <button onClick={() => setIsNotifOpen(!isNotifOpen)} className={`relative p-2 transition-colors rounded-full ${isNotifOpen ? 'bg-emerald-50 text-emerald-600' : 'text-slate-500 hover:text-emerald-600'}`}><Bell size={20} />{unreadCount > 0 && <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>}</button>
                {isNotifOpen && (
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden animate-fade-in">
                    <div className="p-3 border-b border-slate-100 flex justify-between items-center bg-slate-50"><h3 className="font-bold text-slate-700 text-sm">Notificações</h3>{notifications.length > 0 && <button onClick={handleClearNotifications} className="text-[10px] text-slate-500 hover:text-red-500 font-medium">Limpar tudo</button>}</div>
                    <div className="max-h-[300px] overflow-y-auto custom-scrollbar">{notifications.length > 0 ? notifications.map(notif => (<div key={notif.id} onClick={() => handleNotificationClick(notif)} className={`p-3 border-b border-slate-50 cursor-pointer hover:bg-slate-50 transition-colors ${!notif.read ? 'bg-blue-50/30' : ''}`}><div className="flex gap-3"><div className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${!notif.read ? (notif.type === 'term' ? 'bg-emerald-500' : 'bg-blue-500') : 'bg-slate-300'}`}></div><div className="flex-1"><div className="flex justify-between items-start"><p className={`text-sm ${!notif.read ? 'font-bold text-slate-800' : 'text-slate-600'}`}>{notif.title}</p><span className="text-[10px] text-slate-400 whitespace-nowrap ml-2">{new Date(notif.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span></div><p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{notif.message}</p>{notif.type === 'term' && <span className="inline-block mt-1 text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded">Termo de Responsabilidade</span>}</div></div></div>)) : <div className="p-8 text-center text-slate-400"><Bell size={24} className="mx-auto mb-2 opacity-20" /><p className="text-xs">Nenhuma notificação.</p></div>}</div>
                    <div className="p-2 bg-slate-50 text-center border-t border-slate-100"><Link to="/tasks" onClick={() => setIsNotifOpen(false)} className="text-xs font-medium text-emerald-600 hover:underline">Ver todas as tarefas</Link></div>
                  </div>
                )}
              </div>
            </div>
        </header>
        <div className="p-4 md:p-8 max-w-7xl mx-auto w-full"><Outlet /></div>
      </main>

      {/* EDIT PROFILE MODAL */}
      {isProfileModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
           <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-fade-in custom-scrollbar overflow-y-auto max-h-[95vh]">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50 sticky top-0 z-10"><h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><User className="text-emerald-600" size={20} /> Minha Conta</h3><button onClick={() => setIsProfileModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-200 rounded-full transition-colors"><X size={20} /></button></div>
              <div className="p-6 space-y-8">
                {/* Foto do Perfil */}
                <div className="flex flex-col items-center gap-3">
                  <div className="relative group">
                    <div className="w-24 h-24 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden border-4 border-white shadow-md">
                      {profileForm.avatar ? <img src={profileForm.avatar} className="w-full h-full object-cover" /> : <User className="text-slate-400" size={32} />}
                    </div>
                    <label className="absolute bottom-0 right-0 bg-emerald-600 text-white p-2 rounded-full cursor-pointer hover:bg-emerald-700 transition-colors shadow-sm">
                      <Camera size={14} />
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, 'avatar')} />
                    </label>
                  </div>
                  <p className="text-xs text-slate-400">Foto de Perfil (Avatar)</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div><label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Nome Completo</label><div className="relative"><User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} /><input type="text" value={profileForm.name} onChange={(e) => setProfileForm({...profileForm, name: e.target.value})} className="w-full pl-9 p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white text-slate-900 text-sm"/></div></div>
                    <div><label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Ramal</label><div className="relative"><Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} /><input type="text" value={profileForm.extension} onChange={(e) => setProfileForm({...profileForm, extension: e.target.value})} className="w-full pl-9 p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white text-slate-900 text-sm"/></div></div>
                  </div>
                  <div className="space-y-4">
                    <div><label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">WhatsApp</label><div className="relative"><MessageCircle className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} /><input type="text" value={profileForm.whatsapp} onChange={(e) => setProfileForm({...profileForm, whatsapp: e.target.value})} className="w-full pl-9 p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white text-slate-900 text-sm" placeholder="5571..."/></div></div>
                    <div><label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Data de Nascimento</label><div className="relative"><Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} /><input type="date" value={profileForm.birthday} onChange={(e) => setProfileForm({...profileForm, birthday: e.target.value})} className="w-full pl-9 p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white text-slate-900 text-sm"/></div></div>
                  </div>
                </div>

                {/* Seção de Assinatura Digitalizada */}
                <div className="border-t pt-8">
                  <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2 mb-4"><Signature size={18} className="text-emerald-600" /> Assinatura para Documentos Digital</h4>
                  <p className="text-xs text-slate-500 mb-4 leading-relaxed">Esta assinatura será utilizada nos termos e outros documentos oficiais que você assinar digitalmente através do sistema.</p>
                  
                  <div className="flex flex-col md:flex-row items-center gap-6 bg-slate-50 p-6 rounded-2xl border border-slate-100">
                    <div className="relative shrink-0 group">
                      <div className="w-48 h-24 bg-white border-2 border-dashed border-slate-300 rounded-xl flex items-center justify-center overflow-hidden shadow-inner p-2 group-hover:border-emerald-400 transition-colors">
                        {profileForm.signatureImage ? (
                          <img src={profileForm.signatureImage} className="max-w-full max-h-full object-contain mix-blend-multiply" />
                        ) : (
                          <div className="text-slate-300 flex flex-col items-center">
                            <PenTool size={24} className="opacity-20 mb-1" />
                            <span className="text-[10px] font-black uppercase">Sem Assinatura</span>
                          </div>
                        )}
                      </div>
                      <label className="absolute -bottom-2 -right-2 bg-emerald-600 text-white p-2 rounded-full cursor-pointer hover:bg-emerald-700 transition-all shadow-md group-hover:scale-110">
                        <Upload size={14} />
                        <input type="file" accept="image/png, image/jpeg" className="hidden" onChange={(e) => handleFileUpload(e, 'signature')} />
                      </label>
                    </div>
                    <div className="flex-1 space-y-2">
                       <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Recomendação:</p>
                       <ul className="text-[10px] text-slate-500 space-y-1">
                          <li>• Use papel branco liso com caneta preta ou azul forte.</li>
                          <li>• Tire uma foto bem iluminada e recorte apenas a assinatura.</li>
                          <li>• Formato ideal: **PNG com fundo transparente**.</li>
                       </ul>
                       {profileForm.signatureImage && (
                          <button onClick={() => setProfileForm(prev => ({...prev, signatureImage: ''}))} className="text-[10px] font-bold text-red-500 hover:underline flex items-center gap-1 mt-2">Remover Assinatura</button>
                       )}
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 text-[10px] text-amber-800 leading-relaxed">
                  <p><strong>IMPORTANTE:</strong> Para sua segurança, a assinatura manuscrita (opcional) será estampada junto a uma chave criptográfica (hash) e seus dados de CPF/Senha validados no ato da assinatura de cada termo.</p>
                </div>
              </div>
              <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 sticky bottom-0 z-10"><button onClick={() => setIsProfileModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg font-medium text-sm" disabled={isSavingProfile}>Cancelar</button><button onClick={handleSaveProfile} className="px-6 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 flex items-center gap-2 text-sm disabled:opacity-50" disabled={isSavingProfile}>{isSavingProfile ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />} Salvar Perfil</button></div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Layout;
