
import React, { useState, useEffect, useMemo } from 'react';
import { 
  subscribeTermTemplates, addTermTemplate, updateTermTemplate, removeTermTemplate,
  subscribeTerms, addTerm, removeTerm, fetchEmployees, fetchUnits, fetchEquipments, fetchDepartments,
  updateGlobalSettings
} from '../services/firebaseService';
import { TermTemplate, Term, Employee, TermType, OrganizationUnit, TableField, CustomVariable, VariableMapping, OrganizationDepartment, DeptTermsPermission } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { 
  Plus, FileText, Settings, ClipboardList, Loader2, Search, Trash2, Edit2, Save, X, 
  CheckCircle2, Printer, Send, Eye, FileUp, Package, ArrowLeftRight, Type, Info, Copy, ListTree, Sparkles, Variable, RotateCcw, ShieldCheck, Calendar, AlertCircle, AlertTriangle, CornerDownRight, Clock,
  CheckSquare, CheckSquare as CheckSquareIcon, Square, Building2, Shield, Lock, Unlock, Check, ToggleLeft, ToggleRight, Globe, Award, Camera, Image as ImageIcon
} from 'lucide-react';
import Logo from '../components/Logo';

const SUGGESTED_DEFAULTS: CustomVariable[] = [
  { label: 'Título do Termo', key: 'titulo_documento', mapping: 'doc_title', type: 'text' },
  { label: 'Nome do Colaborador', key: 'nome_colaborador', mapping: 'emp_name', type: 'text' },
  { label: 'Departamento/Setor', key: 'departamento', mapping: 'emp_dept', type: 'text' },
  { label: 'Cargo do Colaborador', key: 'cargo', mapping: 'emp_role', type: 'text' },
  { label: 'Unidade de Trabalho', key: 'unidade', mapping: 'emp_unit', type: 'text' },
  { label: 'Data (DD/MM/AAAA)', key: 'data_documento', mapping: 'doc_date', type: 'text' },
  { label: 'Data por Extenso', key: 'dia_mesescrito_ano', mapping: 'doc_date_full', type: 'text' },
];

const extractPlainTextFromRTF = (rtf: string) => {
    if (!rtf) return "";
    let text = rtf.replace(/\\pict[\s\S]*?\}|\\bin[0-9 ]+.*?\}/g, ' '); 
    text = text.replace(/\{\\\*\\generated.*?\}|\\blipuid[\s\S]*?\}/g, ' ');
    text = text.replace(/\\([a-z]{1,32})(-?\d+)? ?/g, (match, cmd) => {
        if (cmd === 'par' || cmd === 'line') return '\n';
        if (cmd === 'tab') return '\t';
        return '';
    }); 
    text = text.replace(/[\{\}]/g, ''); 
    return text.trim().replace(/[ ]{2,}/g, ' ');
};

