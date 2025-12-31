
import React, { useState, useEffect } from 'react';
import { 
  subscribeSystems, addSystem, updateSystem, removeSystem, fetchDepartments 
} from '../services/firebaseService';
import { SystemTool } from '../types';
import { Plus, Trash2, Edit2, Save, Image as ImageIcon, LayoutGrid, Loader2, X, AlertTriangle, Lock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const AdminSystems: React.FC = () => {
  const { isMaster } = useAuth();
  const [systems, setSystems] = useState<SystemTool[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const [currentSystem, setCurrentSystem] = useState<Partial<SystemTool>>({});
  const [systemToDelete, setSystemToDelete] = useState<SystemTool | null>(null);
  const [availableDepartments, setAvailableDepartments] = useState<string[]>([]);

  useEffect(() => {
    setIsLoading(true);
    
    // Inicia subscrição em tempo real de sistemas
    const unsubSystems = subscribeSystems((data) => {
      setSystems(data);
      setIsLoading(false);
    });

    // Carrega departamentos para o seletor de permissão
    fetchDepartments().then(deptData => {
      setAvailableDepartments(deptData.map(d => d.name).sort());
    });

    return () => unsubSystems();
  }, []);

  const handleAddNew = () => {
    setCurrentSystem({
      logo: '',
      name: '',
      description: '',
      category: 'Geral',
      url: 'https://',
      allowedDepartments: ['Todos']
    });
    setIsEditing(true);
  };

  const handleEdit = (sys: SystemTool) => {
    setCurrentSystem({ ...sys });
    setIsEditing(true);
  };

  const handleRequestDelete = (e: React.MouseEvent, sys: SystemTool) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isMaster) return;
    setSystemToDelete(sys);
  };

  const confirmDelete = async () => {
    if (!systemToDelete || !systemToDelete.id) return;
    
    setIsSaving(true);
    try {
      await removeSystem(systemToDelete.id);
      setSystemToDelete(null);
    } catch (error) {
      alert("Erro ao excluir sistema.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = async () => {
    if (!currentSystem.name || !currentSystem.url) return alert('Nome e URL são obrigatórios');
    
    setIsSaving(true);
    try {
      const finalSystem: Partial<SystemTool> = {
        ...currentSystem,
        logo: currentSystem.logo || `https://ui-avatars.com/api/?name=${currentSystem.name}&background=047857&color=fff`,
        allowedDepartments: currentSystem.allowedDepartments && currentSystem.allowedDepartments.length > 0 
          ? currentSystem.allowedDepartments 
          : ['Todos']
      };

      if (currentSystem.id) {
        await updateSystem(currentSystem.id, finalSystem);
      } else {
        await addSystem(finalSystem);
      }
      
      setIsEditing(false);
    } catch (error) {
      alert("Erro ao salvar sistema.");
    } finally {
      setIsSaving(false);
    }
  };

  const toggleDepartment = (dept: string) => {
    const currentDepts = currentSystem.allowedDepartments || [];
    let newDepts: string[];

    if (dept === 'Todos') {
      if (currentDepts.includes('Todos')) newDepts = [];
      else newDepts = ['Todos'];
    } else {
      const withoutAll = currentDepts.filter(d => d !== 'Todos');
      if (withoutAll.includes(dept)) newDepts = withoutAll.filter(d => d !== dept);
      else newDepts = [...withoutAll, dept];
    }
    
    setCurrentSystem({ ...currentSystem, allowedDepartments: newDepts });
  };

  if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-emerald-600" size={48} /></div>;

  return (
    <div className="space-y-6 relative">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Gestão de Sistemas & Links</h2>
          <p className="text-slate-500 text-sm">Gerencie o acesso às ferramentas corporativas.</p>
        </div>
        {!isEditing && (
          <button onClick={handleAddNew} className="bg-emerald-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-emerald-700 transition-all font-bold shadow-md">
            <Plus size={18} /> Novo Sistema
          </button>
        )}
      </div>

      {isEditing ? (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 animate-fade-in">
           <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold flex items-center gap-2"><LayoutGrid size={20} className="text-emerald-600"/> {currentSystem.id ? 'Editar Sistema' : 'Novo Sistema'}</h3>
              <button onClick={() => setIsEditing(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={20}/></button>
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="space-y-4">
               <div>
                 <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome do Sistema</label>
                 <input type="text" value={currentSystem.name || ''} onChange={e => setCurrentSystem({...currentSystem, name: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white text-slate-900 shadow-sm"/>
               </div>
               <div>
                 <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Link de Acesso (URL)</label>
                 <input type="text" value={currentSystem.url || ''} onChange={e => setCurrentSystem({...currentSystem, url: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white text-slate-900 shadow-sm"/>
               </div>
               <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Categoria</label>
                    <input type="text" value={currentSystem.category || ''} onChange={e => setCurrentSystem({...currentSystem, category: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white text-slate-900 shadow-sm" placeholder="Ex: Financeiro"/>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Logo (URL)</label>
                    <input type="text" value={currentSystem.logo || ''} onChange={e => setCurrentSystem({...currentSystem, logo: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white text-slate-900 shadow-sm" placeholder="Vazio = Gerado"/>
                  </div>
               </div>
               <div>
                 <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Descrição Curta</label>
                 <textarea value={currentSystem.description || ''} onChange={e => setCurrentSystem({...currentSystem, description: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white text-slate-900 shadow-sm" rows={2} />
               </div>
             </div>

             <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Permitir acesso para:</label>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 max-h-[280px] overflow-y-auto space-y-2 custom-scrollbar">
                    <label className="flex items-center gap-3 p-2 bg-white rounded-lg border border-slate-100 cursor-pointer hover:border-emerald-200 transition-colors">
                        <input type="checkbox" checked={currentSystem.allowedDepartments?.includes('Todos')} onChange={() => toggleDepartment('Todos')} className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"/>
                        <span className="text-sm font-bold text-slate-700">Todos (Acesso Global)</span>
                    </label>
                    <div className="h-px bg-slate-200 my-2"></div>
                    {availableDepartments.map(dept => (
                        <label key={dept} className={`flex items-center gap-3 p-2 bg-white rounded-lg border border-slate-100 cursor-pointer hover:border-emerald-200 transition-colors ${currentSystem.allowedDepartments?.includes('Todos') ? 'opacity-50 grayscale pointer-events-none' : ''}`}>
                            <input type="checkbox" checked={currentSystem.allowedDepartments?.includes(dept)} onChange={() => toggleDepartment(dept)} disabled={currentSystem.allowedDepartments?.includes('Todos')} className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"/>
                            <span className="text-sm text-slate-600">{dept}</span>
                        </label>
                    ))}
                </div>
             </div>
           </div>

           <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-slate-100">
             <button onClick={() => setIsEditing(false)} className="px-6 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium" disabled={isSaving}>Cancelar</button>
             <button onClick={handleSave} className="px-8 py-2 bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-700 shadow-md transition-all flex items-center gap-2" disabled={isSaving}>
               {isSaving ? <Loader2 className="animate-spin" size={18}/> : <Save size={18} />} Salvar Sistema
             </button>
           </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {systems.map(sys => (
            <div key={sys.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between hover:shadow-md transition-all">
               <div className="flex items-center gap-4">
                 <div className="w-12 h-12 rounded-lg bg-slate-50 border border-slate-100 overflow-hidden flex items-center justify-center p-1">
                    <img src={sys.logo} alt="" className="w-full h-full object-contain" />
                 </div>
                 <div>
                   <h4 className="font-bold text-slate-800 text-sm">{sys.name}</h4>
                   <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{sys.category} • {sys.allowedDepartments.includes('Todos') ? 'Acesso Global' : `Restrito a: ${sys.allowedDepartments.length} setor(es)`}</p>
                 </div>
               </div>
               <div className="flex items-center gap-1">
                 <button onClick={() => handleEdit(sys)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"><Edit2 size={16} /></button>
                 <button 
                    onClick={(e) => handleRequestDelete(e, sys)} 
                    disabled={!isMaster}
                    title={!isMaster ? "Apenas usuários Master podem excluir" : "Excluir sistema"}
                    className={`p-2 transition-colors rounded-lg ${isMaster ? 'text-slate-400 hover:text-red-600 hover:bg-red-50' : 'text-slate-200 cursor-not-allowed opacity-50'}`}
                 >
                    {isMaster ? <Trash2 size={16} /> : <Lock size={16} />}
                 </button>
               </div>
            </div>
          ))}
          {systems.length === 0 && <div className="p-12 text-center text-slate-400 italic">Nenhum sistema cadastrado.</div>}
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO DE DELEÇÃO */}
      {systemToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
           <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden border-2 border-red-100">
              <div className="p-6 text-center">
                 <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500">
                    <AlertTriangle size={32} />
                 </div>
                 <h3 className="text-lg font-bold text-slate-800 mb-2">Remover Sistema?</h3>
                 <p className="text-sm text-slate-500 mb-6">
                    Você está prestes a excluir permanentemente o sistema <strong>"{systemToDelete.name}"</strong>.<br/>Esta ação não pode ser desfeita.
                 </p>
                 <div className="flex gap-3">
                   <button 
                    onClick={() => setSystemToDelete(null)} 
                    className="flex-1 py-3 text-slate-600 hover:bg-slate-100 rounded-xl font-bold text-sm transition-colors" 
                    disabled={isSaving}
                   >
                    Cancelar
                   </button>
                   <button 
                    onClick={confirmDelete} 
                    className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold text-sm hover:bg-red-700 flex items-center justify-center gap-2 shadow-lg shadow-red-200 transition-colors" 
                    disabled={isSaving}
                   >
                     {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />} Sim, Excluir
                   </button>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default AdminSystems;
