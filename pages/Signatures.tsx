
import React, { useState, useEffect, useRef } from 'react';
import { 
    subscribeTerms, signTerm, fetchTermTemplates, addSignatureRequest, subscribeSignatureRequests, subscribeSignatureUnits
} from '../services/firebaseService';
import { Term, TermTemplate, TableField, SignatureRequest, OrganizationUnit, SignatureData } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { Send, ClipboardList, CheckCircle2, Clock, Loader2, PenTool, Download, X, FileText, Check, ShieldCheck, MapPin, Printer, Settings, Lock, Info, AlertTriangle, Calendar, Link as LinkIcon, History, Plus, Mail, Phone, Briefcase, User, UserPlus, UserCheck, Eye, EyeOff, Building2, FileSearch, Signature, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import Logo from '../components/Logo';
import { renderSignatureToCanvas } from './AdminSignatures';

const Signatures: React.FC = () => {
  const { currentUser, user, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<'terms' | 'email'>('terms');
  
  // Estados para Termos
  const [myTerms, setMyTerms] = useState<Term[]>([]);
  const [templates, setTemplates] = useState<TermTemplate[]>([]);
  
  // Estados para Assinatura de E-mail
  const [myRequests, setMyRequests] = useState<SignatureRequest[]>([]);
  const [units, setUnits] = useState<OrganizationUnit[]>([]);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [viewingSignatureUrl, setViewingSignatureUrl] = useState<string | null>(null);

  // Form de Solicitação
  const [requestForm, setRequestForm] = useState({
    name: '',
    email: '',
    sector: '',
    phoneFixed: '',
    phoneMobile: '',
    notes: ''
  });

  const [loading, setLoading] = useState(true);
  const [activeTermToSign, setActiveTermToSign] = useState<Term | null>(null);
  const [viewingSignedTerm, setViewingSignedTerm] = useState<Term | null>(null);
  const [processedViewContent, setProcessedViewContent] = useState('');

  // Estados do Form de Assinatura Digital
  const [signingCpf, setSigningCpf] = useState('');
  const [signingPassword, setSigningPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const hiddenCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!currentUser) return;
    setLoading(true);

    const unsubTerms = subscribeTerms((data) => setMyTerms(data), currentUser.id);
    const unsubRequests = subscribeSignatureRequests((data) => setMyRequests(data), currentUser.id);
    const unsubUnits = subscribeSignatureUnits(setUnits);

    Promise.all([fetchTermTemplates()]).then(([templatesData]) => {
        setTemplates(templatesData);
        setLoading(false);
    }).catch(() => setLoading(false));

    return () => {
        unsubTerms();
        unsubRequests();
        unsubUnits();
    };
  }, [currentUser]);

  const handleOpenCertificate = async (term: Term) => {
    const template = templates.find(t => t.id === term.templateId);
    if (!template) return alert("Modelo não encontrado.");
    
    let content = template.content;
    Object.entries(term.data).forEach(([key, value]) => {
        const regex = new RegExp(`{{${key}}}`, 'g');
        content = content.replace(regex, value || '');
    });
    
    setProcessedViewContent(content);
    setViewingSignedTerm(term);
    if (term.status === 'PENDENTE') {
        setActiveTermToSign(term);
    } else {
        setActiveTermToSign(null);
    }
  };

  const handleOpenRequestModal = () => {
    if (currentUser) {
        setRequestForm({
            name: currentUser.name,
            email: currentUser.email,
            sector: currentUser.role || currentUser.department,
            phoneFixed: `(71) 3879-${currentUser.extension || ''}`,
            phoneMobile: currentUser.whatsapp || '',
            notes: ''
        });
    }
    setIsRequestModalOpen(true);
  };

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setIsProcessing(true);
    try {
        await addSignatureRequest({
            userId: currentUser.id,
            userName: currentUser.name,
            userEmail: currentUser.email,
            notes: requestForm.notes,
            requestedData: {
                name: requestForm.name,
                email: requestForm.email,
                sector: requestForm.sector,
                phoneFixed: requestForm.phoneFixed,
                phoneMobile: requestForm.phoneMobile
            }
        });
        alert("Solicitação enviada com sucesso! O TI processará sua assinatura em breve.");
        setIsRequestModalOpen(false);
    } catch (error) {
        alert("Erro ao enviar solicitação.");
    } finally {
        setIsProcessing(false);
    }
  };

  const handleViewSignature = async (req: SignatureRequest) => {
    if (!req.signatureData || !hiddenCanvasRef.current) return;
    setIsProcessing(true);
    try {
        await renderSignatureToCanvas(hiddenCanvasRef.current, req.signatureData, units);
        setViewingSignatureUrl(hiddenCanvasRef.current.toDataURL("image/png"));
    } catch (e) {
        alert("Erro ao gerar visualização.");
    } finally {
        setIsProcessing(false);
    }
  };

  const handleDownloadSignature = async (req: SignatureRequest) => {
    if (!req.signatureData || !hiddenCanvasRef.current) return;
    setIsProcessing(true);
    try {
        await renderSignatureToCanvas(hiddenCanvasRef.current, req.signatureData, units);
        const link = document.createElement('a');
        link.download = `assinatura_${currentUser?.name}.png`;
        link.href = hiddenCanvasRef.current.toDataURL("image/png");
        link.click();
    } catch (e) {
        alert("Erro ao gerar download.");
    } finally {
        setIsProcessing(false);
    }
  };

  const handleValidateAndSign = async () => {
    setErrorMsg('');
    const cleanCpf = signingCpf.replace(/\D/g, '');
    if (!activeTermToSign || !cleanCpf || !signingPassword) {
        setErrorMsg("Preencha o CPF e a sua senha de acesso.");
        return;
    }
    if (cleanCpf.length < 11) {
        setErrorMsg("O CPF deve conter 11 dígitos.");
        return;
    }

    setIsProcessing(true);
    try {
        if (user && user.email) {
            const credential = EmailAuthProvider.credential(user.email, signingPassword);
            await reauthenticateWithCredential(user, credential);
            const finalSignatureImage = currentUser?.signatureImage || '';
            await signTerm(activeTermToSign.id, cleanCpf, finalSignatureImage);
            alert("Documento assinado digitalmente com sucesso!");
            setActiveTermToSign(null);
            setViewingSignedTerm(null);
            setSigningPassword('');
            setSigningCpf('');
            setShowPassword(false);
        } else {
            throw new Error("Erro na sessão.");
        }
    } catch (e: any) {
        if (e.code === 'auth/wrong-password' || e.code === 'auth/invalid-credential') {
            setErrorMsg("Senha incorreta. Use a mesma senha do iRamais.");
        } else {
            setErrorMsg("Erro ao validar assinatura.");
        }
    } finally {
        setIsProcessing(false);
    }
  };

  const formatCPF = (value: string) => {
    const v = value.replace(/\D/g, '').substring(0, 11);
    if (v.length <= 3) return v;
    if (v.length <= 6) return `${v.slice(0, 3)}.${v.slice(3)}`;
    if (v.length <= 9) return `${v.slice(0, 3)}.${v.slice(3, 6)}.${v.slice(6)}`;
    return `${v.slice(0, 3)}.${v.slice(3, 6)}.${v.slice(6, 9)}-${v.slice(9)}`;
  };

  if (loading) return <div className="h-[60vh] flex flex-col items-center justify-center"><Loader2 className="animate-spin text-emerald-600 mb-4" size={48} /></div>;

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-20 animate-fade-in">
      <canvas ref={hiddenCanvasRef} className="hidden" />
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2 uppercase tracking-tight">
            <ShieldCheck className="text-emerald-600" size={32} /> Central de Assinaturas
          </h2>
          <p className="text-slate-500 text-sm font-medium">Gestão de termos de responsabilidade e assinaturas de e-mail.</p>
        </div>
        {isAdmin && <Link to="/admin-terms" className="px-5 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-700 text-xs font-black uppercase flex items-center gap-2 shadow-sm hover:bg-slate-50 transition-all"><Settings size={16}/> Painel Administrativo</Link>}
      </div>

      <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl w-fit">
          <button onClick={() => setActiveTab('terms')} className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase transition-all flex items-center gap-2 ${activeTab === 'terms' ? 'bg-white text-emerald-700 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}>
            <ClipboardList size={16}/> Assinatura de Termos
            {myTerms.filter(t => t.status === 'PENDENTE').length > 0 && <span className="bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded-full animate-pulse">{myTerms.filter(t => t.status === 'PENDENTE').length}</span>}
          </button>
          <button onClick={() => setActiveTab('email')} className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase transition-all flex items-center gap-2 ${activeTab === 'email' ? 'bg-white text-emerald-700 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}>
            <Mail size={16}/> Assinatura de E-mail
          </button>
      </div>

      {activeTab === 'terms' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
            {myTerms.length > 0 ? myTerms.map(term => {
                const template = templates.find(t => t.id === term.templateId);
                return (
                    <div key={term.id} className={`bg-white rounded-[2rem] border shadow-sm flex flex-col h-full transition-all hover:shadow-xl ${term.status === 'ASSINADO' ? 'border-slate-100 opacity-90' : 'border-emerald-200 ring-4 ring-emerald-50'}`}>
                        <div className="p-8 flex-1">
                            <div className="flex justify-between items-start mb-6">
                                <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${term.status === 'ASSINADO' ? 'bg-slate-50 text-slate-400' : 'bg-emerald-600 text-white animate-pulse'}`}>{term.status}</span>
                                {term.type === 'devolucao' && <span className="bg-amber-100 text-amber-700 text-[9px] font-black uppercase px-2 py-0.5 rounded-full flex items-center gap-1 border border-amber-200"><History size={10} /> Devolução</span>}
                            </div>
                            <h4 className="font-black text-slate-800 text-lg mb-4 uppercase leading-tight tracking-tight">{term.data.titulo_documento}</h4>
                            <div className="space-y-2">
                                <p className="text-[10px] text-emerald-600 font-black uppercase flex items-center gap-2"><Building2 size={14} className="text-emerald-500"/> Emitido por: {template?.responsibleDepartment || 'Intermarítima'}</p>
                                {term.issuerName && (
                                   <p className="text-[10px] text-slate-500 font-bold uppercase flex items-center gap-2 ml-5">Gerado por: {term.issuerName}</p>
                                )}
                                <p className="text-[10px] text-slate-400 font-black uppercase flex items-center gap-2"><MapPin size={14} className="text-slate-300"/> {term.data.marca_equipamento} {term.data.modelo_equipamento}</p>
                                <p className="text-[10px] text-slate-400 font-black uppercase flex items-center gap-2"><Calendar size={14} className="text-slate-300"/> Emitido: {new Date(term.createdAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                                {term.status === 'ASSINADO' && term.signedAt && (
                                    <p className="text-[10px] text-emerald-600 font-black uppercase flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-500"/> Assinado: {new Date(term.signedAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                                )}
                            </div>
                        </div>
                        <div className="p-6 bg-slate-50/50 border-t mt-auto rounded-b-[2rem] space-y-2">
                            {term.status === 'ASSINADO' ? (
                                <button onClick={() => handleOpenCertificate(term)} className="w-full py-4 bg-white border-2 border-slate-200 rounded-2xl text-[10px] font-black uppercase text-slate-600 hover:bg-slate-100 flex items-center justify-center gap-2 transition-all shadow-sm"><Download size={14}/> Ver Comprovante Digital</button>
                            ) : (
                                <button onClick={() => handleOpenCertificate(term)} className="w-full py-5 bg-emerald-600 text-white rounded-2xl text-[10px] font-black uppercase hover:bg-emerald-700 flex items-center justify-center gap-2 shadow-xl shadow-emerald-200 transition-all active:scale-95"><Eye size={18}/> Visualizar para Assinar</button>
                            )}
                        </div>
                    </div>
                )
            }) : (
                <div className="col-span-full py-20 text-center bg-white rounded-[3rem] border-2 border-dashed border-slate-200 text-slate-400">
                    <ClipboardList size={48} className="mx-auto mb-4 opacity-10" />
                    <p className="font-black uppercase text-xs tracking-widest">Nenhum termo vinculado ao seu CPF</p>
                </div>
            )}
        </div>
      )}

      {activeTab === 'email' && (
        <div className="space-y-6 animate-fade-in">
            <div className="bg-emerald-600 rounded-[2.5rem] p-8 md:p-12 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden">
                <div className="relative z-10 space-y-4 max-w-xl">
                    <h3 className="text-2xl md:text-3xl font-black uppercase tracking-tight">Sua Assinatura Oficial</h3>
                    <p className="text-emerald-50 text-sm md:text-base opacity-90 leading-relaxed font-medium">Solicite ao TI a geração da sua assinatura de e-mail padronizada com seus dados atualizados e logomarca da unidade.</p>
                    <button onClick={handleOpenRequestModal} className="bg-white text-emerald-700 px-8 py-3 rounded-2xl font-black uppercase text-xs hover:bg-emerald-50 transition-all shadow-lg flex items-center gap-2 active:scale-95"><Plus size={18} strokeWidth={3}/> Nova Solicitação</button>
                </div>
                <div className="relative z-10 flex-shrink-0 bg-white/10 p-6 rounded-[2rem] border border-white/20 backdrop-blur-sm shadow-inner animate-float">
                    <PenTool size={80} className="text-white opacity-80" />
                </div>
                <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {myRequests.map(req => (
                    <div key={req.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between group hover:border-emerald-300 transition-all">
                        <div>
                            <div className="flex justify-between items-start mb-4">
                                <div className={`p-3 rounded-2xl ${req.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600 animate-pulse'}`}>
                                    {req.status === 'COMPLETED' ? <UserCheck size={24}/> : <Clock size={24}/>}
                                </div>
                                <span className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-full border ${req.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                                    {req.status === 'COMPLETED' ? 'Concluída' : 'Pendente'}
                                </span>
                            </div>
                            <h4 className="font-bold text-slate-800 text-sm uppercase mb-1">{req.requestedData?.sector || 'Assinatura'}</h4>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-1"><Calendar size={12}/> {new Date(req.createdAt).toLocaleDateString()}</p>
                            {req.status === 'COMPLETED' && req.completedBy && (
                                <p className="text-[9px] text-emerald-600 font-black uppercase mt-2">Gerada por: {req.completedBy}</p>
                            )}
                        </div>
                        {req.status === 'COMPLETED' && (
                            <div className="mt-6 flex gap-2">
                                <button onClick={() => handleViewSignature(req)} className="flex-1 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-200 transition-all flex items-center justify-center gap-2"><Eye size={14}/> Ver</button>
                                <button onClick={() => handleDownloadSignature(req)} className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-100"><Download size={14}/> Baixar</button>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {myRequests.length === 0 && (
                <div className="py-20 text-center bg-white rounded-[3rem] border-2 border-dashed border-slate-200 text-slate-400">
                    <FileSearch size={48} className="mx-auto mb-4 opacity-10" />
                    <p className="font-black uppercase text-xs tracking-widest">Nenhuma solicitação de assinatura</p>
                </div>
            )}
        </div>
      )}

      {/* MODAL: VISUALIZAR E ASSINAR TERMO */}
      {viewingSignedTerm && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-[150] flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-[210mm] my-8 overflow-hidden flex flex-col h-full max-h-[95vh] relative">
                <div className="p-4 border-b flex justify-between items-center bg-slate-50 sticky top-0 z-20">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-100 rounded-xl text-emerald-600"><FileText size={20}/></div>
                        <h3 className="font-black text-slate-800 uppercase text-sm tracking-tight">Visualização do Documento Digital</h3>
                    </div>
                    <div className="flex gap-2">
                        {viewingSignedTerm.status === 'ASSINADO' && (
                            <button onClick={() => window.print()} className="bg-emerald-600 text-white px-5 py-2 rounded-xl text-xs font-black uppercase hover:bg-emerald-700 shadow-md flex items-center gap-2"><Printer size={16}/> Imprimir / PDF</button>
                        )}
                        <button onClick={() => { setViewingSignedTerm(null); setActiveTermToSign(null); setErrorMsg(''); }} className="p-2 hover:bg-slate-200 rounded-full text-slate-400 transition-colors"><X size={24}/></button>
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

                        <h1 className="text-center font-black text-lg md:text-xl mb-10 uppercase tracking-tight">{viewingSignedTerm.data.titulo_documento || 'Termo de Responsabilidade'}</h1>
                        
                        <div className="space-y-1 mb-6 text-[10px] md:text-[11px] font-bold uppercase text-slate-900">
                            <p>COLABORADOR: <span className="font-medium">{viewingSignedTerm.employeeName}</span></p>
                            <p>SETOR: <span className="font-medium">{viewingSignedTerm.data.departamento || '---'}</span></p>
                            <p>CARGO: <span className="font-medium">{viewingSignedTerm.data.cargo || '---'}</span></p>
                        </div>

                        <table className="w-full border-collapse mb-8 border border-emerald-800">
                            <thead><tr className="bg-[#006c5b] text-white text-[9px] md:text-[10px] font-black uppercase"><th className="border border-emerald-800 px-4 py-2 w-1/2 text-center">DESCRIÇÃO</th><th className="border border-emerald-800 px-4 py-2 w-1/2 text-center">DADOS</th></tr></thead>
                            <tbody className="text-[10px] md:text-[11px] font-bold uppercase text-slate-800">
                                {(templates.find(t => t.id === viewingSignedTerm.templateId)?.tableFields || []).map((field, idx) => (
                                    <tr key={idx}>
                                        <td className="border border-emerald-800 px-4 py-1.5 bg-slate-50 text-slate-700 font-black">{field.label}</td>
                                        <td className="border border-emerald-800 px-4 py-1.5 font-medium text-slate-900 whitespace-pre-wrap">{viewingSignedTerm.data[field.variable] || '---'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        <div className="text-xs md:text-sm leading-relaxed text-justify whitespace-pre-wrap mb-16 font-serif flex-1 text-slate-900">{processedViewContent}</div>
                        
                        {/* ÁREA DE SELOS E ASSINATURA */}
                        <div className="mt-auto pt-4 space-y-8">
                            {/* 1. Assinatura Centralizada */}
                            <div className="flex justify-center w-full">
                                {viewingSignedTerm.status === 'ASSINADO' && (
                                    <div className="text-center relative">
                                        {viewingSignedTerm.signatureImage && (
                                            <img src={viewingSignedTerm.signatureImage} className="h-10 md:h-12 object-contain mx-auto mix-blend-multiply mb-0 relative z-10" />
                                        )}
                                        <div className="w-64 h-px bg-slate-400 mx-auto mt-1 mb-2"></div>
                                        <p className="font-black uppercase text-xs md:text-sm text-slate-900">{viewingSignedTerm.employeeName}</p>
                                        <p className="text-[10px] text-slate-500 font-bold">CPF: {viewingSignedTerm.employeeCpf?.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-**")}</p>
                                        <p className="text-[8px] text-emerald-600 font-black uppercase mt-1">Assinado digitalmente em: {new Date(viewingSignedTerm.signedAt!).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })}</p>
                                        <p className="text-[8px] text-slate-400 font-mono mt-2 break-all max-w-[300px] mx-auto uppercase">CÓDIGO DE VERIFICAÇÃO: {viewingSignedTerm.token}</p>
                                    </div>
                                )}
                            </div>

                            {/* 2. Selos de Certificação Alinhados à Direita */}
                            <div className="flex justify-end gap-3">
                                {(templates.find(t => t.id === viewingSignedTerm.templateId)?.certificationImages || []).map((img, idx) => (
                                    <div key={idx} className="bg-white border border-slate-200 p-1.5 rounded-lg flex items-center justify-center h-12 md:h-16 w-fit shadow-sm">
                                        <img src={img} className="h-full object-contain mix-blend-multiply" alt="Selo" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {activeTermToSign && viewingSignedTerm.status === 'PENDENTE' && (
                    <div className="p-6 md:p-8 bg-slate-900 text-white shrink-0 border-t border-white/10 animate-slide-up relative z-30">
                        <div className="max-w-xl mx-auto space-y-6">
                            <div className="flex items-center gap-3 text-emerald-400">
                                <Lock size={24} />
                                <div>
                                    <h4 className="font-black uppercase text-sm tracking-widest">Assinatura Digital</h4>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Valide sua identidade para concluir a assinatura</p>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black uppercase text-slate-500 ml-1">Seu CPF</label>
                                    <input type="text" value={signingCpf} onChange={e => setSigningCpf(formatCPF(e.target.value))} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="000.000.000-00" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black uppercase text-slate-500 ml-1">Senha do iRamais</label>
                                    <div className="relative">
                                        <input type={showPassword ? "text" : "password"} value={signingPassword} onChange={e => setSigningPassword(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white focus:ring-2 focus:ring-emerald-500 outline-none pr-10" placeholder="••••••••" />
                                        <button onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3.5 text-slate-500 hover:text-white transition-colors">{showPassword ? <EyeOff size={16}/> : <Eye size={16}/>}</button>
                                    </div>
                                </div>
                            </div>

                            {errorMsg && (
                                <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-xl text-red-200 text-[10px] font-bold flex items-center gap-2 animate-shake">
                                    <AlertTriangle size={14}/> {errorMsg}
                                </div>
                            )}

                            <div className="flex gap-4">
                                <button onClick={() => { setViewingSignedTerm(null); setActiveTermToSign(null); }} className="flex-1 py-4 text-slate-400 font-black uppercase text-xs hover:bg-white/5 rounded-2xl transition-all">Cancelar</button>
                                <button onClick={handleValidateAndSign} disabled={isProcessing || !signingCpf || !signingPassword} className="flex-[2] py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase text-xs hover:bg-emerald-500 transition-all shadow-xl shadow-emerald-900/40 flex items-center justify-center gap-2 disabled:opacity-50">
                                    {isProcessing ? <Loader2 className="animate-spin" size={16}/> : <Signature size={18}/>} Confirmar Assinatura Digital
                                </button>
                            </div>
                            <p className="text-[8px] text-center text-slate-500 font-medium uppercase leading-relaxed tracking-wider">Ao clicar em confirmar, você declara estar de acordo com os termos acima e autoriza a inserção da sua assinatura digitalizada neste documento com validade jurídica interna.</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
      )}

      {/* MODAL: SOLICITAR ASSINATURA DE E-MAIL */}
      {isRequestModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
           <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h3 className="font-black text-slate-800 uppercase text-sm flex items-center gap-2"><Mail size={20} className="text-emerald-600"/> Solicitar Assinatura Oficial</h3>
                    <button onClick={() => setIsRequestModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full text-slate-400"><X size={24}/></button>
                </div>
                <form onSubmit={handleSubmitRequest} className="p-8 overflow-y-auto custom-scrollbar space-y-6">
                    <div className="space-y-4">
                        <div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1 block">Nome p/ Exibição</label><input required value={requestForm.name} onChange={e => setRequestForm({...requestForm, name: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500"/></div>
                        <div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1 block">Cargo ou Setor</label><input required value={requestForm.sector} onChange={e => setRequestForm({...requestForm, sector: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500"/></div>
                        <div className="grid grid-cols-2 gap-4">
                            <div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1 block">Telefone Fixo</label><input value={requestForm.phoneFixed} onChange={e => setRequestForm({...requestForm, phoneFixed: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500" placeholder="(71) 3879-XXXX"/></div>
                            <div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1 block">WhatsApp / Celular</label><input value={requestForm.phoneMobile} onChange={e => setRequestForm({...requestForm, phoneMobile: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500" placeholder="(71) 9XXXX-XXXX"/></div>
                        </div>
                        <div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1 block">Observações (Opcional)</label><textarea value={requestForm.notes} onChange={e => setRequestForm({...requestForm, notes: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 min-h-[100px]" placeholder="Ex: Adicionar selo comemorativo 50 anos."/></div>
                    </div>
                    <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 flex gap-3"><AlertCircle size={20} className="text-amber-500 shrink-0"/><p className="text-[10px] text-amber-800 font-bold uppercase leading-relaxed">Sua solicitação gerará um chamado automático para a equipe de TI. Você receberá uma notificação assim que o download for liberado.</p></div>
                    <div className="flex justify-end gap-3 pt-4"><button type="button" onClick={() => setIsRequestModalOpen(false)} className="px-6 py-2 text-slate-400 font-black uppercase text-xs hover:bg-slate-100 rounded-xl">Cancelar</button><button type="submit" disabled={isProcessing} className="px-10 py-3 bg-emerald-600 text-white rounded-2xl font-black uppercase text-xs hover:bg-emerald-700 shadow-xl shadow-emerald-200 flex items-center gap-2">{isProcessing ? <Loader2 className="animate-spin" size={16}/> : <Send size={16}/>} Enviar Solicitação</button></div>
                </form>
           </div>
        </div>
      )}

      {/* MODAL: PREVIEW DA ASSINATURA GERADA */}
      {viewingSignatureUrl && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-fade-in">
           <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden p-8 flex flex-col items-center">
                <div className="w-full flex justify-between items-center mb-8"><h3 className="font-black text-slate-800 uppercase text-xs tracking-[0.3em]">Assinatura Corporativa</h3><button onClick={() => setViewingSignatureUrl(null)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400"><X size={24}/></button></div>
                <div className="bg-white p-6 shadow-2xl border border-slate-100 rounded-xl overflow-hidden mb-10 w-full flex justify-center"><img src={viewingSignatureUrl} alt="Signature Preview" className="max-w-full"/></div>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest text-center max-w-sm mb-10 leading-relaxed">Você pode salvar esta imagem e inseri-la nas configurações de assinatura do seu Outlook ou Webmail.</p>
                <div className="flex gap-3"><button onClick={() => setViewingSignatureUrl(null)} className="px-8 py-3 text-slate-400 font-black uppercase text-xs hover:bg-slate-100 rounded-xl">Fechar</button><a href={viewingSignatureUrl} download={`assinatura_${currentUser?.name}.png`} className="px-12 py-3 bg-emerald-600 text-white rounded-2xl font-black uppercase text-xs hover:bg-emerald-700 shadow-xl shadow-emerald-200 flex items-center gap-2"><Download size={18}/> Baixar Imagem (PNG)</a></div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Signatures;
