
import React, { useState, useEffect } from 'react';
import { 
  fetchUnits, addUnit, updateUnit, removeUnit,
  fetchDepartments, addDepartment, updateDepartment, removeDepartment,
  fetchGlobalSettings, updateGlobalSettings
} from '../services/firebaseService';
import { OrganizationUnit, OrganizationDepartment } from '../types';
import { Building, MapPin, Plus, Trash2, Edit2, Save, Loader2, Briefcase, Settings, ToggleLeft, ToggleRight, Globe } from 'lucide-react';

const AdminOrganization: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'units' | 'depts' | 'settings'>('units');
  const [isLoading, setIsLoading] = useState(true);
  
  // Units State
  const [units, setUnits] = useState<OrganizationUnit[]>([]);
  const [isEditingUnit, setIsEditingUnit] = useState(false);
  const [currentUnit, setCurrentUnit] = useState<Partial<OrganizationUnit>>({});

  // Depts State
  const [depts, setDepts] = useState<OrganizationDepartment[]>([]);
  const [isEditingDept, setIsEditingDept] = useState(false);
  const [currentDept, setCurrentDept] = useState<Partial<OrganizationDepartment>>({});

  // Settings State
  const [publicDirectory, setPublicDirectory] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [u, d, s] = await Promise.all([
        fetchUnits(), 
        fetchDepartments(),
        fetchGlobalSettings()
      ]);
      setUnits(u);
      setDepts(d);
      setPublicDirectory(s.publicDirectory);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  // --- Units Logic ---
  const handleEditUnit = (unit?: OrganizationUnit) => {
    if (unit) {
      setCurrentUnit(unit);
    } else {
      setCurrentUnit({ name: '', address: '' });
    }
    setIsEditingUnit(true);
  };

  const handleSaveUnit = async () => {
    if (!currentUnit.name) return alert('Nome da unidade é obrigatório');
    try {
      if (currentUnit.id) await updateUnit(currentUnit as OrganizationUnit);
      else await addUnit(currentUnit as OrganizationUnit);
      setIsEditingUnit(false);
      loadData();
    } catch (e) { alert("Erro ao salvar"); }
  };

  const handleDeleteUnit = async (id: string) => {
    if (confirm('Excluir esta unidade?')) {
      await removeUnit(id);
      loadData();
    }
  };

  // --- Depts Logic ---
  const handleEditDept = (dept?: OrganizationDepartment) => {
    if (dept) {
      setCurrentDept(dept);
    } else {
      setCurrentDept({ name: '' });
    }
    setIsEditingDept(true);
  };

  const handleSaveDept = async () => {
    if (!currentDept.name) return alert('Nome do departamento é obrigatório');
    try {
      if (currentDept.id) await updateDepartment(currentDept as OrganizationDepartment);
      else await addDepartment(currentDept as OrganizationDepartment);
      setIsEditingDept(false);
      loadData();
    } catch (e) { alert("Erro ao salvar"); }
  };

  const handleDeleteDept = async (id: string) => {
    if (confirm('Excluir este departamento?')) {
      await removeDepartment(id);
      loadData();
    }
  };

  // --- Settings Logic ---
  const togglePublicDirectory = async () => {
    setIsSavingSettings(true);
    const newValue = !publicDirectory;
    try {
      await updateGlobalSettings({ publicDirectory: newValue });
      setPublicDirectory(newValue);
    } catch (error) {
      alert("Erro ao salvar configuração.");
    } finally {
      setIsSavingSettings(false);
    }
  };

  if (isLoading) return <div className="p-8 text-center text-slate-500"><Loader2 className="animate-spin inline mr-2"/> Carregando...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Gestão Organizacional</h2>
        <p className="text-slate-500 text-sm">Gerencie a estrutura física (unidades), lógica (departamentos) e configurações públicas.</p>
      </div>

      <div className="flex gap-4 border-b border-slate-200 overflow-x-auto">
        <button
          onClick={() => setActiveTab('units')}
          className={`pb-3 px-2 text-sm font-medium transition-colors flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'units' 
            ? 'text-emerald-600 border-b-2 border-emerald-600' 
            : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <MapPin size={18} /> Unidades Físicas
        </button>
        <button
          onClick={() => setActiveTab('depts')}
          className={`pb-3 px-2 text-sm font-medium transition-colors flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'depts' 
            ? 'text-emerald-600 border-b-2 border-emerald-600' 
            : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Building size={18} /> Departamentos
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`pb-3 px-2 text-sm font-medium transition-colors flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'settings' 
            ? 'text-emerald-600 border-b-2 border-emerald-600' 
            : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Settings size={18} /> Configurações Gerais
        </button>
      </div>

      {/* --- UNITS TAB --- */}
      {activeTab === 'units' && (
        <div className="space-y-6 animate-fade-in">
          <div className="flex justify-end">
             <button onClick={() => handleEditUnit()} className="bg-emerald-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-emerald-700">
               <Plus size={18} /> Nova Unidade
             </button>
          </div>

          {isEditingUnit && (
             <div className="bg-white p-6 rounded-xl border border-emerald-200 shadow-sm">
                <h3 className="font-bold text-lg mb-4 text-slate-800">
                  {currentUnit.id ? 'Editar Unidade' : 'Nova Unidade'}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Nome da Unidade</label>
                    <input 
                      type="text" 
                      value={currentUnit.name}
                      onChange={e => setCurrentUnit({...currentUnit, name: e.target.value})}
                      className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white text-slate-900"
                      placeholder="Ex: Matriz"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Endereço / CNPJ</label>
                    <input 
                      type="text" 
                      value={currentUnit.address}
                      onChange={e => setCurrentUnit({...currentUnit, address: e.target.value})}
                      className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white text-slate-900"
                      placeholder="Ex: Av. Paulista, 1000"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-4">
                   <button onClick={() => setIsEditingUnit(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Cancelar</button>
                   <button onClick={handleSaveUnit} className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center gap-2"><Save size={18}/> Salvar</button>
                </div>
             </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {units.map(unit => (
              <div key={unit.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col">
                 <div className="flex justify-between items-start mb-2">
                    <div className="bg-emerald-50 p-2 rounded-lg text-emerald-600">
                       <MapPin size={24} />
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => handleEditUnit(unit)} className="p-2 text-slate-400 hover:text-indigo-600 rounded"><Edit2 size={16}/></button>
                      <button onClick={() => handleDeleteUnit(unit.id)} className="p-2 text-slate-400 hover:text-red-600 rounded"><Trash2 size={16}/></button>
                    </div>
                 </div>
                 <h4 className="font-bold text-slate-800 text-lg">{unit.name}</h4>
                 <p className="text-slate-500 text-sm mt-1">{unit.address || 'Sem endereço'}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- DEPARTMENTS TAB --- */}
      {activeTab === 'depts' && (
        <div className="space-y-6 animate-fade-in">
          <div className="flex justify-end">
             <button onClick={() => handleEditDept()} className="bg-emerald-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-emerald-700">
               <Plus size={18} /> Novo Departamento
             </button>
          </div>

          {isEditingDept && (
             <div className="bg-white p-6 rounded-xl border border-emerald-200 shadow-sm">
                <h3 className="font-bold text-lg mb-4 text-slate-800">
                  {currentDept.id ? 'Editar Departamento' : 'Novo Departamento'}
                </h3>
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Nome do Departamento</label>
                    <input 
                      type="text" 
                      value={currentDept.name}
                      onChange={e => setCurrentDept({...currentDept, name: e.target.value})}
                      className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white text-slate-900"
                      placeholder="Ex: Recursos Humanos"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-4">
                   <button onClick={() => setIsEditingDept(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Cancelar</button>
                   <button onClick={handleSaveDept} className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center gap-2"><Save size={18}/> Salvar</button>
                </div>
             </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {depts.map(dept => (
              <div key={dept.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                 <div className="flex items-center gap-3">
                    <div className="bg-indigo-50 p-2 rounded-lg text-indigo-600">
                       <Briefcase size={20} />
                    </div>
                    <span className="font-semibold text-slate-700">{dept.name}</span>
                 </div>
                 <div className="flex gap-1">
                    <button onClick={() => handleEditDept(dept)} className="p-1.5 text-slate-400 hover:text-indigo-600 rounded"><Edit2 size={14}/></button>
                    <button onClick={() => handleDeleteDept(dept.id)} className="p-1.5 text-slate-400 hover:text-red-600 rounded"><Trash2 size={14}/></button>
                 </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- SETTINGS TAB --- */}
      {activeTab === 'settings' && (
        <div className="space-y-6 animate-fade-in bg-white p-8 rounded-xl shadow-sm border border-slate-200">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
               <Globe className="text-emerald-600" /> Portal do Visitante
            </h3>
            
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
               <div>
                  <h4 className="font-semibold text-slate-800">Exibir Ramais Publicamente</h4>
                  <p className="text-sm text-slate-500 max-w-lg mt-1">
                     Se ativado, qualquer visitante poderá pesquisar ramais e contatos na página inicial (sem login). 
                     Se desativado, apenas usuários logados verão a lista de ramais no menu interno.
                  </p>
               </div>
               <button 
                 onClick={togglePublicDirectory}
                 disabled={isSavingSettings}
                 className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${publicDirectory ? 'bg-emerald-600' : 'bg-slate-300'}`}
               >
                  <span className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${publicDirectory ? 'translate-x-7' : 'translate-x-1'}`} />
               </button>
            </div>
            
            <div className="p-4 bg-yellow-50 text-yellow-800 rounded-lg text-sm border border-yellow-200 mt-4">
               <strong>Nota:</strong> As alterações nesta configuração são aplicadas imediatamente a todos os visitantes.
            </div>
        </div>
      )}

    </div>
  );
};

export default AdminOrganization;