const AdminTerms: React.FC = () => {
  const { currentUser, isMaster, isAdmin: isGlobalAdmin, globalSettings } = useAuth();
  const [activeTab, setActiveTab] = useState<'issued' | 'templates' | 'new' | 'permissions'>('issued');
  const [templates, setTemplates] = useState<TermTemplate[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [equipments, setEquipments] = useState<any[]>([]);
  const [units, setUnits] = useState<OrganizationUnit[]>([]);
  const [depts, setDepts] = useState<OrganizationDepartment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [viewingTerm, setViewingTerm] = useState<Term | null>(null);
  const [viewingTemplatePreview, setViewingTemplatePreview] = useState<TermTemplate | null>(null);
  const [processedContent, setProcessedContent] = useState('');
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<TermTemplate | null>(null);

  const [termToDelete, setTermToDelete] = useState<Term | null>(null);
  const [templateToDelete, setTemplateToDelete] = useState<TermTemplate | null>(null);
  
  const [templateForm, setTemplateForm] = useState<Omit<TermTemplate, 'id' | 'createdAt' | 'active'>>({
      name: '',
      title: '',
      type: 'entrega',
      responsibleDepartment: currentUser?.department || 'TI',
      content: '',
      tableFields: [],
      customVariables: [...SUGGESTED_DEFAULTS],
      certificationImages: []
  });

  const [issueForm, setIssueForm] = useState<{
    templateId: string;
    employeeId: string;
    dataDoc: string;
    originalTermId?: string;
    dynamicData: Record<string, string>;
  }>({
    templateId: '',
    employeeId: '',
    dataDoc: new Date().toISOString().split('T')[0],
    dynamicData: {}
  });

  // Cálculo de permissões locais
  const myPerms = useMemo(() => {
    if (isMaster || isGlobalAdmin) return { enabled: true, canCreateTemplates: true, canIssueTerms: true, canDelete: true, canReturn: true, canSeeAllSectors: true };
    return globalSettings?.termsDeptPermissions?.[currentUser?.department || ''] || { enabled: false, canCreateTemplates: false, canIssueTerms: false, canDelete: false, canReturn: false, canSeeAllSectors: false };
  }, [globalSettings, currentUser, isMaster, isGlobalAdmin]);

  useEffect(() => {
    setIsLoading(true);
    const unsubTemplates = subscribeTermTemplates(setTemplates);
    const unsubTerms = subscribeTerms(setTerms);
    fetchEmployees().then(setEmployees);
    fetchUnits().then(setUnits);
    fetchEquipments().then(setEquipments);
    fetchDepartments().then(setDepts);
    setIsLoading(false);
    return () => { unsubTemplates(); unsubTerms(); };
  }, []);

  const filteredTemplates = useMemo(() => {
    if (isMaster || isGlobalAdmin || myPerms.canSeeAllSectors) return templates;
    return templates.filter(t => t.responsibleDepartment === currentUser?.department);
  }, [templates, isMaster, isGlobalAdmin, myPerms.canSeeAllSectors, currentUser]);

  const filteredTermsList = useMemo(() => {
    const templateIds = new Set(filteredTemplates.map(t => t.id));
    const list = (isMaster || isGlobalAdmin || myPerms.canSeeAllSectors) ? terms : terms.filter(t => templateIds.has(t.templateId));
    return list.filter(t => t.employeeName.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [terms, filteredTemplates, isMaster, isGlobalAdmin, myPerms.canSeeAllSectors, searchTerm]);

  const returnStatusMap = useMemo(() => {
    const map = new Map<string, { status: 'PENDENTE' | 'ASSINADO', id: string }>();
    filteredTermsList.forEach(t => {
      if (t.originalTermId && t.type === 'devolucao') {
        map.set(t.originalTermId, { status: t.status, id: t.id });
      }
    });
    return map;
  }, [filteredTermsList]);

  const sortedAndGroupedTerms = useMemo(() => {
      const termMap = new Map(terms.map(t => [t.id, t]));
      return [...filteredTermsList].sort((a, b) => {
          const rootAId = a.originalTermId || a.id;
          const rootBId = b.originalTermId || b.id;
          if (rootAId === rootBId) return a.type === 'devolucao' ? 1 : -1;
          const rootA = termMap.get(rootAId) || a;
          const rootB = termMap.get(rootBId) || b;
          return new Date(rootB.createdAt).getTime() - new Date(rootA.createdAt).getTime();
      });
  }, [filteredTermsList, terms]);

  const handleImportRTF = async (file: File) => {
    setIsProcessing(true);
    try {
        const text = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target?.result as string);
            reader.onerror = reject;
            reader.readAsText(file, 'windows-1252');
        });
        const plainText = extractPlainTextFromRTF(text);
        setTemplateForm(prev => ({ ...prev, content: plainText }));
    } catch (e) { alert("Erro ao ler arquivo RTF."); } finally { setIsProcessing(false); }
  };

  const calculateAutoValues = (templateId: string, employeeId: string, date: string, currentData: Record<string, string>) => {
    const template = templates.find(t => t.id === templateId);
    const emp = employees.find(e => e.id === employeeId);
    if (!template) return currentData;
    const newData = { ...currentData };
    template.customVariables.forEach(v => {
      if (v.mapping && v.mapping !== 'none' && emp) {
        switch(v.mapping) {
          case 'doc_title': newData[v.key] = template.title; break;
          case 'emp_name': newData[v.key] = emp.name; break;
          case 'emp_dept': newData[v.key] = emp.department; break;
          case 'emp_role': newData[v.key] = emp.role; break;
          case 'emp_unit': newData[v.key] = emp.unit || 'MATRIZ'; break;
          case 'doc_date': newData[v.key] = new Date(date).toLocaleDateString('pt-BR'); break;
          case 'doc_date_full': newData[v.key] = new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }); break;
        }
      } else if (!newData[v.key]) { newData[v.key] = ''; }
    });
    return newData;
  };

  const handleTemplateChange = (templateId: string) => {
    const newData = calculateAutoValues(templateId, issueForm.employeeId, issueForm.dataDoc, {});
    setIssueForm(prev => ({ ...prev, templateId, dynamicData: newData }));
  };

  const handleEmployeeChange = (employeeId: string) => {
    const newData = calculateAutoValues(issueForm.templateId, employeeId, issueForm.dataDoc, issueForm.dynamicData);
    setIssueForm(prev => ({ ...prev, employeeId, dynamicData: newData }));
  };

  const handleDateChange = (date: string) => {
    const newData = calculateAutoValues(issueForm.templateId, issueForm.employeeId, date, issueForm.dynamicData);
    setIssueForm(prev => ({ ...prev, dataDoc: date, dynamicData: newData }));
  };

  const handleUpdateDynamicField = (key: string, value: string) => {
      setIssueForm(prev => ({ ...prev, dynamicData: { ...prev.dynamicData, [key]: value } }));
  };

  const handleIssueTerm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!issueForm.templateId || !issueForm.employeeId) return alert("Selecione modelo e colaborador.");
    setIsProcessing(true);
    try {
        const emp = employees.find(e => e.id === issueForm.employeeId);
        const template = templates.find(t => t.id === issueForm.templateId);
        if (!emp || !template) throw new Error();
        const nameVar = template.customVariables.find(v => v.mapping === 'emp_name');
        const finalEmployeeName = nameVar ? (issueForm.dynamicData[nameVar.key] || emp.name) : emp.name;
        
        await addTerm({ 
          templateId: template.id, 
          employeeId: emp.id, 
          employeeName: finalEmployeeName, 
          type: template.type, 
          data: issueForm.dynamicData, 
          originalTermId: issueForm.originalTermId || '',
          issuerName: currentUser?.name || 'Administrador'
        });
        
        alert("Termo emitido com sucesso!");
        setIssueForm({ templateId: '', employeeId: '', dataDoc: new Date().toISOString().split('T')[0], dynamicData: {} });
        setActiveTab('issued');
    } catch (e) { alert("Erro ao emitir termo."); } finally { setIsProcessing(false); }
  };

  const handleSaveTemplate = async () => {
    if (!templateForm.name || !templateForm.content) return alert("Preencha o nome e o conteúdo do termo.");
    setIsProcessing(true);
    try {
        if (editingTemplate) { await updateTermTemplate(editingTemplate.id, { ...templateForm }); }
        else { await addTermTemplate({ ...templateForm, active: true, createdAt: new Date().toISOString() }); }
        setIsTemplateModalOpen(false);
    } catch (e) { alert("Erro ao salvar modelo."); } finally { setIsProcessing(false); }
  };

  const updateDeptPermission = async (deptName: string, key: keyof DeptTermsPermission, val: boolean) => {
    if (!isMaster || !globalSettings) return;
    setIsProcessing(true);
    try {
      const perms = globalSettings.termsDeptPermissions || {};
      const currentDeptPerm = perms[deptName] || { enabled: false, canCreateTemplates: false, canIssueTerms: false, canDelete: false, canReturn: false, canSeeAllSectors: false };
      
      const newPerms = {
        ...perms,
        [deptName]: { ...currentDeptPerm, [key]: val }
      };
      await updateGlobalSettings({ termsDeptPermissions: newPerms });
    } catch (e) { alert("Erro ao atualizar permissão."); } finally { setIsProcessing(false); }
  };

  const addCustomVariable = () => setTemplateForm(prev => ({ ...prev, customVariables: [...(prev.customVariables || []), { key: '', label: '', mapping: 'none', type: 'text' }] }));
  const removeCustomVariable = (index: number) => setTemplateForm(prev => ({ ...prev, customVariables: (prev.customVariables || []).filter((_, i) => i !== index) }));
  const updateCustomVariable = (index: number, updates: Partial<CustomVariable>) => setTemplateForm(prev => {
      const n = [...(prev.customVariables || [])];
      if (updates.key) updates.key = updates.key.toLowerCase().replace(/[^a-z0-9_]/g, '');
      n[index] = { ...n[index], ...updates };
      return { ...prev, customVariables: n };
  });

  const addTableField = () => setTemplateForm(prev => ({ ...prev, tableFields: [...(prev.tableFields || []), { label: '', variable: '' }] }));
  const removeTableField = (index: number) => setTemplateForm(prev => ({ ...prev, tableFields: (prev.tableFields || []).filter((_, i) => i !== index) }));
  const updateTableField = (index: number, updates: Partial<TableField>) => setTemplateForm(prev => {
      const n = [...(prev.tableFields || [])];
      n[index] = { ...n[index], ...updates };
      return { ...prev, tableFields: n };
  });

  const handleCertUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const MAX_SIZE = 400; 
          if (width > height) { if (width > MAX_SIZE) { height *= MAX_SIZE / width; width = MAX_SIZE; } } 
          else { if (height > MAX_SIZE) { width *= MAX_SIZE / height; height = MAX_SIZE; } }
          canvas.width = width; canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          const compressedBase64 = canvas.toDataURL('image/png', 0.8);
          setTemplateForm(prev => ({ ...prev, certificationImages: [...(prev.certificationImages || []), compressedBase64] }));
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const removeCertImage = (index: number) => {
    setTemplateForm(prev => ({ ...prev, certificationImages: (prev.certificationImages || []).filter((_, i) => i !== index) }));
  };

  const handleViewTemplate = (template: TermTemplate) => {
    let content = template.content;
    const dummyData: Record<string, string> = {};
    
    template.customVariables.forEach(v => {
      dummyData[v.key] = `[${v.label.toUpperCase()}]`;
      const regex = new RegExp(`{{${v.key}}}`, 'g');
      content = content.replace(regex, dummyData[v.key]);
    });

    setProcessedContent(content);
    setViewingTemplatePreview(template);
  };

  const confirmDeleteTerm = async () => {
    if (!termToDelete) return;
    setIsProcessing(true);
    try { await removeTerm(termToDelete.id); setTermToDelete(null); } 
    catch (error) { alert("Erro ao excluir documento."); } finally { setIsProcessing(false); }
  };

  const confirmDeleteTemplate = async () => {
    if (!templateToDelete) return;
    setIsProcessing(true);
    try { await removeTermTemplate(templateToDelete.id); setTemplateToDelete(null); } 
    catch (error) { alert("Erro ao excluir modelo."); } finally { setIsProcessing(false); }
  };

  const handlePrepareReturn = (term: Term) => {
    const returnTemplate = filteredTemplates.find(t => t.type === 'devolucao');
    setIssueForm({ templateId: returnTemplate ? returnTemplate.id : '', employeeId: term.employeeId, originalTermId: term.id, dataDoc: new Date().toISOString().split('T')[0], dynamicData: { ...term.data } });
    setActiveTab('new');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><ClipboardList className="text-emerald-600" /> Gestão de Termos</h2>
          <p className="text-slate-500 text-sm">Setor: <span className="font-bold text-emerald-600 uppercase">{currentUser?.department}</span></p>
        </div>
        <div className="flex gap-2">
            {(isMaster || isGlobalAdmin || myPerms.canCreateTemplates) && (
              <button type="button" onClick={() => { 
                  setEditingTemplate(null); 
                  setTemplateForm({ name: '', title: '', type: 'entrega', responsibleDepartment: currentUser?.department || '', content: '', tableFields: [], customVariables: [...SUGGESTED_DEFAULTS], certificationImages: [] }); 
                  setIsTemplateModalOpen(true); 
              }} className="bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-slate-50 transition-all text-sm shadow-sm"><Plus size={18}/> Novo Modelo</button>
            )}
            {(isMaster || isGlobalAdmin || myPerms.canIssueTerms) && (
              <button type="button" onClick={() => { setIssueForm({...issueForm, originalTermId: undefined}); setActiveTab('new'); }} className="bg-emerald-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-emerald-700 transition-all flex items-center gap-2 shadow-md text-sm"><Plus size={18}/> Emitir Termo</button>
            )}
        </div>
      </div>

      <div className="flex gap-4 border-b border-slate-200 overflow-x-auto">
        <button onClick={() => setActiveTab('issued')} className={`pb-2 px-2 text-sm font-bold border-b-2 transition-all whitespace-nowrap ${activeTab === 'issued' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-400'}`}>Termos Emitidos</button>
        <button onClick={() => setActiveTab('templates')} className={`pb-2 px-2 text-sm font-bold border-b-2 transition-all whitespace-nowrap ${activeTab === 'templates' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-400'}`}>Modelos de Termo</button>
        {isMaster && (
          <button onClick={() => setActiveTab('permissions')} className={`pb-2 px-2 text-sm font-bold border-b-2 transition-all whitespace-nowrap flex items-center gap-2 ${activeTab === 'permissions' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-400'}`}><Shield size={16}/> Permissões por Setor</button>
        )}
      </div>

      {activeTab === 'permissions' && isMaster && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 animate-fade-in overflow-hidden">
             <div className="p-6 bg-slate-50 border-b border-slate-100 flex items-center gap-3">
                <div className="p-3 bg-white rounded-xl text-emerald-600 shadow-sm"><Settings size={20}/></div>
                <div>
                   <h3 className="font-black text-slate-800 uppercase text-sm tracking-tight">Matriz de Permissões: Gestão de Termos</h3>
                   <p className="text-xs text-slate-500 font-medium">Defina detalhadamente o que cada setor pode realizar no módulo administrativo.</p>
                </div>
             </div>
             <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[1000px]">
                   <thead className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase text-slate-400 font-black">
                      <tr>
                        <th className="px-6 py-4">Departamento</th>
                        <th className="px-6 py-4 text-center">Habilitar Menu</th>
                        <th className="px-6 py-4 text-center">Criar Modelos</th>
                        <th className="px-6 py-4 text-center">Emitir Termos</th>
                        <th className="px-6 py-4 text-center">Deletar Registros</th>
                        <th className="px-6 py-4 text-center">Gerar Devoluções</th>
                        <th className="px-6 py-4 text-center bg-emerald-50/50 text-emerald-600">Visão Global (RH/DP)</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100">
                      {depts.sort((a,b) => a.name.localeCompare(b.name)).map(dept => {
                         const p = globalSettings?.termsDeptPermissions?.[dept.name] || { enabled: false, canCreateTemplates: false, canIssueTerms: false, canDelete: false, canReturn: false, canSeeAllSectors: false };
                         return (
                            <tr key={dept.id} className="hover:bg-slate-50/50 transition-all">
                               <td className="px-6 py-4 font-black text-slate-700 uppercase text-xs tracking-tight">{dept.name}</td>
                               <td className="px-6 py-4 text-center">
                                  <button onClick={() => updateDeptPermission(dept.name, 'enabled', !p.enabled)} className={`p-1.5 rounded-lg transition-all ${p.enabled ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-300 hover:text-slate-500'}`}>
                                     {p.enabled ? <Unlock size={18}/> : <Lock size={18}/>}
                                  </button>
                               </td>
                               <td className="px-6 py-4 text-center">
                                  <button onClick={() => updateDeptPermission(dept.name, 'canCreateTemplates', !p.canCreateTemplates)} className={`p-1.5 rounded-lg transition-all ${p.canCreateTemplates ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-300 hover:text-slate-500'}`}>
                                     {p.canCreateTemplates ? <CheckSquareIcon size={18}/> : <Square size={18}/>}
                                  </button>
                               </td>
                               <td className="px-6 py-4 text-center">
                                  <button onClick={() => updateDeptPermission(dept.name, 'canIssueTerms', !p.canIssueTerms)} className={`p-1.5 rounded-lg transition-all ${p.canIssueTerms ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-300 hover:text-slate-500'}`}>
                                     {p.canIssueTerms ? <CheckSquareIcon size={18}/> : <Square size={18}/>}
                                  </button>
                               </td>
                               <td className="px-6 py-4 text-center">
                                  <button onClick={() => updateDeptPermission(dept.name, 'canDelete', !p.canDelete)} className={`p-1.5 rounded-lg transition-all ${p.canDelete ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-300 hover:text-slate-500'}`}>
                                     {p.canDelete ? <CheckSquareIcon size={18}/> : <Square size={18}/>}
                                  </button>
                               </td>
                               <td className="px-6 py-4 text-center">
                                  <button onClick={() => updateDeptPermission(dept.name, 'canReturn', !p.canReturn)} className={`p-1.5 rounded-lg transition-all ${p.canReturn ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-300 hover:text-slate-500'}`}>
                                     {p.canReturn ? <CheckSquareIcon size={18}/> : <Square size={18}/>}
                                  </button>
                               </td>
                               <td className="px-6 py-4 text-center bg-emerald-50/20">
                                  <button onClick={() => updateDeptPermission(dept.name, 'canSeeAllSectors', !p.canSeeAllSectors)} className={`p-1.5 rounded-lg transition-all ${p.canSeeAllSectors ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-300 hover:text-slate-500'}`} title="Permitir visualizar termos de todos os outros setores">
                                     {p.canSeeAllSectors ? <Globe size={18}/> : <Square size={18}/>}
                                  </button>
                               </td>
                            </tr>
                         )
                      })}
                   </tbody>
                </table>
             </div>
          </div>
      )}

      {activeTab === 'issued' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-fade-in">
            <div className="p-4 border-b border-slate-100 flex items-center gap-3">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-2.5 text-slate-400 w-4 h-4" />
                    <input type="text" placeholder="Filtrar colaborador..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                {(myPerms.canSeeAllSectors) && (
                   <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-100 text-[10px] font-black uppercase">
                      <Globe size={14}/> Visão Global Ativa
                   </div>
                )}
            </div>
            <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 border-b text-xs uppercase text-slate-500 font-bold"><tr><th className="px-6 py-4">Data</th><th className="px-6 py-4">Colaborador</th><th className="px-6 py-4">Equipamento/Info</th><th className="px-6 py-4">Status / Vínculo</th><th className="px-6 py-4 text-right">Ações</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                    {sortedAndGroupedTerms.map(term => {
                        const isReturn = term.type === 'devolucao';
                        const returnInfo = returnStatusMap.get(term.id);
                        return (
                            <tr key={term.id} className={`hover:bg-slate-50/50 transition-colors ${isReturn ? 'bg-slate-50/30' : ''}`}>
                                <td className="px-6 py-4 text-xs text-slate-500">
                                    <div className="flex items-center gap-2">
                                        {isReturn && <CornerDownRight size={14} className="text-slate-300 ml-2" />}
                                        {new Date(term.createdAt).toLocaleDateString()}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <p className={`font-bold text-slate-800 text-sm ${isReturn ? 'ml-4' : ''}`}>{term.employeeName}</p>
                                    <p className={`text-[10px] text-slate-400 uppercase font-black ${isReturn ? 'ml-4' : ''}`}>{term.type}</p>
                                </td>
                                <td className="px-6 py-4 text-xs text-slate-600 font-medium uppercase line-clamp-1">{term.data.marca_equipamento || term.data.item || term.data.modelo_equipamento || '---'}</td>
                                <td className="px-6 py-4">
                                    <div className="flex flex-col gap-1">
                                        <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-full border w-fit ${term.status === 'ASSINADO' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>{term.status}</span>
                                        {(term.type === 'entrega' || term.type === 'emprestimo') && returnInfo && (
                                            <div className={`text-[8px] font-black uppercase flex items-center gap-1 mt-1 ${returnInfo.status === 'ASSINADO' ? 'text-blue-600' : 'text-amber-500 animate-pulse'}`}>
                                                {returnInfo.status === 'ASSINADO' ? <CheckSquare size={10}/> : <Clock size={10}/>}
                                                {returnInfo.status === 'ASSINADO' ? 'Devolução Concluída' : 'Devolução em Aberto'}
                                            </div>
                                        )}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex justify-end gap-1">
                                        {(isMaster || isGlobalAdmin || myPerms.canReturn) && (term.type === 'entrega' || term.type === 'emprestimo') && !returnInfo && term.status === 'ASSINADO' && (
                                            <button type="button" onClick={() => handlePrepareReturn(term)} title="Gerar Termo de Devolução" className="p-2 text-slate-400 hover:text-amber-600 transition-colors"><RotateCcw size={18}/></button>
                                        )}
                                        <button type="button" onClick={() => {
                                            const template = templates.find(t => t.id === term.templateId);
                                            if (template) {
                                                let content = template.content;
                                                Object.entries(term.data).forEach(([key, value]) => {
                                                    const regex = new RegExp(`{{${key}}}`, 'g');
                                                    content = content.replace(regex, value || '');
                                                });
                                                setProcessedContent(content);
                                                setViewingTerm(term);
                                            }
                                        }} className="p-2 text-slate-400 hover:text-emerald-600 transition-colors"><Eye size={18}/></button>
                                        {(isMaster || isGlobalAdmin || myPerms.canDelete) && (
                                          <button type="button" onClick={() => setTermToDelete(term)} className="p-2 text-slate-400 hover:text-red-600 transition-colors"><Trash2 size={18}/></button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
      )}

      {activeTab === 'templates' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
            {filteredTemplates.map(t => (
                <div key={t.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all group flex flex-col justify-between">
                    <div>
                        <div className="flex justify-between items-start mb-4">
                            <div className="bg-emerald-50 p-3 rounded-2xl text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-all"><FileText size={24}/></div>
                            <div className="flex gap-1">
                                <button type="button" onClick={() => handleViewTemplate(t)} className="p-2 text-slate-300 hover:text-emerald-600 transition-colors" title="Ver modelo do documento"><Eye size={18}/></button>
                                {(isMaster || isGlobalAdmin || myPerms.canCreateTemplates) && (
                                  <>
                                    <button type="button" onClick={() => { setEditingTemplate(t); setTemplateForm({ ...t, tableFields: t.tableFields || [], customVariables: t.customVariables || [], certificationImages: t.certificationImages || [] }); setIsTemplateModalOpen(true); }} className="p-2 text-slate-300 hover:text-indigo-600 transition-colors"><Edit2 size={18}/></button>
                                    <button type="button" onClick={() => setTemplateToDelete(t)} className="p-2 text-slate-300 hover:text-red-600 transition-colors"><Trash2 size={18}/></button>
                                  </>
                                )}
                            </div>
                        </div>
                        <h4 className="font-black text-slate-800 uppercase text-base leading-tight mb-1">{t.name}</h4>
                        <div className="flex flex-col gap-1">
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Tipo: {t.type} • {(t.customVariables || []).length} Variáveis</p>
                            <p className="text-[10px] text-emerald-600 font-black uppercase tracking-widest flex items-center gap-1"><Building2 size={12} /> Setor: {t.responsibleDepartment}</p>
                        </div>
                    </div>
                </div>
            ))}
            {filteredTemplates.length === 0 && <div className="col-span-full py-20 text-center text-slate-400 italic">Nenhum modelo cadastrado para seu setor.</div>}
        </div>
      )}

      {activeTab === 'new' && (
        <div className="bg-white p-8 rounded-[2.5rem] border border-emerald-100 shadow-xl animate-fade-in max-w-4xl mx-auto">
            <h3 className="text-xl font-black text-slate-800 mb-8 flex items-center gap-3 uppercase tracking-tight"><Send className="text-emerald-600"/> {issueForm.originalTermId ? 'Emissão de Termo de Devolução' : 'Emissão de Termo Digital'}</h3>
            <form onSubmit={handleIssueTerm} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Modelo de Documento</label>
                        <select required value={issueForm.templateId} onChange={e => handleTemplateChange(e.target.value)} className="w-full p-4 border-2 border-slate-100 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none bg-white text-slate-700 uppercase shadow-sm">
                            <option value="">Selecione o Modelo...</option>
                            {filteredTemplates.map(t => (<option key={t.id} value={t.id}>[{t.responsibleDepartment}] {t.name} ({t.type})</option>))}
                        </select>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Colaborador Destinatário</label>
                        <select required value={issueForm.employeeId} onChange={e => handleEmployeeChange(e.target.value)} className="w-full p-4 border-2 border-slate-100 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none bg-white text-slate-700 uppercase shadow-sm">
                            <option value="">Selecione o Colaborador...</option>
                            {employees.sort((a,b) => a.name.localeCompare(b.name)).map(e => <option key={e.id} value={e.id}>{e.name} ({e.department})</option>)}
                        </select>
                    </div>
                </div>

                {issueForm.templateId && (
                    <div className="bg-slate-50/50 p-8 rounded-[2rem] border border-slate-200 space-y-6 animate-fade-in shadow-inner">
                        <div className="flex items-center justify-between mb-4"><div className="flex items-center gap-2 text-slate-400 font-black uppercase text-[10px] tracking-[0.2em]"><Package size={14}/> Dados do Documento</div></div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {(() => {
                                const template = templates.find(t => t.id === issueForm.templateId);
                                return (template?.customVariables || []).map(field => {
                                    const isLongText = field.type === 'textarea';
                                    return (
                                    <div key={field.key} className={`space-y-1 ${isLongText ? 'md:col-span-2' : ''}`}>
                                        <div className="flex items-center justify-between ml-1">
                                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{field.label}</label>
                                            {field.mapping && field.mapping !== 'none' && <span className="text-[8px] font-black text-emerald-500 uppercase bg-emerald-50 px-1.5 rounded border border-emerald-100 flex items-center gap-1" title="Sugerido automaticamente"><Sparkles size={8}/> Auto</span>}
                                        </div>
                                        {isLongText ? (
                                            <textarea value={issueForm.dynamicData[field.key] || ''} onChange={e => handleUpdateDynamicField(field.key, e.target.value)} placeholder={field.placeholder || `Valor para ${field.label}`} rows={4} className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs uppercase font-bold text-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none shadow-sm placeholder:text-slate-300 resize-none"/>
                                        ) : (
                                            <input value={issueForm.dynamicData[field.key] || ''} onChange={e => handleUpdateDynamicField(field.key, e.target.value)} placeholder={field.placeholder || `Valor para ${field.label}`} className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs uppercase font-bold text-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none shadow-sm placeholder:text-slate-300"/>
                                        )}
                                    </div>
                                )});
                            })()}
                            <div className="space-y-1">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Data de Emissão (Ref.)</label>
                                <input type="date" required value={issueForm.dataDoc} onChange={e => handleDateChange(e.target.value)} className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs uppercase font-bold text-slate-700 outline-none shadow-sm"/>
                            </div>
                        </div>
                    </div>
                )}
                <div className="flex justify-end gap-3 pt-4">
                    <button type="button" onClick={() => setActiveTab('issued')} className="px-8 py-3 text-slate-400 font-black uppercase text-xs hover:bg-slate-100 rounded-2xl transition-all">Cancelar</button>
                    <button type="submit" disabled={isProcessing || !issueForm.templateId} className="px-12 py-3 bg-emerald-600 text-white font-black uppercase text-xs rounded-2xl shadow-xl shadow-emerald-200 hover:bg-emerald-700 transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50">{isProcessing ? <Loader2 className="animate-spin" size={16}/> : <CheckCircle2 size={16}/>} Emitir Termo Digital</button>
                </div>
            </form>
        </div>
      )}

      {/* MODAL EDITOR DE MODELO */}
      {isTemplateModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 z-[110] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in overflow-y-auto">
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[95vh]">
                  <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                      <h3 className="font-bold text-slate-800 uppercase text-sm flex items-center gap-2"><Settings size={18} className="text-emerald-600"/> {editingTemplate ? 'Editar' : 'Novo'} Modelo de Termo</h3>
                      <button type="button" onClick={() => setIsTemplateModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full text-slate-400"><X size={24}/></button>
                  </div>
                  <div className="p-8 overflow-y-auto custom-scrollbar space-y-8">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <div className="space-y-1"><label className="text-[10px] font-bold text-slate-400 uppercase">Nome Interno</label><input value={templateForm.name || ''} onChange={e => setTemplateForm({...templateForm, name: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-lg text-sm bg-white text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="Nome para identificação interna"/></div>
                          <div className="space-y-1"><label className="text-[10px] font-bold text-slate-400 uppercase">Tipo Movimentação</label><select value={templateForm.type} onChange={e => setTemplateForm({...templateForm, type: e.target.value as TermType})} className="w-full p-2.5 border border-slate-300 rounded-lg text-sm bg-white text-slate-900 uppercase font-bold outline-none"><option value="entrega">Entrega</option><option value="emprestimo">Empréstimo</option><option value="devolucao">Devolução</option></select></div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Setor Responsável</label>
                            <select 
                                value={templateForm.responsibleDepartment} 
                                disabled={!(isMaster || isGlobalAdmin)} 
                                onChange={e => setTemplateForm({...templateForm, responsibleDepartment: e.target.value})} 
                                className={`w-full p-2.5 border border-slate-300 rounded-lg text-sm bg-white text-slate-900 uppercase font-bold outline-none ${!(isMaster || isGlobalAdmin) ? 'bg-slate-50 opacity-60' : ''}`}
                            >
                                <option value="">Selecione o Setor...</option>
                                {depts.sort((a,b) => a.name.localeCompare(b.name)).map(d => (
                                    <option key={d.id} value={d.name}>{d.name}</option>
                                ))}
                            </select>
                          </div>
                      </div>
                      <div className="space-y-1"><label className="text-[10px] font-bold text-slate-400 uppercase">Título no Documento</label><input value={templateForm.title || ''} onChange={e => setTemplateForm({...templateForm, title: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white text-slate-900" placeholder="Ex: TERMO DE ENTREGA DE EQUIPAMENTO"/></div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <div className="space-y-4">
                              <div className="flex items-center justify-between border-b border-slate-100 pb-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Variáveis Dinâmicas</label><button type="button" onClick={addCustomVariable} className="text-[10px] font-black uppercase text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full hover:bg-emerald-100 flex items-center gap-1 transition-colors border border-emerald-100"><Plus size={12}/> Adicionar</button></div>
                              <div className="space-y-3 max-h-[350px] overflow-y-auto pr-3 custom-scrollbar">
                                  {(templateForm.customVariables || []).map((v, i) => (
                                      <div key={i} className="flex flex-col gap-2 bg-slate-50 p-4 rounded-2xl border border-slate-100 relative group">
                                          <div className="flex justify-between items-start"><input value={v.label || ''} onChange={e => updateCustomVariable(e.target.value, i)} className="flex-1 p-2 border border-slate-200 rounded-lg bg-white text-slate-900 text-xs font-bold" placeholder="Rótulo (ex: Modelo)"/><button type="button" onClick={() => removeCustomVariable(i)} className="text-red-400 p-2 hover:bg-red-100 hover:text-red-600 rounded-xl transition-all ml-2" title="Remover variável"><Trash2 size={16}/></button></div>
                                          <div className="grid grid-cols-2 gap-2"><input value={v.key || ''} onChange={e => updateCustomVariable(i, { key: e.target.value })} className="p-2 border border-slate-200 rounded-lg bg-white text-slate-800 text-[10px] font-mono" placeholder="tag_exemplo"/><select value={v.mapping || 'none'} onChange={e => updateCustomVariable(i, { mapping: e.target.value as VariableMapping })} className="p-2 border border-slate-200 rounded-lg bg-white text-slate-700 text-[9px] font-bold"><option value="none">Manual</option><option value="doc_title">Doc: Título</option><option value="emp_name">Colab: Nome</option><option value="emp_role">Colab: Cargo</option><option value="emp_dept">Colab: Setor</option><option value="emp_unit">Colab: Unidade</option><option value="doc_date">Data: Simples</option><option value="doc_date_full">Data: Extenso</option></select></div>
                                      </div>
                                  ))}
                              </div>
                          </div>
                          <div className="space-y-4">
                              <div className="flex items-center justify-between border-b border-slate-100 pb-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tabela de Ativos (Opcional)</label><button type="button" onClick={addTableField} className="text-[10px] font-black uppercase text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full hover:bg-indigo-100 flex items-center gap-1 transition-colors border border-indigo-100"><Plus size={12}/> Adicionar</button></div>
                              <div className="space-y-3 max-h-[350px] overflow-y-auto pr-3 custom-scrollbar">
                                  {(templateForm.tableFields || []).map((f, i) => (
                                      <div key={i} className="flex gap-2 bg-indigo-50/30 p-4 rounded-2xl border border-indigo-100"><div className="flex-1 space-y-2"><input value={f.label || ''} onChange={e => updateTableField(i, { label: e.target.value })} className="w-full p-2 border border-slate-200 rounded-lg bg-white text-slate-900 text-xs font-bold" placeholder="Rótulo da Tabela"/><input value={f.variable || ''} onChange={e => updateTableField(i, { variable: e.target.value })} className="w-full p-2 border border-slate-200 rounded-lg bg-white text-slate-800 text-[10px] font-mono" placeholder="tag_da_variavel"/></div><button type="button" onClick={() => removeTableField(i)} className="text-red-400 p-2 hover:bg-red-100 hover:text-red-600 rounded-xl transition-all"><Trash2 size={16}/></button></div>
                                  ))}
                              </div>
                          </div>
                      </div>

                      {/* NOVA SEÇÃO: SELOS DE CERTIFICAÇÃO */}
                      <div className="space-y-4 border-t border-slate-100 pt-6">
                          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <Award size={14} className="text-amber-500" /> Selos de Certificação (Rodapé)
                             </label>
                             <label className="text-[10px] font-black uppercase text-amber-600 bg-amber-50 px-3 py-1 rounded-full hover:bg-amber-100 flex items-center gap-1 transition-colors border border-amber-100 cursor-pointer">
                                <Plus size={12}/> Adicionar Selo
                                <input type="file" accept="image/*" className="hidden" onChange={handleCertUpload} />
                             </label>
                          </div>
                          <div className="flex flex-wrap gap-4">
                              {(templateForm.certificationImages || []).map((img, idx) => (
                                  <div key={idx} className="relative group w-24 h-24 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-center p-2 overflow-hidden shadow-sm">
                                      <img src={img} className="max-w-full max-h-full object-contain mix-blend-multiply" />
                                      <button type="button" onClick={() => removeCertImage(idx)} className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={10}/></button>
                                  </div>
                              ))}
                              {(templateForm.certificationImages || []).length === 0 && (
                                  <div className="w-full py-6 text-center text-slate-300 border-2 border-dashed border-slate-100 rounded-2xl flex flex-col items-center">
                                      <ImageIcon size={24} className="opacity-20 mb-1" />
                                      <p className="text-[9px] uppercase font-black">Nenhum selo configurado para este modelo</p>
                                  </div>
                              )}
                          </div>
                      </div>

                      <div className="space-y-3 pt-6 border-t"><div className="flex items-center justify-between"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Conteúdo do Documento (Corpo do Texto)</label><label className="text-[10px] font-black uppercase text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full cursor-pointer hover:bg-emerald-100 flex items-center gap-2 border border-emerald-100 transition-all"><FileUp size={12}/> Importar RTF<input type="file" accept=".rtf" className="hidden" onChange={e => e.target.files?.[0] && handleImportRTF(e.target.files[0])}/></label></div><textarea value={templateForm.content || ''} onChange={e => setTemplateForm({...templateForm, content: e.target.value})} className="w-full p-6 border border-slate-200 rounded-2xl text-sm font-serif min-h-[400px] leading-relaxed bg-white text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500 shadow-inner" placeholder="Escreva o texto completo do termo aqui..."/></div>
                  </div>
                  <div className="p-6 bg-slate-50 border-t flex justify-end gap-3 shrink-0"><button type="button" onClick={() => setIsTemplateModalOpen(false)} className="px-6 py-2 text-slate-600 font-bold text-sm hover:bg-slate-200 rounded-xl transition-all" disabled={isProcessing}>Cancelar</button><button type="button" onClick={handleSaveTemplate} className="px-10 py-2.5 bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-700 rounded-xl shadow-lg shadow-emerald-200 flex items-center gap-2 transition-all active:scale-95" disabled={isProcessing}>{isProcessing ? <Loader2 className="animate-spin" size={18}/> : <Save size={18}/>} Salvar Modelo</button></div>
              </div>
          </div>
      )}

      {/* RENDERIZADOR DE DOCUMENTO OFICIAL */}
      {(viewingTerm || viewingTemplatePreview) && (
          <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-[200] flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
              <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-[210mm] my-8 overflow-hidden flex flex-col h-full max-h-[95vh] relative">
                  <div className="p-4 border-b flex justify-between items-center bg-slate-50 sticky top-0 z-20">
                      <div className="flex items-center gap-3">
                          <div className="p-2 bg-emerald-100 rounded-xl text-emerald-600"><FileText size={20}/></div>
                          <h3 className="font-black text-slate-800 uppercase text-sm tracking-tight">{viewingTemplatePreview ? 'Prévia do Modelo' : 'Documento Oficial'}</h3>
                      </div>
                      <div className="flex gap-2">
                          <button type="button" onClick={() => window.print()} className="bg-emerald-600 text-white px-5 py-2 rounded-xl text-xs font-black uppercase hover:bg-emerald-700 shadow-md flex items-center gap-2"><Printer size={16}/> Imprimir / PDF</button>
                          <button type="button" onClick={() => { setViewingTerm(null); setViewingTemplatePreview(null); }} className="p-2 hover:bg-slate-200 rounded-full text-slate-400 transition-colors"><X size={24}/></button>
                      </div>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-4 md:p-10 bg-slate-200/50 flex justify-center custom-scrollbar">
                      <div className="bg-white shadow-2xl w-full max-w-[210mm] min-h-[297mm] pt-[5mm] md:pt-[8mm] px-[10mm] md:px-[20mm] pb-[10mm] md:pb-[20mm] text-slate-900 print:shadow-none print:p-0 flex flex-col relative">
                          <div className="flex justify-between items-start border-b-2 border-emerald-800 pb-4 mb-8">
                             <Logo className="h-14 w-auto" />
                             <div className="text-right text-[9px] text-slate-500 font-bold uppercase leading-tight">
                                <p className="text-slate-800">Intermarítima Portos e Logística S/A</p>
                                <p>Rua da Grécia, 08, Edf. Serra da Raiz, 3º andar.</p>
                                <p>Comércio - CEP. 40.010-010 - Salvador / BA</p>
                                <p className="text-emerald-700">www.intermaritima.com.br</p>
                             </div>
                          </div>

                          <h1 className="text-center font-black text-lg md:text-xl mb-10 uppercase tracking-tight">{(viewingTerm?.data.titulo_documento || viewingTemplatePreview?.title || viewingTerm?.employeeName || '[TÍTULO DO DOCUMENTO]')}</h1>
                          
                          <div className="space-y-1 mb-6 text-[10px] md:text-[11px] font-bold uppercase text-slate-900">
                              <p>COLABORADOR: <span className="font-medium">{viewingTerm?.employeeName || '[NOME DO COLABORADOR]'}</span></p>
                              <p>SETOR: <span className="font-medium">{viewingTerm?.data.departamento || viewingTemplatePreview?.responsibleDepartment || '[SETOR RESPONSÁVEL]'}</span></p>
                              <p>CARGO: <span className="font-medium">{viewingTerm?.data.cargo || '[CARGO DO COLABORADOR]'}</span></p>
                          </div>

                          <table className="w-full border-collapse mb-8 border border-emerald-800">
                            <thead><tr className="bg-[#006c5b] text-white text-[9px] md:text-[10px] font-black uppercase"><th className="border border-emerald-800 px-4 py-2 w-1/2 text-center">DESCRIÇÃO</th><th className="border border-emerald-800 px-4 py-2 w-1/2 text-center">DADOS</th></tr></thead>
                            <tbody className="text-[10px] md:text-[11px] font-bold uppercase text-slate-800">
                                {(templates.find(t => t.id === (viewingTerm?.templateId || viewingTemplatePreview?.id))?.tableFields || []).map((field, idx) => (
                                    <tr key={idx}>
                                        <td className="border border-emerald-800 px-4 py-1.5 bg-slate-50 text-slate-700 font-black">{field.label}</td>
                                        <td className="border border-emerald-800 px-4 py-1.5 font-medium text-slate-900 whitespace-pre-wrap">{(viewingTerm?.data[field.variable] || `[${field.label.toUpperCase()}]`)}</td>
                                    </tr>
                                ))}
                            </tbody>
                          </table>

                          <div className="text-xs md:text-sm leading-relaxed text-justify whitespace-pre-wrap mb-16 font-serif flex-1 text-slate-900">{processedContent}</div>
                          
                          {/* ÁREA DE ASSINATURA E SELOS - EQUALIZADA COM SIGNATURES.TSX */}
                          <div className="mt-auto pt-4 space-y-8">
                              {/* 1. Assinatura Centralizada */}
                              <div className="flex justify-center w-full">
                                  {viewingTerm?.status === 'ASSINADO' ? (
                                      <div className="text-center relative">
                                          {viewingTerm.signatureImage && (
                                              <img src={viewingTerm.signatureImage} className="h-10 md:h-12 object-contain mx-auto mix-blend-multiply mb-0 relative z-10" />
                                          )}
                                          <div className="w-64 h-px bg-slate-400 mx-auto mt-1 mb-2"></div>
                                          <p className="font-black uppercase text-xs md:text-sm text-slate-900">{viewingTerm.employeeName}</p>
                                          <p className="text-[10px] text-slate-500 font-bold">CPF: {viewingTerm.employeeCpf?.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-**")}</p>
                                          {viewingTerm.signedAt && <p className="text-[8px] text-emerald-600 font-black uppercase mt-1">Assinado digitalmente em: {new Date(viewingTerm.signedAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })}</p>}
                                          <p className="text-[8px] text-slate-400 font-mono mt-2 break-all max-w-[300px] mx-auto uppercase">CÓDIGO DE VERIFICAÇÃO: {viewingTerm.token}</p>
                                      </div>
                                  ) : viewingTemplatePreview ? (
                                      <div className="text-center relative opacity-20 grayscale">
                                          <div className="w-64 h-px bg-slate-400 mx-auto mt-16 mb-2"></div>
                                          <p className="font-black uppercase text-xs md:text-sm text-slate-900">[NOME DO COLABORADOR]</p>
                                          <p className="text-[10px] text-slate-500 font-bold">CPF: 000.000.000-**</p>
                                      </div>
                                  ) : null}
                              </div>

                              {/* 2. Selos Alinhados à Direita no final */}
                              <div className="flex justify-end gap-3">
                                  {(templates.find(t => t.id === (viewingTerm?.templateId || viewingTemplatePreview?.id))?.certificationImages || []).map((img, idx) => (
                                      <div key={idx} className="bg-white border border-slate-200 p-1.5 rounded-lg flex items-center justify-center h-12 md:h-16 w-fit shadow-sm">
                                          <img src={img} className="h-full object-contain mix-blend-multiply" alt="Selo" />
                                      </div>
                                  ))}
                              </div>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {termToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 z-[250] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
           <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden border-2 border-red-100">
              <div className="p-8 text-center">
                 <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6 text-red-500"><AlertTriangle size={40} /></div>
                 <h3 className="text-lg font-black text-slate-800 mb-2 uppercase tracking-tight">Excluir Termo?</h3>
                 <p className="text-sm text-slate-500 mb-8">Ação irreversível.</p>
                 <div className="flex gap-3"><button type="button" onClick={() => setTermToDelete(null)} className="flex-1 py-4 text-slate-400 font-black uppercase text-xs hover:bg-slate-100 rounded-2xl transition-all">Manter</button><button type="button" onClick={confirmDeleteTerm} className="flex-1 py-4 bg-red-600 text-white rounded-2xl font-black uppercase text-xs hover:bg-red-700 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-red-100" disabled={isProcessing}>{isProcessing ? <Loader2 className="animate-spin" size={16}/> : <Trash2 size={16}/>} Sim, excluir</button></div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default AdminTerms;
