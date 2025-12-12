
import React, { useState, useEffect } from 'react';
import { Link, useLocation, Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, CheckSquare, FileEdit, Menu, X, Bell, Search, LayoutGrid, LogOut, Settings, Shield, Building, Lock, User, Upload, Phone, MessageCircle, Calendar, Save, Loader2, Camera, Layout as LayoutIcon, Globe } from 'lucide-react';
import Logo from './Logo';
import { useAuth } from '../contexts/AuthContext';
import { updateEmployee, addEmployee } from '../services/firebaseService';

const Layout: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser, logout, isAdmin, isCommunication, user } = useAuth();

  // Profile Edit States
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: '',
    extension: '',
    whatsapp: '',
    birthday: '',
    avatar: ''
  });
  const [newPhotoFile, setNewPhotoFile] = useState<string | undefined>(undefined);

  const isActive = (path: string) => location.pathname === path;

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
        avatar: currentUser.avatar
      });
      setNewPhotoFile(undefined);
      setIsProfileModalOpen(true);
      setIsSidebarOpen(false); // Close sidebar if mobile
    }
  };

  // Improved Photo Upload with Resizing/Compression
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Basic size check (warn if huge, but we will compress anyway)
      if (file.size > 10 * 1024 * 1024) {
        alert("A imagem é muito grande. Por favor escolha uma menor que 10MB.");
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          // Create canvas for resizing
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          // Max dimensions (300x300 is enough for avatar)
          const MAX_SIZE = 300; 

          if (width > height) {
            if (width > MAX_SIZE) {
              height *= MAX_SIZE / width;
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width *= MAX_SIZE / height;
              height = MAX_SIZE;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          // Compress to JPEG 0.7 quality to ensure small base64 string
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
          
          setNewPhotoFile(compressedBase64);
          // Update visual preview
          setProfileForm(prev => ({ ...prev, avatar: compressedBase64 }));
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
      // Create update payload including potential new fields
      const payload = {
        name: profileForm.name,
        extension: profileForm.extension,
        whatsapp: profileForm.whatsapp,
        birthday: profileForm.birthday,
        uid: user?.uid // Ensure UID is attached
      };

      // Check if user is in 'temp' state (has no Firestore doc yet)
      if (currentUser.id === 'temp' || !currentUser.id) {
         // Create new record instead of updating
         await addEmployee(payload, newPhotoFile);
      } else {
         // Update existing record
         await updateEmployee(currentUser.id, payload, newPhotoFile);
      }

      alert("Perfil atualizado com sucesso!");
      setIsProfileModalOpen(false);
      // Removed window.location.reload() to prevent "Moved/Edited/Deleted" 404 errors.
      // AuthContext will auto-update due to onSnapshot listener.
    } catch (error) {
      console.error("Erro no update perfil:", error);
      alert("Erro ao atualizar perfil. Tente novamente.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  if (!currentUser) return null;

  const commonItems = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/directory', label: 'Ramais & Pessoas', icon: Users },
    { path: '/systems', label: 'Sistemas', icon: LayoutGrid },
    { path: '/meeting-rooms', label: 'Salas & Reunião', icon: Calendar }, // Added Item
    { path: '/tasks', label: 'Tarefas', icon: CheckSquare },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans text-slate-900 relative overflow-x-hidden">
      
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 bg-white border-b shadow-sm z-30 relative sticky top-0">
        <div className="flex items-center gap-2">
          <Logo className="h-8 w-auto" />
        </div>
        <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg">
          <Menu />
        </button>
      </div>

      {/* Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 z-40 md:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-slate-900 text-slate-300 transition-transform duration-300 ease-in-out transform ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0 md:static md:h-screen flex flex-col shadow-2xl md:shadow-none`}
      >
        {/* Mobile Sidebar Header */}
        <div className="flex md:hidden items-center justify-between p-4 border-b border-slate-800">
           <Logo className="h-8 w-auto brightness-0 invert" />
           <button onClick={() => setIsSidebarOpen(false)} className="p-2 text-slate-400 hover:text-white rounded-lg">
             <X size={24} />
           </button>
        </div>

        {/* Desktop Logo Area */}
        <div className="p-6 hidden md:flex items-center justify-center">
          <Logo className="w-52 h-auto" />
        </div>

        <nav className="flex-1 px-4 py-6 space-y-6 overflow-y-auto custom-scrollbar">
          
          {/* Main Menu (Everyone) */}
          <div className="space-y-2">
            <p className="px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Menu Principal</p>
            {commonItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                  isActive(item.path)
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/20'
                    : 'hover:bg-slate-800 hover:text-white'
                }`}
              >
                <item.icon size={20} />
                <span className="font-medium">{item.label}</span>
              </Link>
            ))}

            {/* Communication & Admin Only */}
            {isCommunication && (
              <Link
                to="/news-editor"
                onClick={() => setIsSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                  isActive('/news-editor')
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/20'
                    : 'hover:bg-slate-800 hover:text-white'
                }`}
              >
                <FileEdit size={20} />
                <span className="font-medium">Criar Postagem</span>
              </Link>
            )}
          </div>

          {/* Admin Menu (Admin Only) */}
          {isAdmin && (
            <div className="space-y-2">
              <p className="px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                 <Shield size={12} /> Administrativo
              </p>
              
              <Link to="/admin-users" onClick={() => setIsSidebarOpen(false)} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${isActive('/admin-users') ? 'bg-slate-700 text-white border-l-4 border-emerald-500' : 'hover:bg-slate-800 hover:text-white'}`}>
                <Lock size={20} /> <span>Gestão de Usuários</span>
              </Link>

              <Link to="/admin-employees" onClick={() => setIsSidebarOpen(false)} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${isActive('/admin-employees') ? 'bg-slate-700 text-white border-l-4 border-emerald-500' : 'hover:bg-slate-800 hover:text-white'}`}>
                <Users size={20} /> <span>Gestão Colaboradores</span>
              </Link>

              <Link to="/admin-systems" onClick={() => setIsSidebarOpen(false)} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${isActive('/admin-systems') ? 'bg-slate-700 text-white border-l-4 border-emerald-500' : 'hover:bg-slate-800 hover:text-white'}`}>
                <Settings size={20} /> <span>Gestão Sistemas</span>
              </Link>

              <Link to="/admin-rooms" onClick={() => setIsSidebarOpen(false)} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${isActive('/admin-rooms') ? 'bg-slate-700 text-white border-l-4 border-emerald-500' : 'hover:bg-slate-800 hover:text-white'}`}>
                <LayoutIcon size={20} /> <span>Gestão Salas</span>
              </Link>

              <Link to="/admin-org" onClick={() => setIsSidebarOpen(false)} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${isActive('/admin-org') ? 'bg-slate-700 text-white border-l-4 border-emerald-500' : 'hover:bg-slate-800 hover:text-white'}`}>
                <Building size={20} /> <span>Gestão Organizacional</span>
              </Link>
            </div>
          )}
        </nav>

        {/* User Profile Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900">
          <div className="flex items-center gap-3 px-2 mb-4 group cursor-pointer" onClick={handleOpenProfile}>
            <div className="relative shrink-0">
              <img 
                src={currentUser.avatar} 
                alt="User" 
                className="w-10 h-10 rounded-full border-2 border-emerald-500 object-cover group-hover:border-white transition-colors"
              />
              <div className="absolute -bottom-1 -right-1 bg-slate-700 rounded-full p-0.5 border border-slate-900 opacity-0 group-hover:opacity-100 transition-opacity">
                 <Settings size={10} className="text-white"/>
              </div>
            </div>
            <div className="flex-1 min-w-0 flex flex-col">
              <div className="flex items-center justify-between">
                 <p className="text-sm font-semibold text-white leading-tight truncate group-hover:text-emerald-400 transition-colors">
                   {currentUser.name.split(' ').slice(0, 2).join(' ')}
                 </p>
              </div>
              
              <div className="flex flex-col gap-0.5 mt-1">
                <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-300 border border-slate-700 inline-block truncate w-fit max-w-full">
                  {currentUser.role}
                </span>
                
                <span className="text-[10px] text-slate-400 truncate leading-tight pl-0.5">
                  {currentUser.department}
                </span>
                
                {currentUser.unit && (
                  <span className="text-[9px] text-slate-500 truncate leading-tight pl-0.5">
                    {currentUser.unit}
                  </span>
                )}
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            <button 
              onClick={handleOpenProfile}
              className="flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
            >
              <Settings size={14} />
              <span>Editar</span>
            </button>
            <button 
              onClick={handleLogout}
              className="flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-slate-400 hover:text-red-400 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
            >
              <LogOut size={14} />
              <span>Sair</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main 
        className={`flex-1 flex flex-col h-[calc(100vh-64px)] md:h-screen transition-all ${
           isSidebarOpen ? 'overflow-hidden' : 'overflow-y-auto'
        }`}
      >
        <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-bold text-slate-800 hidden md:block">
                iRamais Hub
              </h1>
              <Link 
                to="/" 
                className="flex items-center gap-2 text-xs md:text-sm font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-colors border border-emerald-100"
                title="Ir para a página inicial (pública)"
              >
                 <Globe size={16} />
                 <span className="hidden sm:inline">Portal do Visitante</span>
                 <span className="sm:hidden">Início</span>
              </Link>
            </div>
            
            <div className="flex items-center gap-4 w-full md:w-auto justify-end">
              <div className="relative hidden md:block">
                <Search className="absolute left-3 top-2.5 text-slate-400 w-4 h-4" />
                <input 
                  type="text" 
                  placeholder="Pesquisar em toda a intranet..." 
                  className="pl-9 pr-4 py-2 bg-slate-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 w-64"
                />
              </div>
              <button className="relative p-2 text-slate-500 hover:text-emerald-600 transition-colors">
                <Bell size={20} />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>
            </div>
        </header>
        
        <div className="p-4 md:p-8 max-w-7xl mx-auto w-full">
          <Outlet />
        </div>
      </main>

      {/* EDIT PROFILE MODAL */}
      {isProfileModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
           <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-fade-in">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                 <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                   <User className="text-emerald-600" size={20} /> Minha Conta
                 </h3>
                 <button onClick={() => setIsProfileModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-200 rounded-full transition-colors">
                   <X size={20} />
                 </button>
              </div>
              
              <div className="p-6 space-y-5">
                 {/* Photo Upload */}
                 <div className="flex flex-col items-center gap-3">
                    <div className="relative group">
                      <div className="w-24 h-24 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden border-4 border-white shadow-md">
                        {profileForm.avatar ? (
                          <img src={profileForm.avatar} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                          <User className="text-slate-400" size={32} />
                        )}
                      </div>
                      <label className="absolute bottom-0 right-0 bg-emerald-600 text-white p-2 rounded-full cursor-pointer hover:bg-emerald-700 transition-colors shadow-sm">
                        <Camera size={14} />
                        <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                      </label>
                    </div>
                    <p className="text-xs text-slate-400">Clique na câmera para alterar (max 5MB)</p>
                 </div>

                 <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Nome Completo</label>
                    <div className="relative">
                       <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                       <input 
                         type="text" 
                         value={profileForm.name}
                         onChange={(e) => setProfileForm({...profileForm, name: e.target.value})}
                         className="w-full pl-9 p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white text-slate-900 text-sm"
                       />
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div>
                       <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Ramal</label>
                       <div className="relative">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                          <input 
                            type="text" 
                            value={profileForm.extension}
                            onChange={(e) => setProfileForm({...profileForm, extension: e.target.value})}
                            className="w-full pl-9 p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white text-slate-900 text-sm"
                          />
                       </div>
                    </div>
                    <div>
                       <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">WhatsApp</label>
                       <div className="relative">
                          <MessageCircle className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                          <input 
                            type="text" 
                            value={profileForm.whatsapp}
                            onChange={(e) => setProfileForm({...profileForm, whatsapp: e.target.value})}
                            className="w-full pl-9 p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white text-slate-900 text-sm"
                            placeholder="5571..."
                          />
                       </div>
                    </div>
                 </div>

                 <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Data de Nascimento</label>
                    <div className="relative">
                       <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                       <input 
                         type="date" 
                         value={profileForm.birthday}
                         onChange={(e) => setProfileForm({...profileForm, birthday: e.target.value})}
                         className="w-full pl-9 p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white text-slate-900 text-sm"
                       />
                    </div>
                 </div>

                 <div className="p-3 bg-amber-50 rounded-lg border border-amber-100 text-xs text-amber-800">
                    <p><strong>Nota:</strong> Informações como Cargo, Departamento e Email são gerenciadas pelo RH. Entre em contato se precisar alterá-las.</p>
                 </div>
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                 <button 
                   onClick={() => setIsProfileModalOpen(false)}
                   className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg font-medium text-sm"
                   disabled={isSavingProfile}
                 >
                   Cancelar
                 </button>
                 <button 
                   onClick={handleSaveProfile}
                   className="px-6 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 flex items-center gap-2 text-sm disabled:opacity-50"
                   disabled={isSavingProfile}
                 >
                   {isSavingProfile ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                   Salvar Alterações
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Layout;
