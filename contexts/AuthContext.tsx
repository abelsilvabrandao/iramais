
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { auth, db } from '../services/firebaseConfig';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { Employee, UserRole } from '../types';

interface AuthContextType {
  currentUser: Employee | null;
  user: User | null; // Objeto raw do Firebase Auth
  loading: boolean;
  logout: () => Promise<void>;
  isAdmin: boolean;
  isCommunication: boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  user: null,
  loading: true,
  logout: async () => {},
  isAdmin: false,
  isCommunication: false,
  refreshUser: async () => {}
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [currentUser, setCurrentUser] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeSnapshot: (() => void) | null = null;

    // O onAuthStateChanged é disparado automaticamente quando o Firebase restaura a sessão do LocalStorage/IndexedDB
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser) {
        // Usuário autenticado, agora buscamos os dados do perfil no Firestore
        // Mantemos loading = true enquanto buscamos os dados extras
        
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
              showInPublicDirectory: data.showInPublicDirectory ?? true
            } as Employee);
          } else {
            // Fallback: Usuário autenticado no Auth mas sem perfil no Firestore (ex: Admin criou manual)
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
                birthday: ''
            } as Employee);
          }
          // Só removemos o loading após ter os dados do Firestore
          setLoading(false);
        }, (error) => {
          console.error("Error fetching user profile:", error);
          // Em caso de erro no banco, ainda liberamos o app (talvez para uma tela de erro ou perfil incompleto)
          setLoading(false);
        });
      } else {
        // Não autenticado
        setCurrentUser(null);
        setLoading(false);
      }
    });

    return () => {
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

  const isAdmin = currentUser?.systemRole === UserRole.ADMIN;
  const isCommunication = currentUser?.systemRole === UserRole.COMMUNICATION || isAdmin;

  return (
    <AuthContext.Provider value={{ currentUser, user, loading, logout, isAdmin, isCommunication, refreshUser }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
