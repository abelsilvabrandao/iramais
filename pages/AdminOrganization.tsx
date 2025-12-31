import React, { useState, useEffect } from 'react';
import { 
  subscribeUnits, subscribeDepartments, addUnit, updateUnit, removeUnit,
  addDepartment, updateDepartment, removeDepartment,
  fetchGlobalSettings, updateGlobalSettings
} from '../services/firebaseService';
import { OrganizationUnit, OrganizationDepartment, GlobalSettings } from '../types';
// Fix: Added missing 'Cake' icon to lucide-react imports
import { Building, MapPin, Plus, Trash2, Edit2, Save, Loader2, Briefcase, Settings, Globe, X, AlertTriangle, Lock, Camera, ImageIcon, Users, Calendar, Megaphone, Phone, Layout, Type, Palette, AlignLeft, AlignCenter, AlignRight, Eye, EyeOff, Cake } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const AdminOrganization: React.FC = () => {
  const { isMaster } = useAuth();
  const [activeTab, setActiveTab] = useState<'units' | 'depts' | 'settings'>('units');
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [units, setUnits] = useState<OrganizationUnit[]>([]);
  const [isEditingUnit, setIsEditingUnit] = useState(false);
  const [currentUnit, setCurrentUnit] = useState<Partial<OrganizationUnit>>({});
  const [unitToDelete, setUnitToDelete] = useState<OrganizationUnit | null>(null);

  const [depts, setDepts] = useState<OrganizationDepartment[]>([]);
  const [isEditingDept, setIsEditingDept] = useState(false);
  const [currentDept, setCurrentDept] = useState<Partial<OrganizationDepartment>>({});
  const [deptToDelete, setDeptToDelete] = useState<OrganizationDepartment | null>(null);

  // Settings State
  const [settings, setSettings] = useState<GlobalSettings>({
    publicDirectory: true,
    showBirthdaysPublicly: true,
    showRoomsPublicly: true,
    showNewsPublicly: true,
    showRolePublicly: true,
    companyLogo: '',
    showWelcomeSection: true,
    welcomeTitle: 'Bem-vindo ao iRamais Hub',
    welcomeDescription: 'Gestão inteligente de ramais, reservas de salas, notícias corporativas e acesso unificado aos sistemas da empresa.',
    welcomePrimaryColor: '#065f46',
    welcomeSecondaryColor: '#115e59',
    welcomeBannerImage: '',
    welcomeTextAlignment: 'center',
    welcomeDisableOverlay: false,
    dashboardShowRooms: true,
    dashboardShowNews: true,
    dashboardShowBirthdays: true,
    showRoleInternal: true
  });
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    
    const unsubUnits = subscribeUnits((data) => {
      setUnits(data);
      setIsLoading(false);
    });

    const unsubDepts = subscribeDepartments((data) => {
      setDepts(data);
    });

    fetchGlobalSettings().then(s => {
      setSettings(prev => ({
        ...prev,
        ...s,
        showWelcomeSection: s.showWelcomeSection ?? true,
        welcomeTitle: s.welcomeTitle || 'Bem-vindo ao iRamais Hub',
        welcomeDescription: s.welcomeDescription || 'Gestão inteligente de ramais, reservas de salas, notícias corporativas e acesso unificado aos sistemas da empresa.',
        welcomePrimaryColor: s.welcomePrimaryColor || '#065f46',
        welcomeSecondaryColor: s.welcomeSecondaryColor || '#115e59',
        welcomeBannerImage: s.welcomeBannerImage || '',
        welcomeTextAlignment: s.welcomeTextAlignment || 'center',
        welcomeDisableOverlay: s.welcomeDisableOverlay ?? false,
        dashboardShowRooms: s.dashboardShowRooms ?? true,
        dashboardShowNews: s.dashboardShowNews ?? true,
        dashboardShowBirthdays: s.dashboardShowBirthdays ?? true,
        showRoleInternal: s.showRoleInternal ?? true
      }));
    });

    return () => {
      unsubUnits();
      unsubDepts();
    };
  }, []);

  const handleEditUnit = (unit?: OrganizationUnit) => {
    if (unit) setCurrentUnit(unit);
    else setCurrentUnit({ name: '', address: '' });
    setIsEditingUnit(true);
  };

  const handleSaveUnit = async () => {
    if (!currentUnit.name) return alert('Nome da unidade é obrigatório');
    setIsProcessing(true);
    try {
      if (currentUnit.id) await updateUnit(currentUnit as OrganizationUnit);
      else await addUnit(currentUnit as OrganizationUnit);
      setIsEditingUnit(false);
    } catch (e: any) { 
      alert(`Erro ao salvar unidade: ${e.message}`); 
    } finally {
      setIsProcessing(false);
    }
  };

  const confirmDeleteUnit = async () => {
    if (!unitToDelete || !unitToDelete.id) return;
    setIsProcessing(true);
    try {
      await removeUnit(unitToDelete.id);
      setUnitToDelete(null);
    } catch (error: any) {
      alert(`Falha na exclusão: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveDept = async () => {
    if (!currentDept.name) return alert('Nome do departamento é obrigatório');
    setIsProcessing(true);
    try {
      if (currentDept.id) await updateDepartment(currentDept as OrganizationDepartment);
      else await addDepartment(currentDept as OrganizationDepartment);
      setIsEditingDept(false);
    } catch (e: any) { 
      alert(`Erro ao salvar departamento: ${e.message}`); 
    } finally {
      setIsProcessing(false);
    }
  };

  const confirmDeleteDept = async () => {
    if (!deptToDelete || !deptToDelete.id) return;
    setIsProcessing(true);
    try {
      await removeDepartment(deptToDelete.id);
      setDeptToDelete(null);
    } catch (error: any) {
      alert(`Falha na exclusão: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'banner') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (type === 'logo') {
          setSettings(prev => ({ ...prev, companyLogo: reader.result as string }));
        } else {
          setSettings(prev => ({ ...prev, welcomeBannerImage: reader.result as string }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleToggleSetting = (key: keyof GlobalSettings) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSaveGlobalSettings = async () => {
    setIsSavingSettings(true);
    try {
      await updateGlobalSettings(settings);
      alert("Configurações aplicadas com sucesso!");
    } catch (error) {
      alert("Erro ao salvar configurações.");
    } finally {
      setIsSavingSettings(false);
    }
  };

  if (isLoading) return <div className="p-8 text-center text-slate-500"><Loader2 className="animate-spin inline mr-2"/> Carregando estrutura...</div>;

  return (
    <div className="space-y-6 relative">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Gestão Organizacional</h2>
        <p className="text-slate-500 text-sm">Gerencie a estrutura física e as regras de exibição do sistema.</p>
      </div>

      <div className="flex gap-4 border-b border-slate-200 overflow-x-auto">
        <button
          onClick={() => setActiveTab('units')}
          className={`pb-3 px-2 text-sm font-medium transition-colors flex items-center gap-2 whitespace-nowrap ${activeTab === 'units' ? 'text-emerald-600 border-b-2 border-emerald-600' : 'text-slate-500 hover:text-slate-800'}`}
        >
          <MapPin size={18} /> Unidades Físicas
        </button>
        <button
          onClick={() => setActiveTab('depts')}
          className={`pb-3 px-2 text-sm font-medium transition-colors flex items-center gap-2 whitespace-nowrap ${activeTab === 'depts' ? 'text-emerald-600 border-b-2 border-emerald-600' : 'text-slate-500 hover:text-slate-800'}`}
        >
          <Building size={18} /> Departamentos
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`pb-3 px-2 text-sm font-medium transition-colors flex items-center gap-2 whitespace-nowrap ${activeTab === 'settings' ? 'text-emerald-600 border-b-2 border-emerald-600' : 'text-slate-500 hover:text-slate-800'}`}
        >
          <Settings size={18} /> Configurações Gerais
        </button>
      </div>

      {activeTab === 'units' && (
        <div className="space-y-6 animate-fade-in">
          <div className="flex justify-end">
             <button onClick={() => handleEditUnit()} className="bg-emerald-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-emerald-700 shadow-sm transition-all font-bold">
               <Plus size={18} /> Nova Unidade
             </button>
          </div>
          {isEditingUnit && (
             <div className="bg-white p-6 rounded-xl border border-emerald-200 shadow-sm animate-fade-in">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-lg text-slate-800">{currentUnit.id ? 'Editar Unidade' : 'Nova Unidade'}</h3>
                  <button onClick={() => setIsEditingUnit(false)} className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-100 rounded-full transition-colors"><X size={20}/></button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input type="text" value={currentUnit.name || ''} onChange={e => setCurrentUnit({...currentUnit, name: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white text-slate-900" placeholder="Nome da Unidade"/>
                  <input type="text" value={currentUnit.address || ''} onChange={e => setCurrentUnit({...currentUnit, address: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white text-slate-900" placeholder="Endereço"/>
                </div>
                <div className="flex justify-end gap-2 mt-6">
                   <button onClick={() => setIsEditingUnit(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors font-medium">Cancelar</button>
                   <button onClick={handleSaveUnit} className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center gap-2 shadow-md transition-all font-bold" disabled={isProcessing}>{isProcessing ? <Loader2 className="animate-spin" size={18}/> : <Save size={18}/>} Salvar</button>
                </div>
             </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {units.map(unit => (
              <div key={unit.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col hover:shadow-md transition-shadow group">
                 <div className="flex justify-between items-start mb-2">
                    <div className="bg-emerald-50 p-2 rounded-lg text-emerald-600 group-hover:bg-emerald-100 transition-colors"><MapPin size={24} /></div>
                    <div className="flex gap-1">
                      <button onClick={() => handleEditUnit(unit)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"><Edit2 size={16}/></button>
                      <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); if(isMaster) setUnitToDelete(unit); }} disabled={!isMaster} className={`p-2 transition-colors rounded-lg ${isMaster ? 'text-slate-400 hover:text-red-600 hover:bg-red-50' : 'text-slate-200 cursor-not-allowed opacity-50'}`}>{isMaster ? <Trash2 size={16}/> : <Lock size={16}/>}</button>
                    </div>
                 </div>
                 <h4 className="font-bold text-slate-800 text-lg leading-tight">{unit.name}</h4>
                 <p className="text-slate-500 text-sm mt-1 line-clamp-1">{unit.address || 'Sem endereço'}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'depts' && (
        <div className="space-y-6 animate-fade-in">
          <div className="flex justify-end"><button onClick={() => { setCurrentDept({name: ''}); setIsEditingDept(true); }} className="bg-emerald-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-emerald-700 shadow-sm transition-all font-bold"><Plus size={18} /> Novo Setor</button></div>
          {isEditingDept && (
             <div className="bg-white p-6 rounded-xl border border-emerald-200 shadow-sm animate-fade-in">
                <div className="flex justify-between items-center mb-4"><h3 className="font-bold text-lg text-slate-800">{currentDept.id ? 'Editar Setor' : 'Novo Setor'}</h3><button onClick={() => setIsEditingDept(false)} className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-100 rounded-full transition-colors"><X size={20}/></button></div>
                <input type="text" value={currentDept.name || ''} onChange={e => setCurrentDept({...currentDept, name: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white text-slate-900" placeholder="Nome do Departamento"/>
                <div className="flex justify-end gap-2 mt-6"><button onClick={() => setIsEditingDept(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors font-medium">Cancelar</button><button onClick={handleSaveDept} className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center gap-2 shadow-md transition-all font-bold" disabled={isProcessing}>{isProcessing ? <Loader2 className="animate-spin" size={18}/> : <Save size={18}/>} Salvar</button></div>
             </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {depts.map(dept => (
              <div key={dept.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between hover:shadow-md transition-all group">
                 <div className="flex items-center gap-3"><div className="bg-indigo-50 p-2 rounded-lg text-indigo-600 group-hover:bg-indigo-100 transition-colors"><Briefcase size={20} /></div><span className="font-semibold text-slate-700">{dept.name}</span></div>
                 <div className="flex gap-1"><button onClick={() => { setCurrentDept(dept); setIsEditingDept(true); }} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"><Edit2 size={14}/></button><button onClick={(e) => { e.preventDefault(); e.stopPropagation(); if(isMaster) setDeptToDelete(dept); }} disabled={!isMaster} className={`p-1.5 transition-colors rounded-lg ${isMaster ? 'text-slate-400 hover:text-red-600 hover:bg-red-50' : 'text-slate-200 cursor-not-allowed opacity-50'}`}>{isMaster ? <Trash2 size={14}/> : <Lock size={14}/>}</button></div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="animate-fade-in space-y-8">
            {/* LOGO MANAGEMENT */}
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
                <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                   <ImageIcon className="text-emerald-600" /> Logomarca da Empresa
                </h3>
                <div className="flex flex-col md:flex-row items-center gap-10">
                    <div className="relative group">
                        <div className="w-64 h-32 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden shadow-inner">
                            {settings.companyLogo ? (
                                <img src={settings.companyLogo} className="max-w-full max-h-full object-contain p-4" />
                            ) : (
                                <div className="text-slate-300 text-center">
                                    <ImageIcon size={40} className="mx-auto mb-1 opacity-20" />
                                    <p className="text-[10px] uppercase font-bold">Logo Padrão</p>
                                </div>
                            )}
                        </div>
                        <label className="absolute -bottom-3 -right-3 bg-emerald-600 text-white p-3 rounded-full shadow-xl cursor-pointer hover:bg-emerald-700 transition-all hover:scale-110 active:scale-95 z-20">
                            <Camera size={20} />
                            <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, 'logo')} />
                        </label>
                        {settings.companyLogo && (
                          <button 
                              onClick={() => setSettings(prev => ({ ...prev, companyLogo: '' }))} 
                              className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-full shadow-lg hover:bg-red-600 transition-all hover:scale-110 active:scale-95 z-20"
                              title="Remover Logomarca"
                          >
                              <Trash2 size={14} />
                          </button>
                        )}
                    </div>
                    <div className="flex-1 space-y-4">
                        <p className="text-sm text-slate-500 leading-relaxed">
                            A logomarca enviada aqui substituirá a marca padrão em todas as telas do sistema, incluindo o Portal do Visitante, tela de Login e Sidebar.
                        </p>
                        <div className="flex flex-wrap gap-3">
                            <div className="text-[10px] uppercase font-black px-3 py-1 bg-slate-100 text-slate-400 rounded-full">PNG ou SVG</div>
                            <div className="text-[10px] uppercase font-black px-3 py-1 bg-slate-100 text-slate-400 rounded-full">Fundo Transparente</div>
                            <div className="text-[10px] uppercase font-black px-3 py-1 bg-slate-100 text-slate-400 rounded-full">Proporção 2:1 recomendada</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* WELCOME SECTION CUSTOMIZATION */}
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
                <div className="flex items-center justify-between mb-8">
                   <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                      <Layout className="text-emerald-600" /> Personalização da Boas-vindas (Hero)
                   </h3>
                   <button 
                     onClick={() => handleToggleSetting('showWelcomeSection')}
                     className={`relative inline-flex h-7 w-12 items-center rounded-full transition-all duration-300 shrink-0 ${settings.showWelcomeSection ? 'bg-emerald-600' : 'bg-slate-300'}`}
                   >
                      <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform duration-300 ${settings.showWelcomeSection ? 'translate-x-6' : 'translate-x-1'}`} />
                   </button>
                </div>

                <div className={`space-y-8 transition-opacity duration-300 ${settings.showWelcomeSection ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                         <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1 flex items-center gap-1"><Type size={14}/> Título de Boas-vindas</label>
                            <input 
                              type="text" 
                              value={settings.welcomeTitle} 
                              onChange={e => setSettings({...settings, welcomeTitle: e.target.value})} 
                              className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm font-bold bg-white text-slate-900"
                            />
                         </div>
                         <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1 flex items-center gap-1"><Type size={14}/> Descrição Curta (Respeita parágrafos)</label>
                            <textarea 
                              value={settings.welcomeDescription} 
                              onChange={e => setSettings({...settings, welcomeDescription: e.target.value})} 
                              className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm min-h-[120px] bg-white text-slate-900"
                              placeholder="Digite aqui e use Enter para novos parágrafos..."
                            />
                         </div>
                         
                         <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-1">Alinhamento do Conteúdo</label>
                            <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-200 w-fit">
                               {[
                                 { id: 'left', icon: AlignLeft },
                                 { id: 'center', icon: AlignCenter },
                                 { id: 'right', icon: AlignRight }
                               ].map(pos => (
                                 <button
                                   key={pos.id}
                                   onClick={() => setSettings({...settings, welcomeTextAlignment: pos.id as any})}
                                   className={`p-2.5 rounded-lg transition-all ${settings.welcomeTextAlignment === pos.id ? 'bg-white text-emerald-600 shadow-sm border border-slate-100' : 'text-slate-400 hover:text-slate-600'}`}
                                 >
                                   <pos.icon size={20} />
                                 </button>
                               ))}
                            </div>
                         </div>
                      </div>

                      <div className="space-y-4">
                         <div className="grid grid-cols-2 gap-4">
                            <div>
                               <label className="block text-xs font-bold text-slate-500 uppercase mb-1 flex items-center gap-1"><Palette size={14}/> Cor Primária</label>
                               <div className="flex gap-2 items-center p-2 border border-slate-300 rounded-xl bg-white shadow-sm">
                                  <input 
                                    type="color" 
                                    value={settings.welcomePrimaryColor} 
                                    onChange={e => setSettings({...settings, welcomePrimaryColor: e.target.value})} 
                                    className="w-10 h-10 p-0 border-0 rounded-lg cursor-pointer shadow-sm bg-white"
                                  />
                                  <span className="text-xs font-mono text-slate-800 font-bold">{settings.welcomePrimaryColor}</span>
                               </div>
                            </div>
                            <div>
                               <label className="block text-xs font-bold text-slate-500 uppercase mb-1 flex items-center gap-1"><Palette size={14}/> Cor Secundária</label>
                               <div className="flex gap-2 items-center p-2 border border-slate-300 rounded-xl bg-white shadow-sm">
                                  <input 
                                    type="color" 
                                    value={settings.welcomeSecondaryColor} 
                                    onChange={e => setSettings({...settings, welcomeSecondaryColor: e.target.value})} 
                                    className="w-10 h-10 p-0 border-0 rounded-lg cursor-pointer shadow-sm bg-white"
                                  />
                                  <span className="text-xs font-mono text-slate-800 font-bold">{settings.welcomeSecondaryColor}</span>
                               </div>
                            </div>
                         </div>
                         
                         <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="block text-xs font-bold text-slate-500 uppercase flex items-center gap-1"><ImageIcon size={14}/> Imagem de Fundo (Opcional)</label>
                                {settings.welcomeBannerImage && (
                                    <button 
                                        onClick={() => handleToggleSetting('welcomeDisableOverlay')}
                                        className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-black uppercase transition-all ${settings.welcomeDisableOverlay ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}
                                        title={settings.welcomeDisableOverlay ? "Mostrando imagem original" : "Aplicando degradê por cima"}
                                    >
                                        {settings.welcomeDisableOverlay ? <Eye size={12}/> : <EyeOff size={12}/>}
                                        {settings.welcomeDisableOverlay ? 'Original' : 'Com Sobreposição'}
                                    </button>
                                )}
                            </div>
                            <div className="relative group">
                               <div className="w-full h-32 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden shadow-inner">
                                  {settings.welcomeBannerImage ? (
                                      <img src={settings.welcomeBannerImage} className="w-full h-full object-cover" />
                                  ) : (
                                      <div className="text-slate-300 text-center">
                                          <ImageIcon size={32} className="mx-auto mb-1 opacity-20" />
                                          <p className="text-[10px] uppercase font-bold">Sem imagem (Usará degradê)</p>
                                      </div>
                                  )}
                               </div>
                               <label className="absolute bottom-2 right-2 bg-emerald-600 text-white p-2.5 rounded-full shadow-lg cursor-pointer hover:bg-emerald-700 transition-all hover:scale-110 active:scale-95">
                                  <Camera size={16} />
                                  <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, 'banner')} />
                               </label>
                               {settings.welcomeBannerImage && (
                                  <button onClick={() => setSettings({...settings, welcomeBannerImage: '', welcomeDisableOverlay: false})} className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-full shadow-sm hover:bg-red-600 transition-all">
                                     <Trash2 size={12} />
                                  </button>
                               )}
                            </div>
                         </div>
                      </div>
                   </div>

                   {/* PREVIEW MINIATURA */}
                   <div className="mt-8 border-t border-slate-100 pt-6">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Prévia Rápida</p>
                      <div 
                        className={`rounded-3xl p-6 text-white shadow-lg overflow-hidden relative min-h-[120px] flex flex-col justify-center ${settings.welcomeTextAlignment === 'left' ? 'text-left items-start' : settings.welcomeTextAlignment === 'right' ? 'text-right items-end' : 'text-center items-center'}`}
                        style={{ 
                          background: settings.welcomeBannerImage 
                            ? (settings.welcomeDisableOverlay 
                                ? `url(${settings.welcomeBannerImage}) center/cover`
                                : `linear-gradient(to right, ${settings.welcomePrimaryColor}CC, ${settings.welcomeSecondaryColor}CC), url(${settings.welcomeBannerImage}) center/cover`)
                            : `linear-gradient(to right, ${settings.welcomePrimaryColor}, ${settings.welcomeSecondaryColor})`
                        }}
                      >
                         <h4 className="text-xl font-black mb-1">{settings.welcomeTitle}</h4>
                         <p className="text-[10px] opacity-90 max-w-xl whitespace-pre-wrap">{settings.welcomeDescription}</p>
                      </div>
                   </div>
                </div>
            </div>

            {/* INTERNAL DASHBOARD VISIBILITY CONTROLS */}
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
                <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                   <Layout className="text-emerald-600" /> Visibilidade no Dashboard Interno
                </h3>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                   {[
                      { key: 'dashboardShowRooms', label: 'Widget: Agenda de Salas', icon: Calendar, color: 'text-indigo-600', desc: 'Exibe o status de ocupação das salas na lateral do Dashboard.' },
                      { key: 'dashboardShowNews', label: 'Widget: Mural de Notícias', icon: Megaphone, color: 'text-orange-500', desc: 'Exibe a lista de comunicados recentes no centro do Dashboard.' },
                      { key: 'dashboardShowBirthdays', label: 'Widget: Aniversariantes', icon: Cake, color: 'text-pink-500', desc: 'Exibe os aniversariantes do mês na lateral do Dashboard.' },
                      { key: 'showRoleInternal', label: 'Exibir Cargos no Sistema', icon: Briefcase, color: 'text-emerald-600', desc: 'Exibe o cargo abaixo do nome nos diretórios e menus internos.' }
                   ].map((item) => (
                      <div key={item.key} className="flex items-center justify-between gap-4 p-5 bg-slate-50 rounded-2xl border border-slate-100 hover:border-emerald-200 transition-all group">
                         <div className="flex items-start gap-4 min-w-0 flex-1">
                            <div className={`p-3 bg-white rounded-xl shadow-sm shrink-0 ${item.color}`}><item.icon size={20} /></div>
                            <div className="min-w-0">
                               <h4 className="font-bold text-slate-800 text-sm truncate">{item.label}</h4>
                               <p className="text-[11px] text-slate-400 mt-0.5 leading-tight">{item.desc}</p>
                            </div>
                         </div>
                         <button 
                           onClick={() => handleToggleSetting(item.key as keyof GlobalSettings)}
                           className={`relative inline-flex h-7 w-12 items-center rounded-full transition-all duration-300 shrink-0 ${settings[item.key as keyof GlobalSettings] ? 'bg-emerald-600' : 'bg-slate-300'}`}
                         >
                            <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform duration-300 ${settings[item.key as keyof GlobalSettings] ? 'translate-x-6' : 'translate-x-1'}`} />
                         </button>
                      </div>
                   ))}
                </div>
            </div>

            {/* VISIBILITY CONTROLS (VISITOR PORTAL) */}
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
                <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                   <Globe className="text-emerald-600" /> Visibilidade no Portal do Visitante
                </h3>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                   {[
                      { key: 'publicDirectory', label: 'Diretório de Ramais', icon: Phone, color: 'text-emerald-500', desc: 'Permite que qualquer visitante busque nomes e ramais da empresa.' },
                      { key: 'showRolePublicly', label: 'Exibir Cargo de Colaborador', icon: Briefcase, color: 'text-emerald-600', desc: 'Exibe o cargo abaixo do nome nos cards de ramal do diretório público.' },
                      { key: 'showBirthdaysPublicly', label: 'Aniversariantes do Mês', icon: Users, color: 'text-pink-500', desc: 'Exibe a lista de colaboradores que fazem aniversário no mês atual.' },
                      { key: 'showRoomsPublicly', label: 'Agenda de Salas', icon: Calendar, color: 'text-indigo-50', desc: 'Exibe o status de ocupação das salas de reunião em tempo real.' },
                      { key: 'showNewsPublicly', label: 'Mural de Notícias', icon: Megaphone, color: 'text-orange-500', desc: 'Exibe comunicados e notícias corporativas para visitantes.' }
                   ].map((item) => (
                      <div key={item.key} className="flex items-center justify-between gap-4 p-5 bg-slate-50 rounded-2xl border border-slate-100 hover:border-emerald-200 transition-all group">
                         <div className="flex items-start gap-4 min-w-0 flex-1">
                            <div className={`p-3 bg-white rounded-xl shadow-sm shrink-0 ${item.color}`}><item.icon size={20} /></div>
                            <div className="min-w-0">
                               <h4 className="font-bold text-slate-800 text-sm truncate">{item.label}</h4>
                               <p className="text-[11px] text-slate-400 mt-0.5 leading-tight">{item.desc}</p>
                            </div>
                         </div>
                         <button 
                           onClick={() => handleToggleSetting(item.key as keyof GlobalSettings)}
                           className={`relative inline-flex h-7 w-12 items-center rounded-full transition-all duration-300 shrink-0 ${settings[item.key as keyof GlobalSettings] ? 'bg-emerald-600' : 'bg-slate-300'}`}
                         >
                            <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform duration-300 ${settings[item.key as keyof GlobalSettings] ? 'translate-x-6' : 'translate-x-1'}`} />
                         </button>
                      </div>
                   ))}
                </div>

                <div className="mt-10 pt-6 border-t border-slate-100 flex justify-end">
                    <button 
                        onClick={handleSaveGlobalSettings}
                        disabled={isSavingSettings}
                        className="px-12 py-3 bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-emerald-700 shadow-xl shadow-emerald-900/20 flex items-center gap-3 transition-all active:scale-95 disabled:opacity-50"
                    >
                        {isSavingSettings ? <Loader2 className="animate-spin" size={16}/> : <Save size={16}/>}
                        Aplicar Configurações
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* MODALS */}
      {unitToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
           <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden border-2 border-red-100">
              <div className="p-6 text-center">
                 <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500"><AlertTriangle size={32} /></div>
                 <h3 className="text-lg font-bold text-slate-800 mb-2">Excluir Unidade?</h3>
                 <p className="text-sm text-slate-500 mb-6">Você está prestes a remover permanentemente <strong>"{unitToDelete.name}"</strong>.</p>
                 <div className="flex gap-3"><button onClick={() => setUnitToDelete(null)} className="flex-1 py-3 text-slate-600 hover:bg-slate-100 rounded-xl font-bold text-sm">Cancelar</button><button onClick={confirmDeleteUnit} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold text-sm hover:bg-red-700 flex items-center justify-center gap-2">{isProcessing ? <Loader2 className="animate-spin" size={16}/> : <Trash2 size={16}/>} Sim, Excluir</button></div>
              </div>
           </div>
        </div>
      )}
      
      {deptToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
           <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden border-2 border-red-100">
              <div className="p-6 text-center">
                 <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500"><AlertTriangle size={32} /></div>
                 <h3 className="text-lg font-bold text-slate-800 mb-2">Excluir Setor?</h3>
                 <p className="text-sm text-slate-500 mb-6">Deseja remover o departamento <strong>"{deptToDelete.name}"</strong>?</p>
                 <div className="flex gap-3"><button onClick={() => setDeptToDelete(null)} className="flex-1 py-3 text-slate-600 hover:bg-slate-100 rounded-xl font-bold text-sm">Cancelar</button><button onClick={confirmDeleteDept} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold text-sm hover:bg-red-700 flex items-center justify-center gap-2">{isProcessing ? <Loader2 className="animate-spin" size={16}/> : <Trash2 size={16}/>} Sim, Excluir</button></div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default AdminOrganization;