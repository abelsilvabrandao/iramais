
import React, { useState, useEffect } from 'react';
import { 
  subscribeEmployees, addEmployee, updateEmployee, removeEmployee,
  fetchDepartments, fetchUnits 
} from '../services/firebaseService';
import { Employee, OrganizationDepartment, OrganizationUnit } from '../types';
import { Plus, Trash2, Edit2, Save, User, Upload, Loader2, Search, MapPin, X, AlertTriangle, Camera, Lock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const AdminEmployees: React.FC = () => {
  const { isMaster } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [currentEmp, setCurrentEmp] = useState<Partial<Employee>>({});
  const [photoFile, setPhotoFile] = useState<string | undefined>(undefined);
  
  const [departmentsList, setDepartmentsList] = useState<OrganizationDepartment[]>([]);
  const [unitsList, setUnitsList] = useState<OrganizationUnit[]>([]);

  const [itemToDelete, setItemToDelete] = useState<Employee | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [deptFilter, setDeptFilter] = useState('All');
  const [unitFilter, setUnitFilter] = useState('All');

  useEffect(() => {
    setIsLoading(true);
    
    // Inicia subscrição em tempo real de colaboradores
    const unsubEmps = subscribeEmployees((data) => {
      setEmployees(data);
      setIsLoading(false);
    });

    // Carrega opções de suporte (estáticos)
    Promise.all([fetchDepartments(), fetchUnits()]).then(([depts, units]) => {
      setDepartmentsList(depts);
      setUnitsList(units);
    });

    return () => unsubEmps();
  }, []);

  const handleAddNew = () => {
    setCurrentEmp({
      name: '', role: '', department: '', unit: '', extension: '', whatsapp: '', email: '', avatar: '', birthday: '', showRole: true, showInPublicDirectory: true
    });
    setPhotoFile(undefined);
    setIsEditing(true);
  };

  const handleEdit = (emp: Employee) => {
    setCurrentEmp({ ...emp });
    setPhotoFile(undefined); 
    setIsEditing(true);
  };

  const handleRequestDelete = (e: React.MouseEvent, emp: Employee) => {
    e.preventDefault();
    e.stopPropagation(); 
    if (!isMaster) return;
    setItemToDelete(emp);
  };

  const confirmDelete = async () => {
    if (!itemToDelete || !itemToDelete.id) return;
    const id = itemToDelete.id;
    setIsSaving(true);

    try {
      await removeEmployee(id);
      setItemToDelete(null);
    } catch (e: any) {
      console.error("Erro ao excluir colaborador:", e);
      alert(`Erro na exclusão: ${e.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoFile(reader.result as string);
        setCurrentEmp(prev => ({ ...prev, avatar: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!currentEmp.name || !currentEmp.email) return alert('Nome e Email são obrigatórios');
    
    setIsSaving(true);
    try {
      if (currentEmp.id) {
        await updateEmployee(currentEmp.id, currentEmp, photoFile);
      } else {
        await addEmployee(currentEmp, photoFile);
      }
      setIsEditing(false);
    } catch (e: any) {
      alert(`Erro ao salvar: ${e.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const filteredEmployees = employees.filter(emp => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = emp.name.toLowerCase().includes(searchLower) || emp.email.toLowerCase().includes(searchLower) || (emp.extension && emp.extension.includes(searchLower));
    const matchesDept = deptFilter === 'All' || emp.department === deptFilter;
    const matchesUnit = unitFilter === 'All' || (emp.unit && emp.unit === unitFilter);
    return matchesSearch && matchesDept && matchesUnit;
  });

  if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-emerald-600" size={48} /></div>;

  return (
    <div className="space-y-6 relative">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Gestão de Colaboradores</h2>
          <p className="text-slate-500 text-sm">Controle total sobre o diretório da empresa.</p>
        </div>
        {!isEditing && (
          <button onClick={handleAddNew} className="bg-emerald-600 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-emerald-700 shadow-sm w-full md:w-auto font-medium">
            <Plus size={18} /> Novo Colaborador
          </button>
        )}
      </div>

      {isEditing ? (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 animate-fade-in">
           <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
              <h3 className="text-lg font-bold text-slate-800">{currentEmp.id ? 'Editar Colaborador' : 'Novo Cadastro'}</h3>
              <button onClick={() => setIsEditing(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={20}/></button>
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="col-span-full flex flex-col items-center gap-3">
                <div className="relative group">
                  <div className="w-24 h-24 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden border-2 border-emerald-500">
                    {currentEmp.avatar ? <img src={currentEmp.avatar} alt="" className="w-full h-full object-cover" /> : <User className="text-slate-300" size={40} />}
                  </div>
                  <label className="absolute bottom-0 right-0 bg-emerald-600 text-white p-2 rounded-full cursor-pointer hover:bg-emerald-700 shadow-sm transition-colors">
                    <Camera size={14} />
                    <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload}/>
                  </label>
                </div>
                <p className="text-[10px] uppercase font-bold text-slate-400">Foto do Perfil</p>
             </div>

             <div className="space-y-4">
               <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome Completo</label>
                  <input type="text" value={currentEmp.name} onChange={e => setCurrentEmp({...currentEmp, name: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white text-slate-900"/>
               </div>
               <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email Corporativo</label>
                  <input type="email" value={currentEmp.email} onChange={e => setCurrentEmp({...currentEmp, email: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white text-slate-900"/>
               </div>
               <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Ramal</label>
                    <input type="text" value={currentEmp.extension} onChange={e => setCurrentEmp({...currentEmp, extension: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white text-slate-900"/>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">WhatsApp</label>
                    <input type="text" value={currentEmp.whatsapp || ''} onChange={e => setCurrentEmp({...currentEmp, whatsapp: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white text-slate-900" placeholder="5571..."/>
                  </div>
               </div>
             </div>

             <div className="space-y-4">
               <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Cargo</label>
                  <input type="text" value={currentEmp.role} onChange={e => setCurrentEmp({...currentEmp, role: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white text-slate-900"/>
               </div>
               <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Departamento</label>
                    <select value={currentEmp.department} onChange={e => setCurrentEmp({...currentEmp, department: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white text-slate-900">
                        <option value="">Selecione...</option>
                        {departmentsList.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Unidade</label>
                    <select value={currentEmp.unit || ''} onChange={e => setCurrentEmp({...currentEmp, unit: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white text-slate-900">
                        <option value="">Selecione...</option>
                        {unitsList.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
                    </select>
                  </div>
               </div>
               <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Data de Nascimento</label>
                  <input type="date" value={currentEmp.birthday} onChange={e => setCurrentEmp({...currentEmp, birthday: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white text-slate-900"/>
               </div>
             </div>
           </div>

           <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-slate-100">
             <button onClick={() => setIsEditing(false)} className="px-6 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium" disabled={isSaving}>Cancelar</button>
             <button onClick={handleSave} disabled={isSaving} className="px-8 py-2 bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-700 flex items-center justify-center gap-2 shadow-md disabled:opacity-50 transition-all">
               {isSaving ? <Loader2 className="animate-spin" size={18}/> : <Save size={18} />} Salvar Colaborador
             </button>
           </div>
        </div>
      ) : (
        <>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-3">
             <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input type="text" placeholder="Buscar por nome, e-mail ou ramal..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-slate-50 text-slate-900 text-sm"/>
             </div>
             <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} className="w-full md:w-48 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white text-slate-900 text-sm">
                <option value="All">Todos Setores</option>
                {departmentsList.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
             </select>
             <select value={unitFilter} onChange={(e) => setUnitFilter(e.target.value)} className="w-full md:w-48 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white text-slate-900 text-sm">
                <option value="All">Todas Unidades</option>
                {unitsList.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
             </select>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase text-slate-500 font-bold tracking-wider">
                    <th className="px-6 py-4">Colaborador</th>
                    <th className="px-6 py-4">Contato</th>
                    <th className="px-6 py-4">Setor / Unidade</th>
                    <th className="px-6 py-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredEmployees.map(emp => (
                    <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <img src={emp.avatar} alt="" className="w-10 h-10 rounded-full bg-slate-200 object-cover border border-slate-100" />
                          <div><p className="font-bold text-slate-800 text-sm">{emp.name}</p><p className="text-[10px] text-slate-500 uppercase">{emp.role}</p></div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-xs text-slate-600 font-medium">{emp.email}</p>
                        <p className="text-[10px] text-emerald-600 font-bold mt-1">RAMAL: {emp.extension || '---'}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px] font-bold border border-slate-200 block w-fit mb-1">{emp.department}</span>
                        {emp.unit && <span className="text-[10px] text-slate-400 flex items-center gap-1"><MapPin size={10} /> {emp.unit}</span>}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => handleEdit(emp)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"><Edit2 size={16} /></button>
                          <button 
                            onClick={(e) => handleRequestDelete(e, emp)} 
                            disabled={!isMaster}
                            title={!isMaster ? "Apenas usuários Master podem excluir" : "Excluir colaborador"}
                            className={`p-2 transition-colors rounded-lg ${isMaster ? 'text-slate-400 hover:text-red-600 hover:bg-red-50' : 'text-slate-200 cursor-not-allowed opacity-50'}`}
                          >
                            {isMaster ? <Trash2 size={16} /> : <Lock size={16} />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filteredEmployees.length === 0 && <div className="p-12 text-center text-slate-400 italic">Nenhum colaborador encontrado.</div>}
          </div>
        </>
      )}

      {itemToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
           <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden border-2 border-red-100">
              <div className="p-6 text-center">
                 <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500"><AlertTriangle size={32} /></div>
                 <h3 className="text-lg font-bold text-slate-800 mb-2">Excluir Colaborador?</h3>
                 <p className="text-sm text-slate-500 mb-6">Você está prestes a remover <strong>{itemToDelete.name}</strong>.<br/>Esta ação é irreversível.</p>
                 <div className="flex gap-3">
                   <button onClick={() => setItemToDelete(null)} className="flex-1 py-3 text-slate-600 hover:bg-slate-100 rounded-xl font-bold text-sm" disabled={isSaving}>Cancelar</button>
                   <button onClick={confirmDelete} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold text-sm hover:bg-red-700 flex items-center justify-center gap-2 shadow-lg shadow-red-200" disabled={isSaving}>
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

export default AdminEmployees;
