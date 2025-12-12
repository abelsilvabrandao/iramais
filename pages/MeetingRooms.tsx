
import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebaseConfig';
import { createAppointment, updateAppointment, deleteAppointment, fetchMeetingRooms, fetchEmployees } from '../services/firebaseService';
import { useAuth } from '../contexts/AuthContext';
import { Appointment, MeetingRoom, Employee } from '../types';
import { Calendar, Clock, MapPin, Plus, Trash2, Edit2, Users, AlertCircle, CheckCircle2, ChevronLeft, ChevronRight, X, Loader2, AlertTriangle, UserPlus } from 'lucide-react';

// Gera horários de 30 em 30 minutos (das 08:00 às 17:30)
// O escritório fecha às 18:00, então o último slot de 30min começa às 17:30.
const generateTimeSlots = () => {
  const slots = [];
  for (let hour = 8; hour <= 17; hour++) {
    slots.push(`${String(hour).padStart(2, '0')}:00`);
    // Adiciona a meia hora para todos, inclusive 17:30
    slots.push(`${String(hour).padStart(2, '0')}:30`);
  }
  return slots;
};

const TIME_SLOTS = generateTimeSlots();

const MeetingRooms: React.FC = () => {
  const { currentUser, isAdmin } = useAuth();
  
  // States
  const [rooms, setRooms] = useState<MeetingRoom[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]); // Lista de colaboradores para sugestão
  const [selectedRoomId, setSelectedRoomId] = useState<string>('');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [weekOffset, setWeekOffset] = useState(0); // 0 = Current week
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isLoadingRooms, setIsLoadingRooms] = useState(true);
  
  // Modal State for Booking
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [bookingSlot, setBookingSlot] = useState<{date: Date, time: string} | null>(null);
  const [subject, setSubject] = useState('');
  
  // Participants State
  const [participants, setParticipants] = useState<string[]>([]);
  const [participantInput, setParticipantInput] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);

  // Modal State for Deletion
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [appointmentToDelete, setAppointmentToDelete] = useState<Appointment | null>(null);

  // 1. Fetch Rooms & Employees
  useEffect(() => {
    const loadData = async () => {
      setIsLoadingRooms(true);
      try {
        const [roomsData, employeesData] = await Promise.all([
          fetchMeetingRooms(),
          fetchEmployees()
        ]);
        setRooms(roomsData);
        setEmployees(employeesData);
        if (roomsData.length > 0) {
          setSelectedRoomId(roomsData[0].id);
        }
      } catch (error) {
        console.error("Erro ao carregar dados", error);
      } finally {
        setIsLoadingRooms(false);
      }
    };
    loadData();
  }, []);

  // 2. Load Appointments (Real-time) - Depends on selectedRoomId
  useEffect(() => {
    if (!selectedRoomId) return;

    // Query appointments for the selected room only
    const q = query(
      collection(db, "appointments"), 
      where("roomId", "==", selectedRoomId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const apps: Appointment[] = [];
      snapshot.forEach((doc) => {
        apps.push({ id: doc.id, ...doc.data() } as Appointment);
      });
      setAppointments(apps);
    });

    return () => unsubscribe();
  }, [selectedRoomId]);

  // Helper to get dates of the current week view
  const weekDates = useMemo(() => {
    const today = new Date();
    const currentDay = today.getDay(); // 0-6
    // Adjust to Monday of the current week (if Sunday(0), go back 6 days)
    const diff = today.getDate() - currentDay + (currentDay === 0 ? -6 : 1); 
    const monday = new Date(today.setDate(diff));
    
    // Apply week offset
    monday.setDate(monday.getDate() + (weekOffset * 7));

    const dates = [];
    for (let i = 0; i < 5; i++) { // Mon-Fri
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      dates.push(d);
    }
    return dates;
  }, [weekOffset]);

  // Format YYYY-MM-DD
  const formatDateKey = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  const handleDaySelect = (date: Date) => {
    setSelectedDate(date);
  };

  const handleSlotClick = (time: string) => {
    // Validate past time
    const now = new Date();
    const slotStartDateTime = new Date(selectedDate);
    const [hours, minutes] = time.split(':').map(Number);
    slotStartDateTime.setHours(hours, minutes, 0, 0);

    // Calculate Slot End Time (Start + 30 mins)
    const slotEndDateTime = new Date(slotStartDateTime);
    slotEndDateTime.setMinutes(slotStartDateTime.getMinutes() + 30);

    // Permite agendar se o horário ATUAL for menor que o FIM do slot.
    if (slotEndDateTime <= now) {
      alert("Este horário já foi encerrado.");
      return;
    }

    setEditingAppointment(null);
    setBookingSlot({ date: selectedDate, time });
    setSubject('');
    setParticipants([]); // Reset participants
    setParticipantInput('');
    setIsModalOpen(true);
  };

  const handleEdit = (e: React.MouseEvent, app: Appointment) => {
    e.preventDefault();
    e.stopPropagation();
    // Parse date correctly
    const [year, month, day] = app.date.split('-').map(Number);
    // Create date in local time
    const dateObj = new Date(year, month - 1, day);
    
    setEditingAppointment(app);
    setBookingSlot({ date: dateObj, time: app.time });
    setSubject(app.subject);
    setParticipants(app.participants || []); // Load existing participants
    setParticipantInput('');
    setIsModalOpen(true);
  };

  // --- Participant Logic ---

  const handleAddParticipant = () => {
    if (!participantInput.trim()) return;
    if (!participants.includes(participantInput.trim())) {
      setParticipants([...participants, participantInput.trim()]);
    }
    setParticipantInput('');
  };

  const handleSelectEmployee = (empName: string) => {
    if (!participants.includes(empName)) {
      setParticipants([...participants, empName]);
    }
    setParticipantInput('');
  };

  const handleRemoveParticipant = (name: string) => {
    setParticipants(participants.filter(p => p !== name));
  };

  const filteredSuggestions = participantInput.length > 1 
    ? employees.filter(e => 
        e.name.toLowerCase().includes(participantInput.toLowerCase()) && 
        !participants.includes(e.name) &&
        e.name !== currentUser?.name // Don't suggest self
      ).slice(0, 3) 
    : [];

  // -------------------------

  const handleConfirmBooking = async () => {
    if (!bookingSlot || !currentUser || !subject.trim()) return;

    setIsSubmitting(true);
    try {
      if (editingAppointment) {
        await updateAppointment(editingAppointment.id, {
          subject: subject.trim(),
          participants: participants
        });
      } else {
        const dateKey = formatDateKey(bookingSlot.date);
        await createAppointment({
          roomId: selectedRoomId,
          date: dateKey,
          time: bookingSlot.time,
          userId: currentUser.id,
          userName: currentUser.name,
          subject: subject.trim(),
          participants: participants,
          createdAt: new Date().toISOString()
        });
      }

      setIsModalOpen(false);
      setBookingSlot(null);
      setEditingAppointment(null);
    } catch (error) {
      alert("Erro ao salvar agendamento. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent, app: Appointment) => {
    e.preventDefault();
    e.stopPropagation(); 
    
    const isOwner = app.userId === currentUser?.id;
    
    if (!isOwner && !isAdmin) {
      alert("Você só pode cancelar seus próprios agendamentos.");
      return;
    }

    setAppointmentToDelete(app);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!appointmentToDelete) return;
    
    setIsSubmitting(true);
    try {
      await deleteAppointment(appointmentToDelete.id);
      setIsDeleteModalOpen(false);
      setAppointmentToDelete(null);
    } catch (error) {
      console.error(error);
      alert("Ocorreu um erro ao cancelar o agendamento.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Check if a slot is occupied
  const getAppointmentForSlot = (time: string) => {
    const dateKey = formatDateKey(selectedDate);
    return appointments.find(a => a.date === dateKey && a.time === time);
  };

  const selectedRoom = rooms.find(r => r.id === selectedRoomId);

  if (isLoadingRooms) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-2 text-emerald-600">
           <Loader2 className="animate-spin" size={48} />
           <span className="font-medium">Carregando salas...</span>
        </div>
      </div>
    );
  }

  if (rooms.length === 0) {
    return (
      <div className="text-center p-12 bg-white rounded-2xl shadow-sm border border-slate-200">
        <h2 className="text-xl font-bold text-slate-800 mb-2">Nenhuma Sala Encontrada</h2>
        <p className="text-slate-500">Contate o administrador para cadastrar salas de reunião.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10">
      
      {/* Header & Room Selection */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Calendar className="text-emerald-600" /> Salas & Reunião
          </h2>
          <p className="text-slate-500 text-sm">Gerencie reservas das salas de reunião corporativas.</p>
        </div>
        
        <div className="flex flex-wrap gap-2 bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
          {rooms.map(room => (
            <button
              key={room.id}
              onClick={() => setSelectedRoomId(room.id)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                selectedRoomId === room.id 
                  ? 'bg-emerald-600 text-white shadow-md' 
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              {room.name}
            </button>
          ))}
        </div>
      </div>

      {/* Room Details Banner */}
      {selectedRoom && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap gap-4 items-center text-sm text-slate-600 shadow-sm animate-fade-in">
           <div className="flex items-center gap-2">
              <MapPin className="text-emerald-500" size={18} />
              <span className="font-semibold">{selectedRoom.name}</span>
           </div>
           <div className="w-px h-4 bg-slate-300 hidden sm:block"></div>
           <div className="flex items-center gap-2">
              <Users className="text-slate-400" size={18} />
              <span>Capacidade: <strong>{selectedRoom.capacity} pessoas</strong></span>
           </div>
           <div className="w-px h-4 bg-slate-300 hidden sm:block"></div>
           <div className="flex flex-wrap gap-2">
              {selectedRoom.features && selectedRoom.features.length > 0 ? (
                selectedRoom.features.map(f => (
                  <span key={f} className="bg-slate-100 px-2 py-0.5 rounded text-xs border border-slate-200">
                    {f}
                  </span>
                ))
              ) : (
                <span className="text-xs italic text-slate-400">Sem recursos cadastrados</span>
              )}
           </div>
        </div>
      )}

      {/* Calendar Navigation & Tabs */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Week Navigator */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
           <button onClick={() => setWeekOffset(prev => prev - 1)} className="p-2 hover:bg-white rounded-lg transition-colors text-slate-500 hover:text-emerald-600">
             <ChevronLeft size={20} />
           </button>
           <span className="font-bold text-slate-700 capitalize">
             {selectedDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
           </span>
           <button onClick={() => setWeekOffset(prev => prev + 1)} className="p-2 hover:bg-white rounded-lg transition-colors text-slate-500 hover:text-emerald-600">
             <ChevronRight size={20} />
           </button>
        </div>

        {/* Days Tabs */}
        <div className="grid grid-cols-5 divide-x divide-slate-100 border-b border-slate-200">
           {weekDates.map(date => {
             const isSelected = formatDateKey(date) === formatDateKey(selectedDate);
             const isToday = formatDateKey(date) === formatDateKey(new Date());
             
             return (
               <button
                 key={date.toString()}
                 onClick={() => handleDaySelect(date)}
                 className={`py-3 flex flex-col items-center justify-center transition-colors hover:bg-emerald-50/50 ${
                   isSelected ? 'bg-white border-b-2 border-emerald-600' : 'bg-slate-50/50'
                 }`}
               >
                 <span className={`text-xs font-bold uppercase mb-1 ${isSelected ? 'text-emerald-600' : 'text-slate-400'}`}>
                   {date.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')}
                 </span>
                 <div className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold ${
                   isToday 
                     ? 'bg-emerald-600 text-white shadow-md' 
                     : isSelected ? 'bg-emerald-100 text-emerald-800' : 'text-slate-700'
                 }`}>
                   {date.getDate()}
                 </div>
               </button>
             );
           })}
        </div>

        {/* Time Slots Grid */}
        <div className="p-6">
           <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
             <Clock size={18} className="text-slate-400" />
             Horários Disponíveis para {selectedDate.toLocaleDateString('pt-BR')}
           </h3>
           
           <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {TIME_SLOTS.map(time => {
                const appointment = getAppointmentForSlot(time);
                const [h, m] = time.split(':').map(Number);
                const now = new Date();
                
                // Validação de horário passado:
                // Considera encerrado APENAS se o horário ATUAL for maior que o FIM do slot (Início + 30min)
                const slotEndDateTime = new Date(selectedDate);
                slotEndDateTime.setHours(h, m + 30, 0, 0); // Define a hora baseada no fim do slot
                
                const isPast = slotEndDateTime <= now;

                if (appointment) {
                  const isMine = appointment.userId === currentUser?.id;
                  const canEdit = isMine || isAdmin;
                  const participantCount = appointment.participants?.length || 0;

                  return (
                    <div key={time} className={`relative p-3 rounded-lg border text-left flex flex-col justify-between min-h-[100px] ${isPast ? 'bg-slate-100 border-slate-200 opacity-70 grayscale-[50%]' : (isMine ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200')}`}>
                       <div>
                         <span className={`text-xs font-bold px-2 py-0.5 rounded-full mb-2 flex justify-between items-center ${isPast ? 'bg-slate-200 text-slate-500' : (isMine ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700')}`}>
                           <span>{time}</span>
                           {isPast && <span className="text-[8px] uppercase font-bold tracking-wide">Encerrado</span>}
                         </span>
                         <p className="text-xs font-bold text-slate-800 line-clamp-2 leading-tight" title={appointment.subject}>{appointment.subject}</p>
                         <p className="text-[10px] text-slate-500 mt-1 truncate">{appointment.userName}</p>
                         
                         {participantCount > 0 && (
                           <div className="flex items-center gap-1 mt-1 text-[10px] text-slate-500" title={appointment.participants?.join(', ')}>
                             <Users size={10} />
                             <span>+ {participantCount} pessoa{participantCount > 1 ? 's' : ''}</span>
                           </div>
                         )}
                       </div>
                       
                       {canEdit && !isPast && (
                         <div className="flex items-center justify-end gap-1 mt-2 z-10">
                           <button 
                             type="button"
                             onClick={(e) => handleEdit(e, appointment)}
                             className="text-slate-400 hover:text-indigo-600 transition-colors p-2 rounded hover:bg-white/50"
                             title="Editar Assunto"
                           >
                             <Edit2 size={16} className="pointer-events-none" />
                           </button>
                           <button 
                             type="button"
                             onClick={(e) => handleDeleteClick(e, appointment)}
                             className="text-slate-400 hover:text-red-600 transition-colors p-2 rounded hover:bg-white/50"
                             title="Cancelar agendamento"
                           >
                             <Trash2 size={16} className="pointer-events-none" />
                           </button>
                         </div>
                       )}
                    </div>
                  );
                }

                if (isPast) {
                  return (
                    <div key={time} className="p-3 rounded-lg border border-slate-100 bg-slate-50 text-slate-300 flex flex-col items-center justify-center min-h-[100px] cursor-not-allowed">
                       <span className="text-sm font-bold mb-1">{time}</span>
                       <span className="text-[10px] uppercase font-bold tracking-wide">Encerrado</span>
                    </div>
                  );
                }

                return (
                  <button
                    key={time}
                    type="button"
                    onClick={() => handleSlotClick(time)}
                    className="p-3 rounded-lg border border-slate-200 bg-white hover:border-emerald-500 hover:shadow-md transition-all flex flex-col items-center justify-center min-h-[100px] group text-slate-600 hover:text-emerald-600"
                  >
                     <span className="text-lg font-bold mb-1 group-hover:scale-110 transition-transform">{time}</span>
                     <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Plus size={10} strokeWidth={4} /> Agendar
                     </div>
                  </button>
                );
              })}
           </div>
        </div>
      </div>

      {/* Booking Modal */}
      {isModalOpen && bookingSlot && (
        <div className="fixed inset-0 bg-slate-900/60 z-[70] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
           <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                 <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                   {editingAppointment ? <Edit2 className="text-indigo-600" size={20} /> : <Calendar className="text-emerald-600" size={20} />}
                   {editingAppointment ? 'Editar Agendamento' : 'Novo Agendamento'}
                 </h3>
                 <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-200 rounded-full transition-colors">
                   <X size={20} />
                 </button>
              </div>
              
              <div className="p-6 space-y-4">
                 <div className={`p-4 rounded-xl border space-y-1 text-sm ${editingAppointment ? 'bg-indigo-50 border-indigo-100 text-indigo-800' : 'bg-emerald-50 border-emerald-100 text-emerald-800'}`}>
                    <p><strong>Sala:</strong> {rooms.find(r => r.id === selectedRoomId)?.name}</p>
                    <p><strong>Data:</strong> {bookingSlot.date.toLocaleDateString('pt-BR')}</p>
                    <p><strong>Início:</strong> {bookingSlot.time}</p>
                    <p className="text-xs mt-1 opacity-80">(Duração padrão de 30 minutos)</p>
                 </div>

                 <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Assunto da Reunião</label>
                    <input 
                      type="text" 
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="Ex: Reunião de Alinhamento Semanal"
                      className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white text-slate-900 text-sm"
                      autoFocus
                    />
                 </div>

                 {/* Participants Section */}
                 <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1 flex justify-between">
                       Participantes (Opcional)
                       <span className="text-xs font-normal text-slate-400">Internos ou Externos</span>
                    </label>
                    <div className="flex gap-2 mb-2">
                       <input 
                         type="text" 
                         value={participantInput}
                         onChange={(e) => setParticipantInput(e.target.value)}
                         onKeyDown={(e) => e.key === 'Enter' && handleAddParticipant()}
                         placeholder="Nome do participante..."
                         className="flex-1 p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
                       />
                       <button 
                         onClick={handleAddParticipant}
                         type="button"
                         disabled={!participantInput.trim()}
                         className="bg-slate-100 text-slate-600 p-2.5 rounded-lg hover:bg-slate-200 disabled:opacity-50"
                       >
                         <Plus size={18} />
                       </button>
                    </div>
                    
                    {/* Suggestions */}
                    {filteredSuggestions.length > 0 && (
                      <div className="mb-3 flex flex-wrap gap-2">
                         {filteredSuggestions.map(emp => (
                           <button 
                             key={emp.id}
                             onClick={() => handleSelectEmployee(emp.name)}
                             className="text-xs bg-emerald-50 text-emerald-700 px-2 py-1 rounded-md border border-emerald-100 hover:bg-emerald-100 flex items-center gap-1"
                           >
                             <UserPlus size={10} /> {emp.name}
                           </button>
                         ))}
                      </div>
                    )}

                    {/* Added List */}
                    {participants.length > 0 ? (
                       <div className="flex flex-wrap gap-2 mt-2">
                          {participants.map((p, idx) => (
                             <span key={idx} className="bg-slate-100 text-slate-700 text-xs px-2 py-1 rounded-full flex items-center gap-1 border border-slate-200">
                                {p}
                                <button onClick={() => handleRemoveParticipant(p)} className="text-slate-400 hover:text-red-500">
                                   <X size={12} />
                                </button>
                             </span>
                          ))}
                       </div>
                    ) : (
                       <p className="text-xs text-slate-400 italic mt-1">Nenhum participante adicionado.</p>
                    )}
                 </div>

                 {!editingAppointment && (
                    <div className="text-xs text-slate-500 flex items-start gap-2 bg-slate-50 p-3 rounded-lg">
                        <AlertCircle size={14} className="shrink-0 mt-0.5 text-amber-500" />
                        <p>Lembre-se de cancelar caso não possa comparecer para liberar o horário para outros colegas.</p>
                    </div>
                 )}
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                 <button 
                   onClick={() => setIsModalOpen(false)}
                   className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg font-medium text-sm"
                   disabled={isSubmitting}
                 >
                   Cancelar
                 </button>
                 <button 
                   onClick={handleConfirmBooking}
                   disabled={!subject.trim() || isSubmitting}
                   className={`px-6 py-2 text-white rounded-lg font-medium hover:opacity-90 flex items-center gap-2 text-sm disabled:opacity-50 ${editingAppointment ? 'bg-indigo-600' : 'bg-emerald-600'}`}
                 >
                   {isSubmitting ? 'Salvando...' : (editingAppointment ? 'Salvar Alterações' : 'Confirmar Reserva')}
                   {!isSubmitting && <CheckCircle2 size={16} />}
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && appointmentToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 z-[80] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
           <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden border-2 border-red-100">
              <div className="p-6 text-center">
                 <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500">
                   <AlertTriangle size={28} />
                 </div>
                 <h3 className="text-lg font-bold text-slate-800 mb-2">Cancelar Reunião?</h3>
                 <p className="text-sm text-slate-500 mb-6">
                   Tem certeza que deseja cancelar a reunião <strong>"{appointmentToDelete.subject}"</strong>?
                   <br/>O horário ficará livre para outros agendamentos.
                 </p>
                 
                 <div className="flex gap-3">
                   <button 
                     onClick={() => setIsDeleteModalOpen(false)}
                     className="flex-1 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl font-bold text-sm transition-colors"
                     disabled={isSubmitting}
                   >
                     Não, manter
                   </button>
                   <button 
                     onClick={confirmDelete}
                     className="flex-1 py-2.5 bg-red-600 text-white rounded-xl font-bold text-sm hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                     disabled={isSubmitting}
                   >
                     {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : 'Sim, cancelar'}
                   </button>
                 </div>
              </div>
           </div>
        </div>
      )}

    </div>
  );
};

export default MeetingRooms;
