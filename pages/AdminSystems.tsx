
import React, { useState, useEffect } from 'react';
import { 
  fetchSystems, addSystem, updateSystem, removeSystem, fetchDepartments 
} from '../services/firebaseService';
import { SystemTool } from '../types';
import { Plus, Trash2, Edit2, Save, Image as ImageIcon, LayoutGrid, Loader2 } from 'lucide-react';

const AdminSystems: React.FC = () => {
  const [systems, setSystems] = useState<SystemTool[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const [currentSystem, setCurrentSystem] = useState<Partial<SystemTool>>({});
  const [availableDepartments, setAvailableDepartments] = useState<string[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [sysData, deptData] = await Promise.all([
        fetchSystems(),
        fetchDepartments()
      ]);
      setSystems(sysData);
      // Mapeia os objetos de departamento para strings (nomes)
      setAvailableDepartments(deptData.map(d => d.name).sort());
    } catch (error) {
      console.error("Erro ao carregar dados", error);
    } finally {
      setIsLoading(false);
    }
  };

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

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este sistema?')) {
      try {
        await removeSystem(id);
        loadData();
      } catch (error) {
        alert("Erro ao excluir sistema.");
      }
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
      loadData();
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
      // If 'Todos' is selected, clear others or toggle it off
      if (currentDepts.includes('Todos')) {
        newDepts = [];
      } else {
        newDepts = ['Todos'];
      }
    } else {
      // If specific dept selected, ensure 'Todos' is removed
      const withoutAll = currentDepts.filter(d => d !== 'Todos');
      if (withoutAll.includes(dept)) {
        newDepts = withoutAll.filter(d => d !== dept);
      } else {
        newDepts = [...withoutAll, dept];
      }
    }
    
    setCurrentSystem({ ...currentSystem, allowedDepartments: newDepts });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-emerald-600" size={48} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Gestão de Sistemas / Links</h2>
          <p className="text-slate-500 text-sm">Cadastre e configure o acesso aos aplicativos e links da empresa.</p>
        </div>
        {!isEditing && (
          <button 
            onClick={handleAddNew}
            className="bg-emerald-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-emerald-700 transition-colors"
          >
            <Plus size={18} /> Novo Sistema
          </button>
        )}
      </div>

      {isEditing ? (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 animate-fade-in">
           <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
             <LayoutGrid size={20} className="text-emerald-600"/> 
             {currentSystem.id ? 'Editar Sistema' : 'Novo Sistema'}
           </h3>
           
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="space-y-4">
               <div>
                 <label className="block text-sm font-medium text-slate-700 mb-1">Nome do Sistema</label>
                 <input 
                    type="text" 
                    value={currentSystem.name} 
                    onChange={e => setCurrentSystem({...currentSystem, name: e.target.value})}
                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white text-slate-900"
                 />
               </div>
               
               <div>
                 <label className="block text-sm font-medium text-slate-700 mb-1">Link de Acesso (URL)</label>
                 <input 
                    type="text" 
                    value={currentSystem.url} 
                    onChange={e => setCurrentSystem({...currentSystem, url: e.target.value})}
                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white text-slate-900"
                 />
               </div>

               <div>
                 <label className="block text-sm font-medium text-slate-700 mb-1">Categoria</label>
                 <input 
                    type="text" 
                    value={currentSystem.category} 
                    onChange={e => setCurrentSystem({...currentSystem, category: e.target.value})}
                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white text-slate-900"
                    placeholder="Ex: RH, Vendas, Comunicação"
                 />
               </div>
               
               <div>
                 <label className="block text-sm font-medium text-slate-700 mb-1">Descrição Curta</label>
                 <textarea 
                    value={currentSystem.description || ''} 
                    onChange={e => setCurrentSystem({...currentSystem, description: e.target.value})}
                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white text-slate-900"
                    rows={2}
                 />
               </div>
             </div>

             <div className="space-y-4">
                <div>
                   <label className="block text-sm font-medium text-slate-700 mb-1">Logo (URL)</label>
                   <div className="flex gap-4">
                     <div className="flex-1">
                        <input 
                            type="text" 
                            value={currentSystem.logo} 
                            onChange={e => setCurrentSystem({...currentSystem, logo: e.target.value})}
                            className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 text-sm bg-white text-slate-900"
                            placeholder="Deixe vazio para gerar automático"
                        />
                        <p className="text-xs text-slate-500 mt-1">Recomendado: Imagem quadrada (png/jpg)</p>
                     </div>
                     <div className="w-16 h-16 bg-slate-100 rounded-lg border border-slate-200 flex items-center justify-center overflow-hidden">
                        {currentSystem.logo ? (
                          <img src={currentSystem.logo} alt="Preview" className="w-full h-full object-cover" />
                        ) : (
                          <ImageIcon className="text-slate-300" />
                        )}
                     </div>
                   </div>
                </div>

                <div>
                   <label className="block text-sm font-medium text-slate-700 mb-2">Controle de Acesso (Setores)</label>
                   <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 max-h-60 overflow-y-auto">
                      <label className="flex items-center gap-2 mb-2 p-2 rounded hover:bg-slate-100 cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={currentSystem.allowedDepartments?.includes('Todos')}
                          onChange={() => toggleDepartment('Todos')}
                          className="rounded text-emerald-600 focus:ring-emerald-500"
                        />
                        <span className="text-sm font-bold text-slate-800">Todos os Colaboradores</span>
                      </label>
                      <hr className="border-slate-200 my-2"/>
                      {availableDepartments.map(dept => (
                        <label key={dept} className="flex items-center gap-2 mb-1 p-2 rounded hover:bg-slate-100 cursor-pointer">
                           <input 
                              type="checkbox" 
                              checked={currentSystem.allowedDepartments?.includes(dept)}
                              onChange={() => toggleDepartment(dept)}
                              disabled={currentSystem.allowedDepartments?.includes('Todos')}
                              className="rounded text-emerald-600 focus:ring-emerald-500 disabled:opacity-50"
                            />
                            <span className={`text-sm ${currentSystem.allowedDepartments?.includes('Todos') ? 'text-slate-400' : 'text-slate-700'}`}>
                              {dept}
                            </span>
                        </label>
                      ))}
                      {availableDepartments.length === 0 && (
                        <p className="text-xs text-slate-400 italic">Cadastre departamentos na gestão organizacional.</p>
                      )}
                   </div>
                </div>
             </div>
           </div>

           <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-slate-100">
             <button 
               onClick={() => setIsEditing(false)}
               className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
               disabled={isSaving}
             >
               Cancelar
             </button>
             <button 
               onClick={handleSave}
               className="px-6 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 flex items-center gap-2 disabled:opacity-50"
               disabled={isSaving}
             >
               {isSaving ? <Loader2 className="animate-spin" size={18}/> : <Save size={18} />}
               Salvar Sistema
             </button>
           </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {systems.map(sys => (
            <div key={sys.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between hover:shadow-md transition-shadow">
               <div className="flex items-center gap-4">
                 <img src={sys.logo} alt={sys.name} className="w-12 h-12 rounded-lg bg-slate-50 object-cover" />
                 <div>
                   <h4 className="font-bold text-slate-800">{sys.name}</h4>
                   <p className="text-sm text-slate-500 flex items-center gap-2">
                      <span className="bg-slate-100 px-2 py-0.5 rounded text-xs">{sys.category}</span>
                      <span className="text-xs">•</span>
                      <span className="text-xs text-emerald-600">
                        {sys.allowedDepartments.includes('Todos') 
                          ? 'Acesso Público' 
                          : `Restrito: ${sys.allowedDepartments.join(', ')}`}
                      </span>
                   </p>
                 </div>
               </div>
               <div className="flex items-center gap-2">
                 <button onClick={() => handleEdit(sys)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                   <Edit2 size={18} />
                 </button>
                 <button onClick={() => handleDelete(sys.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                   <Trash2 size={18} />
                 </button>
               </div>
            </div>
          ))}
          {systems.length === 0 && (
            <div className="p-12 text-center text-slate-400">
                Nenhum sistema cadastrado.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminSystems;
