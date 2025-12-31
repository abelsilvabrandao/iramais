
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { auth, db } from '../services/firebaseConfig';
import { fetchUnits, fetchDepartments } from '../services/firebaseService';
import { OrganizationUnit, OrganizationDepartment } from '../types';
import { Loader2, AlertCircle, CheckCircle2, User, Lock, Mail, Building, MapPin, Phone, Globe, Eye, EyeOff } from 'lucide-react';
import Logo from '../components/Logo';
import { useAuth } from '../contexts/AuthContext'; // Import useAuth

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, loading: authLoading } = useAuth(); // Check auth state
  
  const [isRegistering, setIsRegistering] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Form States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Register Specifics
  const [regUnit, setRegUnit] = useState('');
  const [regDept, setRegDept] = useState('');
  const [regExtension, setRegExtension] = useState('');
  
  // Data Lists for Selects
  const [units, setUnits] = useState<OrganizationUnit[]>([]);
  const [depts, setDepts] = useState<OrganizationDepartment[]>([]);

  // Brand Colors
  const brandColor = '#006c5b';
  const bgColor = '#0b1424'; // Alterado para o azul escuro solicitado

  // Redirect if already logged in
  useEffect(() => {
    if (!authLoading && currentUser) {
      navigate('/dashboard');
    }
  }, [currentUser, authLoading, navigate]);

  useEffect(() => {
    if (isRegistering) {
      const loadOptions = async () => {
        try {
          const [u, d] = await Promise.all([fetchUnits(), fetchDepartments()]);
          setUnits(u);
          setDepts(d);
        } catch (e) {
          console.error("Erro ao carregar opções de cadastro", e);
        }
      };
      loadOptions();
    }
  }, [isRegistering]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      // Redireciona para dashboard
      navigate('/dashboard');
    } catch (err: any) {
      console.error("Erro Login:", err.code);
      
      let customError = 'Erro ao fazer login. Tente novamente.';

      // Verifica erros de credencial
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        try {
          // Verifica no Firestore se o usuário existe na base de colaboradores
          const q = query(collection(db, 'people'), where('email', '==', email));
          const snapshot = await getDocs(q);

          if (!snapshot.empty) {
            const personData = snapshot.docs[0].data();
            
            // Se existe na base mas NÃO tem UID, significa que nunca criou a conta no Auth
            if (!personData.uid) {
              customError = 'Encontramos seu e-mail na base de colaboradores, mas você ainda não ativou seu acesso. Por favor, clique na aba "Criar Cadastro" abaixo para definir sua senha.';
            } else {
              // Tem UID, então errou a senha mesmo
              customError = 'E-mail ou senha inválidos.';
            }
          } else {
            // Não existe nem na base people
            customError = 'E-mail ou senha inválidos.';
          }
        } catch (dbError) {
          // Fallback se falhar a consulta ao banco
          customError = 'E-mail ou senha inválidos.';
        }
      } else if (err.code === 'auth/too-many-requests') {
        customError = 'Muitas tentativas falhas. Tente novamente mais tarde.';
      }

      setError(customError);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    
    if (!email || !password || !regUnit || !regDept) {
      setError('Preencha todos os campos obrigatórios.');
      return;
    }

    // Validação de senha forte (simples)
    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    setIsLoading(true);

    try {
      // 1. Verificar se o e-mail existe na coleção 'people' (Regra de Negócio do Sistema Antigo)
      const q = query(collection(db, 'people'), where('email', '==', email));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        throw new Error("EMAIL_NOT_FOUND_IN_BASE");
      }

      const personDoc = querySnapshot.docs[0];
      const personData = personDoc.data();

      // 2. Verificar divergência de Unidade ou Setor
      // Normalizando strings para comparação segura
      const inputUnit = regUnit.trim().toLowerCase();
      const dbUnit = (personData.unit || '').trim().toLowerCase();
      
      const inputDept = regDept.trim().toLowerCase();
      const dbDept = (personData.department || personData.sector || '').trim().toLowerCase();

      // Comparação flexível para evitar bloqueios por pequenos erros de digitação no cadastro original
      if (inputUnit !== dbUnit || inputDept !== dbDept) {
         throw new Error("DATA_MISMATCH");
      }

      // 3. Criar usuário no Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const uid = userCredential.user.uid;

      // 4. Atualizar o documento em 'people' com o UID e Ramal (se fornecido)
      const updateData: any = {
        uid: uid,
        status: 'available',
        online: true,
        lastSeen: new Date().toISOString()
      };
      
      if (regExtension) {
        updateData.extension = regExtension;
        updateData.ramal = regExtension;
      }

      await updateDoc(doc(db, 'people', personDoc.id), updateData);

      setSuccessMsg('Conta criada com sucesso! Redirecionando...');
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);

    } catch (err: any) {
      console.error(err);
      if (err.message === "EMAIL_NOT_FOUND_IN_BASE") {
        setError('E-mail não cadastrado na base de colaboradores. Solicite ao RH ou TI.');
      } else if (err.message === "DATA_MISMATCH") {
        setError('Unidade ou Setor incorretos para este e-mail. Verifique se selecionou os dados corretos conforme seu cadastro no RH.');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('Este e-mail já possui cadastro ativo. Por favor, faça login.');
      } else {
        setError('Erro ao realizar cadastro: ' + err.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Digite seu e-mail no campo acima para redefinir a senha.');
      return;
    }
    try {
      setIsLoading(true);
      await sendPasswordResetEmail(auth, email);
      setSuccessMsg('Link de redefinição enviado para seu e-mail.');
      setError('');
    } catch (err) {
      setError('Erro ao enviar e-mail de redefinição. Verifique se o e-mail está correto.');
    } finally {
      setIsLoading(false);
    }
  };

  // Se já estiver logado, não renderiza o form (o useEffect irá redirecionar)
  if (authLoading || currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-emerald-600" size={48} />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 font-sans transition-colors duration-500" style={{ backgroundColor: bgColor }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[420px] overflow-hidden border border-white/10">
        
        {/* Header */}
        <div className="p-8 pb-6 flex flex-col items-center text-center">
          <div className="w-48 mb-6">
             <Logo className="w-full h-auto" />
          </div>
          <h1 className="text-2xl font-bold mb-1" style={{ color: brandColor }}>
            {isRegistering ? 'Criar Acesso' : 'Acesso ao iRamais'}
          </h1>
          <p className="text-slate-400 text-sm">
            {isRegistering ? 'Valide seus dados para criar sua senha' : 'Entre com suas credenciais corporativas'}
          </p>
        </div>

        {/* Body */}
        <div className="px-8 pb-8">
          
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4 flex items-start gap-2 animate-fade-in border border-red-100">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span className="leading-snug">{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="bg-green-50 text-green-700 p-3 rounded-lg text-sm mb-4 flex items-start gap-2 animate-fade-in border border-green-100">
              <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
              <span className="leading-snug">{successMsg}</span>
            </div>
          )}

          <form onSubmit={isRegistering ? handleRegister : handleLogin} className="space-y-4">
            
            {/* Email Field (Common) */}
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">E-mail Corporativo</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:bg-white transition-all text-slate-800"
                  style={{ '--tw-ring-color': brandColor } as React.CSSProperties}
                  placeholder="nome@intermaritima.com.br"
                  required
                />
              </div>
            </div>

            {/* Register Extra Fields */}
            {isRegistering && (
              <div className="space-y-4 animate-fade-in">
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Unidade</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <select 
                      value={regUnit}
                      onChange={(e) => setRegUnit(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:bg-white transition-all text-slate-800 appearance-none"
                      style={{ '--tw-ring-color': brandColor } as React.CSSProperties}
                      required
                    >
                      <option value="">Selecione sua unidade...</option>
                      {units.map(u => (
                        <option key={u.id} value={u.name}>{u.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Setor / Departamento</label>
                  <div className="relative">
                    <Building className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <select 
                      value={regDept}
                      onChange={(e) => setRegDept(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white transition-all text-slate-800 appearance-none"
                      style={{ '--tw-ring-color': brandColor } as React.CSSProperties}
                      required
                    >
                      <option value="">Selecione seu setor...</option>
                      {depts.map(d => (
                        <option key={d.id} value={d.name}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                   <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Ramal (Opcional)</label>
                   <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input 
                        type="text" 
                        value={regExtension}
                        onChange={(e) => setRegExtension(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:bg-white transition-all text-slate-800"
                        style={{ '--tw-ring-color': brandColor } as React.CSSProperties}
                        placeholder="Seu ramal atual"
                      />
                   </div>
                </div>
              </div>
            )}

            {/* Password Field (Common) */}
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                {isRegistering ? 'Crie uma Senha' : 'Senha'}
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type={showPassword ? "text" : "password"} 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:bg-white transition-all text-slate-800"
                  style={{ '--tw-ring-color': brandColor } as React.CSSProperties}
                  placeholder="••••••••"
                  required
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {isRegistering && (
                <p className="text-[10px] text-slate-400">Mínimo de 6 caracteres.</p>
              )}
            </div>

            {/* Action Button */}
            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full py-3.5 text-white font-bold text-lg rounded-xl hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-emerald-900/20 active:scale-[0.98]"
              style={{ backgroundColor: brandColor }}
            >
              {isLoading ? (
                <Loader2 className="animate-spin" />
              ) : isRegistering ? (
                'Finalizar Cadastro'
              ) : (
                'Entrar no Sistema'
              )}
            </button>

          </form>

          {/* Footer Links */}
          <div className="mt-6 space-y-3 text-center">
            
            <Link 
              to="/" 
              className="flex items-center justify-center gap-2 w-full py-2.5 text-sm font-bold text-emerald-700 bg-emerald-50 rounded-xl hover:bg-emerald-100 transition-colors border border-emerald-100"
            >
               <Globe size={16} /> Acessar Portal do Visitante (Sem login)
            </Link>

            {!isRegistering && (
              <button 
                type="button"
                onClick={handleForgotPassword}
                className="text-sm text-slate-500 hover:text-emerald-700 font-medium transition-colors mt-4 block mx-auto"
              >
                Esqueci minha senha
              </button>
            )}
            
            <div className="pt-4 border-t border-slate-100 mt-4">
              {isRegistering ? (
                <p className="text-sm text-slate-600">
                  Já possui conta? {' '}
                  <button 
                    onClick={() => setIsRegistering(false)} 
                    className="font-bold hover:underline"
                    style={{ color: brandColor }}
                  >
                    Fazer Login
                  </button>
                </p>
              ) : (
                <p className="text-sm text-slate-600">
                  Primeiro acesso? {' '}
                  <button 
                    onClick={() => setIsRegistering(true)} 
                    className="font-bold hover:underline"
                    style={{ color: brandColor }}
                  >
                    Criar Cadastro
                  </button>
                </p>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Login;
