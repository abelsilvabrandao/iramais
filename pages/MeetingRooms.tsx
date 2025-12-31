
import React, { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebaseConfig';
import { createAppointment, updateAppointment, deleteAppointment, fetchMeetingRooms, fetchEmployees, fetchUnits } from '../services/firebaseService';
import { useAuth } from '../contexts/AuthContext';
import { Appointment, MeetingRoom, Employee, OrganizationUnit } from '../types';
import { Calendar, Clock, MapPin, Plus, Trash2, Edit2, Users, AlertCircle, CheckCircle2, ChevronLeft, ChevronRight, X, Loader2, AlertTriangle, UserPlus, CheckSquare, Square, User, Building2 } from 'lucide-react';

// Gera horários de 30 em 30 minutos (das 00:00 às 23:30)
const generateAllTimeSlots = () => {
  const slots = [];
  for (let hour = 0; hour <= 23; hour++) {
    slots.push(`${String(hour).padStart(2, '0')}:00`);
    slots.push(`${String(hour).padStart(2, '0')}:30`);
  }
  return slots;
};

const ALL_TIME_SLOTS = generateAllTimeSlots();

const MeetingRooms: React.FC = () => {
  const { currentUser, isAdmin, isMaster } = useAuth();
  const location = useLocation();
  
  // States
  const [rooms, setRooms] = useState<MeetingRoom[]>([]);
  const [units, setUnits] = useState<OrganizationUnit[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]); 
  const [selectedUnitId, setSelectedUnitId] = useState<string>('');
  const [selectedRoomId, setSelectedRoomId] = useState<string>('');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [weekOffset, setWeekOffset] = useState(0); 
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isLoadingData, setIsLoadingData] = useState(true);
  
  // Modal State for Booking
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [bookingSlot, setBookingSlot] = useState<{date: Date, time: string} | null>(null);
  const [selectedSlots, setSelectedSlots] = useState<string[]>([]); 
  const [subject, setSubject] = useState('');
  
  // Participants State
  const [participants, setParticipants] = useState<string[]>([]);
  const [participantInput, setParticipantInput] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);

  // Modal State for Deletion
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [appointmentToDelete, setAppointmentToDelete] = useState<Appointment | null>(null);

  // 1. Fetch Rooms, Units & Employees
  useEffect(() => {
    const loadData = async () => {
      setIsLoadingData(true);
      try {
        const [roomsData, employeesData, unitsData] = await Promise.all([
          fetchMeetingRooms(),
          fetchEmployees(),
          fetchUnits()
        ]);
        
        setRooms(roomsData);
        setEmployees(employeesData);
        setUnits(unitsData);
        
        const navigationState = location.state as { selectedRoomId?: string };
        
        // Lógica de pré-seleção
        if (navigationState?.selectedRoomId) {
          const targetRoom = roomsData.find(r => r.id === navigationState.selectedRoomId);
          if (targetRoom) {
            setSelectedUnitId(targetRoom.unitId || '');
            setSelectedRoomId(targetRoom.id);
          }
        } else if (currentUser?.unit && unitsData.length > 0) {
          // Tenta encontrar a unidade pelo nome do perfil do usuário
          const myUnit = unitsData.find(u => u.name === currentUser.unit);
          const unitId = myUnit ? myUnit.id : (unitsData[0]?.id || '');
          setSelectedUnitId(unitId);
          
          // Seleciona a primeira sala desta unidade
          const firstRoomInUnit = roomsData.find(r => r.unitId === unitId);
          if (firstRoomInUnit) {
            setSelectedRoomId(firstRoomInUnit.id);
          }
        } else if (unitsData.length > 0) {
            setSelectedUnitId(unitsData[0].id);
            const firstRoom = roomsData.find(r => r.unitId === unitsData[0].id);
            if (firstRoom) setSelectedRoomId(firstRoom.id);
        }

      } catch (error) {
        console.error("Erro ao carregar dados", error);
      } finally {
        setIsLoadingData(false);
      }
    };
    loadData();
  }, [location.state, currentUser]);

  // 2. Load Appointments
  useEffect(() => {
    if (!selectedRoomId) return;

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

  // Filtragem de salas baseada na unidade selecionada
  const filteredRooms = useMemo(() => {
    return rooms.filter(r => r.unitId === selectedUnitId);
  }, [rooms, selectedUnitId]);

  const selectedRoom = useMemo(() => rooms.find(r => r.id === selectedRoomId), [rooms, selectedRoomId]);

  const roomTimeSlots = useMemo(() => {
    if (!selectedRoom) return [];
    
    const day = selectedDate.getDay();
    const isSaturday = day === 6;
    const isSunday = day === 0;
    
    if ((isSaturday && !selectedRoom.worksSaturday) || (isSunday && !selectedRoom.worksSunday)) {
        return [];
    }

    const start = selectedRoom.startTime || '08:00';
    const end = selectedRoom.endTime || '18:00';
    return ALL_TIME_SLOTS.filter(slot => slot >= start && slot < end);
  }, [selectedRoom, selectedDate]);

  const weekDates = useMemo(() => {
    const today = new Date();
    const currentDay = today.getDay(); 
    const diff = today.getDate() - currentDay + (currentDay === 0 ? -6 : 1); 
    const monday = new Date(today.setDate(diff));
    monday.setDate(monday.getDate() + (weekOffset * 7));
    const dates = [];
    for (let i = 0; i < 7; i++) { 
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      dates.push(d);
    }
    return dates;
  }, [weekOffset]);

  const formatDateKey = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  const handleDaySelect = (date: Date) => {
    setSelectedDate(date);
  };

  const handleUnitChange = (unitId: string) => {
    setSelectedUnitId(unitId);
    // Ao trocar unidade, seleciona a primeira sala daquela unidade
    const firstRoom = rooms.find(r => r.unitId === unitId);
    if (firstRoom) {
      setSelectedRoomId(firstRoom.id);
    } else {
      setSelectedRoomId('');
    }
  };

  const handleSlotClick = (time: string) => {
    const now = new Date();
    const slotStartDateTime = new Date(selectedDate);
    const [hours, minutes] = time.split(':').map(Number);
    slotStartDateTime.setHours(hours, minutes, 0, 0);
    const slotEndDateTime = new Date(slotStartDateTime);
    slotEndDateTime.setMinutes(slotStartDateTime.getMinutes() + 30);
    if (slotEndDateTime <= now) {
      alert("Este horário já foi encerrado.");
      return;
    }
    setEditingAppointment(null);
    setBookingSlot({ date: selectedDate, time });
    setSelectedSlots([time]);
    setSubject('');
    setParticipants([]); 
    setParticipantInput('');
    setIsModalOpen(true);
  };

  const handleEdit = (e: React.MouseEvent, app: Appointment) => {
    e.preventDefault();
    e.stopPropagation();
    const [year, month, day] = app.date.split('-').map(Number);
    const dateObj = new Date(year, month - 1, day);
    setEditingAppointment(app);
    setBookingSlot({ date: dateObj, time: app.time });
    setSelectedSlots([app.time]);
    setSubject(app.subject);
    setParticipants(app.participants || []); 
    setParticipantInput('');
    setIsModalOpen(true);
  };

  const toggleSlotSelection = (time: string) => {
    setSelectedSlots(prev => {
        if (prev.includes(time)) {
            if (prev.length === 1) return prev; 
            return prev.filter(t => t !== time);
        }
        return [...prev, time].sort();
    });
  };

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
        e.name !== currentUser?.name 
      ).slice(0, 3) 
    : [];

  const handleConfirmBooking = async () => {
    if (selectedSlots.length === 0 || !currentUser || !subject.trim()) return;
    setIsSubmitting(true);
    try {
      if (editingAppointment) {
        await updateAppointment(editingAppointment.id, {
          subject: subject.trim(),
          participants: participants
        });
      } else {
        const dateKey = formatDateKey(selectedDate);
        const promises = selectedSlots.map(time => 
            createAppointment({
                roomId: selectedRoomId,
                date: dateKey,
                time: time,
                userId: currentUser.id,
                userName: currentUser.name,
                subject: subject.trim(),
                participants: participants,
                createdAt: new Date().toISOString()
            })
        );
        await Promise.all(promises);
      }
      setIsModalOpen(false);
      setBookingSlot(null);
      setSelectedSlots([]);
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
    if (!isOwner && !isAdmin && !isMaster) {
      alert("Você não tem permissão para cancelar este agendamento.");
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

  const getAppointmentForSlot = (time: string) => {
    const dateKey = formatDateKey(selectedDate);
    return appointments.find(a => a.date === dateKey && a.time === time);
  };

  if (isLoadingData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-2 text-emerald-600">
           <Loader2 className="animate-spin" size={48} />
           <span className="font-medium">Carregando agenda...</span>
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
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Calendar className="text-emerald-600" size={24} /> Salas de Reunião
          </h2>
          <p className="text-slate-500 text-sm">Agendamentos dinâmicos por sala e unidade.</p>
        </div>

        {/* SELEÇÃO DE UNIDADE E SALA */}
        <div className="flex flex-col gap-3 w-full md:w-auto">
          {/* Barra de Unidades */}
          <div className="flex flex-wrap items-center gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-inner">
            <span className="text-[10px] font-black text-slate-400 uppercase px-2">Unidade:</span>
            {units.map(unit => (
              <button
                key={unit.id}
                onClick={() => handleUnitChange(unit.id)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  selectedUnitId === unit.id 
                    ? 'bg-white text-emerald-700 shadow-sm border border-emerald-100' 
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {unit.name}
              </button>
            ))}
          </div>

          {/* Barra de Salas */}
          <div className="flex flex-wrap items-center gap-2 bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-[10px] font-black text-slate-400 uppercase px-2">Sala:</span>
            {filteredRooms.length > 0 ? filteredRooms.map(room => (
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
            )) : (
              <span className="text-xs text-slate-400 px-4 py-2">Nenhuma sala nesta unidade</span>
            )}
          </div>
        </div>
      </div>

      {selectedRoom && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap gap-4 items-center text-sm text-slate-600 shadow-sm animate-fade-in">
           <div className="flex items-center gap-2">
              <MapPin className="text-emerald-500" size={18} />
              <span className="font-semibold">{selectedRoom.name}</span>
           </div>
           <div className="w-px h-4 bg-slate-300 hidden sm:block"></div>
           <div className="flex items-center gap-2">
              <Building2 className="text-slate-400" size={18} />
              <span className="font-semibold">{units.find(u => u.id === selectedRoom.unitId)?.name}</span>
           </div>
           <div className="w-px h-4 bg-slate-300 hidden sm:block"></div>
           <div className="flex items-center gap-2">
              <Users className="text-slate-400" size={18} />
              <span>Capacidade: <strong>{selectedRoom.capacity} pessoas</strong></span>
           </div>
           <div className="w-px h-4 bg-slate-300 hidden sm:block"></div>
           <div className="flex items-center gap-2">
              <Clock size={18} className="text-slate-400" />
              <span>Funcionamento: <strong>{selectedRoom.startTime || '08:00'} - {selectedRoom.endTime || '18:00'}</strong></span>
           </div>
           {selectedRoom.worksSaturday && <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-50 text-emerald-600 border border-emerald-100">SÁB ABERTO</span>}
           {selectedRoom.worksSunday && <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-50 text-emerald-600 border border-emerald-100">DOM ABERTO</span>}
        </div>
      )}

      {/* CALENDAR */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
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

        <div className="grid grid-cols-7 divide-x divide-slate-100 border-b border-slate-200">
           {weekDates.map(date => {
             const isSelected = formatDateKey(date) === formatDateKey(selectedDate);
             const isToday = formatDateKey(date) === formatDateKey(new Date());
             const day = date.getDay();
             const isWeekend = day === 0 || day === 6;
             
             return (
               <button
                 key={date.toString()}
                 onClick={() => handleDaySelect(date)}
                 className={`py-3 flex flex-col items-center justify-center transition-colors hover:bg-emerald-50/50 ${
                   isSelected ? 'bg-white border-b-2 border-emerald-600' : (isWeekend ? 'bg-slate-50/20' : 'bg-slate-50/50')
                 }`}
               >
                 <span className={`text-[10px] font-bold uppercase mb-1 ${isSelected ? 'text-emerald-600' : (isWeekend ? 'text-slate-300' : 'text-slate-400')}`}>
                   {date.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')}
                 </span>
                 <div className={`w-7 h-7 flex items-center justify-center rounded-full text-xs font-bold ${
                   isToday 
                     ? 'bg-emerald-600 text-white shadow-md' 
                     : isSelected ? 'bg-emerald-100 text-emerald-800' : (isWeekend ? 'text-slate-400' : 'text-slate-700')
                 }`}>
                   {date.getDate()}
                 </div>
               </button>
             );
           })}
        </div>

        {/* TIME SLOTS */}
        <div className="p-6">
           <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
             <Clock size={18} className="text-slate-400" />
             Horários para {selectedDate.toLocaleDateString('pt-BR')}
           </h3>
           
           {roomTimeSlots.length > 0 ? (
             <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {roomTimeSlots.map(time => {
                    const appointment = getAppointmentForSlot(time);
                    const [h, m] = time.split(':').map(Number);
                    const now = new Date();
                    const slotEndDateTime = new Date(selectedDate);
                    slotEndDateTime.setHours(h, m + 30, 0, 0); 
                    const isPast = slotEndDateTime <= now;

                    if (appointment) {
                    const isMine = appointment.userId === currentUser?.id;
                    const canEdit = isMine || isAdmin || isMaster;
                    const participantsList = appointment.participants || [];
                    
                    return (
                        <div key={time} className={`relative p-4 rounded-2xl border text-left flex flex-col justify-between min-h-[140px] shadow-sm transition-all hover:shadow-md ${isPast ? 'bg-slate-100 border-slate-200 opacity-70 grayscale-[50%]' : (isMine ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200')}`}>
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${isPast ? 'bg-slate-200 text-slate-500' : (isMine ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700')}`}>
                                    {time}
                                </span>
                                {isPast && <span className="text-[8px] uppercase font-black tracking-widest text-slate-400">Encerrado</span>}
                            </div>
                            
                            <h4 className="text-xs font-black text-slate-800 line-clamp-2 uppercase tracking-tight leading-tight mb-1" title={appointment.subject}>
                                {appointment.subject}
                            </h4>
                            
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-bold mb-2">
                                <User size={10} className="text-slate-400" />
                                <span className="truncate">{appointment.userName}</span>
                            </div>

                            {participantsList.length > 0 && (
                                <div className="border-t border-black/5 pt-2 mt-2">
                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Participantes:</p>
                                    <div className="flex flex-wrap gap-1">
                                        {participantsList.map((p, idx) => (
                                            <span key={idx} className={`text-[9px] px-1.5 py-0.5 rounded border leading-none font-medium truncate max-w-[100px] ${isMine ? 'bg-emerald-100/50 border-emerald-200 text-emerald-800' : 'bg-red-100/50 border-red-200 text-red-800'}`}>
                                                {p}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                        
                        {canEdit && (
                            <div className="flex items-center justify-end gap-1 mt-3 pt-2 border-t border-black/5">
                                {!isPast && (
                                  <button type="button" onClick={(e) => handleEdit(e, appointment)} className="text-slate-400 hover:text-indigo-600 transition-colors p-2 rounded-lg hover:bg-white/50" title="Editar Assunto"><Edit2 size={16} /></button>
                                )}
                                <button type="button" onClick={(e) => handleDeleteClick(e, appointment)} className="text-slate-400 hover:text-red-600 transition-colors p-2 rounded-lg hover:bg-white/50" title="Cancelar agendamento"><Trash2 size={16} /></button>
                            </div>
                        )}
                        </div>
                    );
                    }

                    if (isPast) {
                    return (
                        <div key={time} className="p-4 rounded-2xl border border-slate-100 bg-slate-50 text-slate-300 flex flex-col items-center justify-center min-h-[140px] cursor-not-allowed border-dashed">
                            <span className="text-sm font-black mb-1 opacity-50">{time}</span>
                            <span className="text-[9px] uppercase font-black tracking-widest opacity-40">Horário Encerrado</span>
                        </div>
                    );
                    }

                    return (
                    <button key={time} type="button" onClick={() => handleSlotClick(time)} className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-emerald-500 hover:shadow-lg hover:-translate-y-1 transition-all flex flex-col items-center justify-center min-h-[140px] group text-slate-400 hover:text-emerald-600">
                        <span className="text-2xl font-black mb-1 group-hover:scale-110 transition-transform text-slate-700 group-hover:text-emerald-600">{time}</span>
                        <div className="flex items-center gap-1 text-[10px] uppercase font-black tracking-widest text-emerald-600 opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0">
                            <Plus size={12} strokeWidth={3} /> Agendar
                        </div>
                    </button>
                    );
                })}
             </div>
           ) : (
             <div className="py-12 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 flex flex-col items-center">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mb-4">
                    <Clock size={32} />
                </div>
                <h4 className="text-lg font-bold text-slate-700 uppercase tracking-tight">Sala Fechada</h4>
                <p className="text-sm text-slate-500 max-w-xs mx-auto mt-1">A sala <strong>{selectedRoom?.name}</strong> não possui funcionamento configurado para este dia.</p>
             </div>
           )}
        </div>
      </div>

      {/* BOOKING MODAL */}
      {isModalOpen && bookingSlot && (
        <div className="fixed inset-0 bg-slate-900/60 z-[70] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in overflow-y-auto">
           <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
              <div className="p-4 md:p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                 <h3 className="font-black text-slate-800 flex items-center gap-2 uppercase tracking-tight">
                   {editingAppointment ? <Edit2 className="text-indigo-600" size={20} /> : <Calendar className="text-emerald-600" size={20} />}
                   {editingAppointment ? 'Editar Agendamento' : 'Novo Agendamento'}
                 </h3>
                 <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400"><X size={24} /></button>
              </div>
              
              <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1">
                 <div className={`p-4 rounded-2xl border space-y-2 text-[11px] font-bold uppercase tracking-wide ${editingAppointment ? 'bg-indigo-50 border-indigo-100 text-indigo-800' : 'bg-emerald-50 border-emerald-100 text-emerald-800'}`}>
                    <p className="flex items-center gap-2"><MapPin size={14}/> <span>Sala: {selectedRoom?.name}</span></p>
                    <p className="flex items-center gap-2"><Calendar size={14}/> <span>Data: {bookingSlot.date.toLocaleDateString('pt-BR')}</span></p>
                    <p className="flex items-center gap-2"><Clock size={14}/> <span>Horários: {selectedSlots.join(', ')}</span></p>
                 </div>

                 {!editingAppointment && (
                     <div className="space-y-3">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Facilitador: Selecione outros horários livres:</label>
                        <div className="grid grid-cols-4 gap-2 p-3 border border-slate-100 rounded-2xl bg-slate-50/50">
                           {roomTimeSlots.map(time => {
                              const isOccupied = !!getAppointmentForSlot(time);
                              const isNowOrPast = (() => {
                                 const [h, m] = time.split(':').map(Number);
                                 const d = new Date(selectedDate); d.setHours(h, m+30, 0, 0);
                                 return d <= new Date();
                              })();
                              const isSelected = selectedSlots.includes(time);
                              if (isOccupied || isNowOrPast) return null;
                              return (
                                 <button key={time} type="button" onClick={() => toggleSlotSelection(time)} className={`flex items-center justify-center gap-1.5 p-2 rounded-xl text-[10px] font-black transition-all border ${isSelected ? 'bg-emerald-600 text-white border-emerald-700 shadow-md' : 'bg-white text-slate-400 border-slate-200 hover:border-emerald-300'}`}>
                                    {isSelected ? <CheckSquare size={12}/> : <Square size={12}/>} {time}
                                 </button>
                              );
                           })}
                        </div>
                     </div>
                 )}

                 <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">Assunto da Reunião</label>
                    <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Ex: ALINHAMENTO DE PROJETOS" className="w-full p-4 border border-slate-200 rounded-2xl text-sm font-bold bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 text-slate-900 transition-all uppercase placeholder:text-slate-300 shadow-inner" autoFocus />
                 </div>

                 <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5 flex justify-between">Participantes Opcionais <span className="font-bold text-slate-300 text-[10px] italic">Externos ou Internos</span></label>
                    <div className="flex gap-2 mb-3">
                       <input 
                         type="text" 
                         value={participantInput} 
                         onChange={(e) => setParticipantInput(e.target.value)} 
                         onKeyDown={(e) => e.key === 'Enter' && handleAddParticipant()} 
                         placeholder="Digite o nome e pressione Enter..." 
                         className="flex-1 p-4 bg-white border-2 border-slate-100 rounded-2xl text-sm font-bold text-slate-800 focus:border-emerald-500 focus:ring-0 shadow-sm transition-all placeholder:text-slate-300" 
                       />
                       <button onClick={handleAddParticipant} type="button" disabled={!participantInput.trim()} className="bg-emerald-600 text-white p-4 rounded-2xl hover:bg-emerald-700 disabled:opacity-50 transition-all shadow-lg active:scale-95"><Plus size={20} strokeWidth={3}/></button>
                    </div>
                    {filteredSuggestions.length > 0 && (
                      <div className="mb-4 flex flex-wrap gap-2 p-2 bg-slate-50 rounded-xl animate-fade-in border border-slate-100">
                         {filteredSuggestions.map(emp => (<button key={emp.id} onClick={() => handleSelectEmployee(emp.name)} className="text-[10px] font-black uppercase bg-white text-emerald-700 px-3 py-1.5 rounded-lg border border-emerald-100 hover:bg-emerald-50 flex items-center gap-1.5 shadow-sm"><UserPlus size={12} /> {emp.name}</button>))}
                      </div>
                    )}
                    <div className="flex flex-wrap gap-2 mt-3 p-3 bg-slate-50 rounded-2xl min-h-[50px] border border-slate-100 border-dashed">
                       {participants.length > 0 ? participants.map((p, idx) => (
                          <span key={idx} className="bg-white text-slate-700 text-[10px] font-black uppercase px-3 py-2 rounded-xl flex items-center gap-2 border border-slate-200 shadow-sm animate-fade-in">
                             {p}
                             <button onClick={() => handleRemoveParticipant(p)} className="text-red-400 hover:text-red-600 transition-colors"><X size={14} /></button>
                          </span>
                       )) : ( <p className="text-[10px] text-slate-300 font-bold uppercase tracking-widest italic m-auto">Nenhum participante na lista</p> )}
                    </div>
                 </div>

                 {!editingAppointment && (
                    <div className="text-[10px] text-slate-500 font-bold bg-amber-50 p-4 rounded-2xl border border-amber-100 flex gap-3">
                        <AlertCircle size={18} className="text-amber-500 shrink-0" />
                        <p>DICA: Ao selecionar vários horários, o sistema criará reservas individuais de 30 min cada, mantendo o mesmo assunto e participantes.</p>
                    </div>
                 )}
              </div>

              <div className="p-4 md:p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 shrink-0">
                 <button onClick={() => setIsModalOpen(false)} className="px-6 py-3 text-slate-500 font-black uppercase tracking-widest text-xs hover:bg-slate-200 rounded-2xl transition-all" disabled={isSubmitting}>Cancelar</button>
                 <button onClick={handleConfirmBooking} disabled={!subject.trim() || isSubmitting || selectedSlots.length === 0} className={`px-10 py-3 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:opacity-90 flex items-center gap-2 disabled:opacity-50 shadow-xl transition-all active:scale-95 ${editingAppointment ? 'bg-indigo-600 shadow-indigo-100' : 'bg-emerald-600 shadow-emerald-200'}`}>
                    {isSubmitting ? <Loader2 className="animate-spin" size={18}/> : (editingAppointment ? 'Salvar Alterações' : 'Confirmar Reserva(s)')}
                    {!isSubmitting && <CheckCircle2 size={18} />}
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* DELETE */}
      {isDeleteModalOpen && appointmentToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 z-[80] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
           <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden border-2 border-red-100">
              <div className="p-8 text-center">
                 <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6 text-red-500"><AlertTriangle size={40} /></div>
                 <h3 className="text-lg font-black text-slate-800 mb-2 uppercase tracking-tight">Cancelar Reunião?</h3>
                 <p className="text-sm text-slate-500 mb-8 leading-relaxed">Você está prestes a cancelar a reserva <strong>"{appointmentToDelete.subject}"</strong>. Esta vaga voltará a ficar disponível para outros colaboradores.</p>
                 <div className="flex gap-3">
                   <button onClick={() => setIsDeleteModalOpen(false)} className="flex-1 py-4 text-slate-400 font-black uppercase text-xs hover:bg-slate-100 rounded-2xl transition-all" disabled={isSubmitting}>Manter</button>
                   <button onClick={confirmDelete} className="flex-1 py-4 bg-red-600 text-white rounded-2xl font-black uppercase text-xs hover:bg-red-700 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-red-100" disabled={isSubmitting}>{isSubmitting ? <Loader2 size={16} className="animate-spin" /> : 'Sim, cancelar'}</button>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default MeetingRooms;
