
import React, { useState, useEffect } from 'react';
import { fetchEmployees, updateEmployee, fetchDepartments, fetchUnits } from '../services/firebaseService';
import { Employee, UserRole, OrganizationDepartment, OrganizationUnit } from '../types';
import { Shield, ShieldAlert, ShieldCheck, User, Search, Loader2, Crown, Filter, MapPin, AlertTriangle, ArrowLeft } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Navigate, useNavigate } from 'react-router-dom';

const AdminUsers: React.FC = () => {
  const { isMaster } = useAuth();
  const navigate = useNavigate();
  
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departmentsList, setDepartmentsList] = useState<OrganizationDepartment[]>([]);
  const [unitsList, setUnitsList] = useState<OrganizationUnit[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [deptFilter, setDeptFilter] = useState('All');
  const [unitFilter, setUnitFilter] = useState('All');
  
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Segurança nível de código: Se não for Master, redireciona.
  if (!isMaster) {
      return (
          <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6 animate-fade-in">
              <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-6 shadow-sm border border-red-100">
                  <AlertTriangle size={40} />
              </div>
              <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight mb-2">Acesso Restrito</h2>
              <p className="text-slate-500 max-w-md mb-8 leading-relaxed">Esta área é exclusiva para usuários com nível de acesso <strong>Master</strong>. Suas permissões atuais não permitem visualizar ou gerenciar os acessos do sistema.</p>
              <button 
                  onClick={() => navigate('/dashboard')}
                  className="flex items-center gap-2 px-8 py-3 bg-emerald-600 text-white rounded-2xl font-black uppercase text-xs hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-900/20 active:scale-95"
              >
                  <ArrowLeft size={16} /> Voltar ao Início
              </button>
          </div>
      );
  }

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [empData, deptData, unitData] = await Promise.all([
        fetchEmployees(),
        fetchDepartments(),
        fetchUnits()
      ]);

      // Sort: Master first, then Admins, then Communication, then Users
      const sorted = empData.sort((a, b) => {
        const roleOrder = { 
          [UserRole.MASTER]: 0, 
          [UserRole.ADMIN]: 1, 
          [UserRole.COMMUNICATION]: 2, 
          [UserRole.USER]: 3 
        };
        return (roleOrder[a.systemRole] ?? 3) - (roleOrder[b.systemRole] ?? 3);
      });

      setEmployees(sorted);
      setDepartmentsList(deptData);
      setUnitsList(unitData);
    } catch (error) {
      console.error("Erro ao carregar dados de usuários:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (employee: Employee, newRole: UserRole) => {
    if (employee.systemRole === newRole) return;
    
    setUpdatingId(employee.id);
    try {
      await updateEmployee(employee.id, { ...employee, systemRole: newRole });
      // Update local state to reflect change immediately
      setEmployees(prev => prev.map(e => e.id === employee.id ? { ...e, systemRole: newRole } : e));
    } catch (error) {
      alert("Erro ao atualizar permissão.");
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredEmployees = employees.filter(emp => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = emp.name.toLowerCase().includes(searchLower) || 
                          emp.email.toLowerCase().includes(searchLower);
    const matchesDept = deptFilter === 'All' || emp.department === deptFilter;
    const matchesUnit = unitFilter === 'All' || (emp.unit && emp.unit === unitFilter);
    
    return matchesSearch && matchesDept && matchesUnit;
  });

  const roleConfig = {
    [UserRole.MASTER]: {
      label: 'Nível Master',
      icon: Crown,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
      border: 'border-amber-200'
    },
    [UserRole.ADMIN]: {
      label: 'Administrador',
      icon: ShieldAlert,
      color: 'text-red-600',
      bg: 'bg-red-50',
      border: 'border-red-200'
    },
    [UserRole.COMMUNICATION]: {
      label: 'Comunicação',
      icon: ShieldCheck,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
      border: 'border-purple-200'
    },
    [UserRole.USER]: {
      label: 'Colaborador',
      icon: User,
      color: 'text-slate-600',
      bg: 'bg-slate-50',
      border: 'border-slate-200'
    }
  };

  if (loading) return (
    <div className="flex justify-center p-12">
      <Loader2 className="animate-spin text-emerald-600" size={32} />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Gestão de Usuários</h2>
          <p className="text-slate-500 text-sm">Defina os níveis de acesso e permissões do sistema.</p>
        </div>
      </div>

      {/* FILTROS SUPERIORES */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input 
            type="text" 
            placeholder="Buscar por nome ou e-mail..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-slate-50 text-slate-900 text-sm"
          />
        </div>
        
        <div className="relative w-full md:w-48">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
          <select 
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white text-slate-900 text-sm appearance-none"
          >
            <option value="All">Todos Setores</option>
            {departmentsList.sort((a,b) => a.name.localeCompare(b.name)).map(d => (
              <option key={d.id} value={d.name}>{d.name}</option>
            ))}
          </select>
        </div>

        <div className="relative w-full md:w-48">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
          <select 
            value={unitFilter}
            onChange={(e) => setUnitFilter(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white text-slate-900 text-sm appearance-none"
          >
            <option value="All">Todas Unidades</option>
            {unitsList.sort((a,b) => a.name.localeCompare(b.name)).map(u => (
              <option key={u.id} value={u.name}>{u.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
             <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-semibold">
                   <th className="px-6 py-4">Usuário</th>
                   <th className="px-6 py-4">E-mail</th>
                   <th className="px-6 py-4">Setor / Unidade</th>
                   <th className="px-6 py-4">Nível de Acesso</th>
                </tr>
             </thead>
             <tbody className="divide-y divide-slate-100">
               {filteredEmployees.map(emp => {
                 const CurrentIcon = roleConfig[emp.systemRole]?.icon || User;
                 const roleData = roleConfig[emp.systemRole] || roleConfig[UserRole.USER];
                 return (
                   <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                     <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                           <img src={emp.avatar} alt="" className="w-9 h-9 rounded-full object-cover bg-slate-200 border border-slate-100" />
                           <span className="font-semibold text-slate-800">{emp.name}</span>
                        </div>
                     </td>
                     <td className="px-6 py-4 text-sm text-slate-600">{emp.email}</td>
                     <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px] font-bold border border-slate-200 w-fit">
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
                        <div className="flex items-center gap-2">
                           <div className={`p-2 rounded-lg ${roleData.bg} ${roleData.color}`}>
                              <CurrentIcon size={18} />
                           </div>
                           <div className="relative flex-1 max-w-[200px]">
                              {updatingId === emp.id && (
                                <div className="absolute right-2 top-1/2 -translate-y-1/2">
                                   <Loader2 className="animate-spin text-slate-400" size={14} />
                                </div>
                              )}
                              <select 
                                value={emp.systemRole}
                                onChange={(e) => handleRoleChange(emp, e.target.value as UserRole)}
                                disabled={updatingId === emp.id}
                                className={`w-full text-sm font-medium py-2 pl-2 pr-8 rounded-lg border focus:ring-2 focus:ring-emerald-500 cursor-pointer disabled:opacity-50 appearance-none ${roleData.border} ${roleData.color} bg-white transition-all`}
                              >
                                <option value={UserRole.MASTER}>Nível Master (Total)</option>
                                <option value={UserRole.ADMIN}>Administrador</option>
                                <option value={UserRole.COMMUNICATION}>Comunicação</option>
                                <option value={UserRole.USER}>Colaborador</option>
                              </select>
                           </div>
                        </div>
                     </td>
                   </tr>
                 );
               })}
             </tbody>
          </table>
        </div>
        {filteredEmployees.length === 0 && (
          <div className="p-12 text-center text-slate-400">
            <Filter size={40} className="mx-auto mb-3 opacity-20" />
            <p>Nenhum usuário encontrado com os filtros aplicados.</p>
          </div>
        )}
      </div>
      
      <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-sm text-amber-800 flex items-start gap-3">
         <Shield className="shrink-0 mt-0.5" size={18} />
         <div>
           <p className="font-bold mb-1 uppercase text-[10px] tracking-widest">Hierarquia de Permissões:</p>
           <ul className="list-disc list-inside space-y-1 text-xs opacity-90">
             <li><strong>Nível Master:</strong> Super-usuário com controle total, incluindo exclusão de registros e gestão de acessos.</li>
             <li><strong>Administrador:</strong> Gestão operacional completa de salas, ramais e sistemas.</li>
             <li><strong>Comunicação:</strong> Permissão para criar e editar postagens e notícias no mural.</li>
             <li><strong>Colaborador:</strong> Acesso padrão às ferramentas e diretórios do sistema.</li>
           </ul>
         </div>
      </div>
    </div>
  );
};

export default AdminUsers;
