
import React, { useState, useEffect, useRef } from 'react';
import { 
    fetchSignatureLogs, 
    fetchSignatureRequests, 
    updateSignatureRequestStatus, 
    subscribeSignatureUnits, 
    subscribeSignatureSectors, 
    subscribeSignatureRequests,
    subscribeSignatureLogs,
    addSignatureLog,
    addSignatureUnit,
    updateSignatureUnit,
    removeSignatureUnit,
    addSignatureSector,
    updateSignatureSector,
    removeSignatureSector,
    fetchEmployees,
    removeSignatureRequest,
    removeSignatureLog
} from '../services/firebaseService';
import { SignatureLog, SignatureRequest, OrganizationUnit, OrganizationDepartment, Employee, SignatureData } from '../types';
import { FileText, Search, Loader2, Calendar, ClipboardList, CheckSquare, MessageSquare, PenTool, X, Download, Minus, Plus, RefreshCw, Settings, MapPin, Building, Save, Trash2, Edit2, Upload, User, UserCheck, Briefcase, Globe, Award, Camera, Eye, AlertCircle, Phone, Hash, AlertTriangle, Send, CheckCircle2, UserPlus, FileSpreadsheet, Lock, Image as ImageIcon, Eraser, UserSearch } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export const renderSignatureToCanvas = async (
    canvas: HTMLCanvasElement, 
    data: SignatureData, 
    units: OrganizationUnit[]
) => {
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const unit = units.find(u => u.id === data.unitId);
    if (!unit) return;

    const scaleFactor = 1.5;
    canvas.width = 710 * scaleFactor;
    canvas.height = 240 * scaleFactor;
    ctx.scale(scaleFactor, scaleFactor);
    ctx.clearRect(0, 0, 710, 240);

    if (unit.image) {
        const logoImage = new Image();
        logoImage.src = unit.image;
        await new Promise<void>((resolve) => {
            logoImage.onload = () => { ctx.drawImage(logoImage, 24, 40, 180, 65); resolve(); };
            logoImage.onerror = () => resolve();
        });
    }

    ctx.setLineDash([5, 5]);
    ctx.beginPath(); ctx.moveTo(250, 20); ctx.lineTo(250, 190);
    ctx.strokeStyle = "#808080"; ctx.lineWidth = 1; ctx.stroke(); ctx.setLineDash([]);

    const site = unit.site ? unit.site.replace(/^https?:\/\//, '') : 'www.intermaritima.com.br';
    ctx.font = "bold 14px Arial"; ctx.fillStyle = '#666666'; 
    const siteWidth = ctx.measureText(site).width;
    ctx.fillText(site, 40 + (150 - siteWidth) / 2, 140);

    if (unit.certifications && unit.certifications.length > 0) {
        ctx.font = "12px Arial"; ctx.fillStyle = "#666666";
        const certY = 160; const lineHeight = 15;
        for (let i = 0; i < unit.certifications.length; i += 2) {
            const lineCerts = unit.certifications.slice(i, i + 2);
            const certText = lineCerts.join(" / ");
            const certWidth = ctx.measureText(certText).width;
            ctx.fillText(certText, 40 + (150 - certWidth) / 2, certY + Math.floor(i / 2) * lineHeight);
        }
    }

    const cleanSector = data.sector.replace('*', '\n');
    const sectorLines = cleanSector.split('\n');
    const hasTwoLines = sectorLines.length > 1;

    const nameY = hasTwoLines ? 30 : 40;
    const emailY = hasTwoLines ? 90 : 80;
    const dashY = hasTwoLines ? 105 : 95;
    const addrY = hasTwoLines ? 125 : 115;

    ctx.fillStyle = "#666666"; ctx.font = "bold 14px Arial"; ctx.fillText(data.name, 270, nameY);
    ctx.font = "14px Arial"; 
    if (hasTwoLines) { ctx.fillText(sectorLines[0].trim(), 270, 50); ctx.fillText(sectorLines[1].trim(), 270, 70); }
    else { ctx.fillText(data.sector, 270, 60); }
    ctx.fillText(data.email, 270, emailY);

    ctx.setLineDash([5, 5]); ctx.beginPath(); ctx.moveTo(270, dashY); ctx.lineTo(710, dashY); ctx.strokeStyle = "#808080"; ctx.stroke(); ctx.setLineDash([]);

    ctx.font = "12px Arial";
    const addr = `${unit.address || ''}, ${unit.number || ''}${unit.complement ? ' - ' + unit.complement : ''}${unit.neighborhood ? ', ' + unit.neighborhood : ''}`;
    ctx.fillText(addr, 270, addrY);
    ctx.fillText(`${unit.city || ''} - ${unit.state || ''} CEP: ${unit.cep || ''}`, 270, addrY + 20);

    const fixed = data.phones.filter(p => p.type === 'fixo' && p.number && p.number.trim());
    const mob = data.phones.filter(p => p.type === 'celular' && p.number && p.number.trim());
    let pStr = "";
    if (fixed.length > 0) pStr += `Fixo: ${fixed.map(p => p.number).join(" / ")}`;
    if (mob.length > 0) { if (pStr) pStr += "   "; pStr += `Celular: +55 ${mob.map(p => p.number).join(" / ")}`; }
    if (pStr) { ctx.font = "bold 12px Arial"; ctx.fillText(pStr, 270, 165); }

    ctx.fillStyle = "#28a745"; ctx.font = "12px Arial";
    const p1 = "Antes de imprimir, pense em seu compromisso com o ";
    const p2 = "Meio Ambiente";
    const p3 = " e o comprometimento com os ";
    const p4 = "Custos.";
    const tw = ctx.measureText(p1 + p2 + p3 + p4).width;
    let cx = (710 - tw) / 2;
    ctx.font = "12px Arial"; ctx.fillText(p1, cx, 230); cx += ctx.measureText(p1).width;
    ctx.font = "bold 12px Arial"; ctx.fillText(p2, cx, 230); cx += ctx.measureText(p2).width;
    ctx.font = "12px Arial"; ctx.fillText(p3, cx, 230); cx += ctx.measureText(p3).width;
    ctx.font = "bold 12px Arial"; ctx.fillText(p4, cx, 230);
};

const AdminSignatures: React.FC = () => {
  const { currentUser, isMaster } = useAuth();
  const [activeTab, setActiveTab] = useState<'requests' | 'logs' | 'management' | 'create'>('requests');
  const [loading, setLoading] = useState(true);
  
  const [logs, setLogs] = useState<SignatureLog[]>([]);
  const [requests, setRequests] = useState<SignatureRequest[]>([]);
  const [units, setUnits] = useState<OrganizationUnit[]>([]);
  const [departments, setDepartments] = useState<OrganizationDepartment[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [genData, setGenData] = useState({ name: '', email: '', unitId: '', sector: '' });
  const [phones, setPhones] = useState<{number: string, type: 'fixo' | 'celular'}[]>([{ number: '', type: 'celular' }]);
  const [selectedRequest, setSelectedRequest] = useState<SignatureRequest | null>(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  
  const [mgmtTab, setMgmtTab] = useState<'units' | 'sectors'>('units');
  const [isMgmtModalOpen, setIsMgmtModalOpen] = useState(false);
  const [editingMgmtItem, setEditingMgmtItem] = useState<any>(null);
  const [mgmtForm, setMgmtForm] = useState<any>({});
  const [mgmtCerts, setMgmtCerts] = useState<string[]>([]);
  const [certInput, setCertInput] = useState('');

  // Estados para modais de confirmação
  const [mgmtItemToDelete, setMgmtItemToDelete] = useState<any | null>(null);
  const [requestToDelete, setRequestToDelete] = useState<SignatureRequest | null>(null);
  const [logToDelete, setLogToDelete] = useState<SignatureLog | null>(null);
  const [showFinishConfirm, setShowFinishConfirm] = useState(false);
  const [showManualSaveConfirm, setShowManualSaveConfirm] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  // Novo estado para visualização do histórico
  const [viewingLogSignatureUrl, setViewingLogSignatureUrl] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hiddenCanvasRef = useRef<HTMLCanvasElement>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isFetchingCep, setIsFetchingCep] = useState(false);

  const formatPhoneMask = (value: string) => {
    let r = value.replace(/\D/g, "").substring(0, 11);
    if (r.length > 10) r = r.replace(/^(\d\d)(\d{5})(\d{4}).*/, "($1) $2-$3");
    else if (r.length > 6) r = r.replace(/^(\d\d)(\d{4})(\d{0,4}).*/, "($1) $2-$3");
    else if (r.length > 2) r = r.replace(/^(\d\d)(\d{0,5})/, "($1) $2");
    else if (r.length > 0) r = r.replace(/^(\d*)/, "($1");
    return r;
  };

  const handleProcessRequest = (req: SignatureRequest) => {
    setSelectedRequest(req);
    setGeneratedImage(null);
    
    if (req.requestedData) {
      setGenData({
        name: req.requestedData.name,
        email: req.requestedData.email,
        unitId: '', 
        sector: req.requestedData.sector
      });

      const newPhones: {number: string, type: 'fixo' | 'celular'}[] = [];
      if (req.requestedData.phoneMobile) {
        newPhones.push({ number: req.requestedData.phoneMobile, type: 'celular' });
      }
      if (req.requestedData.phoneFixed) {
        newPhones.push({ number: req.requestedData.phoneFixed, type: 'fixo' });
      }
      setPhones(newPhones.length > 0 ? newPhones : [{ number: '', type: 'celular' }]);

      const emp = employees.find(e => e.email === req.userEmail);
      if (emp) {
        const matchingUnit = units.find(u => u.name === emp.unit);
        if (matchingUnit) setGenData(prev => ({...prev, unitId: matchingUnit.id!}));
        setSelectedEmployeeId(emp.id);
      }
    } else {
      const emp = employees.find(e => e.email === req.userEmail);
      const matchingUnit = emp ? units.find(u => u.name === emp.unit) : null;
      const matchingSector = emp ? departments.find(d => d.name.toLowerCase() === emp.role.toLowerCase() || d.name.toLowerCase() === emp.department.toLowerCase()) : null;

      setGenData({
          name: req.userName,
          email: req.userEmail,
          unitId: matchingUnit ? matchingUnit.id! : '',
          sector: matchingSector ? matchingSector.name : ''
      });

      const newPhones: {number: string, type: 'fixo' | 'celular'}[] = [];
      if (emp && emp.whatsapp && emp.whatsapp.trim()) {
          newPhones.push({ number: formatPhoneMask(emp.whatsapp), type: 'celular' as const });
      }
      if (emp && emp.extension && emp.extension.trim()) {
          newPhones.push({ number: `(71) 3879-${emp.extension.trim()}`, type: 'fixo' as const });
      }
      setPhones(newPhones.length > 0 ? newPhones : [{ number: '', type: 'celular' }]);
      if (emp) setSelectedEmployeeId(emp.id);
    }
    
    setActiveTab('create');
  };

  useEffect(() => {
    setLoading(true);
    
    const unsubRequests = subscribeSignatureRequests((data) => {
      setRequests(data);
      setLoading(false);
    });

    const unsubLogs = subscribeSignatureLogs((data) => {
      setLogs(data);
    });

    const unsubUnits = subscribeSignatureUnits((data) => setUnits(data));
    const unsubSectors = subscribeSignatureSectors((data) => setDepartments(data));

    const loadBasics = async () => {
        try {
            const empsData = await fetchEmployees();
            setEmployees(empsData);
        } catch (e) {
            console.error("Erro ao carregar dados básicos:", e);
        }
    };
    loadBasics();

    return () => {
        unsubRequests();
        unsubLogs();
        unsubUnits();
        unsubSectors();
    };
  }, []);

  const resetForm = () => {
    setGeneratedImage(null);
    setSelectedRequest(null);
    setSelectedEmployeeId('');
    setGenData({ name: '', email: '', unitId: '', sector: '' });
    setPhones([{ number: '', type: 'celular' }]);
    setShowSuccessToast(true);
    setTimeout(() => setShowSuccessToast(false), 3000);
  };

  const handleClearForm = () => {
    setGeneratedImage(null);
    setSelectedRequest(null);
    setSelectedEmployeeId('');
    setGenData({ name: '', email: '', unitId: '', sector: '' });
    setPhones([{ number: '', type: 'celular' }]);
  };

  const handleSelectEmployee = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const empId = event.target.value; 
    setSelectedEmployeeId(empId);
    
    if (empId) {
        const emp = employees.find(e => e.id === empId);
        if (emp) {
            const matchingUnit = units.find(u => u.name === emp.unit);
            const matchingSector = departments.find(d => d.name.toLowerCase() === emp.role.toLowerCase() || d.name.toLowerCase() === emp.department.toLowerCase());
            setGenData({ name: emp.name, email: emp.email, unitId: matchingUnit ? matchingUnit.id! : '', sector: matchingSector ? matchingSector.name : '' });
            const newPhones: {number: string, type: 'fixo' | 'celular'}[] = [];
            if (emp.whatsapp) newPhones.push({ number: formatPhoneMask(emp.whatsapp), type: 'celular' as const });
            if (emp.extension) newPhones.push({ number: `(71) 3879-${emp.extension}`, type: 'fixo' as const });
            setPhones(newPhones.length > 0 ? newPhones : [{ number: '', type: 'celular' }]);
        }
    }
  };

  const generatePreview = async () => {
    if (!genData.unitId || !genData.name || !genData.sector) return alert("Preencha Unidade, Nome e selecione um Cargo/Setor válido.");
    setIsProcessing(true);
    try {
        if (!canvasRef.current) return;
        const validPhones = phones.filter(p => p.number && p.number.trim() !== '');
        const signatureData: SignatureData = { ...genData, phones: validPhones };
        await renderSignatureToCanvas(canvasRef.current, signatureData, units);
        setGeneratedImage(canvasRef.current.toDataURL("image/png"));
    } catch (e) { alert("Erro ao gerar prévia."); } finally { setIsProcessing(false); }
  };

  const handleFinishAndNotify = async () => {
    if (!selectedRequest || !generatedImage || isProcessing) return;
    
    setIsProcessing(true);
    try {
        const validPhones = phones.filter(p => p.number && p.number.trim() !== '');
        const sigData: SignatureData = { 
          name: genData.name,
          email: genData.email,
          unitId: genData.unitId,
          sector: genData.sector,
          phones: validPhones
        };
        
        const adminName = currentUser?.name || 'Administrador';
        const unitName = units.find(u => u.id === genData.unitId)?.name || 'N/A';

        await updateSignatureRequestStatus(
            selectedRequest.id, 
            'COMPLETED', 
            adminName, 
            selectedRequest.userId,
            sigData
        );

        await addSignatureLog({
            employeeName: genData.name,
            employeeEmail: genData.email,
            department: genData.sector,
            unitName: unitName,
            createdAt: new Date().toISOString(),
            generatedBy: adminName,
            signatureData: sigData,
            origin: 'REQUEST' 
        });

        setShowFinishConfirm(false);
        resetForm();
        setActiveTab('requests');
    } catch (error: any) {
        console.error("Erro na finalização:", error);
        alert(`Erro ao processar: ${error.message}`);
    } finally { setIsProcessing(false); }
  };

  const handleConfirmManualSave = async () => {
    if (!generatedImage || isProcessing) return;
    setIsProcessing(true);
    
    const validPhones = phones.filter(p => p.number && p.number.trim() !== '');
    const sigData: SignatureData = { 
        name: genData.name, 
        email: genData.email, 
        unitId: genData.unitId, 
        sector: genData.sector, 
        phones: validPhones 
    };
    
    const unitName = units.find(u => u.id === genData.unitId)?.name || 'Desconhecida';
    
    try {
        await addSignatureLog({
            employeeName: genData.name, 
            employeeEmail: genData.email, 
            department: genData.sector, 
            unitName,
            createdAt: new Date().toISOString(), 
            generatedBy: currentUser?.name || 'Admin', 
            signatureData: sigData,
            origin: 'MANUAL' 
        });
        
        setShowManualSaveConfirm(false);
        resetForm();
    } catch (error) { 
        alert("Erro ao salvar no histórico."); 
    } finally { 
        setIsProcessing(false); 
    }
  };

  const handleDownloadFromLog = async (log: SignatureLog) => {
    if (!log.signatureData || !hiddenCanvasRef.current) return alert("Dados insuficientes.");
    await renderSignatureToCanvas(hiddenCanvasRef.current, log.signatureData, units);
    const link = document.createElement('a');
    link.download = `assinatura_${log.employeeName}.png`;
    link.href = hiddenCanvasRef.current.toDataURL("image/png");
    link.click();
  };

  // Função para visualizar do histórico
  const handleViewFromLog = async (log: SignatureLog) => {
    if (!log.signatureData || !hiddenCanvasRef.current) return alert("Dados insuficientes.");
    setIsProcessing(true);
    try {
        await renderSignatureToCanvas(hiddenCanvasRef.current, log.signatureData, units);
        setViewingLogSignatureUrl(hiddenCanvasRef.current.toDataURL("image/png"));
    } catch (e) {
        alert("Erro ao gerar visualização.");
    } finally {
        setIsProcessing(false);
    }
  };

  const handleOpenMgmtModal = (item?: any) => {
    if (item) { 
        setEditingMgmtItem(item); 
        setMgmtForm({ ...item }); 
        setMgmtCerts(item.certifications || []); 
    } else { 
        setEditingMgmtItem(null); 
        setMgmtForm(mgmtTab === 'units' ? { 
            name: '', cnpj: '', site: '', city: '', state: '', address: '', 
            number: '', complement: '', neighborhood: '', cep: '', phone: '', image: ''
        } : { name: '', description: '' }); 
        setMgmtCerts([]); 
    }
    setCertInput('');
    setIsMgmtModalOpen(true);
  };

  const handleRequestDeleteMgmtItem = (e: React.MouseEvent, item: any) => {
    e.preventDefault();
    e.stopPropagation();
    setMgmtItemToDelete(item);
  };

  const confirmDeleteMgmtItem = async () => {
    if (!mgmtItemToDelete || !mgmtItemToDelete.id) return;
    
    setIsProcessing(true);
    try {
        if (mgmtTab === 'units') {
            await removeSignatureUnit(mgmtItemToDelete.id);
        } else {
            await removeSignatureSector(mgmtItemToDelete.id);
        }
        setMgmtItemToDelete(null);
    } catch (error: any) {
        alert(`Erro ao excluir: ${error.message}`);
    } finally {
        setIsProcessing(false);
    }
  };

  const confirmDeleteRequest = async () => {
    if (!requestToDelete) return;
    setIsProcessing(true);
    try {
        await removeSignatureRequest(requestToDelete.id);
        setRequestToDelete(null);
    } catch (error: any) {
        alert(`Erro ao excluir solicitação: ${error.message}`);
    } finally {
        setIsProcessing(false);
    }
  };

  const confirmDeleteLog = async () => {
    if (!logToDelete) return;
    setIsProcessing(true);
    try {
        await removeSignatureLog(logToDelete.id);
        setLogToDelete(null);
    } catch (error: any) {
        alert(`Erro ao excluir histórico: ${error.message}`);
    } finally {
        setIsProcessing(false);
    }
  };

  const handleCepChange = async (val: string) => {
    const cleaned = val.replace(/\D/g, '').substring(0, 8);
    const formatted = cleaned.length > 5 ? `${cleaned.slice(0, 5)}-${cleaned.slice(5)}` : cleaned;
    
    setMgmtForm((prev: any) => ({ ...prev, cep: formatted }));

    if (cleaned.length === 8) {
      setIsFetchingCep(true);
      try {
        const res = await fetch(`https://brasilapi.com.br/api/cep/v2/${cleaned}`);
        if (res.status === 404) {
            console.warn("CEP não encontrado.");
            setIsFetchingCep(false);
            return;
        }
        if (!res.ok) throw new Error("Erro na rede");
        const data = await res.json();
        if (data) {
            setMgmtForm((prev: any) => ({ 
              ...prev, 
              address: data.street || '', 
              neighborhood: data.neighborhood || '', 
              city: data.city || '', 
              state: data.state || '', 
              cep: formatted 
            }));
        }
      } catch (e) {
          console.error("Erro ao buscar CEP (BrasilAPI):", e);
      } finally {
          setIsFetchingCep(false);
      }
    }
  };

  const handleMgmtPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setMgmtForm((prev: any) => ({ ...prev, image: reader.result as string }));
      reader.readAsDataURL(file);
    }
  };

  const handleAddCert = () => {
    if (certInput.trim()) {
        setMgmtCerts([...mgmtCerts, certInput.trim()]);
        setCertInput('');
    }
  };

  const handleSaveMgmtItem = async () => {
    if (!mgmtForm.name) return alert("Nome obrigatório.");
    setIsProcessing(true);
    try {
        const payload = { 
            ...mgmtForm, 
            certifications: mgmtCerts,
            site: mgmtForm.site || '',
            phone: mgmtForm.phone || '',
            cnpj: mgmtForm.cnpj || '',
            number: mgmtForm.number || '',
            complement: mgmtForm.complement || '',
            neighborhood: mgmtForm.neighborhood || '',
            city: mgmtForm.city || '',
            state: mgmtForm.state || '',
            cep: mgmtForm.cep || '',
            image: mgmtForm.image || ''
        };
        
        if (mgmtTab === 'units') {
            if (editingMgmtItem) await updateSignatureUnit(editingMgmtItem.id, payload);
            else await addSignatureUnit(payload);
        } else {
            if (editingMgmtItem) await updateSignatureSector(editingMgmtItem.id, payload);
            else await addSignatureSector(payload);
        }
        setIsMgmtModalOpen(false); 
    } catch (e: any) { 
        alert(`Erro ao salvar: ${e.message}`); 
    } finally { 
        setIsProcessing(false); 
    }
  };

  const filteredLogs = logs.filter(log => log.employeeName.toLowerCase().includes(searchTerm.toLowerCase()));
  const filteredRequests = requests.filter(req => req.status === 'PENDING' && req.userName.toLowerCase().includes(searchTerm.toLowerCase()));
  const inputClassName = "w-full p-2.5 border border-slate-300 rounded-lg text-sm bg-white text-slate-900 focus:ring-2 focus:ring-emerald-500 shadow-sm transition-all";

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-emerald-600" size={32} /></div>;

  return (
    <div className="space-y-6 relative">
      <canvas ref={hiddenCanvasRef} className="hidden" />
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div><h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><FileText className="text-emerald-600" /> Gestão de Assinaturas</h2></div>
        <div className="relative w-full md:w-auto">
            <Search className="absolute left-3 top-3 text-slate-400 w-4 h-4" />
            <input type="text" placeholder="Buscar colaborador..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 w-full md:w-64 shadow-sm" />
        </div>
      </div>

      <div className="flex gap-2 border-b border-slate-200 overflow-x-auto">
        <button type="button" onClick={() => setActiveTab('requests')} className={`px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap flex items-center gap-2 transition-all ${activeTab === 'requests' ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50' : 'border-transparent text-slate-500 hover:text-slate-700'}`}><ClipboardList size={16}/> Solicitações {filteredRequests.length > 0 && <span className="bg-emerald-600 text-white text-[10px] px-1.5 py-0.5 rounded-full ml-1">{filteredRequests.length}</span>}</button>
        <button type="button" onClick={() => setActiveTab('create')} className={`px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap flex items-center gap-2 transition-all ${activeTab === 'create' ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50' : 'border-transparent text-slate-500 hover:text-slate-700'}`}><PenTool size={16}/> Criar Assinatura {selectedRequest && <span className="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded text-[10px] animate-pulse ml-1">Processando</span>}</button>
        <button type="button" onClick={() => setActiveTab('logs')} className={`px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap flex items-center gap-2 transition-all ${activeTab === 'logs' ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50' : 'border-transparent text-slate-500 hover:text-slate-700'}`}><CheckSquare size={16}/> Histórico</button>
        <button type="button" onClick={() => setActiveTab('management')} className={`px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap flex items-center gap-2 transition-all ${activeTab === 'management' ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50' : 'border-transparent text-slate-500 hover:text-slate-700'}`}><Settings size={16}/> Configurações</button>
      </div>

      {activeTab === 'create' && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 animate-fade-in relative">
            {showSuccessToast && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-emerald-500 text-white px-6 py-2 rounded-full shadow-lg flex items-center gap-2 animate-bounce z-20">
                    <CheckCircle2 size={18}/> Assinatura salva com sucesso!
                </div>
            )}

            {selectedRequest && (
                <div className="mb-6 p-4 bg-amber-50 border border-amber-100 rounded-xl flex items-center justify-between animate-fade-in">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-100 rounded-full text-amber-600"><AlertCircle size={20}/></div>
                        <div>
                            <p className="text-sm font-bold text-amber-800">Processando solicitação de {selectedRequest.userName}</p>
                            <p className="text-xs text-amber-600">Observações: "{selectedRequest.notes}"</p>
                        </div>
                    </div>
                    <button type="button" onClick={() => {setSelectedRequest(null); setSelectedEmployeeId('');}} className="text-xs font-bold text-amber-700 hover:underline">Cancelar vínculo</button>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1 space-y-5">
                    <div>
                        <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Colaborador (Opcional)</label>
                        <select value={selectedEmployeeId} onChange={handleSelectEmployee} className={inputClassName}>
                            <option value="">Selecionar manualmente...</option>
                            {employees.sort((a,b) => a.name.localeCompare(b.name)).map(emp => (
                                <option key={emp.id} value={emp.id}>{emp.name} ({emp.department})</option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-slate-100">
                        <div>
                            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Unidade</label>
                            <select value={genData.unitId} onChange={e => setGenData({...genData, unitId: e.target.value})} className={inputClassName}>
                                <option value="">Selecione Unidade</option>
                                {units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                            </select>
                        </div>
                        <input value={genData.name} onChange={e => setGenData({...genData, name: e.target.value})} className={inputClassName} placeholder="Nome Completo"/>
                        <input value={genData.email} onChange={e => setGenData({...genData, email: e.target.value})} className={inputClassName} placeholder="E-mail"/>
                        
                        <div>
                            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Cargo / Setor (Exclusivo)</label>
                            <select value={genData.sector} onChange={e => setGenData({...genData, sector: e.target.value})} className={inputClassName}>
                                <option value="">Selecione um Cargo/Setor...</option>
                                {departments.sort((a,b) => a.name.localeCompare(b.name)).map(d => (
                                    <option key={d.id} value={d.name}>{d.name}</option>
                                ))}
                            </select>
                        </div>
                        
                        <div>
                            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Telefones (WhatsApp e Ramal)</label>
                            {phones.map((p, i) => (
                                <div key={i} className="flex gap-1 mb-1 animate-fade-in">
                                    <input value={p.number} onChange={e => { const n = [...phones]; n[i].number = formatPhoneMask(e.target.value); setPhones(n); }} className={`${inputClassName} flex-1`} placeholder="(XX) XXXXX-XXXX"/>
                                    <select value={p.type} onChange={e => { const n = [...phones]; n[i].type = e.target.value as any; setPhones(n); }} className="border border-slate-300 rounded-lg p-2 text-sm bg-white w-24">
                                        <option value="celular">Cel</option>
                                        <option value="fixo">Fixo</option>
                                    </select>
                                    <button type="button" onClick={() => setPhones(phones.filter((_, idx) => idx !== i))} className="text-red-400 px-1 hover:bg-red-50 rounded"><Minus size={16}/></button>
                                </div>
                            ))}
                            <button type="button" onClick={() => setPhones([...phones, {number: '', type: 'celular'}])} className="text-xs text-emerald-600 flex items-center gap-1 font-bold mt-1 hover:underline"><Plus size={12}/> Adicionar Telefone</button>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            <button type="button" onClick={handleClearForm} className="bg-slate-100 text-slate-600 p-2.5 rounded-lg font-bold hover:bg-slate-200 flex items-center justify-center gap-2 transition-all border border-slate-200">
                                <Eraser size={16}/> Limpar
                            </button>
                            <button type="button" onClick={generatePreview} disabled={isProcessing} className="bg-emerald-600 text-white p-2.5 rounded-lg font-bold hover:bg-emerald-700 flex items-center justify-center gap-2 shadow-md shadow-emerald-100 disabled:opacity-50 transition-all">
                                {isProcessing ? <Loader2 className="animate-spin" size={16}/> : <RefreshCw size={16}/>} Preview
                            </button>
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-2 bg-slate-100 rounded-xl p-6 flex flex-col items-center justify-center border min-h-[400px]">
                    <canvas ref={canvasRef} className="hidden" />
                    {generatedImage ? (
                        <div className="text-center space-y-6 w-full max-w-2xl animate-fade-in">
                            <div className="bg-white p-4 shadow-xl border border-slate-200 rounded-lg overflow-hidden">
                                <img src={generatedImage} alt="Preview" className="max-w-full"/>
                            </div>
                            <div className="flex flex-wrap justify-center gap-3">
                                {selectedRequest ? (
                                    <button 
                                        type="button" 
                                        onClick={() => setShowFinishConfirm(true)} 
                                        disabled={isProcessing} 
                                        className="bg-emerald-600 text-white px-6 py-2.5 rounded-lg text-sm font-bold hover:bg-emerald-700 flex items-center gap-2 shadow-md shadow-emerald-200 transition-all active:scale-95"
                                    >
                                        {isProcessing ? <Loader2 className="animate-spin" size={18}/> : <CheckSquare size={18}/>} Finalizar e Notificar Solicitante
                                    </button>
                                ) : (
                                    <button 
                                        type="button" 
                                        onClick={() => setShowManualSaveConfirm(true)} 
                                        disabled={isProcessing} 
                                        className="bg-emerald-600 text-white px-6 py-2.5 rounded-lg text-sm font-bold hover:bg-emerald-700 flex items-center gap-2 shadow-md shadow-emerald-200"
                                    >
                                        {isProcessing ? <Loader2 className="animate-spin" size={18}/> : <Save size={18}/>} Salvar no Histórico
                                    </button>
                                )}
                                <a href={generatedImage} download={`assinatura_${genData.name}.png`} className="bg-white border border-slate-200 text-slate-700 px-6 py-2.5 rounded-lg text-sm font-bold hover:bg-slate-50 flex items-center gap-2 shadow-sm"><Download size={18}/> Baixar PNG</a>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-2 text-slate-400">
                            <PenTool size={48} className="opacity-20 mb-2"/><p className="italic">Gere o preview para habilitar a finalização.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
      )}

      {activeTab === 'requests' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-fade-in">
            {filteredRequests.length > 0 ? (
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[800px]">
                        <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-bold">
                            <th className="px-6 py-4">Data</th><th className="px-6 py-4">Colaborador</th><th className="px-6 py-4">Observações</th><th className="px-6 py-4">Status</th><th className="px-6 py-4 text-right">Ações</th>
                        </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                        {filteredRequests.map(req => (
                            <tr key={req.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-6 py-4 text-sm text-slate-500">{new Date(req.createdAt).toLocaleDateString()}</td>
                                <td className="px-6 py-4">
                                    <p className="font-bold text-slate-800 text-sm">{req.userName}</p>
                                    <p className="text-xs text-slate-500">{req.userEmail}</p>
                                </td>
                                <td className="px-6 py-4 text-xs text-slate-500 italic max-w-xs truncate">"{req.notes}"</td>
                                <td className="px-6 py-4">
                                    <span className="text-[10px] uppercase font-bold px-2 py-1 rounded-full border bg-amber-50 text-amber-600 border-amber-100">Pendente</span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex justify-end gap-2">
                                        <button type="button" onClick={() => handleProcessRequest(req)} className="text-xs bg-emerald-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-emerald-700 shadow-sm shadow-emerald-100 transition-all"><PenTool size={14}/> Processar Agora</button>
                                        <button 
                                            type="button" 
                                            onClick={() => setRequestToDelete(req)} 
                                            disabled={!isMaster}
                                            title={!isMaster ? "Apenas usuários Master podem excluir" : "Excluir solicitação"}
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
            ) : (
                <div className="p-20 text-center bg-slate-50/50 flex flex-col items-center justify-center animate-fade-in">
                    <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-6 text-slate-300">
                        <ClipboardList size={40} />
                    </div>
                    <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight mb-2">Sem solicitações no momento</h3>
                    <p className="text-slate-500 max-w-md mx-auto leading-relaxed text-sm">Nenhum colaborador solicitou uma nova assinatura de e-mail recentemente. Quando houver solicitações pendentes, elas aparecerão nesta lista.</p>
                </div>
            )}
        </div>
      )}

      {activeTab === 'logs' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-fade-in">
            {filteredLogs.length > 0 ? (
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[800px]">
                        <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-bold">
                            <th className="px-6 py-4">Data/Hora</th><th className="px-6 py-4">Origem</th><th className="px-6 py-4">Colaborador</th><th className="px-6 py-4">Setor / Unidade</th><th className="px-6 py-4">Processado Por</th><th className="px-6 py-4 text-right">Ação</th>
                        </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                        {filteredLogs.map(log => (
                            <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-6 py-4">
                                <p className="text-xs font-bold text-slate-700">{new Date(log.createdAt).toLocaleDateString()}</p>
                                <p className="text-[10px] text-slate-400">{new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`text-[9px] uppercase font-black px-2 py-0.5 rounded-full flex items-center gap-1 w-fit border ${log.origin === 'REQUEST' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                                        {log.origin === 'REQUEST' ? <MessageSquare size={10}/> : <UserPlus size={10}/>}
                                        {log.origin === 'REQUEST' ? 'Solicitação' : 'Avulso'}
                                    </span>
                                </td>
                                <td className="px-6 py-4"><p className="font-bold text-slate-800 text-sm">{log.employeeName}</p><p className="text-xs text-slate-500">{log.employeeEmail}</p></td>
                                <td className="px-6 py-4"><span className="bg-slate-100 px-2 py-0.5 rounded text-[10px] font-bold text-slate-600 border border-slate-200">{log.department}</span><p className="text-[10px] text-slate-400 mt-1">{log.unitName}</p></td>
                                <td className="px-6 py-4">
                                <div className="flex items-center gap-2">
                                    <div className="p-1.5 bg-slate-100 rounded-full text-slate-500"><UserCheck size={14}/></div>
                                    <span className="text-xs font-bold text-slate-700">{log.generatedBy}</span>
                                </div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex justify-end gap-2">
                                        <button type="button" onClick={() => handleViewFromLog(log)} className="text-xs bg-slate-100 text-slate-600 px-3 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-slate-200 transition-all border border-slate-200"><Eye size={14}/> Visualizar</button>
                                        <button type="button" onClick={() => handleDownloadFromLog(log)} className="text-xs bg-emerald-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-emerald-700 shadow-sm shadow-emerald-100 transition-all"><Download size={14}/> Baixar</button>
                                        <button 
                                            type="button" 
                                            onClick={() => setLogToDelete(log)} 
                                            disabled={!isMaster}
                                            title={!isMaster ? "Apenas usuários Master podem excluir" : "Excluir histórico"}
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
            ) : (
                <div className="p-20 text-center bg-slate-50/50 flex flex-col items-center justify-center animate-fade-in">
                    <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-6 text-slate-300">
                        <FileSpreadsheet size={40} />
                    </div>
                    <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight mb-2">Histórico de Geracão Vazio</h3>
                    <p className="text-slate-500 max-w-md mx-auto leading-relaxed text-sm">Ainda não foram geradas assinaturas oficiais através desta ferramenta. Comece processando uma solicitação ou criando uma manualmente.</p>
                    <button 
                        onClick={() => setActiveTab('create')}
                        className="mt-6 text-emerald-600 font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:underline"
                    >
                        <PenTool size={14}/> Criar Primeira Assinatura
                    </button>
                </div>
            )}
        </div>
      )}
      
      {activeTab === 'management' && (
        <div className="space-y-6 animate-fade-in">
            <div className="flex gap-4 border-b border-slate-200">
                <button type="button" onClick={() => setMgmtTab('units')} className={`pb-2 px-4 text-sm font-bold transition-all ${mgmtTab === 'units' ? 'border-b-2 border-emerald-600 text-emerald-700' : 'text-slate-400 hover:text-slate-600'}`}>Unidades Físicas</button>
                <button type="button" onClick={() => setMgmtTab('sectors')} className={`pb-2 px-4 text-sm font-bold transition-all ${mgmtTab === 'sectors' ? 'border-b-2 border-emerald-600 text-emerald-700' : 'text-slate-400 hover:text-slate-600'}`}>Cargos / Setores</button>
            </div>

            <div className="flex justify-end">
                <button type="button" onClick={() => handleOpenMgmtModal()} className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-emerald-700 shadow-sm shadow-emerald-100"><Plus size={16}/> Adicionar {mgmtTab === 'units' ? 'Unidade' : 'Setor'}</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {mgmtTab === 'units' ? (
                    units.map(u => (
                        <div key={u.id} className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col hover:border-emerald-300 hover:shadow-xl transition-all group overflow-hidden relative">
                            <div className="flex items-start justify-between mb-4">
                                <div className="w-24 h-12 flex items-center justify-center bg-slate-50 rounded-xl overflow-hidden border border-slate-100 group-hover:bg-white transition-colors p-2 shadow-inner">
                                    {u.image ? (
                                        <img src={u.image} alt={u.name} className="max-w-full max-h-full object-contain" />
                                    ) : (
                                        <div className="text-emerald-600 flex items-center gap-1.5 font-black uppercase text-[10px]">
                                            <MapPin size={16} /> UNID
                                        </div>
                                    )}
                                </div>
                                
                                <div className="flex gap-1">
                                    <button type="button" onClick={() => handleOpenMgmtModal(u)} className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"><Edit2 size={16}/></button>
                                    <button 
                                        type="button" 
                                        onClick={(e) => handleRequestDeleteMgmtItem(e, u)} 
                                        disabled={!isMaster}
                                        className={`p-2 transition-colors rounded-lg ${isMaster ? 'text-slate-400 hover:text-red-600 hover:bg-red-50' : 'text-slate-200 cursor-not-allowed opacity-50'}`}
                                    >
                                        {isMaster ? <Trash2 size={16} /> : <Lock size={16} />}
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-3 mb-6">
                                <div>
                                    <h4 className="font-black text-slate-800 uppercase tracking-tight text-lg leading-tight group-hover:text-emerald-600 transition-colors">{u.name}</h4>
                                    <p className="text-[10px] font-bold text-slate-400 flex items-center gap-1 uppercase tracking-widest mt-1">
                                        <Hash size={10} /> {u.cnpj || 'CNPJ não informado'}
                                    </p>
                                </div>

                                <div className="space-y-1.5">
                                    <p className="text-xs text-slate-600 flex items-start gap-2 leading-snug">
                                        <MapPin size={14} className="text-slate-400 shrink-0 mt-0.5" />
                                        <span>{u.address}, {u.number}{u.complement ? ` - ${u.complement}` : ''}<br/>{u.neighborhood} - {u.city}/{u.state}</span>
                                    </p>
                                    <p className="text-[10px] text-slate-400 font-bold pl-5">CEP: {u.cep || '---'}</p>
                                </div>
                            </div>

                            <div className="mt-auto space-y-4 pt-4 border-t border-slate-50">
                                <div className="flex flex-wrap gap-4">
                                    {u.phone && (
                                        <p className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                                            <Phone size={12} className="text-emerald-500" /> {u.phone}
                                        </p>
                                    )}
                                    {u.site && (
                                        <p className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                                            <Globe size={12} className="text-blue-500" /> {u.site.replace(/^https?:\/\//, '')}
                                        </p>
                                    )}
                                </div>

                                {u.certifications && u.certifications.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5">
                                        {u.certifications.map((cert, idx) => (
                                            <span key={idx} className="bg-amber-50 text-amber-700 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border border-amber-100 flex items-center gap-1">
                                                <Award size={10}/> {cert}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                ) : (
                    departments.sort((a,b) => a.name.localeCompare(b.name)).map(d => (
                        <div key={d.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between hover:border-emerald-300 transition-all group">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600"><Briefcase size={18}/></div>
                                <span className="font-bold text-slate-700 text-sm">{d.name}</span>
                            </div>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button type="button" onClick={() => handleOpenMgmtModal(d)} className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg"><Edit2 size={14}/></button>
                                <button 
                                    type="button" 
                                    onClick={(e) => handleRequestDeleteMgmtItem(e, d)} 
                                    disabled={!isMaster}
                                    className={`p-1.5 transition-colors rounded-lg ${isMaster ? 'text-slate-400 hover:text-red-600 hover:bg-red-50' : 'text-slate-200 cursor-not-allowed opacity-50'}`}
                                >
                                    {isMaster ? <Trash2 size={14} /> : <Lock size={14} />}
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
      )}

      {/* MODAL: VISUALIZAR ASSINATURA DO HISTÓRICO */}
      {viewingLogSignatureUrl && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-fade-in">
           <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden p-8 flex flex-col items-center">
                <div className="w-full flex justify-between items-center mb-8"><h3 className="font-black text-slate-800 uppercase text-xs tracking-[0.3em]">Visualização: Assinatura Gerada</h3><button onClick={() => setViewingLogSignatureUrl(null)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-all"><X size={24}/></button></div>
                <div className="bg-white p-6 shadow-2xl border border-slate-100 rounded-xl overflow-hidden mb-10 w-full flex justify-center"><img src={viewingLogSignatureUrl} alt="Log Signature Preview" className="max-w-full"/></div>
                <div className="flex gap-3"><button onClick={() => setViewingLogSignatureUrl(null)} className="px-8 py-3 text-slate-400 font-black uppercase text-xs hover:bg-slate-100 rounded-xl transition-all">Fechar</button></div>
           </div>
        </div>
      )}

      {isMgmtModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h3 className="font-black text-slate-800 uppercase tracking-widest text-sm flex items-center gap-2">
                        {mgmtTab === 'units' ? <MapPin size={18} className="text-emerald-600"/> : <Briefcase size={18} className="text-emerald-600"/>}
                        {editingMgmtItem ? 'Editar' : 'Adicionar'} {mgmtTab === 'units' ? 'Unidade' : 'Setor'}
                    </h3>
                    <button onClick={() => setIsMgmtModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full text-slate-400"><X size={24}/></button>
                </div>

                <div className="p-8 overflow-y-auto custom-scrollbar space-y-6">
                    {mgmtTab === 'units' ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="col-span-full flex flex-col items-center gap-2 mb-4">
                                <div className="w-48 h-20 bg-slate-100 rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden relative group">
                                    {mgmtForm.image ? <img src={mgmtForm.image} className="w-full h-full object-contain p-2" alt="Logo preview"/> : <ImageIcon size={24} className="text-slate-400"/>}
                                    <label className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                                        <Camera size={20} className="text-white"/>
                                        <input type="file" accept="image/*" className="hidden" onChange={handleMgmtPhotoUpload}/>
                                    </label>
                                </div>
                                <span className="text-[10px] uppercase font-bold text-slate-400">Logo da Unidade (PNG)</span>
                            </div>
                            <div className="col-span-full"><label className="text-[10px] font-bold text-slate-400 uppercase">Nome da Unidade</label><input value={mgmtForm.name || ''} onChange={e => setMgmtForm({...mgmtForm, name: e.target.value})} className={inputClassName}/></div>
                            <div><label className="text-[10px] font-bold text-slate-400 uppercase">CNPJ</label><input value={mgmtForm.cnpj || ''} onChange={e => setMgmtForm({...mgmtForm, cnpj: e.target.value})} className={inputClassName}/></div>
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase flex justify-between">
                                    CEP (Auto-busca)
                                    {isFetchingCep && <Loader2 size={10} className="animate-spin text-emerald-500" />}
                                </label>
                                <input value={mgmtForm.cep || ''} onChange={e => handleCepChange(e.target.value)} className={inputClassName} placeholder="00000-000"/>
                            </div>
                            <div className="col-span-full"><label className="text-[10px] font-bold text-slate-400 uppercase">Logradouro / Endereço</label><input value={mgmtForm.address || ''} onChange={e => setMgmtForm({...mgmtForm, address: e.target.value})} className={inputClassName}/></div>
                            <div><label className="text-[10px] font-bold text-slate-400 uppercase">Número</label><input value={mgmtForm.number || ''} onChange={e => setMgmtForm({...mgmtForm, number: e.target.value})} className={inputClassName}/></div>
                            <div><label className="text-[10px] font-bold text-slate-400 uppercase">Complemento</label><input value={mgmtForm.complement || ''} onChange={e => setMgmtForm({...mgmtForm, complement: e.target.value})} className={inputClassName}/></div>
                            <div><label className="text-[10px] font-bold text-slate-400 uppercase">Bairro</label><input value={mgmtForm.neighborhood || ''} onChange={e => setMgmtForm({...mgmtForm, neighborhood: e.target.value})} className={inputClassName}/></div>
                            <div><label className="text-[10px] font-bold text-slate-400 uppercase">Cidade / UF</label><div className="flex gap-2"><input value={mgmtForm.city || ''} onChange={e => setMgmtForm({...mgmtForm, city: e.target.value})} className={`${inputClassName} flex-1`}/><input value={mgmtForm.state || ''} onChange={e => setMgmtForm({...mgmtForm, state: e.target.value})} className={`${inputClassName} w-16 uppercase`} maxLength={2}/></div></div>
                            
                            <div className="col-span-full border-t border-slate-100 pt-4 mt-2">
                                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Contato Adicional</label>
                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className="text-[8px] uppercase font-bold text-slate-400">Site Oficial</label><input value={mgmtForm.site || ''} onChange={e => setMgmtForm({...mgmtForm, site: e.target.value})} className={inputClassName} placeholder="Ex: www.site.com.br"/></div>
                                    <div><label className="text-[8px] uppercase font-bold text-slate-400">Telefone Geral</label><input value={mgmtForm.phone || ''} onChange={e => setMgmtForm({...mgmtForm, phone: e.target.value})} className={inputClassName} placeholder="Ex: (71) 0000-0000"/></div>
                                </div>
                            </div>

                            <div className="col-span-full border-t border-slate-100 pt-4 mt-2">
                                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-3">Certificações / Selos (Máx 4)</label>
                                <div className="flex gap-2 mb-4">
                                    <input value={certInput} onChange={e => setCertInput(e.target.value)} className={`${inputClassName} flex-1`} placeholder="Ex: ISO 9001"/>
                                    <button type="button" onClick={handleAddCert} className="bg-slate-100 px-4 rounded-lg font-bold text-slate-600 hover:bg-slate-200 transition-all"><Plus size={18}/></button>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {mgmtCerts.map((c, i) => (
                                        <span key={i} className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-3 py-1.5 rounded-full border border-emerald-100 flex items-center gap-2">
                                            {c} <button type="button" onClick={() => setMgmtCerts(mgmtCerts.filter((_, idx) => idx !== i))} aria-label="Remover certificação"><X size={12}/></button>
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div><label className="text-[10px] font-bold text-slate-400 uppercase">Nome do Cargo / Setor</label><input value={mgmtForm.name || ''} onChange={e => setMgmtForm({...mgmtForm, name: e.target.value})} className={inputClassName} placeholder="Ex: Gerente de Operações"/></div>
                            <div><label className="text-[10px] font-bold text-slate-400 uppercase">Observações Internas (Opcional)</label><textarea value={mgmtForm.description || ''} onChange={e => setMgmtForm({...mgmtForm, description: e.target.value})} className={`${inputClassName} min-h-[100px]`}/></div>
                        </div>
                    )}
                </div>

                <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                    <button onClick={() => setIsMgmtModalOpen(false)} className="px-6 py-2 text-slate-600 font-bold text-sm hover:bg-slate-200 rounded-xl transition-all" disabled={isProcessing}>Cancelar</button>
                    <button onClick={handleSaveMgmtItem} className="px-10 py-2 bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-700 rounded-xl shadow-lg shadow-emerald-200 flex items-center gap-2" disabled={isProcessing}>{isProcessing ? <Loader2 className="animate-spin" size={18}/> : <Save size={18}/>} Salvar</button>
                </div>
            </div>
        </div>
      )}

      {showFinishConfirm && selectedRequest && (
        <div className="fixed inset-0 bg-slate-900/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
           <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden border-2 border-emerald-100">
              <div className="p-6 text-center">
                 <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4 text-emerald-600">
                    <Send size={32} />
                 </div>
                 <h3 className="text-lg font-bold text-slate-800 mb-2">Finalizar Processamento?</h3>
                 <p className="text-sm text-slate-500 mb-6">
                    Deseja finalizar e notificar <strong>{selectedRequest.userName}</strong>?<br/>A assinatura será salva no histórico e a tarefa correspondente no iRamais será concluída.
                 </p>
                 <div className="flex gap-3">
                   <button 
                    onClick={() => setShowFinishConfirm(false)} 
                    className="flex-1 py-3 text-slate-600 hover:bg-slate-100 rounded-xl font-bold text-sm transition-colors" 
                    disabled={isProcessing}
                   >
                    Cancelar
                   </button>
                   <button 
                    onClick={handleFinishAndNotify} 
                    className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 flex items-center justify-center gap-2 shadow-lg shadow-emerald-200 transition-colors" 
                    disabled={isProcessing}
                   >
                     {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <CheckSquare size={16} />} Confirmar e Notificar
                   </button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {showManualSaveConfirm && (
        <div className="fixed inset-0 bg-slate-900/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
           <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden border-2 border-emerald-100">
              <div className="p-6 text-center">
                 <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4 text-emerald-600">
                    <Save size={32} />
                 </div>
                 <h3 className="text-lg font-bold text-slate-800 mb-2">Salvar no Histórico?</h3>
                 <p className="text-sm text-slate-500 mb-6">
                    Esta assinatura não está vinculada a uma solicitação. Deseja salvá-la no histórico para futuras consultas e downloads?
                 </p>
                 <div className="flex gap-3">
                   <button 
                    onClick={() => setShowManualSaveConfirm(false)} 
                    className="flex-1 py-3 text-slate-600 hover:bg-slate-100 rounded-xl font-bold text-sm transition-colors" 
                    disabled={isProcessing}
                   >
                    Não, apenas ver
                   </button>
                   <button 
                    onClick={handleConfirmManualSave} 
                    className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 flex items-center justify-center gap-2 shadow-lg shadow-emerald-200 transition-all" 
                    disabled={isProcessing}
                   >
                     {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <CheckSquare size={16} />} Confirmar e Salvar
                   </button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {mgmtItemToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 z-[120] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
           <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden border-2 border-red-100">
              <div className="p-6 text-center">
                 <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500">
                    <AlertTriangle size={32} />
                 </div>
                 <h3 className="text-lg font-bold text-slate-800 mb-2">Excluir {mgmtTab === 'units' ? 'Unidade' : 'Setor'}?</h3>
                 <p className="text-sm text-slate-500 mb-6">
                    Tem certeza que deseja remover <strong>"{mgmtItemToDelete.name}"</strong>?<br/>Isso não apagará as assinaturas geradas anteriormente, mas impedirá novas.
                 </p>
                 <div className="flex gap-3">
                   <button onClick={() => setMgmtItemToDelete(null)} className="flex-1 py-3 text-slate-600 hover:bg-slate-100 rounded-xl font-bold text-sm" disabled={isProcessing}>Cancelar</button>
                   <button onClick={confirmDeleteMgmtItem} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold text-sm hover:bg-red-700 transition-all flex items-center justify-center gap-2" disabled={isProcessing}>
                     {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />} Sim, Excluir
                   </button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {requestToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 z-[120] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
           <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden border-2 border-red-100">
              <div className="p-6 text-center">
                 <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500">
                    <AlertTriangle size={32} />
                 </div>
                 <h3 className="text-lg font-bold text-slate-800 mb-2">Excluir Solicitação?</h3>
                 <p className="text-sm text-slate-500 mb-6">
                    Deseja remover permanentemente a solicitação de <strong>{requestToDelete.userName}</strong>?
                 </p>
                 <div className="flex gap-3">
                   <button onClick={() => setRequestToDelete(null)} className="flex-1 py-3 text-slate-600 hover:bg-slate-100 rounded-xl font-bold text-sm" disabled={isProcessing}>Cancelar</button>
                   <button onClick={confirmDeleteRequest} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold text-sm hover:bg-red-700 flex items-center justify-center gap-2" disabled={isProcessing}>
                     {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />} Sim, Excluir
                   </button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {logToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 z-[120] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
           <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden border-2 border-red-100">
              <div className="p-6 text-center">
                 <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500">
                    <AlertTriangle size={32} />
                 </div>
                 <h3 className="text-lg font-bold text-slate-800 mb-2">Excluir do Histórico?</h3>
                 <p className="text-sm text-slate-500 mb-6">
                    Deseja remover o registro de <strong>{logToDelete.employeeName}</strong> do histórico?<br/>Isso não impedirá o colaborador de baixar a assinatura dele.
                 </p>
                 <div className="flex gap-3">
                   <button onClick={() => setLogToDelete(null)} className="flex-1 py-3 text-slate-600 hover:bg-slate-100 rounded-xl font-bold text-sm" disabled={isProcessing}>Cancelar</button>
                   <button onClick={confirmDeleteLog} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold text-sm hover:bg-red-700 flex items-center justify-center gap-2" disabled={isProcessing}>
                     {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />} Sim, Excluir
                   </button>
                 </div>
              </div>
           </div>
        </div>
      )}

    </div>
  );
};

export default AdminSignatures;
