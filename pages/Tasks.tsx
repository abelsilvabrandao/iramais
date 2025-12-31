
import React, { useState, useEffect } from 'react';
import { fetchTasks, addTask, updateTask, deleteTask, fetchEmployees } from '../services/firebaseService';
import { Task, TaskStatus, Employee } from '../types';
import { CheckCircle2, Clock, Plus, Calendar, X, User, AlignLeft, Save, Trash2, Loader2, AlertCircle, Building2, UserCircle, Edit3, ArrowRight, AlertTriangle, CheckSquare, Lock, PenTool, ExternalLink } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const Tasks: React.FC = () => {
  const { currentUser, isMaster } = useAuth();
  const navigate = useNavigate();
  
  const [tasks, setTasks] = useState<Task[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<TaskStatus | 'ALL'>('ALL');
  
  // -- STATES FOR MODAL HANDLING --
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'view' | 'edit'>('create');
  const [isSaving, setIsSaving] = useState(false);
  
  // State for Delete Confirmation Modal
  const [taskToDelete, setTaskToDelete] = useState<Partial<Task> | null>(null);
  
  // Data for the modal (used for Create, View, and Edit)
  const [currentTaskData, setCurrentTaskData] = useState<Partial<Task>>({
    title: '',
    description: '',
    assigneeId: '',
    dueDate: '',
    status: TaskStatus.TODO
  });

  useEffect(() => {
    if (currentUser) {
      loadData();
    }
  }, [currentUser]);

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
  const getCreator = (id?: string) => employees.find(e => e.id === id);
  const getCompleter = (id?: string | null) => employees.find(e => e.id === id);

  // Helper para identificar tarefas de assinatura
  // Fix: Converted to boolean to prevent "string | boolean" type error on disabled attributes
  const isSignatureTask = (task: Partial<Task>) => {
    return !!(task.signatureRequestId || task.title?.startsWith('Assinatura:') || (task.creatorDepartment === 'TI' && task.title?.includes('Assinatura')));
  };

  // --- ACTIONS ---

  const openCreateModal = () => {
    setModalMode('create');
    setCurrentTaskData({
      title: '',
      description: '',
      assigneeId: '',
      dueDate: '',
      status: TaskStatus.TODO
    });
    setIsModalOpen(true);
  };

  const openViewModal = (task: Task) => {
    setModalMode('view');
    setCurrentTaskData({ ...task });
    setIsModalOpen(true);
  };

  const switchToEditMode = () => {
    setModalMode('edit');
  };

  const handleStatusChange = async (taskId: string, newStatus: TaskStatus, e?: React.MouseEvent) => {
    if (e) e.stopPropagation(); 
    
    const task = tasks.find(t => t.id === taskId);
    if (task && isSignatureTask(task) && newStatus === TaskStatus.DONE) {
        alert("Tarefas de assinatura devem ser processadas e finalizadas através do menu de Assinaturas no Painel Admin para garantir a geração da imagem.");
        return;
    }

    // Calculate updates regarding completion
    const updates: Partial<Task> = { status: newStatus };
    
    if (newStatus === TaskStatus.DONE) {
        updates.completedAt = new Date().toISOString();
        updates.completedBy = currentUser?.id;
    } else {
        updates.completedAt = null;
        updates.completedBy = null;
    }

    // Optimistic update
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...updates } : t));
    
    if (isModalOpen && currentTaskData.id === taskId) {
        setCurrentTaskData(prev => ({...prev, ...updates}));
    }

    try {
      await updateTask(taskId, updates);
    } catch (error) {
      console.error("Erro ao atualizar status", error);
      loadData(); 
    }
  };

  const handleSave = async () => {
    if (!currentTaskData.title || !currentTaskData.dueDate) {
      alert("Por favor, preencha o título e a data.");
      return;
    }
    if (!currentUser) return;

    setIsSaving(true);
    try {
      if (modalMode === 'create') {
        await addTask({
          title: currentTaskData.title,
          description: currentTaskData.description || '',
          assigneeId: currentTaskData.assigneeId || '',
          dueDate: currentTaskData.dueDate,
          status: TaskStatus.TODO,
          creatorId: currentUser.id,
          creatorDepartment: currentUser.department
        });
      } else if (modalMode === 'edit' && currentTaskData.id) {
        await updateTask(currentTaskData.id, {
          title: currentTaskData.title,
          description: currentTaskData.description,
          assigneeId: currentTaskData.assigneeId,
          dueDate: currentTaskData.dueDate,
        });
      }
      
      await loadData();
      setIsModalOpen(false);
    } catch (error) {
      alert("Erro ao salvar tarefa. Verifique sua conexão.");
    } finally {
      setIsSaving(false);
    }
  };

  const requestDelete = () => {
    if (!currentTaskData.id) return;
    const isCreator = currentTaskData.creatorId === currentUser?.id;
    if (isMaster || isCreator) {
        setTaskToDelete(currentTaskData);
    } else {
        alert("Você não tem permissão para excluir esta tarefa.");
    }
  };

  const confirmDelete = async () => {
    if (!taskToDelete?.id) return;
    setIsSaving(true);
    try {
      await deleteTask(taskToDelete.id);
      setTasks(prev => prev.filter(t => t.id !== taskToDelete.id));
      setTaskToDelete(null);
      setIsModalOpen(false);
    } catch (error) {
      alert("Erro ao excluir tarefa");
    } finally {
      setIsSaving(false);
    }
  };

  const statusColors = {
    [TaskStatus.TODO]: 'bg-slate-100 text-slate-600 border-slate-200',
    [TaskStatus.IN_PROGRESS]: 'bg-amber-100 text-amber-700 border-amber-200',
    [TaskStatus.DONE]: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  };

  const visibleTasks = tasks.filter(t => {
      if (!currentUser) return false;
      const isCreator = t.creatorId === currentUser.id;
      const isAssignee = t.assigneeId === currentUser.id;
      const isSameDept = t.creatorDepartment === currentUser.department;
      return isCreator || isAssignee || isSameDept || isMaster;
  });

  const filteredTasks = visibleTasks.filter(t => filter === 'ALL' || t.status === filter);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-emerald-600" size={48} />
      </div>
    );
  }

  return (
    <div className="space-y-6 relative">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Gestão de Tarefas</h2>
          <p className="text-slate-500 text-sm">Organize demandas pessoais e do seu departamento.</p>
        </div>
        <button 
          onClick={openCreateModal}
          className="bg-emerald-600 text-white px-4 py-3 md:py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-200 w-full md:w-auto font-medium"
        >
          <Plus size={18} /> <span className="md:inline">Nova Tarefa</span>
        </button>
      </div>

      <div className="flex gap-2 border-b border-slate-200 pb-1 overflow-x-auto custom-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
        {(['ALL', TaskStatus.TODO, TaskStatus.IN_PROGRESS, TaskStatus.DONE] as const).map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`whitespace-nowrap px-4 py-2 text-sm font-medium rounded-t-lg transition-colors flex-shrink-0 ${
              filter === status 
              ? 'text-emerald-600 border-b-2 border-emerald-600 bg-emerald-50/50' 
              : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {status === 'ALL' ? 'Todas' : (status === 'TODO' ? 'A Fazer' : (status === 'IN_PROGRESS' ? 'Em Andamento' : 'Concluído'))}
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
                <th className="px-6 py-4">Origem</th>
                <th className="px-6 py-4">Responsável</th>
                <th className="px-6 py-4">Prazo</th>
                <th className="px-6 py-4 text-right">Status / Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTasks.map(task => {
                const assignee = getAssignee(task.assigneeId);
                const isCreator = task.creatorId === currentUser?.id;
                const creator = getCreator(task.creatorId);
                const isSig = isSignatureTask(task);
                const completer = getCompleter(task.completedBy);
                // Bloqueia se estiver pronta OU se for de assinatura (pois assinatura só muda via AdminSignatures)
                const isLocked = (task.status === TaskStatus.DONE && !isCreator && !isMaster) || isSig;

                return (
                  <tr 
                    key={task.id} 
                    onClick={() => openViewModal(task)}
                    className="hover:bg-slate-50 transition-colors cursor-pointer group"
                  >
                    <td className="px-6 py-4">
                      <p className="font-semibold text-slate-800 group-hover:text-emerald-600 transition-colors">{task.title}</p>
                      <p className="text-xs text-slate-500 truncate max-w-xs">{task.description}</p>
                    </td>
                    <td className="px-6 py-4">
                        {isCreator ? (
                            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 flex items-center gap-1 w-fit">
                                <UserCircle size={10} /> Eu
                            </span>
                        ) : creator ? (
                            <div className="flex items-center gap-2">
                               <img src={creator.avatar} alt="" className="w-6 h-6 rounded-full object-cover border border-slate-100" />
                               <div className="flex flex-col">
                                  <span className="text-xs font-bold text-slate-700 leading-none">{creator.name.split(' ')[0]}</span>
                                  <span className="text-[9px] text-slate-400 leading-none mt-0.5">{creator.department}</span>
                               </div>
                            </div>
                        ) : (
                            <span className="text-xs text-slate-400 italic">Desconhecido</span>
                        )}
                    </td>
                    <td className="px-6 py-4">
                      {assignee ? (
                        <div className="flex items-center gap-2">
                          <img src={assignee.avatar} alt={assignee.name} className="w-6 h-6 rounded-full object-cover" />
                          <p className="text-sm text-slate-700 leading-none">{assignee.name.split(' ')[0]}</p>
                        </div>
                      ) : (
                        <span className="text-sm text-slate-400 italic">Não atribuído</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-sm text-slate-600">
                        <Calendar size={14} />
                        {task.dueDate ? new Date(task.dueDate).toLocaleDateString('pt-BR') : '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex flex-col items-end gap-1">
                        {/* REGRA: Se for assinatura e NÃO estiver concluída, mostra botão. */}
                        {isSig && task.status !== TaskStatus.DONE ? (
                            <button 
                                onClick={(e) => { e.stopPropagation(); navigate('/admin-signatures'); }}
                                className="bg-emerald-600 text-white px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 hover:bg-emerald-700 transition-colors shadow-sm"
                            >
                                <PenTool size={12}/> Processar Agora
                            </button>
                        ) : (
                            <div className="relative inline-block">
                                <select 
                                    value={task.status}
                                    disabled={isLocked}
                                    onClick={(e) => e.stopPropagation()} 
                                    onChange={(e) => handleStatusChange(task.id, e.target.value as TaskStatus, e as any)}
                                    className={`text-xs font-bold px-3 py-1 rounded-full border appearance-none focus:outline-none focus:ring-2 focus:ring-offset-1 ${statusColors[task.status]} ${isLocked ? 'opacity-60 cursor-not-allowed pr-6' : 'cursor-pointer'}`}
                                >
                                    <option value={TaskStatus.TODO}>A Fazer</option>
                                    <option value={TaskStatus.IN_PROGRESS}>Em Andamento</option>
                                    <option value={TaskStatus.DONE}>Concluído</option>
                                </select>
                                {isLocked && <Lock size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />}
                            </div>
                        )}
                        {task.status === TaskStatus.DONE && (
                            <span className="text-[10px] text-emerald-600 flex items-center gap-1">
                                <CheckSquare size={10} /> {completer ? `Por: ${completer.name.split(' ')[0]}` : 'Concluído'}
                            </span>
                        )}
                      </div>
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
            const isCreator = task.creatorId === currentUser?.id;
            const creator = getCreator(task.creatorId);
            const completer = getCompleter(task.completedBy);
            const isSig = isSignatureTask(task);
            const isLocked = (task.status === TaskStatus.DONE && !isCreator && !isMaster) || isSig;

            return (
              <div key={task.id} onClick={() => openViewModal(task)} className="p-5 flex flex-col gap-4 cursor-pointer active:bg-slate-50">
                <div>
                   <div className="flex justify-between items-start mb-1 relative">
                      <div className="w-full">
                        <div className="flex items-center justify-between mb-2">
                            {isCreator ? (
                                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 flex items-center gap-1 w-fit">
                                    <UserCircle size={10} /> Minha Tarefa
                                </span>
                            ) : creator ? (
                                <div className="flex items-center gap-1.5 bg-slate-50 rounded-full pr-2 py-0.5 pl-0.5 border border-slate-100">
                                   <img src={creator.avatar} className="w-5 h-5 rounded-full object-cover"/>
                                   <span className="text-[10px] font-bold text-slate-600">De: {creator.name.split(' ')[0]}</span>
                                </div>
                            ) : null}
                        </div>
                        <h3 className="font-bold text-slate-800 text-lg">{task.title}</h3>
                      </div>
                   </div>
                   <p className="text-sm text-slate-500 leading-relaxed line-clamp-2">{task.description}</p>
                </div>

                <div className="flex flex-col gap-3 mt-2">
                   <div className="flex items-center justify-between">
                       <div className="flex items-center gap-2">
                          {assignee ? (
                            <>
                              <img src={assignee.avatar} alt="" className="w-6 h-6 rounded-full object-cover border border-white shadow-sm" />
                              <span className="text-xs text-slate-600">{assignee.name.split(' ')[0]}</span>
                            </>
                          ) : (
                            <span className="text-slate-400 italic text-xs">Sem responsável</span>
                          )}
                       </div>
                       
                       {/* REGRA MOBILE */}
                       {isSig && task.status !== TaskStatus.DONE ? (
                           <button 
                                onClick={(e) => { e.stopPropagation(); navigate('/admin-signatures'); }}
                                className="bg-emerald-600 text-white px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-md"
                            >
                                <PenTool size={12}/> Processar Agora
                            </button>
                       ) : (
                            <div className={`text-xs font-bold px-3 py-1 rounded-full border flex items-center gap-1 ${statusColors[task.status]} ${isLocked ? 'opacity-70' : ''}`}>
                                {task.status === 'TODO' ? 'A Fazer' : (task.status === 'IN_PROGRESS' ? 'Em Andamento' : 'Concluído')}
                                {isLocked && <Lock size={10} />}
                            </div>
                       )}
                   </div>
                   
                   {task.status === TaskStatus.DONE && (
                       <div className="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-1 rounded self-end flex items-center gap-1 border border-emerald-100">
                           <CheckSquare size={10} /> {completer ? `Concluído por: ${completer.name.split(' ')[0]}` : 'Concluído'}
                       </div>
                   )}
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

      {/* --- TASK MODAL --- */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-fade-in">
           <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
                 <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                   {modalMode === 'create' && <><Plus className="text-emerald-600" /> Nova Tarefa</>}
                   {modalMode === 'view' && <><CheckCircle2 className="text-emerald-600" /> Detalhes da Tarefa</>}
                   {modalMode === 'edit' && <><Edit3 className="text-emerald-600" /> Editar Tarefa</>}
                 </h3>
                 <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-200 rounded-full transition-colors"><X size={24} /></button>
              </div>
              
              <div className="p-6 space-y-5 overflow-y-auto custom-scrollbar flex-1">
                 {modalMode === 'view' && (
                    <div className="space-y-6">
                        <div>
                           <div className="flex justify-between items-start">
                              <h2 className="text-2xl font-bold text-slate-900 leading-tight">{currentTaskData.title}</h2>
                              <div className="shrink-0 ml-4 relative">
                                {(() => {
                                    const isSig = isSignatureTask(currentTaskData);
                                    const isLocked = (currentTaskData.status === TaskStatus.DONE && currentTaskData.creatorId !== currentUser?.id && !isMaster) || isSig;
                                    
                                    // REGRA MODAL
                                    if (isSig && currentTaskData.status !== TaskStatus.DONE) {
                                        return (
                                            <button 
                                                onClick={() => navigate('/admin-signatures')}
                                                className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 hover:bg-emerald-700 transition-all shadow-md active:scale-95"
                                            >
                                                <PenTool size={14}/> Processar Agora
                                            </button>
                                        );
                                    }

                                    return (
                                        <>
                                            <select 
                                                value={currentTaskData.status}
                                                disabled={isLocked}
                                                onChange={(e) => handleStatusChange(currentTaskData.id!, e.target.value as TaskStatus)}
                                                className={`text-xs font-bold px-3 py-1.5 rounded-full border appearance-none focus:outline-none focus:ring-2 focus:ring-offset-1 ${statusColors[currentTaskData.status || TaskStatus.TODO]} ${isLocked ? 'opacity-60 cursor-not-allowed pr-6' : 'cursor-pointer'}`}
                                            >
                                                <option value={TaskStatus.TODO}>A Fazer</option>
                                                <option value={TaskStatus.IN_PROGRESS}>Em Andamento</option>
                                                <option value={TaskStatus.DONE}>Concluído</option>
                                            </select>
                                            {isLocked && <Lock size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"/>}
                                        </>
                                    );
                                })()}
                              </div>
                           </div>
                           <div className="mt-2 flex items-center gap-2 text-sm text-slate-500">
                              <span className="flex items-center gap-1"><Calendar size={14}/> Prazo: {currentTaskData.dueDate ? new Date(currentTaskData.dueDate).toLocaleDateString('pt-BR') : 'Sem prazo'}</span>
                           </div>
                        </div>

                        {currentTaskData.status === TaskStatus.DONE && currentTaskData.completedAt && (
                            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 flex items-center gap-3">
                                <div className="bg-emerald-100 p-2 rounded-full text-emerald-600"><CheckSquare size={20} /></div>
                                <div className="flex-1">
                                    <p className="text-xs font-bold text-emerald-800 uppercase">Tarefa Concluída</p>
                                    <p className="text-xs text-emerald-700">Em: <strong>{new Date(currentTaskData.completedAt).toLocaleString('pt-BR')}</strong></p>
                                    {currentTaskData.completedBy && (() => {
                                        const completer = getCompleter(currentTaskData.completedBy);
                                        return completer ? (
                                            <p className="text-xs text-emerald-700 mt-0.5 flex items-center gap-1">Por: <img src={completer.avatar} className="w-4 h-4 rounded-full inline-block"/> <strong>{completer.name}</strong></p>
                                        ) : null;
                                    })()}
                                </div>
                            </div>
                        )}

                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                           <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Descrição</h4>
                           <p className="text-slate-700 whitespace-pre-wrap leading-relaxed text-sm">{currentTaskData.description || <span className="italic text-slate-400">Sem descrição.</span>}</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                           <div className="border border-slate-100 rounded-xl p-3">
                              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Responsável</span>
                              {(() => {
                                 const assignee = getAssignee(currentTaskData.assigneeId || '');
                                 return assignee ? (
                                    <div className="flex items-center gap-2">
                                       <img src={assignee.avatar} className="w-8 h-8 rounded-full object-cover"/>
                                       <div><p className="text-sm font-bold text-slate-700 leading-none">{assignee.name}</p><p className="text-[10px] text-slate-500">{assignee.department}</p></div>
                                    </div>
                                 ) : <span className="text-sm text-slate-400 italic">Não atribuído</span>
                              })()}
                           </div>
                           <div className="border border-slate-100 rounded-xl p-3">
                              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Criado por</span>
                              {(() => {
                                 const creator = getCreator(currentTaskData.creatorId);
                                 return creator ? (
                                    <div className="flex items-center gap-2">
                                       <img src={creator.avatar} className="w-8 h-8 rounded-full object-cover"/>
                                       <div><p className="text-sm font-bold text-slate-700 leading-none">{creator.name}</p><p className="text-[10px] text-slate-500">{creator.department}</p></div>
                                    </div>
                                 ) : <span className="text-sm text-slate-400 italic">Sistema</span>
                              })()}
                           </div>
                        </div>
                    </div>
                 )}

                 {(modalMode === 'create' || modalMode === 'edit') && (
                    <>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Título da Tarefa</label>
                            <input type="text" value={currentTaskData.title} onChange={(e) => setCurrentTaskData({...currentTaskData, title: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white text-slate-900" placeholder="Ex: Atualizar Relatório..." autoFocus />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Descrição</label>
                            <div className="relative">
                            <textarea value={currentTaskData.description} onChange={(e) => setCurrentTaskData({...currentTaskData, description: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 min-h-[120px] bg-white text-slate-900" placeholder="Detalhes da tarefa..." />
                            <AlignLeft className="absolute top-3 right-3 text-slate-300 w-4 h-4 pointer-events-none" />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <div className="flex justify-between items-center mb-1">
                                <label className="block text-sm font-medium text-slate-700">Responsável</label>
                                <button type="button" onClick={() => setCurrentTaskData({...currentTaskData, assigneeId: currentUser?.id})} className="text-xs text-emerald-600 font-medium hover:underline focus:outline-none">Atribuir a mim</button>
                                </div>
                                <div className="relative">
                                <select value={currentTaskData.assigneeId} onChange={(e) => setCurrentTaskData({...currentTaskData, assigneeId: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 appearance-none bg-white text-slate-900">
                                    <option value="">Selecione...</option>
                                    {employees.map(emp => (<option key={emp.id} value={emp.id}>{emp.name} ({emp.department})</option>))}
                                </select>
                                <User className="absolute top-1/2 -translate-y-1/2 right-3 text-slate-400 w-4 h-4 pointer-events-none" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Prazo</label>
                                <div className="relative">
                                <input type="date" value={currentTaskData.dueDate} onChange={(e) => setCurrentTaskData({...currentTaskData, dueDate: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white text-slate-900" />
                                <Calendar className="absolute top-1/2 -translate-y-1/2 right-3 text-slate-400 w-4 h-4 pointer-events-none" />
                                </div>
                            </div>
                        </div>
                    </>
                 )}
              </div>

              <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 shrink-0">
                 {modalMode === 'view' && (
                    <>
                       {(currentTaskData.creatorId === currentUser?.id || isMaster) && (
                          <button 
                              type="button"
                              onClick={requestDelete}
                              disabled={isSaving}
                              className="px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 mr-auto transition-colors text-red-600 hover:bg-red-50"
                              title="Excluir tarefa permanentemente"
                          >
                              <Trash2 size={16} /> Excluir
                          </button>
                       )}
                       
                       {currentTaskData.creatorId === currentUser?.id && !isSignatureTask(currentTaskData) && (
                          <button onClick={switchToEditMode} className="px-4 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg font-medium text-sm flex items-center gap-2 shadow-sm"><Edit3 size={16} /> Editar</button>
                       )}
                       
                       <button onClick={() => setIsModalOpen(false)} className="px-6 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors text-sm shadow-md shadow-emerald-200">Fechar</button>
                    </>
                 )}
                 {(modalMode === 'create' || modalMode === 'edit') && (
                    <>
                        <button onClick={() => { if(modalMode === 'edit') setModalMode('view'); else setIsModalOpen(false); }} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg font-medium text-sm" disabled={isSaving}>Cancelar</button>
                        <button onClick={handleSave} className="px-6 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 flex items-center gap-2 disabled:opacity-50 text-sm shadow-md shadow-emerald-200" disabled={isSaving}>{isSaving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}{modalMode === 'create' ? 'Criar Tarefa' : 'Salvar Alterações'}</button>
                    </>
                 )}
              </div>
           </div>
        </div>
      )}

      {/* CONFIRMATION DELETE MODAL */}
      {taskToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 z-[80] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
           <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden border-2 border-red-100">
              <div className="p-6 text-center">
                 <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500"><AlertTriangle size={28} /></div>
                 <h3 className="text-lg font-bold text-slate-800 mb-2">Excluir Tarefa?</h3>
                 <p className="text-sm text-slate-500 mb-6">Tem certeza que deseja excluir <strong>"{taskToDelete.title}"</strong>?<br/>Esta ação não pode ser desfeita.</p>
                 <div className="flex gap-3">
                   <button type="button" onClick={() => setTaskToDelete(null)} className="flex-1 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl font-bold text-sm transition-colors" disabled={isSaving}>Cancelar</button>
                   <button type="button" onClick={confirmDelete} className="flex-1 py-2.5 bg-red-600 text-white rounded-xl font-bold text-sm hover:bg-red-700 transition-colors flex items-center justify-center gap-2" disabled={isSaving}>{isSaving ? <Loader2 size={16} className="animate-spin" /> : 'Sim, excluir'}</button>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Tasks;
