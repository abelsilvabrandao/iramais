
import React, { useState, useEffect } from 'react';
import { 
  fetchMeetingRooms, addMeetingRoom, updateMeetingRoom, deleteMeetingRoom 
} from '../services/firebaseService';
import { MeetingRoom } from '../types';
import { Plus, Trash2, Edit2, Save, Tv, MonitorPlay, Users, Layout, Video, Coffee, Square, CheckSquare, Loader2 } from 'lucide-react';

const COMMON_FEATURES = [
  'TV', 
  'Projetor', 
  'Videoconferência', 
  'Quadro Branco', 
  'Ar Condicionado', 
  'Computador', 
  'Mesa Redonda', 
  'Frigobar',
  'Diretoria'
];

const AdminMeetingRooms: React.FC = () => {
  const [rooms, setRooms] = useState<MeetingRoom[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const [currentRoom, setCurrentRoom] = useState<Partial<MeetingRoom>>({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await fetchMeetingRooms();
      setRooms(data);
    } catch (error) {
      console.error("Erro ao carregar salas", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddNew = () => {
    setCurrentRoom({
      name: '',
      capacity: 4,
      features: []
    });
    setIsEditing(true);
  };

  const handleEdit = (room: MeetingRoom) => {
    setCurrentRoom({ ...room });
    setIsEditing(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('ATENÇÃO: Excluir esta sala não excluirá automaticamente os agendamentos vinculados a ela, mas eles ficarão "orfãos". Deseja continuar?')) {
      try {
        await deleteMeetingRoom(id);
        loadData();
      } catch (error) {
        alert("Erro ao excluir sala.");
      }
    }
  };

  const handleSave = async () => {
    if (!currentRoom.name) return alert('Nome da sala é obrigatório');
    if (!currentRoom.capacity || currentRoom.capacity < 1) return alert('Capacidade deve ser maior que 0');
    
    setIsSaving(true);
    try {
      if (currentRoom.id) {
        await updateMeetingRoom(currentRoom.id, currentRoom);
      } else {
        await addMeetingRoom(currentRoom);
      }
      
      setIsEditing(false);
      loadData();
    } catch (error) {
      alert("Erro ao salvar sala.");
    } finally {
      setIsSaving(false);
    }
  };

  const toggleFeature = (feature: string) => {
    const currentFeatures = currentRoom.features || [];
    let newFeatures: string[];

    if (currentFeatures.includes(feature)) {
      newFeatures = currentFeatures.filter(f => f !== feature);
    } else {
      newFeatures = [...currentFeatures, feature];
    }
    
    setCurrentRoom({ ...currentRoom, features: newFeatures });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-emerald-600" size={48} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Gestão de Salas de Reunião</h2>
          <p className="text-slate-500 text-sm">Cadastre e configure as salas disponíveis para agendamento.</p>
        </div>
        {!isEditing && (
          <button 
            onClick={handleAddNew}
            className="bg-emerald-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-emerald-700 transition-colors"
          >
            <Plus size={18} /> Nova Sala
          </button>
        )}
      </div>

      {isEditing ? (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 animate-fade-in">
           <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
             <Layout size={20} className="text-emerald-600"/> 
             {currentRoom.id ? 'Editar Sala' : 'Nova Sala'}
           </h3>
           
           <div className="space-y-6">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div>
                 <label className="block text-sm font-medium text-slate-700 mb-1">Nome da Sala</label>
                 <input 
                    type="text" 
                    value={currentRoom.name} 
                    onChange={e => setCurrentRoom({...currentRoom, name: e.target.value})}
                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white text-slate-900"
                    placeholder="Ex: Sala de Inovação"
                 />
               </div>
               
               <div>
                 <label className="block text-sm font-medium text-slate-700 mb-1">Capacidade (Pessoas)</label>
                 <input 
                    type="number" 
                    min="1"
                    value={currentRoom.capacity} 
                    onChange={e => setCurrentRoom({...currentRoom, capacity: parseInt(e.target.value)})}
                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white text-slate-900"
                 />
               </div>
             </div>

             <div>
                <label className="block text-sm font-medium text-slate-700 mb-3">Recursos e Equipamentos</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                   {COMMON_FEATURES.map(feature => (
                     <button
                       key={feature}
                       onClick={() => toggleFeature(feature)}
                       className={`flex items-center gap-2 p-3 rounded-lg border text-sm font-medium transition-all ${
                         currentRoom.features?.includes(feature) 
                           ? 'bg-emerald-50 border-emerald-500 text-emerald-700' 
                           : 'bg-white border-slate-200 text-slate-600 hover:border-emerald-300'
                       }`}
                     >
                       {currentRoom.features?.includes(feature) ? <CheckSquare size={18}/> : <Square size={18}/>}
                       {feature}
                     </button>
                   ))}
                </div>
             </div>
           </div>

           <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-slate-100">
             <button 
               onClick={() => setIsEditing(false)}
               className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
               disabled={isSaving}
             >
               Cancelar
             </button>
             <button 
               onClick={handleSave}
               className="px-6 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 flex items-center gap-2 disabled:opacity-50"
               disabled={isSaving}
             >
               {isSaving ? <Loader2 className="animate-spin" size={18}/> : <Save size={18} />}
               Salvar Sala
             </button>
           </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rooms.map(room => (
            <div key={room.id} className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
               <div className="flex items-start justify-between mb-3">
                 <div className="flex items-center gap-2">
                    <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600">
                       <Layout size={20} />
                    </div>
                    <div>
                        <h4 className="font-bold text-slate-800 leading-tight">{room.name}</h4>
                        <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                           <Users size={12} /> {room.capacity} Lugares
                        </p>
                    </div>
                 </div>
                 <div className="flex gap-1">
                   <button onClick={() => handleEdit(room)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                     <Edit2 size={16} />
                   </button>
                   <button onClick={() => handleDelete(room.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                     <Trash2 size={16} />
                   </button>
                 </div>
               </div>
               
               <div className="border-t border-slate-100 pt-3">
                  <p className="text-xs font-bold text-slate-400 uppercase mb-2">Equipamentos</p>
                  <div className="flex flex-wrap gap-1">
                    {room.features.length > 0 ? room.features.map(feat => (
                      <span key={feat} className={`px-2 py-1 rounded text-[10px] border ${feat === 'Diretoria' ? 'bg-amber-100 text-amber-800 border-amber-200 font-bold' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                        {feat}
                      </span>
                    )) : (
                      <span className="text-xs text-slate-400 italic">Nenhum recurso cadastrado</span>
                    )}
                  </div>
               </div>
            </div>
          ))}
          {rooms.length === 0 && (
            <div className="col-span-full p-12 text-center text-slate-400">
                Nenhuma sala cadastrada.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminMeetingRooms;
