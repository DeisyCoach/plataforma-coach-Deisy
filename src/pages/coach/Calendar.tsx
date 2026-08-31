import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase/client';
import { useAuth } from '../../providers/AuthProvider';
import { Calendar as CalendarIcon, Plus, User, Dumbbell, ArrowRight, Trash2, X, ArrowUp, ArrowDown, Pencil, Filter, MessageSquare } from 'lucide-react';
import { Link } from 'react-router-dom';

export function Calendar() {
  const { user } = useAuth();
  const isCoach = user?.email === 'coach@plataforma.com';

  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtro de Atleta
  const [selectedAthleteFilter, setSelectedAthleteFilter] = useState<string>('ALL');

  // Modal Asignar
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [athletes, setAthletes] = useState<any[]>([]);
  const [routines, setRoutines] = useState<any[]>([]);
  const [selectedAthlete, setSelectedAthlete] = useState('');
  const [selectedRoutine, setSelectedRoutine] = useState('');
  const [selectedDay, setSelectedDay] = useState(1);
  const [customExercises, setCustomExercises] = useState<any[]>([]);

  // Modal Editar Asignación Existente
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<any>(null);
  const [editExercises, setEditExercises] = useState<any[]>([]);

  const days = [
    { id: 1, name: 'LUNES' }, { id: 2, name: 'MARTES' }, { id: 3, name: 'MIÉRCOLES' },
    { id: 4, name: 'JUEVES' }, { id: 5, name: 'VIERNES' }, { id: 6, name: 'SÁBADO' }, { id: 7, name: 'DOMINGO' }
  ];

  useEffect(() => { fetchData(); }, [user]);

  const fetchData = async () => {
    setLoading(true);
    if (isCoach) {
      const { data: aData } = await supabase.from('athletes').select('*').order('full_name');
      const { data: rData } = await supabase.from('routines').select('*').order('name');
      setAthletes(aData || []);
      setRoutines(rData || []);

      const { data } = await supabase
        .from('athlete_routines')
        .select('*, athletes(full_name), routines(name)')
        .order('order_index', { ascending: true, nullsFirst: false });
      setAssignments(data || []);
    } else {
      const { data: athlete } = await supabase.from('athletes').select('id').eq('email', user?.email).single();
      if (athlete) {
        const { data } = await supabase
          .from('athlete_routines')
          .select('*, routines(name)')
          .eq('athlete_id', athlete.id)
          .order('order_index', { ascending: true, nullsFirst: false });
        setAssignments(data || []);
      }
    }
    setLoading(false);
  };

  const openAssignModal = () => {
    setSelectedAthlete(selectedAthleteFilter !== 'ALL' ? selectedAthleteFilter : '');
    setSelectedRoutine('');
    setCustomExercises([]);
    setIsModalOpen(true);
  };

  const handleRoutineSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const routineId = e.target.value;
    setSelectedRoutine(routineId);
    
    if (routineId) {
      const selected = routines.find(r => r.id === routineId);
      if (selected && selected.exercises) {
        const parsed = typeof selected.exercises === 'string' ? JSON.parse(selected.exercises) : selected.exercises;
        setCustomExercises(parsed);
      } else {
        setCustomExercises([]);
      }
    } else {
      setCustomExercises([]);
    }
  };

  // Funciones Modal Asignar Nuevo
  const handleRemoveExercise = (indexToRemove: number) => {
    setCustomExercises(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  const handleEditExercise = (indexToEdit: number, field: string, newValue: string) => {
    setCustomExercises(prev => prev.map((ex, index) => index === indexToEdit ? { ...ex, [field]: newValue } : ex));
  };

  const handleMoveUpModal = (index: number) => {
    if (index === 0) return;
    const newExercises = [...customExercises];
    const temp = newExercises[index - 1];
    newExercises[index - 1] = newExercises[index];
    newExercises[index] = temp;
    setCustomExercises(newExercises);
  };

  const handleMoveDownModal = (index: number) => {
    if (index === customExercises.length - 1) return;
    const newExercises = [...customExercises];
    const temp = newExercises[index + 1];
    newExercises[index + 1] = newExercises[index];
    newExercises[index] = temp;
    setCustomExercises(newExercises);
  };

  // Reordenar Asignaciones en el Calendario
  const handleMoveAssignment = async (currentAssign: any, direction: 'up' | 'down', dayAssignments: any[]) => {
    const currentIndex = dayAssignments.findIndex(a => a.id === currentAssign.id);
    if (currentIndex === -1) return;
    
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= dayAssignments.length) return;

    const targetAssign = dayAssignments[targetIndex];

    const currentOrder = currentAssign.order_index ?? currentIndex;
    const targetOrder = targetAssign.order_index ?? targetIndex;

    await Promise.all([
      supabase.from('athlete_routines').update({ order_index: targetOrder }).eq('id', currentAssign.id),
      supabase.from('athlete_routines').update({ order_index: currentOrder }).eq('id', targetAssign.id)
    ]);
    
    fetchData();
  };

  const handleAssign = async () => {
    if (!selectedAthlete || !selectedRoutine) return alert('Selecciona atleta y rutina');
    if (customExercises.length === 0) return alert('La rutina debe tener al menos un ejercicio.');

    const currentDayAssignments = assignments.filter(a => Number(a.day_of_week) === selectedDay && a.athlete_id === selectedAthlete);
    const nextOrderIndex = currentDayAssignments.length;

    const { error } = await supabase.from('athlete_routines').insert([
      { 
        athlete_id: selectedAthlete, 
        routine_id: selectedRoutine, 
        day_of_week: selectedDay,
        custom_exercises: customExercises,
        order_index: nextOrderIndex
      }
    ]);

    if (!error) {
      setIsModalOpen(false);
      alert('¡Rutina asignada exitosamente!');
      fetchData();
    } else {
      alert('Error al asignar: ' + error.message);
    }
  };

  const handleDeleteAssign = async (id: string) => {
    if (window.confirm('¿Deseas eliminar esta asignación?')) {
      await supabase.from('athlete_routines').delete().eq('id', id);
      fetchData();
    }
  };

  // Funciones Editar Asignación Existente
  const openEditModal = (assign: any) => {
    setEditingAssignment(assign);
    const exercises = assign.custom_exercises || [];
    const parsed = typeof exercises === 'string' ? JSON.parse(exercises) : exercises;
    setEditExercises(parsed);
    setIsEditModalOpen(true);
  };

  const handleEditExerciseField = (indexToEdit: number, field: string, newValue: string) => {
    setEditExercises(prev => prev.map((ex, index) => index === indexToEdit ? { ...ex, [field]: newValue } : ex));
  };

  const handleRemoveEditExercise = (indexToRemove: number) => {
    setEditExercises(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  const handleMoveUpEdit = (index: number) => {
    if (index === 0) return;
    const list = [...editExercises];
    const temp = list[index - 1];
    list[index - 1] = list[index];
    list[index] = temp;
    setEditExercises(list);
  };

  const handleMoveDownEdit = (index: number) => {
    if (index === editExercises.length - 1) return;
    const list = [...editExercises];
    const temp = list[index + 1];
    list[index + 1] = list[index];
    list[index] = temp;
    setEditExercises(list);
  };

  const handleSaveEditAssignment = async () => {
    if (!editingAssignment) return;
    if (editExercises.length === 0) return alert('La rutina debe tener al menos un ejercicio.');

    const { error } = await supabase
      .from('athlete_routines')
      .update({ custom_exercises: editExercises })
      .eq('id', editingAssignment.id);

    if (!error) {
      setIsEditModalOpen(false);
      alert('¡Rutina modificada exitosamente!');
      fetchData();
    } else {
      alert('Error al guardar cambios: ' + error.message);
    }
  };

  const filteredAssignments = isCoach
    ? (selectedAthleteFilter === 'ALL' ? assignments : assignments.filter(a => a.athlete_id === selectedAthleteFilter))
    : assignments;

  if (loading) return <div className="text-amber-400 font-bold p-8">Cargando calendario...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-zinc-800 pb-4 gap-4">
        <div>
          <h2 className="text-2xl font-black text-white flex items-center gap-2">
            <CalendarIcon className="w-7 h-7 text-amber-400" />
            {isCoach ? 'Calendario General' : 'Mi Semana de Entrenamiento'}
          </h2>
          <p className="text-zinc-400 text-sm mt-1">
            {isCoach ? 'Planifica y ajusta las rutinas de tus atletas.' : 'Toca tu rutina del día para ir a entrenar.'}
          </p>
        </div>

        {isCoach && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2">
              <Filter className="w-4 h-4 text-amber-500 shrink-0" />
              <select 
                value={selectedAthleteFilter} 
                onChange={(e) => setSelectedAthleteFilter(e.target.value)}
                className="bg-transparent text-white font-bold text-sm outline-none cursor-pointer"
              >
                <option value="ALL" className="bg-zinc-950 text-white">Todos los atletas</option>
                {athletes.map(a => (
                  <option key={a.id} value={a.id} className="bg-zinc-950 text-white">{a.full_name}</option>
                ))}
              </select>
            </div>

            <button onClick={openAssignModal} className="bg-amber-500 hover:bg-amber-400 text-black font-bold py-2.5 px-4 rounded-xl flex items-center gap-2 transition-colors shadow-lg shadow-amber-500/20 shrink-0">
              <Plus className="w-5 h-5" /> Asignar Rutina
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-7 gap-4 overflow-x-auto pb-4">
        {days.map(day => {
          const dayAssignments = filteredAssignments.filter(a => Number(a.day_of_week) === day.id);

          return (
            <div key={day.id} className="bg-zinc-950 rounded-2xl p-4 border border-zinc-800 min-w-[160px] flex flex-col h-full">
              <h3 className="text-center font-black text-amber-500 mb-4 tracking-wider">{day.name}</h3>
              
              <div className="space-y-3 flex-1">
                {dayAssignments.length === 0 ? (
                  <div className="text-center text-zinc-600 text-xs italic py-4">Sin entrenamientos</div>
                ) : (
                  dayAssignments.map((assign, idx) => (
                    <div key={assign.id} className="bg-zinc-900 p-3 rounded-xl border border-zinc-800 relative transition-all hover:border-amber-500/50">
                      {isCoach ? (
                        <>
                          <div className="flex items-center justify-between mb-2 pb-2 border-b border-zinc-800/80">
                            <span className="text-[10px] font-bold text-zinc-500 flex items-center gap-1 uppercase">
                              <User className="w-3 h-3" /> {assign.athletes?.full_name?.split(' ')[0]}
                            </span>
                            
                            <div className="flex items-center gap-1 bg-zinc-950 px-1 py-0.5 rounded-lg border border-zinc-800">
                              <button onClick={() => openEditModal(assign)} className="text-zinc-400 hover:text-amber-400 p-1" title="Editar rutina asignada"><Pencil className="w-3.5 h-3.5" /></button>
                              <button onClick={() => handleMoveAssignment(assign, 'up', dayAssignments)} disabled={idx === 0} className="text-zinc-400 hover:text-amber-400 disabled:opacity-20 p-1" title="Subir bloque"><ArrowUp className="w-3.5 h-3.5" /></button>
                              <button onClick={() => handleMoveAssignment(assign, 'down', dayAssignments)} disabled={idx === dayAssignments.length - 1} className="text-zinc-400 hover:text-amber-400 disabled:opacity-20 p-1" title="Bajar bloque"><ArrowDown className="w-3.5 h-3.5" /></button>
                              <button onClick={() => handleDeleteAssign(assign.id)} className="text-zinc-400 hover:text-red-400 p-1 ml-0.5" title="Eliminar"><Trash2 className="w-3.5 h-3.5" /></button>
                            </div>
                          </div>

                          <p className="text-sm font-bold text-white flex items-start gap-1.5 leading-tight">
                            <Dumbbell className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" /> 
                            {assign.routines?.name}
                          </p>
                        </>
                      ) : (
                        <Link to="/athlete/dashboard" state={{ selectedDay: day.id }} className="block">
                          <p className="text-sm font-bold text-white flex items-start gap-1.5 leading-tight">
                            <Dumbbell className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" /> 
                            {assign.routines?.name}
                          </p>
                          <div className="mt-3 pt-2 border-t border-zinc-800 text-xs font-bold text-amber-500 flex items-center justify-between group-hover:text-amber-400">
                            Ir a entrenar <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                          </div>
                        </Link>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL ASIGNAR RUTINA NUEVA */}
      {isModalOpen && isCoach && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-950 rounded-2xl border border-zinc-800 max-w-lg w-full p-6 shadow-2xl flex flex-col max-h-[90vh]">
            <h3 className="font-bold text-lg text-white mb-4">Asignar y Personalizar Rutina</h3>
            
            <div className="space-y-3 overflow-y-auto pr-2 pb-2 flex-1 custom-scrollbar">
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Atleta</label>
                <select value={selectedAthlete} onChange={e => setSelectedAthlete(e.target.value)} className="w-full px-3 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-white focus:border-amber-500 outline-none transition-colors">
                  <option value="">-- Seleccionar --</option>
                  {athletes.map(a => <option key={a.id} value={a.id}>{a.full_name}</option>)}
                </select>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Día</label>
                  <select value={selectedDay} onChange={e => setSelectedDay(Number(e.target.value))} className="w-full px-3 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-white focus:border-amber-500 outline-none transition-colors">
                    {days.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Rutina Máster</label>
                  <select value={selectedRoutine} onChange={handleRoutineSelect} className="w-full px-3 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-white focus:border-amber-500 outline-none transition-colors">
                    <option value="">-- Seleccionar --</option>
                    {routines.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </div>
              </div>

              {customExercises.length > 0 && (
                <div className="mt-4 border-t border-zinc-800 pt-4">
                  <label className="block text-xs font-bold text-amber-500 uppercase mb-1">Modificar para este día</label>
                  
                  <div className="space-y-3 bg-zinc-900/50 p-2 rounded-xl border border-zinc-800 max-h-64 overflow-y-auto custom-scrollbar">
                    {customExercises.map((ex, idx) => (
                      <div key={idx} className="bg-zinc-950 p-3 rounded-lg border border-zinc-800/80 space-y-2">
                        <div className="flex justify-between items-start border-b border-zinc-800/50 pb-2">
                          <span className="text-xs font-bold text-zinc-200 line-clamp-1 pr-2">{ex.name}</span>
                          <div className="flex items-center gap-1">
                            <button type="button" onClick={() => handleMoveUpModal(idx)} disabled={idx === 0} className="text-zinc-600 hover:text-amber-400 disabled:opacity-30 p-1 bg-zinc-900 rounded-md"><ArrowUp className="w-4 h-4" /></button>
                            <button type="button" onClick={() => handleMoveDownModal(idx)} disabled={idx === customExercises.length - 1} className="text-zinc-600 hover:text-amber-400 disabled:opacity-30 p-1 bg-zinc-900 rounded-md"><ArrowDown className="w-4 h-4" /></button>
                            <button type="button" onClick={() => handleRemoveExercise(idx)} className="text-zinc-600 hover:text-red-400 p-1 bg-zinc-900 rounded-md ml-1"><X className="w-4 h-4" /></button>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="block text-[8px] font-bold text-zinc-500 uppercase mb-0.5">Series</label>
                            <input type="text" value={ex.sets || ''} onChange={(e) => handleEditExercise(idx, 'sets', e.target.value)} className="w-full px-2 py-1.5 bg-zinc-900 border border-zinc-800 rounded text-xs text-white focus:border-amber-500 outline-none" />
                          </div>
                          <div>
                            <label className="block text-[8px] font-bold text-zinc-500 uppercase mb-0.5">Reps</label>
                            <input type="text" value={ex.reps || ''} onChange={(e) => handleEditExercise(idx, 'reps', e.target.value)} className="w-full px-2 py-1.5 bg-zinc-900 border border-zinc-800 rounded text-xs text-white focus:border-amber-500 outline-none" />
                          </div>
                          <div>
                            <label className="block text-[8px] font-bold text-zinc-500 uppercase mb-0.5">Descanso</label>
                            <input type="text" value={ex.rest || ''} onChange={(e) => handleEditExercise(idx, 'rest', e.target.value)} className="w-full px-2 py-1.5 bg-zinc-900 border border-zinc-800 rounded text-xs text-white focus:border-amber-500 outline-none" placeholder="Ej. 90s" />
                          </div>
                        </div>

                        {/* 🚨 CASILLA DE OBSERVACIONES/NOTAS */}
                        <div>
                          <label className="block text-[8px] font-bold text-amber-500 uppercase mb-0.5 flex items-center gap-1">
                            <MessageSquare className="w-2.5 h-2.5" /> Notas / Indicaciones Técnicas
                          </label>
                          <input 
                            type="text" 
                            value={ex.notes || ''} 
                            onChange={(e) => handleEditExercise(idx, 'notes', e.target.value)} 
                            className="w-full px-2 py-1.5 bg-zinc-900 border border-zinc-800 rounded text-xs text-zinc-200 focus:border-amber-500 outline-none" 
                            placeholder="Ej. 2 reps en pausa / Drop set en la última serie / RPE 8" 
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex gap-2 pt-4 border-t border-zinc-800 mt-2">
              <button onClick={() => setIsModalOpen(false)} className="w-1/2 py-3 bg-zinc-900 text-zinc-400 font-bold rounded-xl hover:bg-zinc-800 transition-colors">Cancelar</button>
              <button onClick={handleAssign} className="w-1/2 py-3 bg-amber-500 text-black font-bold rounded-xl hover:bg-amber-400 transition-colors">Guardar Asignación</button>
            </div>
          </div>
        </div>
      )}

      {/* 🚨 MODAL EDITAR ASIGNACIÓN EXISTENTE CON OBSERVACIONES */}
      {isEditModalOpen && editingAssignment && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-950 rounded-2xl border border-zinc-800 max-w-lg w-full p-6 shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center mb-4 border-b border-zinc-800 pb-3">
              <div>
                <h3 className="font-bold text-lg text-white flex items-center gap-2">
                  <Pencil className="w-5 h-5 text-amber-500" /> Editar Rutina Asignada
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Atleta: <b className="text-amber-500">{editingAssignment.athletes?.full_name}</b> | Rutina: <b className="text-white">{editingAssignment.routines?.name}</b>
                </p>
              </div>
              <button onClick={() => setIsEditModalOpen(false)} className="text-zinc-500 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 overflow-y-auto pr-2 pb-2 flex-1 custom-scrollbar">
              <div className="space-y-3 bg-zinc-900/50 p-2 rounded-xl border border-zinc-800 max-h-80 overflow-y-auto custom-scrollbar">
                {editExercises.map((ex, idx) => (
                  <div key={idx} className="bg-zinc-950 p-3 rounded-lg border border-zinc-800/80 space-y-2">
                    <div className="flex justify-between items-start border-b border-zinc-800/50 pb-2">
                      <span className="text-xs font-bold text-zinc-200 line-clamp-1 pr-2">{ex.name}</span>
                      <div className="flex items-center gap-1">
                        <button type="button" onClick={() => handleMoveUpEdit(idx)} disabled={idx === 0} className="text-zinc-600 hover:text-amber-400 disabled:opacity-30 p-1 bg-zinc-900 rounded-md"><ArrowUp className="w-4 h-4" /></button>
                        <button type="button" onClick={() => handleMoveDownEdit(idx)} disabled={idx === editExercises.length - 1} className="text-zinc-600 hover:text-amber-400 disabled:opacity-30 p-1 bg-zinc-900 rounded-md"><ArrowDown className="w-4 h-4" /></button>
                        <button type="button" onClick={() => handleRemoveEditExercise(idx)} className="text-zinc-600 hover:text-red-400 p-1 bg-zinc-900 rounded-md ml-1"><X className="w-4 h-4" /></button>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[8px] font-bold text-zinc-500 uppercase mb-0.5">Series</label>
                        <input type="text" value={ex.sets || ''} onChange={(e) => handleEditExerciseField(idx, 'sets', e.target.value)} className="w-full px-2 py-1.5 bg-zinc-900 border border-zinc-800 rounded text-xs text-white focus:border-amber-500 outline-none" />
                      </div>
                      <div>
                        <label className="block text-[8px] font-bold text-zinc-500 uppercase mb-0.5">Reps</label>
                        <input type="text" value={ex.reps || ''} onChange={(e) => handleEditExerciseField(idx, 'reps', e.target.value)} className="w-full px-2 py-1.5 bg-zinc-900 border border-zinc-800 rounded text-xs text-white focus:border-amber-500 outline-none" />
                      </div>
                      <div>
                        <label className="block text-[8px] font-bold text-zinc-500 uppercase mb-0.5">Descanso</label>
                        <input type="text" value={ex.rest || ''} onChange={(e) => handleEditExerciseField(idx, 'rest', e.target.value)} className="w-full px-2 py-1.5 bg-zinc-900 border border-zinc-800 rounded text-xs text-white focus:border-amber-500 outline-none" placeholder="Ej. 90s" />
                      </div>
                    </div>

                    {/* 🚨 CASILLA DE OBSERVACIONES/NOTAS AL EDITAR */}
                    <div>
                      <label className="block text-[8px] font-bold text-amber-500 uppercase mb-0.5 flex items-center gap-1">
                        <MessageSquare className="w-2.5 h-2.5" /> Notas / Indicaciones Técnicas
                      </label>
                      <input 
                        type="text" 
                        value={ex.notes || ''} 
                        onChange={(e) => handleEditExerciseField(idx, 'notes', e.target.value)} 
                        className="w-full px-2 py-1.5 bg-zinc-900 border border-zinc-800 rounded text-xs text-zinc-200 focus:border-amber-500 outline-none" 
                        placeholder="Ej. Reps pausa / Drop set / Iso 2 seg" 
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-4 border-t border-zinc-800 mt-2">
              <button onClick={() => setIsEditModalOpen(false)} className="w-1/2 py-3 bg-zinc-900 text-zinc-400 font-bold rounded-xl hover:bg-zinc-800 transition-colors">Cancelar</button>
              <button onClick={handleSaveEditAssignment} className="w-1/2 py-3 bg-amber-500 text-black font-bold rounded-xl hover:bg-amber-400 transition-colors">Guardar Cambios</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}