import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase/client';
import { useAuth } from '../../providers/AuthProvider';
import { Calendar as CalendarIcon, Plus, User, Dumbbell, ArrowRight, Trash2, X, ArrowUp, ArrowDown, Pencil, Filter, MessageSquare, Layers, Search } from 'lucide-react';
import { Link } from 'react-router-dom';

export function Calendar() {
  const { user } = useAuth();

  const [isCoach, setIsCoach] = useState<boolean>(false);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAthleteFilter, setSelectedAthleteFilter] = useState<string>('ALL');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<any>(null);
  
  const [athletes, setAthletes] = useState<any[]>([]);
  const [routines, setRoutines] = useState<any[]>([]);
  
  const [selectedAthlete, setSelectedAthlete] = useState('');
  const [selectedDay, setSelectedDay] = useState(1);
  const [selectedRoutine, setSelectedRoutine] = useState('');
  const [customExercises, setCustomExercises] = useState<any[]>([]);
  const [editExercises, setEditExercises] = useState<any[]>([]);
  const [selectedExtraRoutine, setSelectedExtraRoutine] = useState('');

  const days = [
    { id: 1, name: 'LUNES' }, { id: 2, name: 'MARTES' }, { id: 3, name: 'MIÉRCOLES' },
    { id: 4, name: 'JUEVES' }, { id: 5, name: 'VIERNES' }, { id: 6, name: 'SÁBADO' }, { id: 7, name: 'DOMINGO' }
  ];

  useEffect(() => {
    if (user) {
      checkRoleAndFetchData();
    }
  }, [user]);

  const checkRoleAndFetchData = async () => {
    setLoading(true);
    try {
      if (!user?.email) {
        setLoading(false);
        return;
      }

      const cleanEmail = user.email.trim().toLowerCase();

      const { data: athlete } = await supabase
        .from('athletes')
        .select('id')
        .ilike('email', cleanEmail)
        .maybeSingle();

      const coachRole = !athlete;
      setIsCoach(coachRole);

      if (coachRole) {
        const { data: aData } = await supabase.from('athletes').select('*').order('full_name');
        const { data: rData } = await supabase.from('routines').select('*').order('name');
        const { data: assignData } = await supabase
          .from('athlete_routines')
          .select('*, athletes(full_name), routines(name)')
          .order('order_index', { ascending: true, nullsFirst: false });
          
        setAthletes(aData || []);
        setRoutines(rData || []);
        setAssignments(assignData || []);
      } else if (athlete) {
        const { data } = await supabase
          .from('athlete_routines')
          .select('*, routines(name)')
          .eq('athlete_id', athlete.id)
          .order('order_index', { ascending: true, nullsFirst: false });

        setAssignments(data || []);
      }
    } catch (err) {
      console.error("Error en Calendar:", err);
    } finally {
      setLoading(false);
    }
  };

  const openAssignModal = () => {
    setSelectedAthlete(selectedAthleteFilter !== 'ALL' ? selectedAthleteFilter : '');
    setSelectedRoutine('');
    setSelectedExtraRoutine('');
    setCustomExercises([]);
    setIsModalOpen(true);
  };

  const handleRoutineSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const routineId = e.target.value;
    setSelectedRoutine(routineId);
    
    if (routineId) {
      const routine = routines.find(r => r.id === routineId);
      if (routine && routine.exercises) {
        const parsed = typeof routine.exercises === 'string' ? JSON.parse(routine.exercises) : routine.exercises;
        setCustomExercises(parsed.map((ex: any) => ({ ...ex, group_type: 'normal', group_tag: '' })));
      } else {
        setCustomExercises([]);
      }
    } else {
      setCustomExercises([]);
    }
  };

  const handleInjectExtra = (isEditing: boolean) => {
    if (!selectedExtraRoutine) return;
    const routine = routines.find(r => r.id === selectedExtraRoutine);
    if (routine && routine.exercises) {
      const parsed = typeof routine.exercises === 'string' ? JSON.parse(routine.exercises) : routine.exercises;
      const newExercises = parsed.map((ex: any) => ({ ...ex, group_type: 'normal', group_tag: '' }));
      
      if (isEditing) setEditExercises(prev => [...prev, ...newExercises]);
      else setCustomExercises(prev => [...prev, ...newExercises]);
    }
    setSelectedExtraRoutine('');
  };

  const handleUpdateExercise = (index: number, field: string, value: string, isEditing: boolean) => {
    const setter = isEditing ? setEditExercises : setCustomExercises;
    setter(prev => prev.map((ex, i) => i === index ? { ...ex, [field]: value } : ex));
  };

  const handleRemoveExercise = (index: number, isEditing: boolean) => {
    const setter = isEditing ? setEditExercises : setCustomExercises;
    setter(prev => prev.filter((_, i) => i !== index));
  };

  const handleMoveExercise = (index: number, direction: 'up' | 'down', isEditing: boolean) => {
    const setter = isEditing ? setEditExercises : setCustomExercises;
    setter(prev => {
      const list = [...prev];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= list.length) return prev;
      [list[index], list[targetIndex]] = [list[targetIndex], list[index]];
      return list;
    });
  };

  const handleAssign = async () => {
    if (!selectedAthlete || !selectedRoutine) return alert('Selecciona un atleta y una rutina principal.');
    if (customExercises.length === 0) return alert('La rutina debe tener al menos un ejercicio.');

    const nextOrder = assignments.filter(a => Number(a.day_of_week) === selectedDay && String(a.athlete_id) === String(selectedAthlete)).length;

    const { error } = await supabase.from('athlete_routines').insert([{ 
      athlete_id: selectedAthlete, 
      routine_id: selectedRoutine, 
      day_of_week: selectedDay,
      custom_exercises: customExercises,
      order_index: nextOrder
    }]);

    if (!error) {
      setIsModalOpen(false);
      checkRoleAndFetchData();
    } else alert('Error al asignar: ' + error.message);
  };

  const openEditModal = (assign: any) => {
    setEditingAssignment(assign);
    setSelectedExtraRoutine('');
    const exercises = assign.custom_exercises || [];
    const parsed = typeof exercises === 'string' ? JSON.parse(exercises) : exercises;
    setEditExercises(parsed.map((ex: any) => ({ ...ex, group_type: ex.group_type || 'normal', group_tag: ex.group_tag || '' })));
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async () => {
    if (editExercises.length === 0) return alert('Debe haber al menos un ejercicio.');
    const { error } = await supabase.from('athlete_routines').update({ custom_exercises: editExercises }).eq('id', editingAssignment.id);
    if (!error) {
      setIsEditModalOpen(false);
      checkRoleAndFetchData();
    } else alert('Error al guardar: ' + error.message);
  };

  const handleMoveBlock = async (assign: any, direction: 'up' | 'down', dayAssignments: any[]) => {
    const currentIndex = dayAssignments.findIndex(a => a.id === assign.id);
    if (currentIndex === -1) return;
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= dayAssignments.length) return;

    const targetAssign = dayAssignments[targetIndex];
    await Promise.all([
      supabase.from('athlete_routines').update({ order_index: targetAssign.order_index ?? targetIndex }).eq('id', assign.id),
      supabase.from('athlete_routines').update({ order_index: assign.order_index ?? currentIndex }).eq('id', targetAssign.id)
    ]);
    checkRoleAndFetchData();
  };

  const filteredAssignments = isCoach && selectedAthleteFilter !== 'ALL' 
    ? assignments.filter(a => String(a.athlete_id) === String(selectedAthleteFilter)) 
    : assignments;

  if (loading) return <div className="text-yellow-400 font-black p-8 text-center animate-pulse">Cargando calendario...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-zinc-800 pb-4 gap-4">
        <div>
          <h2 className="text-2xl font-black text-white flex items-center gap-2">
            <CalendarIcon className="w-7 h-7 text-yellow-400" />
            {isCoach ? 'Calendario General' : 'Mi Semana de Entrenamiento'}
          </h2>
          <p className="text-zinc-400 text-sm mt-1">{isCoach ? 'Planifica rutinas y fusiona biseries.' : 'Tu plan de batalla.'}</p>
        </div>
        {isCoach && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2">
              <Filter className="w-4 h-4 text-yellow-400 shrink-0" />
              <select 
                value={selectedAthleteFilter} 
                onChange={e => setSelectedAthleteFilter(e.target.value)} 
                className="bg-zinc-900 text-white font-bold text-sm outline-none cursor-pointer"
              >
                <option value="ALL" className="bg-zinc-900 text-white">Todos los atletas</option>
                {athletes.map(a => (
                  <option key={a.id} value={a.id} className="bg-zinc-900 text-white">{a.full_name}</option>
                ))}
              </select>
            </div>
            <button onClick={openAssignModal} className="bg-yellow-400 hover:bg-yellow-300 text-black font-black py-2.5 px-4 rounded-xl flex items-center gap-2 shrink-0 shadow-lg shadow-yellow-400/20 transition-all">
              <Plus className="w-5 h-5" /> Nueva Asignación
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-7 gap-4 overflow-x-auto pb-4">
        {days.map(day => {
          const dayAssignments = filteredAssignments.filter(a => Number(a.day_of_week) === day.id);
          return (
            <div key={day.id} className="bg-zinc-950 rounded-2xl p-4 border border-zinc-800 min-w-[160px] flex flex-col h-full">
              <h3 className="text-center font-black text-yellow-400 mb-4 tracking-wider">{day.name}</h3>
              <div className="space-y-3 flex-1">
                {dayAssignments.length === 0 ? <div className="text-center text-zinc-600 text-xs italic py-4">Descanso</div> : (
                  dayAssignments.map((assign, idx) => (
                    <div key={assign.id} className="bg-zinc-900 p-3 rounded-xl border border-zinc-800 hover:border-yellow-400/50 transition-all">
                      {isCoach ? (
                        <>
                          <div className="flex items-center justify-between mb-2 pb-2 border-b border-zinc-800/80">
                            <span className="text-[10px] font-bold text-zinc-400 flex items-center gap-1 uppercase truncate">
                              <User className="w-3 h-3 text-yellow-400" /> 
                              {assign.athletes?.full_name ? assign.athletes.full_name.split(' ')[0] : 'Atleta'}
                            </span>
                            <div className="flex gap-1 bg-zinc-950 px-1 py-0.5 rounded-lg border border-zinc-800">
                              <button onClick={() => openEditModal(assign)} className="text-zinc-400 hover:text-yellow-400 p-1"><Pencil className="w-3.5 h-3.5" /></button>
                              <button onClick={() => handleMoveBlock(assign, 'up', dayAssignments)} disabled={idx===0} className="text-zinc-400 hover:text-yellow-400 p-1 disabled:opacity-30"><ArrowUp className="w-3.5 h-3.5" /></button>
                              <button onClick={() => handleMoveBlock(assign, 'down', dayAssignments)} disabled={idx===dayAssignments.length-1} className="text-zinc-400 hover:text-yellow-400 p-1 disabled:opacity-30"><ArrowDown className="w-3.5 h-3.5" /></button>
                              <button onClick={() => supabase.from('athlete_routines').delete().eq('id', assign.id).then(checkRoleAndFetchData)} className="text-zinc-400 hover:text-red-400 p-1"><Trash2 className="w-3.5 h-3.5" /></button>
                            </div>
                          </div>
                          <p className="text-sm font-bold text-white flex items-start gap-1.5 leading-tight">
                            <Dumbbell className="w-3.5 h-3.5 text-yellow-400 mt-0.5 shrink-0" /> 
                            {assign.routines?.name || 'Rutina Personalizada'}
                          </p>
                        </>
                      ) : (
                        <Link to="/athlete/dashboard" state={{ selectedDay: day.id }} className="block">
                          <p className="text-sm font-bold text-white flex gap-1.5 leading-tight"><Dumbbell className="w-3.5 h-3.5 text-yellow-400 mt-0.5" /> {assign.routines?.name}</p>
                          <div className="mt-3 pt-2 border-t border-zinc-800 text-xs font-bold text-yellow-400 flex justify-between">Ir a entrenar <ArrowRight className="w-3.5 h-3.5" /></div>
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

      {(isModalOpen || isEditModalOpen) && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-950 rounded-2xl border border-zinc-800 max-w-2xl w-full p-6 flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-zinc-800">
              <h3 className="font-bold text-lg text-white">{isModalOpen ? 'Asignar y Personalizar Rutina' : 'Editar Rutina Asignada'}</h3>
              <button onClick={() => { setIsModalOpen(false); setIsEditModalOpen(false); }} className="text-zinc-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>

            <div className="space-y-4 overflow-y-auto pr-2 flex-1 custom-scrollbar">
              {isModalOpen && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Atleta</label>
                      <select value={selectedAthlete} onChange={e => setSelectedAthlete(e.target.value)} className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white outline-none focus:border-yellow-400">
                        <option value="">-- Seleccionar --</option>
                        {athletes.map(a => <option key={a.id} value={a.id}>{a.full_name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Día</label>
                      <select value={selectedDay} onChange={e => setSelectedDay(Number(e.target.value))} className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white outline-none focus:border-yellow-400">
                        {days.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Rutina Máster (Principal)</label>
                    <select value={selectedRoutine} onChange={handleRoutineSelect} className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white outline-none focus:border-yellow-400">
                      <option value="">-- Seleccionar rutina base --</option>
                      {routines.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </select>
                  </div>
                </>
              )}

              <div className="space-y-3 mt-4">
                {(isModalOpen ? customExercises : editExercises).map((ex, idx) => (
                  <div key={idx} className={`p-4 rounded-xl border transition-all ${ex.group_type !== 'normal' ? 'bg-yellow-950/20 border-yellow-400/30' : 'bg-zinc-900 border-zinc-800'}`}>
                    <div className="flex justify-between items-start mb-3 border-b border-zinc-800/60 pb-2">
                      <span className="text-sm font-bold text-white pr-4">{ex.name}</span>
                      <div className="flex gap-1">
                        <button onClick={() => handleMoveExercise(idx, 'up', !isModalOpen)} disabled={idx === 0} className="p-1 text-zinc-500 hover:text-yellow-400 disabled:opacity-30"><ArrowUp className="w-4 h-4" /></button>
                        <button onClick={() => handleMoveExercise(idx, 'down', !isModalOpen)} disabled={idx === (isModalOpen ? customExercises.length : editExercises.length) - 1} className="p-1 text-zinc-500 hover:text-yellow-400 disabled:opacity-30"><ArrowDown className="w-4 h-4" /></button>
                        <button onClick={() => handleRemoveExercise(idx, !isModalOpen)} className="p-1 text-zinc-500 hover:text-red-400 ml-2"><X className="w-4 h-4" /></button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-3 bg-zinc-950 p-2.5 rounded-lg border border-zinc-800/80">
                      <div>
                        <label className="block text-[10px] font-bold text-yellow-400 uppercase mb-1 flex items-center gap-1"><Layers className="w-3 h-3" /> Formato</label>
                        <select value={ex.group_type || 'normal'} onChange={e => handleUpdateExercise(idx, 'group_type', e.target.value, !isModalOpen)} className="w-full bg-zinc-900 border border-zinc-800 text-xs text-white rounded-md p-2 outline-none">
                          <option value="normal">Individual</option>
                          <option value="biserie">🔥 Biserie</option>
                          <option value="superserie">⚡ Superserie</option>
                          <option value="circuito">🔄 Circuito</option>
                        </select>
                      </div>
                      {ex.group_type && ex.group_type !== 'normal' && (
                        <div>
                          <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">Tag (A1, A2)</label>
                          <input type="text" value={ex.group_tag || ''} onChange={e => handleUpdateExercise(idx, 'group_tag', e.target.value, !isModalOpen)} placeholder="Ej. A1" className="w-full bg-zinc-900 border border-yellow-400/30 focus:border-yellow-400 text-xs text-yellow-400 font-bold rounded-md p-2 outline-none" />
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Series</label>
                        <input type="text" value={ex.sets || ''} onChange={e => handleUpdateExercise(idx, 'sets', e.target.value, !isModalOpen)} className="w-full px-2 py-1.5 bg-zinc-950 border border-zinc-800 rounded text-xs text-white outline-none focus:border-yellow-400" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Reps</label>
                        <input type="text" value={ex.reps || ''} onChange={e => handleUpdateExercise(idx, 'reps', e.target.value, !isModalOpen)} className="w-full px-2 py-1.5 bg-zinc-950 border border-zinc-800 rounded text-xs text-white outline-none focus:border-yellow-400" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Descanso</label>
                        <input type="text" value={ex.rest || ''} onChange={e => handleUpdateExercise(idx, 'rest', e.target.value, !isModalOpen)} className="w-full px-2 py-1.5 bg-zinc-950 border border-zinc-800 rounded text-xs text-white outline-none focus:border-yellow-400" placeholder="Ej. 60s" />
                      </div>
                    </div>
                    <div className="mt-3">
                      <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1 flex items-center gap-1"><MessageSquare className="w-3 h-3" /> Observaciones Tácticas</label>
                      <input type="text" value={ex.notes || ''} onChange={e => handleUpdateExercise(idx, 'notes', e.target.value, !isModalOpen)} className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-300 outline-none focus:border-yellow-400" placeholder="Ej. Drop set en la última serie" />
                    </div>
                  </div>
                ))}
              </div>

              {((isModalOpen && selectedRoutine) || isEditModalOpen) && (
                <div className="bg-emerald-500/10 p-4 rounded-xl border border-emerald-500/20 mt-6">
                  <label className="block text-xs font-black text-emerald-500 uppercase mb-2 flex items-center gap-2"><Search className="w-4 h-4"/> ¿Combinar con ejercicios de otra plantilla?</label>
                  <p className="text-[10px] text-zinc-400 mb-3">Si deseas armar una biserie con ejercicios de otro grupo muscular, inyéctalos aquí abajo:</p>
                  <div className="flex gap-2">
                    <select value={selectedExtraRoutine} onChange={e => setSelectedExtraRoutine(e.target.value)} className="flex-1 px-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-white outline-none">
                      <option value="">-- Selecciona rutina para inyectar --</option>
                      {routines.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </select>
                    <button onClick={() => handleInjectExtra(!isModalOpen)} className="bg-emerald-500 hover:bg-emerald-400 text-black font-bold px-4 rounded-lg text-sm transition-all">Añadir</button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-4 border-t border-zinc-800 mt-4">
              <button onClick={() => { setIsModalOpen(false); setIsEditModalOpen(false); }} className="w-1/3 py-3 bg-zinc-900 text-zinc-400 font-bold rounded-xl hover:bg-zinc-800">Cancelar</button>
              <button onClick={isModalOpen ? handleAssign : handleSaveEdit} className="w-2/3 py-3 bg-yellow-400 text-black font-black uppercase rounded-xl hover:bg-yellow-300">Guardar Asignación</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}