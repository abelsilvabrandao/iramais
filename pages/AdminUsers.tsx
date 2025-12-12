
import React, { useState, useEffect } from 'react';
import { fetchEmployees, updateEmployee } from '../services/firebaseService';
import { Employee, UserRole } from '../types';
import { Shield, ShieldAlert, ShieldCheck, User, Search, Loader2, Save } from 'lucide-react';

const AdminUsers: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchEmployees();
      // Sort: Admins first, then Communication, then Users
      const sorted = data.sort((a, b) => {
        const roleOrder = { [UserRole.ADMIN]: 0, [UserRole.COMMUNICATION]: 1, [UserRole.USER]: 2 };
        return roleOrder[a.systemRole] - roleOrder[b.systemRole];
      });
      setEmployees(sorted);
    } catch (error) {
      console.error(error);
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

  const filteredEmployees = employees.filter(emp => 
    emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const roleConfig = {
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
        <div className="relative w-full md:w-auto">
           <Search className="absolute left-3 top-2.5 text-slate-400 w-4 h-4" />
           <input 
             type="text" 
             placeholder="Buscar usuário..." 
             value={searchTerm}
             onChange={(e) => setSearchTerm(e.target.value)}
             className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 w-full md:w-64"
           />
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
             <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-semibold">
                   <th className="px-6 py-4">Usuário</th>
                   <th className="px-6 py-4">E-mail</th>
                   <th className="px-6 py-4">Departamento</th>
                   <th className="px-6 py-4">Nível de Acesso</th>
                </tr>
             </thead>
             <tbody className="divide-y divide-slate-100">
               {filteredEmployees.map(emp => {
                 const CurrentIcon = roleConfig[emp.systemRole].icon;
                 return (
                   <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                     <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                           <img src={emp.avatar} alt="" className="w-9 h-9 rounded-full object-cover bg-slate-200" />
                           <span className="font-semibold text-slate-800">{emp.name}</span>
                        </div>
                     </td>
                     <td className="px-6 py-4 text-sm text-slate-600">{emp.email}</td>
                     <td className="px-6 py-4 text-sm text-slate-600">
                        <span className="bg-slate-100 px-2 py-1 rounded text-xs font-medium">
                          {emp.department}
                        </span>
                     </td>
                     <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                           <div className={`p-2 rounded-lg ${roleConfig[emp.systemRole].bg} ${roleConfig[emp.systemRole].color}`}>
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
                                className={`w-full text-sm font-medium py-2 pl-2 pr-8 rounded-lg border focus:ring-2 focus:ring-emerald-500 cursor-pointer disabled:opacity-50 appearance-none ${roleConfig[emp.systemRole].border} ${roleConfig[emp.systemRole].color} bg-white`}
                              >
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
          <div className="p-8 text-center text-slate-400">
            Nenhum usuário encontrado.
          </div>
        )}
      </div>
      
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-800 flex items-start gap-3">
         <Shield className="shrink-0 mt-0.5" size={18} />
         <div>
           <p className="font-bold mb-1">Definição de Papéis:</p>
           <ul className="list-disc list-inside space-y-1 text-blue-700/80">
             <li><strong>Administrador:</strong> Acesso total ao sistema (Gestão de Usuários, Colaboradores, Sistemas, Notícias).</li>
             <li><strong>Comunicação:</strong> Pode criar e editar postagens/notícias, além do acesso padrão.</li>
             <li><strong>Colaborador:</strong> Acesso de visualização ao Dashboard, Ramais, Tarefas e Sistemas.</li>
           </ul>
         </div>
      </div>
    </div>
  );
};

export default AdminUsers;
