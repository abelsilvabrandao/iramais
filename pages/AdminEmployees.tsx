
import React, { useState, useEffect } from 'react';
import { 
  fetchEmployees, addEmployee, updateEmployee, removeEmployee,
  fetchDepartments, fetchUnits 
} from '../services/firebaseService';
import { Employee, OrganizationDepartment, OrganizationUnit } from '../types';
import { Plus, Trash2, Edit2, Save, User, Mail, Phone, Building2, CheckSquare, Briefcase, Calendar, MapPin, MessageCircle, Upload, Loader2, Search, Filter, XCircle, Eye, EyeOff } from 'lucide-react';

const AdminEmployees: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [currentEmp, setCurrentEmp] = useState<Partial<Employee>>({});
  const [photoFile, setPhotoFile] = useState<string | undefined>(undefined); // Para armazenar Base64 temporariamente
  
  const [departmentsList, setDepartmentsList] = useState<OrganizationDepartment[]>([]);
  const [unitsList, setUnitsList] = useState<OrganizationUnit[]>([]);

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [deptFilter, setDeptFilter] = useState('All');
  const [unitFilter, setUnitFilter] = useState('All');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [emps, depts, units] = await Promise.all([
        fetchEmployees(),
        fetchDepartments(),
        fetchUnits()
      ]);
      setEmployees(emps);
      setDepartmentsList(depts);
      setUnitsList(units);
    } catch (error) {
      alert("Erro ao carregar dados do servidor.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddNew = () => {
    setCurrentEmp({
      name: '',
      role: '',
      department: '',
      unit: '',
      extension: '',
      whatsapp: '',
      email: '',
      avatar: '',
      birthday: '',
      showRole: true,
      showInPublicDirectory: true
    });
    setPhotoFile(undefined);
    setIsEditing(true);
  };

  const handleEdit = (emp: Employee) => {
    setCurrentEmp({ ...emp });
    setPhotoFile(undefined); // Reset foto nova
    setIsEditing(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este colaborador?')) {
      try {
        await removeEmployee(id);
        loadData();
      } catch (e) {
        alert("Erro ao excluir.");
      }
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoFile(reader.result as string);
        // Atualiza preview
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
      loadData();
    } catch (e) {
      alert("Erro ao salvar dados.");
    } finally {
      setIsSaving(false);
    }
  };

  // Lógica de Filtragem
  const filteredEmployees = employees.filter(emp => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = 
      emp.name.toLowerCase().includes(searchLower) ||
      emp.email.toLowerCase().includes(searchLower) ||
      (emp.extension && emp.extension.includes(searchLower));

    const matchesDept = deptFilter === 'All' || emp.department === deptFilter;
    const matchesUnit = unitFilter === 'All' || (emp.unit && emp.unit === unitFilter);

    return matchesSearch && matchesDept && matchesUnit;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-emerald-600" size={48} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Gestão de Colaboradores</h2>
          <p className="text-slate-500 text-sm">Gerencie o cadastro de pessoas, departamentos e unidades.</p>
        </div>
        {!isEditing && (
          <button 
            onClick={handleAddNew}
            className="bg-emerald-600 text-white px-4 py-3 md:py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-emerald-700 transition-colors w-full md:w-auto font-medium"
          >
            <Plus size={18} /> <span>Novo Colaborador</span>
          </button>
        )}
      </div>

      {isEditing ? (
        <div className="bg-white p-4 md:p-8 rounded-2xl shadow-sm border border-slate-200 animate-fade-in">
           <h3 className="text-lg font-bold mb-6 flex items-center gap-2 border-b border-slate-100 pb-4">
             <User size={20} className="text-emerald-600"/> 
             {currentEmp.id ? 'Editar Dados' : 'Novo Cadastro'}
           </h3>
           
           <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
             {/* Avatar Upload */}
             <div className="col-span-1 md:col-span-2 flex flex-col md:flex-row items-center gap-4 mb-2">
                <div className="w-24 h-24 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden border-2 border-emerald-500 shrink-0 relative group">
                  {currentEmp.avatar ? (
                    <img src={currentEmp.avatar} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <User className="text-slate-400" size={32} />
                  )}
                </div>
                <div className="flex-1 w-full">
                   <label className="block text-sm font-medium text-slate-700 mb-1">Foto de Perfil</label>
                   <div className="flex items-center gap-2">
                     <label className="cursor-pointer bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-2 shadow-sm">
                        <Upload size={16} />
                        <span className="text-sm">Escolher arquivo...</span>
                        <input 
                          type="file" 
                          accept="image/*" 
                          className="hidden" 
                          onChange={handlePhotoUpload}
                        />
                     </label>
                     <span className="text-xs text-slate-400">JPG, PNG (Max 2MB)</span>
                   </div>
                </div>
             </div>

             <div>
               <label className="block text-sm font-medium text-slate-700 mb-1">Nome Completo</label>
               <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 pointer-events-none" />
                  <input 
                      type="text" 
                      value={currentEmp.name} 
                      onChange={e => setCurrentEmp({...currentEmp, name: e.target.value})}
                      className="w-full pl-12 py-3 md:py-2 pr-4 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white text-slate-900"
                  />
               </div>
             </div>
             
             <div>
               <label className="block text-sm font-medium text-slate-700 mb-1">E-mail Corporativo</label>
               <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 pointer-events-none" />
                  <input 
                      type="email" 
                      value={currentEmp.email} 
                      onChange={e => setCurrentEmp({...currentEmp, email: e.target.value})}
                      className="w-full pl-12 py-3 md:py-2 pr-4 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white text-slate-900"
                  />
               </div>
             </div>

             <div className="grid grid-cols-2 gap-4">
                 <div>
                   <label className="block text-sm font-medium text-slate-700 mb-1">Ramal</label>
                   <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
                      <input 
                          type="text" 
                          value={currentEmp.extension} 
                          onChange={e => setCurrentEmp({...currentEmp, extension: e.target.value})}
                          className="w-full pl-10 py-3 md:py-2 pr-4 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white text-slate-900"
                      />
                   </div>
                 </div>
                 <div>
                   <label className="block text-sm font-medium text-slate-700 mb-1">WhatsApp</label>
                   <div className="relative">
                      <MessageCircle className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
                      <input 
                          type="text" 
                          value={currentEmp.whatsapp || ''} 
                          onChange={e => setCurrentEmp({...currentEmp, whatsapp: e.target.value})}
                          className="w-full pl-10 py-3 md:py-2 pr-4 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white text-slate-900"
                          placeholder="5571..."
                      />
                   </div>
                 </div>
             </div>

             <div>
               <label className="block text-sm font-medium text-slate-700 mb-1">Cargo / Função</label>
               <div className="relative">
                  <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 pointer-events-none" />
                  <input 
                      type="text" 
                      value={currentEmp.role} 
                      onChange={e => setCurrentEmp({...currentEmp, role: e.target.value})}
                      className="w-full pl-12 py-3 md:py-2 pr-4 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white text-slate-900"
                  />
               </div>
               
               {/* Visibility Options */}
               <div className="mt-3 space-y-2">
                 <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg border border-slate-100">
                   <input 
                     type="checkbox" 
                     id="showRole"
                     checked={currentEmp.showRole ?? true} 
                     onChange={(e) => setCurrentEmp({...currentEmp, showRole: e.target.checked})}
                     className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                   />
                   <label htmlFor="showRole" className="text-sm text-slate-600 cursor-pointer select-none font-medium">
                     Exibir cargo publicamente no cartão
                   </label>
                 </div>
                 
                 <div className="flex items-center gap-2 p-2 bg-emerald-50 rounded-lg border border-emerald-100">
                   <input 
                     type="checkbox" 
                     id="showInPublicDirectory"
                     checked={currentEmp.showInPublicDirectory ?? true} 
                     onChange={(e) => setCurrentEmp({...currentEmp, showInPublicDirectory: e.target.checked})}
                     className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                   />
                   <label htmlFor="showInPublicDirectory" className="text-sm text-emerald-800 cursor-pointer select-none font-bold flex items-center gap-2">
                     <Eye size={16} /> Exibir no Portal do Visitante (Público)
                   </label>
                 </div>
               </div>
             </div>

             <div>
               <label className="block text-sm font-medium text-slate-700 mb-1">Departamento</label>
               <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 pointer-events-none" />
                  <select
                      value={currentEmp.department} 
                      onChange={e => setCurrentEmp({...currentEmp, department: e.target.value})}
                      className="w-full pl-12 py-3 md:py-2 pr-4 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white text-slate-900 appearance-none"
                  >
                    <option value="">Selecione...</option>
                    {departmentsList.map(dept => (
                      <option key={dept.id} value={dept.name}>{dept.name}</option>
                    ))}
                    {currentEmp.department && !departmentsList.find(d => d.name === currentEmp.department) && (
                      <option value={currentEmp.department}>{currentEmp.department}</option>
                    )}
                  </select>
               </div>
             </div>

             <div>
               <label className="block text-sm font-medium text-slate-700 mb-1">Unidade</label>
               <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 pointer-events-none" />
                  <select
                      value={currentEmp.unit || ''} 
                      onChange={e => setCurrentEmp({...currentEmp, unit: e.target.value})}
                      className="w-full pl-12 py-3 md:py-2 pr-4 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white text-slate-900 appearance-none"
                  >
                    <option value="">Selecione...</option>
                    {unitsList.map(unit => (
                      <option key={unit.id} value={unit.name}>{unit.name}</option>
                    ))}
                  </select>
               </div>
             </div>

             <div>
               <label className="block text-sm font-medium text-slate-700 mb-1">Data de Nascimento</label>
               <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 pointer-events-none" />
                  <input 
                      type="date" 
                      value={currentEmp.birthday} 
                      onChange={e => setCurrentEmp({...currentEmp, birthday: e.target.value})}
                      className="w-full pl-12 py-3 md:py-2 pr-4 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white text-slate-900"
                  />
               </div>
             </div>
           </div>

           <div className="flex flex-col-reverse md:flex-row justify-end gap-3 mt-8 pt-4 border-t border-slate-100">
             <button 
               onClick={() => setIsEditing(false)}
               className="w-full md:w-auto px-4 py-3 md:py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium bg-slate-50 md:bg-transparent"
               disabled={isSaving}
             >
               Cancelar
             </button>
             <button 
               onClick={handleSave}
               disabled={isSaving}
               className="w-full md:w-auto px-6 py-3 md:py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 flex items-center justify-center gap-2 shadow-lg shadow-emerald-200 md:shadow-none disabled:opacity-50"
             >
               {isSaving ? (
                 <> <Loader2 className="animate-spin" size={18}/> Salvando... </>
               ) : (
                 <> <Save size={18} /> Salvar Cadastro </>
               )}
             </button>
           </div>
        </div>
      ) : (
        <>
          {/* --- BARRA DE FILTROS --- */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-3">
             <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input 
                  type="text" 
                  placeholder="Buscar por nome, email ou ramal..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-slate-50 text-slate-900"
                />
             </div>
             <div className="flex gap-2 w-full md:w-auto">
               <div className="relative flex-1 md:flex-none">
                 <select 
                    value={deptFilter}
                    onChange={(e) => setDeptFilter(e.target.value)}
                    className="w-full md:w-48 pl-3 pr-8 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-slate-50 text-slate-900 appearance-none"
                 >
                    <option value="All">Todos Setores</option>
                    {departmentsList.map(d => (
                      <option key={d.id} value={d.name}>{d.name}</option>
                    ))}
                 </select>
                 <Filter className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
               </div>
               
               <div className="relative flex-1 md:flex-none">
                 <select 
                    value={unitFilter}
                    onChange={(e) => setUnitFilter(e.target.value)}
                    className="w-full md:w-48 pl-3 pr-8 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-slate-50 text-slate-900 appearance-none"
                 >
                    <option value="All">Todas Unidades</option>
                    {unitsList.map(u => (
                      <option key={u.id} value={u.name}>{u.name}</option>
                    ))}
                 </select>
                 <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
               </div>
             </div>
          </div>

          {/* LISTA DE FUNCIONÁRIOS FILTRADA */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            {/* Desktop Table Wrapper with Horizontal Scroll */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse hidden md:table min-w-[800px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-semibold">
                    <th className="px-6 py-4">Colaborador</th>
                    <th className="px-6 py-4">Contato</th>
                    <th className="px-6 py-4">Setor / Unidade</th>
                    <th className="px-6 py-4">Visibilidade</th>
                    <th className="px-6 py-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredEmployees.map(emp => (
                    <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <img src={emp.avatar} alt="" className="w-10 h-10 rounded-full bg-slate-200 object-cover" />
                          <div>
                            <p className="font-bold text-slate-800">{emp.name}</p>
                            <p className="text-xs text-slate-500">{emp.role}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-slate-600">{emp.email}</p>
                        <div className="flex gap-3 mt-1">
                          <p className="text-xs text-emerald-600 font-medium">Ramal: {emp.extension}</p>
                          {emp.whatsapp && <p className="text-xs text-green-600 font-medium flex items-center gap-1"><MessageCircle size={10}/> {emp.whatsapp}</p>}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-medium border border-slate-200 w-fit">
                            {emp.department}
                          </span>
                          {emp.unit && (
                            <span className="text-[10px] text-slate-400 flex items-center gap-1">
                              <MapPin size={10} /> {emp.unit}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {emp.showInPublicDirectory !== false ? (
                           <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-100 w-fit">
                              <Eye size={12} /> Público
                           </span>
                        ) : (
                           <span className="flex items-center gap-1 text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-full border border-slate-200 w-fit">
                              <EyeOff size={12} /> Oculto
                           </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => handleEdit(emp)} className="p-2 text-slate-400 hover:text-indigo-600 bg-transparent hover:bg-indigo-50 rounded-lg transition-colors">
                            <Edit2 size={16} />
                          </button>
                          <button onClick={() => handleDelete(emp.id)} className="p-2 text-slate-400 hover:text-red-600 bg-transparent hover:bg-red-50 rounded-lg transition-colors">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden divide-y divide-slate-100">
              {filteredEmployees.map(emp => (
                <div key={emp.id} className="p-5 flex flex-col gap-4">
                   <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <img src={emp.avatar} alt="" className="w-12 h-12 rounded-full bg-slate-100 object-cover border border-slate-100" />
                        <div>
                          <p className="font-bold text-slate-800 text-lg">{emp.name}</p>
                          <span className="text-sm text-slate-500">{emp.role}</span>
                        </div>
                      </div>
                      {emp.showInPublicDirectory !== false ? (
                           <Eye size={18} className="text-emerald-500" title="Público"/>
                        ) : (
                           <EyeOff size={18} className="text-slate-300" title="Oculto"/>
                      )}
                   </div>

                   <div className="grid grid-cols-2 gap-3">
                      <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                         <span className="text-xs text-slate-400 uppercase font-bold tracking-wider block mb-1">Setor</span>
                         <span className="text-sm font-semibold text-slate-700">{emp.department}</span>
                         {emp.unit && <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1"><MapPin size={10}/> {emp.unit}</p>}
                      </div>
                      <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-100">
                         <span className="text-xs text-emerald-400 uppercase font-bold tracking-wider block mb-1">Ramal</span>
                         <span className="text-sm font-bold text-emerald-700">{emp.extension || '-'}</span>
                      </div>
                   </div>
                   
                   <div className="flex flex-col gap-1">
                     <div className="text-sm text-slate-600 break-all flex items-center gap-2">
                       <Mail size={14} className="text-slate-400 shrink-0"/>
                       {emp.email}
                     </div>
                     {emp.whatsapp && (
                        <div className="text-sm text-slate-600 break-all flex items-center gap-2">
                          <MessageCircle size={14} className="text-green-500 shrink-0"/>
                          {emp.whatsapp}
                        </div>
                     )}
                   </div>

                   <div className="grid grid-cols-2 gap-3 pt-2">
                      <button 
                        onClick={() => handleEdit(emp)} 
                        className="flex items-center justify-center gap-2 py-3 bg-indigo-50 text-indigo-700 rounded-lg font-semibold hover:bg-indigo-100 transition-colors"
                      >
                        <Edit2 size={18} /> Editar
                      </button>
                      <button 
                        onClick={() => handleDelete(emp.id)} 
                        className="flex items-center justify-center gap-2 py-3 bg-red-50 text-red-700 rounded-lg font-semibold hover:bg-red-100 transition-colors"
                      >
                        <Trash2 size={18} /> Excluir
                      </button>
                   </div>
                </div>
              ))}
            </div>

            {filteredEmployees.length === 0 && (
               <div className="p-12 text-center text-slate-400 flex flex-col items-center">
                  <XCircle size={48} className="mb-4 opacity-20" />
                  <p className="text-lg font-medium text-slate-600">Nenhum colaborador encontrado</p>
                  <p className="text-sm max-w-xs mx-auto mt-1">Tente ajustar os filtros ou pesquisar por outro termo.</p>
                  <button 
                    onClick={() => {setSearchTerm(''); setDeptFilter('All'); setUnitFilter('All');}}
                    className="mt-4 text-emerald-600 hover:text-emerald-700 text-sm font-medium underline"
                  >
                    Limpar Filtros
                  </button>
               </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default AdminEmployees;
