
import React, { useState, useEffect } from 'react';
import { 
  fetchMeetingRooms, addMeetingRoom, updateMeetingRoom, deleteMeetingRoom, fetchUnits 
} from '../services/firebaseService';
import { MeetingRoom, OrganizationUnit } from '../types';
import { Plus, Trash2, Edit2, Save, Users, Layout, CheckSquare, Square, Loader2, X, AlertTriangle, Lock, Clock, Building2, Calendar } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

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
  const { isMaster } = useAuth();
  const [rooms, setRooms] = useState<MeetingRoom[]>([]);
  const [units, setUnits] = useState<OrganizationUnit[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const [currentRoom, setCurrentRoom] = useState<Partial<MeetingRoom>>({});
  const [roomToDelete, setRoomToDelete] = useState<MeetingRoom | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [roomsData, unitsData] = await Promise.all([
        fetchMeetingRooms(),
        fetchUnits()
      ]);
      setRooms(roomsData);
      setUnits(unitsData);
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
      features: [],
      unitId: units[0]?.id || '',
      startTime: '08:00',
      endTime: '18:00',
      worksSaturday: false,
      worksSunday: false
    });
    setIsEditing(true);
  };

  const handleEdit = (room: MeetingRoom) => {
    setCurrentRoom({ ...room });
    setIsEditing(true);
  };

  const handleRequestDelete = (e: React.MouseEvent, room: MeetingRoom) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isMaster) return;
    setRoomToDelete(room);
  };

  const confirmDelete = async () => {
    if (!roomToDelete || !roomToDelete.id) return;
    
    setIsSaving(true);
    try {
      await deleteMeetingRoom(roomToDelete.id);
      setRoomToDelete(null);
      await loadData();
    } catch (error) {
      alert("Erro ao excluir sala.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = async () => {
    if (!currentRoom.name) return alert('Nome da sala é obrigatório');
    if (!currentRoom.unitId) return alert('Selecione a unidade da sala');
    
    setIsSaving(true);
    try {
      const payload = {
        ...currentRoom,
        worksSaturday: !!currentRoom.worksSaturday,
        worksSunday: !!currentRoom.worksSunday
      };
      
      if (currentRoom.id) {
        await updateMeetingRoom(currentRoom.id, payload);
      } else {
        await addMeetingRoom(payload);
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
    <div className="space-y-6 relative">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Gestão de Salas de Reunião</h2>
          <p className="text-slate-500 text-sm">Cadastre salas, defina a unidade e os horários de funcionamento.</p>
        </div>
        {!isEditing && (
          <button 
            onClick={handleAddNew}
            className="bg-emerald-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-emerald-700 transition-all font-bold shadow-md"
          >
            <Plus size={18} /> Nova Sala
          </button>
        )}
      </div>

      {isEditing ? (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 animate-fade-in">
           <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Layout size={20} className="text-emerald-600"/> 
                {currentRoom.id ? 'Editar Sala' : 'Nova Sala'}
              </h3>
              <button onClick={() => setIsEditing(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400"><X size={20}/></button>
           </div>
           
           <div className="space-y-6">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div className="col-span-1">
                 <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome da Sala</label>
                 <input 
                    type="text" 
                    value={currentRoom.name || ''} 
                    onChange={e => setCurrentRoom({...currentRoom, name: e.target.value})}
                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white text-slate-900 shadow-sm"
                    placeholder="Ex: Sala de Inovação"
                 />
               </div>
               
               <div className="col-span-1">
                 <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Unidade</label>
                 <select 
                    value={currentRoom.unitId || ''} 
                    onChange={e => setCurrentRoom({...currentRoom, unitId: e.target.value})}
                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white text-slate-900 shadow-sm"
                 >
                    <option value="">Selecione a Unidade</option>
                    {units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                 </select>
               </div>

               <div className="col-span-1">
                 <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Capacidade (Pessoas)</label>
                 <input 
                    type="number" 
                    min="1"
                    value={currentRoom.capacity || 4} 
                    onChange={e => setCurrentRoom({...currentRoom, capacity: parseInt(e.target.value)})}
                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white text-slate-900 shadow-sm"
                 />
               </div>

               <div className="col-span-1">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Horário de Funcionamento (Seg-Sex)</label>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="relative">
                        <Clock size={14} className="absolute left-2.5 top-3 text-slate-400" />
                        <input 
                            type="time" 
                            value={currentRoom.startTime || '08:00'} 
                            onChange={e => setCurrentRoom({...currentRoom, startTime: e.target.value})}
                            className="w-full p-2.5 pl-8 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white text-slate-900 shadow-sm"
                        />
                    </div>
                    <div className="relative">
                        <Clock size={14} className="absolute left-2.5 top-3 text-slate-400" />
                        <input 
                            type="time" 
                            value={currentRoom.endTime || '18:00'} 
                            onChange={e => setCurrentRoom({...currentRoom, endTime: e.target.value})}
                            className="w-full p-2.5 pl-8 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white text-slate-900 shadow-sm"
                        />
                    </div>
                  </div>
               </div>
             </div>

             <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-3 flex items-center gap-2">
                    <Calendar size={14} /> Funcionamento Extra
                </label>
                <div className="flex gap-6">
                    <label className="flex items-center gap-2 cursor-pointer group">
                        <input 
                            type="checkbox" 
                            checked={!!currentRoom.worksSaturday} 
                            onChange={e => setCurrentRoom({...currentRoom, worksSaturday: e.target.checked})}
                            className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                        />
                        <span className="text-sm font-medium text-slate-700 group-hover:text-emerald-600 transition-colors">Funciona aos Sábados</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer group">
                        <input 
                            type="checkbox" 
                            checked={!!currentRoom.worksSunday} 
                            onChange={e => setCurrentRoom({...currentRoom, worksSunday: e.target.checked})}
                            className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                        />
                        <span className="text-sm font-medium text-slate-700 group-hover:text-emerald-600 transition-colors">Funciona aos Domingos</span>
                    </label>
                </div>
             </div>

             <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-3">Recursos e Equipamentos</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                   {COMMON_FEATURES.map(feature => (
                     <button
                       key={feature}
                       type="button"
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
               className="px-6 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors"
               disabled={isSaving}
             >
               Cancelar
             </button>
             <button 
               onClick={handleSave}
               className="px-8 py-2 bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-700 shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
               disabled={isSaving}
             >
               {isSaving ? <Loader2 className="animate-spin" size={18}/> : <Save size={18} />}
               Salvar Sala
             </button>
           </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rooms.map(room => {
            const unit = units.find(u => u.id === room.unitId);
            return (
              <div key={room.id} className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-all group">
                 <div className="flex items-start justify-between mb-3">
                   <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 border border-indigo-100">
                         <Layout size={24} />
                      </div>
                      <div>
                          <h4 className="font-bold text-slate-800 leading-tight">{room.name}</h4>
                          <p className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1 mt-1">
                             <Building2 size={12} /> {unit?.name || 'Sede'}
                          </p>
                      </div>
                   </div>
                   <div className="flex gap-1">
                     <button onClick={() => handleEdit(room)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                       <Edit2 size={16} />
                     </button>
                     <button 
                      onClick={(e) => handleRequestDelete(e, room)} 
                      disabled={!isMaster}
                      title={!isMaster ? "Apenas usuários Master podem excluir" : "Excluir sala"}
                      className={`p-2 transition-colors rounded-lg ${isMaster ? 'text-slate-400 hover:text-red-600 hover:bg-red-50' : 'text-slate-200 cursor-not-allowed opacity-50'}`}
                     >
                       {isMaster ? <Trash2 size={16} /> : <Lock size={16} />}
                     </button>
                   </div>
                 </div>
                 
                 <div className="space-y-2 mt-4 text-[10px] font-bold text-slate-500 bg-slate-50 p-3 rounded-lg">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5"><Users size={12} className="text-slate-400"/> {room.capacity} Lugares</div>
                        <div className="flex items-center gap-1.5"><Clock size={12} className="text-slate-400"/> {room.startTime || '08:00'} - {room.endTime || '18:00'}</div>
                    </div>
                    <div className="flex flex-wrap gap-2 pt-1 border-t border-slate-200">
                        <span className={room.worksSaturday ? 'text-emerald-600' : 'text-slate-300'}>SÁB: {room.worksSaturday ? 'ABERTO' : 'FECHADO'}</span>
                        <span className={room.worksSunday ? 'text-emerald-600' : 'text-slate-300'}>DOM: {room.worksSunday ? 'ABERTO' : 'FECHADO'}</span>
                    </div>
                 </div>

                 <div className="border-t border-slate-100 pt-3 mt-3">
                    <div className="flex flex-wrap gap-1">
                      {room.features && room.features.length > 0 ? room.features.map(feat => (
                        <span key={feat} className={`px-2 py-0.5 rounded text-[10px] border font-medium ${feat === 'Diretoria' ? 'bg-amber-100 text-amber-800 border-amber-200 font-bold' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                          {feat}
                        </span>
                      )) : (
                        <span className="text-[10px] text-slate-400 italic">Sem recursos listados</span>
                      )}
                    </div>
                 </div>
              </div>
            );
          })}
          {rooms.length === 0 && (
            <div className="col-span-full py-16 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <Layout size={48} className="mx-auto mb-4 opacity-20" />
                <p className="font-medium">Nenhuma sala cadastrada no momento.</p>
            </div>
          )}
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO DE DELEÇÃO */}
      {roomToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
           <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden border-2 border-red-100">
              <div className="p-6 text-center">
                 <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500">
                    <AlertTriangle size={32} />
                 </div>
                 <h3 className="text-lg font-bold text-slate-800 mb-2">Remover Sala?</h3>
                 <p className="text-sm text-slate-500 mb-6">
                    Você está prestes a excluir permanentemente a sala <strong>"{roomToDelete.name}"</strong>.<br/>Esta ação é irreversível.
                 </p>
                 <div className="flex gap-3">
                   <button 
                    onClick={() => setRoomToDelete(null)} 
                    className="flex-1 py-3 text-slate-600 hover:bg-slate-100 rounded-xl font-bold text-sm transition-colors" 
                    disabled={isSaving}
                   >
                    Cancelar
                   </button>
                   <button 
                    onClick={confirmDelete} 
                    className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold text-sm hover:bg-red-700 flex items-center justify-center gap-2 shadow-lg shadow-red-200 transition-colors" 
                    disabled={isSaving}
                   >
                     {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />} Sim, Excluir
                   </button>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default AdminMeetingRooms;
