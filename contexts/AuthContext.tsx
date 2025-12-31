
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { auth, db } from '../services/firebaseConfig';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { collection, query, where, onSnapshot, doc } from 'firebase/firestore';
import { Employee, UserRole, GlobalSettings } from '../types';
import { Loader2 } from 'lucide-react';

interface AuthContextType {
  currentUser: Employee | null;
  user: User | null; 
  loading: boolean;
  logout: () => Promise<void>;
  isAdmin: boolean;
  isMaster: boolean;
  isCommunication: boolean;
  refreshUser: () => Promise<void>;
  globalSettings: GlobalSettings | null;
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  user: null,
  loading: true,
  logout: async () => {},
  isAdmin: false,
  isMaster: false,
  isCommunication: false,
  refreshUser: async () => {},
  globalSettings: null
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [currentUser, setCurrentUser] = useState<Employee | null>(null);
  const [globalSettings, setGlobalSettings] = useState<GlobalSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Escuta Configurações Globais
    const unsubSettings = onSnapshot(doc(db, "settings", "general"), (docSnap) => {
      if (docSnap.exists()) {
        setGlobalSettings(docSnap.data() as GlobalSettings);
      } else {
        setGlobalSettings({
          publicDirectory: true,
          showBirthdaysPublicly: true,
          showRoomsPublicly: true,
          showNewsPublicly: true,
          showRolePublicly: true,
          showWelcomeSection: true,
          dashboardShowRooms: true,
          dashboardShowNews: true,
          dashboardShowBirthdays: true,
          showRoleInternal: true
        });
      }
    });

    let unsubscribeSnapshot: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser) {
        if (unsubscribeSnapshot) {
          unsubscribeSnapshot();
        }

        const q = query(collection(db, 'people'), where('uid', '==', firebaseUser.uid));
        
        unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
          if (!snapshot.empty) {
            const data = snapshot.docs[0].data();
            setCurrentUser({
              id: snapshot.docs[0].id,
              uid: data.uid,
              name: data.name,
              role: data.role,
              systemRole: data.systemRole || UserRole.USER,
              department: data.department || data.sector,
              unit: data.unit,
              extension: data.extension,
              whatsapp: data.whatsapp || '',
              email: data.email,
              avatar: data.photoBase64 || data.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(data.name)}&background=0d9488&color=fff`,
              birthday: data.birthday,
              showRole: data.showRole ?? true,
              showInPublicDirectory: data.showInPublicDirectory ?? true,
              signatureImage: data.signatureImage || '' 
            } as Employee);
          } else {
            setCurrentUser({
                id: 'temp',
                uid: firebaseUser.uid,
                name: firebaseUser.displayName || 'Usuário',
                email: firebaseUser.email || '',
                role: 'Não identificado',
                systemRole: UserRole.USER,
                department: 'Geral',
                extension: '',
                whatsapp: '',
                avatar: firebaseUser.photoURL || '',
                birthday: '',
                signatureImage: ''
            } as Employee);
          }
          setLoading(false);
        }, (error) => {
          console.error("Error fetching user profile:", error);
          setLoading(false);
        });
      } else {
        setCurrentUser(null);
        setLoading(false);
      }
    });

    return () => {
      unsubSettings();
      unsubscribeAuth();
      if (unsubscribeSnapshot) unsubscribeSnapshot();
    };
  }, []);

  const logout = async () => {
    await signOut(auth);
    setCurrentUser(null);
    setUser(null);
  };
  
  const refreshUser = useCallback(async () => {
     console.log("User refresh requested (handled by realtime listener)");
  }, []);

  const isMaster = currentUser?.systemRole === UserRole.MASTER;
  const isAdmin = currentUser?.systemRole === UserRole.ADMIN || isMaster;
  const isCommunication = currentUser?.systemRole === UserRole.COMMUNICATION || isAdmin;

  if (loading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-slate-50 gap-4">
        <Loader2 className="animate-spin text-emerald-600" size={48} />
        <div className="flex flex-col items-center">
           <p className="text-slate-700 font-semibold text-lg">Iniciando iRamais Hub...</p>
           <p className="text-slate-400 text-sm">Conectando ao sistema</p>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ currentUser, user, loading, logout, isAdmin, isMaster, isCommunication, refreshUser, globalSettings }}>
      {children}
    </AuthContext.Provider>
  );
};
