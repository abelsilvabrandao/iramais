
import React, { useState, useEffect } from 'react';
import { fetchTasks, addTask, updateTask, deleteTask, fetchEmployees } from '../services/firebaseService';
import { Task, TaskStatus, Employee } from '../types';
import { CheckCircle2, Clock, MoreVertical, Plus, Calendar, X, User, AlignLeft, Save, Trash2, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const Tasks: React.FC = () => {
  const { currentUser } = useAuth();
  
  const [tasks, setTasks] = useState<Task[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<TaskStatus | 'ALL'>('ALL');
  
  // State for Modal and New Task Form
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [newTask, setNewTask] = useState<Partial<Task>>({
    title: '',
    description: '',
    assigneeId: '',
    dueDate: '',
    status: TaskStatus.TODO
  });

  // State for active dropdown
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  useEffect(() => {
    if (currentUser) {
      loadData();
    }
  }, [currentUser]); // Reload when currentUser matches

  // Fecha dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = () => setActiveDropdown(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const loadData = async () => {
    if (!currentUser) return;
    
    setLoading(true);
    try {
      const [tasksData, employeesData] = await Promise.all([
        fetchTasks(),
        fetchEmployees()
      ]);
      
      setTasks(tasksData);
      setEmployees(employeesData);
    } catch (error) {
      console.error("Erro ao carregar dados", error);
    } finally {
      setLoading(false);
    }
  };

  const getAssignee = (id: string) => employees.find(e => e.id === id);

  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    // Otimistic update
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
    try {
      await updateTask(taskId, { status: newStatus });
    } catch (error) {
      console.error("Erro ao atualizar status", error);
      loadData(); // Revert on error
    }
  };

  const handleSaveTask = async () => {
    if (!newTask.title || !newTask.dueDate) {
      alert("Por favor, preencha o título e a data.");
      return;
    }

    if (!currentUser) return;

    setIsSaving(true);
    try {
      await addTask({
        title: newTask.title,
        description: newTask.description || '',
        assigneeId: newTask.assigneeId || '', // Pode ser vazio se não atribuído
        dueDate: newTask.dueDate,
        status: TaskStatus.TODO
      });
      
      await loadData();
      setIsModalOpen(false);
      // Reset form
      setNewTask({
        title: '',
        description: '',
        assigneeId: '',
        dueDate: '',
        status: TaskStatus.TODO
      });
    } catch (error) {
      alert("Erro ao salvar tarefa: Verifique sua conexão.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteTask = async (e: React.MouseEvent, taskId: string) => {
    e.stopPropagation(); // Impede que o clique propague para o document e feche o dropdown imediatamente
    setActiveDropdown(null); // Fecha o dropdown manualmente

    if(window.confirm("Deseja realmente excluir esta tarefa?")) {
      try {
        await deleteTask(taskId);
        setTasks(prev => prev.filter(t => t.id !== taskId));
      } catch (error) {
        console.error(error);
        alert("Erro ao excluir tarefa");
      }
    }
  };

  const statusColors = {
    [TaskStatus.TODO]: 'bg-slate-100 text-slate-600 border-slate-200',
    [TaskStatus.IN_PROGRESS]: 'bg-amber-100 text-amber-700 border-amber-200',
    [TaskStatus.DONE]: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  };
  
  const statusLabels = {
    [TaskStatus.TODO]: 'A Fazer',
    [TaskStatus.IN_PROGRESS]: 'Em Andamento',
    [TaskStatus.DONE]: 'Concluído',
  };

  const filteredTasks = tasks.filter(t => filter === 'ALL' || t.status === filter);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-indigo-600" size={48} />
      </div>
    );
  }

  return (
    <div className="space-y-6 relative">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Gestão de Tarefas</h2>
          <p className="text-slate-500 text-sm">Minhas tarefas e do meu time</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-indigo-600 text-white px-4 py-3 md:py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 w-full md:w-auto font-medium"
        >
          <Plus size={18} /> <span className="md:inline">Nova Tarefa</span>
        </button>
      </div>

      {/* Filter Tabs - Scrollable on mobile */}
      <div className="flex gap-2 border-b border-slate-200 pb-1 overflow-x-auto custom-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
        {(['ALL', TaskStatus.TODO, TaskStatus.IN_PROGRESS, TaskStatus.DONE] as const).map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`whitespace-nowrap px-4 py-2 text-sm font-medium rounded-t-lg transition-colors flex-shrink-0 ${
              filter === status 
              ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50' 
              : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {status === 'ALL' ? 'Todas' : statusLabels[status]}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Desktop Table View */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse hidden md:table min-w-[800px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-semibold tracking-wider">
                <th className="px-6 py-4">Tarefa</th>
                <th className="px-6 py-4">Responsável</th>
                <th className="px-6 py-4">Prazo</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTasks.map(task => {
                const assignee = getAssignee(task.assigneeId);
                
                return (
                  <tr key={task.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-semibold text-slate-800">{task.title}</p>
                      <p className="text-xs text-slate-500 truncate max-w-xs">{task.description}</p>
                    </td>
                    <td className="px-6 py-4">
                      {assignee ? (
                        <div className="flex items-center gap-2">
                          <img src={assignee.avatar} alt={assignee.name} className="w-6 h-6 rounded-full object-cover" />
                          <div>
                             <p className="text-sm text-slate-700 leading-none">{assignee.name}</p>
                             <p className="text-[9px] text-slate-400 leading-none mt-0.5">{assignee.department}</p>
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-slate-400 italic">Não atribuído</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-sm text-slate-600">
                        <Clock size={14} />
                        {task.dueDate ? new Date(task.dueDate).toLocaleDateString('pt-BR') : '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <select 
                        value={task.status}
                        onChange={(e) => handleStatusChange(task.id, e.target.value as TaskStatus)}
                        className={`text-xs font-bold px-3 py-1 rounded-full border appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-1 ${statusColors[task.status]}`}
                      >
                        <option value={TaskStatus.TODO}>A Fazer</option>
                        <option value={TaskStatus.IN_PROGRESS}>Em Andamento</option>
                        <option value={TaskStatus.DONE}>Concluído</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 text-right relative">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveDropdown(activeDropdown === task.id ? null : task.id);
                        }}
                        className="text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-200 transition-colors"
                      >
                        <MoreVertical size={18} />
                      </button>
                      
                      {activeDropdown === task.id && (
                        <div className="absolute right-8 top-8 z-10 w-32 bg-white rounded-lg shadow-lg border border-slate-100 py-1 animate-fade-in">
                          <button 
                            onClick={(e) => handleDeleteTask(e, task.id)}
                            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                          >
                            <Trash2 size={14} /> Excluir
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden divide-y divide-slate-100">
          {filteredTasks.map(task => {
            const assignee = getAssignee(task.assigneeId);

            return (
              <div key={task.id} className="p-5 flex flex-col gap-4">
                <div>
                   <div className="flex justify-between items-start mb-1 relative">
                      <div>
                        <h3 className="font-bold text-slate-800 text-lg">{task.title}</h3>
                      </div>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveDropdown(activeDropdown === task.id ? null : task.id);
                        }}
                        className="text-slate-400 p-1"
                      >
                        <MoreVertical size={20}/>
                      </button>
                      
                      {activeDropdown === task.id && (
                        <div className="absolute right-0 top-8 z-10 w-32 bg-white rounded-lg shadow-lg border border-slate-100 py-1">
                          <button 
                            onClick={(e) => handleDeleteTask(e, task.id)}
                            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                          >
                            <Trash2 size={14} /> Excluir
                          </button>
                        </div>
                      )}
                   </div>
                   <p className="text-sm text-slate-500 leading-relaxed">{task.description}</p>
                </div>

                <div className="flex items-center justify-between text-sm bg-slate-50 p-3 rounded-lg">
                   <div className="flex items-center gap-2">
                      {assignee ? (
                        <>
                          <img src={assignee.avatar} alt="" className="w-6 h-6 rounded-full object-cover" />
                          <div className="flex flex-col">
                             <span className="text-slate-700 font-medium leading-none">{assignee.name.split(' ')[0]}</span>
                             <span className="text-[9px] text-slate-400 leading-none mt-0.5">{assignee.department}</span>
                          </div>
                        </>
                      ) : (
                        <span className="text-slate-400 italic">Sem responsável</span>
                      )}
                   </div>
                   <div className="flex items-center gap-1.5 text-slate-500">
                      <Calendar size={14} />
                      <span>{task.dueDate ? new Date(task.dueDate).toLocaleDateString('pt-BR') : '-'}</span>
                   </div>
                </div>

                <div>
                   <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Status Atual</label>
                   <select 
                      value={task.status}
                      onChange={(e) => handleStatusChange(task.id, e.target.value as TaskStatus)}
                      className={`w-full text-sm font-medium p-3 rounded-lg border appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-1 ${statusColors[task.status]}`}
                   >
                      <option value={TaskStatus.TODO}>A Fazer</option>
                      <option value={TaskStatus.IN_PROGRESS}>Em Andamento</option>
                      <option value={TaskStatus.DONE}>Concluído</option>
                   </select>
                </div>
              </div>
            );
          })}
        </div>

        {filteredTasks.length === 0 && (
          <div className="p-12 text-center text-slate-500 bg-slate-50/50">
            <CheckCircle2 size={48} className="mx-auto mb-4 text-slate-300" />
            <p>Nenhuma tarefa encontrada.</p>
          </div>
        )}
      </div>

      {/* CREATE TASK MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
           <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-fade-in">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                 <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                   <CheckCircle2 className="text-indigo-600" /> Nova Tarefa
                 </h3>
                 <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                   <X size={24} />
                 </button>
              </div>
              
              <div className="p-6 space-y-4">
                 <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Título da Tarefa</label>
                    <input 
                      type="text" 
                      value={newTask.title}
                      onChange={(e) => setNewTask({...newTask, title: e.target.value})}
                      className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white text-slate-900"
                      placeholder="Ex: Atualizar Relatório..."
                    />
                 </div>
                 
                 <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Descrição</label>
                    <div className="relative">
                      <textarea 
                        value={newTask.description}
                        onChange={(e) => setNewTask({...newTask, description: e.target.value})}
                        className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 min-h-[100px] bg-white text-slate-900"
                        placeholder="Detalhes da tarefa..."
                      />
                      <AlignLeft className="absolute top-3 right-3 text-slate-300 w-4 h-4 pointer-events-none" />
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div>
                        <div className="flex justify-between items-center mb-1">
                          <label className="block text-sm font-medium text-slate-700">Responsável</label>
                          <button 
                            type="button"
                            onClick={() => setNewTask({...newTask, assigneeId: currentUser?.id})}
                            className="text-xs text-indigo-600 font-medium hover:underline focus:outline-none"
                          >
                            Atribuir a mim
                          </button>
                        </div>
                        <div className="relative">
                          <select 
                             value={newTask.assigneeId}
                             onChange={(e) => setNewTask({...newTask, assigneeId: e.target.value})}
                             className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 appearance-none bg-white text-slate-900"
                          >
                             <option value="">Selecione...</option>
                             {employees.map(emp => (
                               <option key={emp.id} value={emp.id}>{emp.name} ({emp.department})</option>
                             ))}
                          </select>
                          <User className="absolute top-1/2 -translate-y-1/2 right-3 text-slate-400 w-4 h-4 pointer-events-none" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Prazo</label>
                        <div className="relative">
                           <input 
                             type="date"
                             value={newTask.dueDate}
                             onChange={(e) => setNewTask({...newTask, dueDate: e.target.value})}
                             className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white text-slate-900"
                           />
                           <Calendar className="absolute top-1/2 -translate-y-1/2 right-3 text-slate-400 w-4 h-4 pointer-events-none" />
                        </div>
                    </div>
                 </div>
              </div>

              <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                 <button 
                   onClick={() => setIsModalOpen(false)}
                   className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg font-medium"
                   disabled={isSaving}
                 >
                   Cancelar
                 </button>
                 <button 
                   onClick={handleSaveTask}
                   className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 flex items-center gap-2 disabled:opacity-50"
                   disabled={isSaving}
                 >
                   {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                   Salvar Tarefa
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Tasks;
