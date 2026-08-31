import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase/client';
import { useAuth } from '../../providers/AuthProvider';
import { Calendar as CalendarIcon, Plus, User, Dumbbell, ArrowRight, Trash2, X, ArrowUp, ArrowDown } from 'lucide-react';
import { Link } from 'react-router-dom';

export function Calendar() {
  const { user } = useAuth();
  const isCoach = user?.email === 'coach@plataforma.com';

  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [athletes, setAthletes] = useState<any[]>([]);
  const [routines, setRoutines] = useState<any[]>([]);
  const [selectedAthlete, setSelectedAthlete] = useState('');
  const [selectedRoutine, setSelectedRoutine] = useState('');
  const [selectedDay, setSelectedDay] = useState(1);
  
  const [customExercises, setCustomExercises] = useState<any[]>([]);

  const days = [
    { id: 1, name: 'LUNES' }, { id: 2, name: 'MARTES' }, { id: 3, name: 'MIÉRCOLES' },
    { id: 4, name: 'JUEVES' }, { id: 5, name: 'VIERNES' }, { id: 6, name: 'SÁBADO' }, { id: 7, name: 'DOMINGO' }
  ];

  useEffect(() => { fetchData(); }, [user]);

  const fetchData = async () => {
    setLoading(true);
    if (isCoach) {
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

  const openAssignModal = async () => {
    const { data: a } = await supabase.from('athletes').select('*').order('full_name');
    const { data: r } = await supabase.from('routines').select('*').order('name');
    setAthletes(a || []); 
    setRoutines(r || []); 
    
    setSelectedAthlete('');
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

  const handleRemoveExercise = (indexToRemove: number) => {
    setCustomExercises(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  const handleEditExercise = (indexToEdit: number, field: string, newValue: string) => {
    setCustomExercises(prev => prev.map((ex, index) => {
      if (index === indexToEdit) {
        return { ...ex, [field]: newValue };
      }
      return ex;
    }));
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

  // 🚨 FUNCIÓN DE REORDENAMIENTO ASEGURADA
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
    await supabase.from('athlete_routines').delete().eq('id', id);
    fetchData();
  };

  if (loading) return <div className="text-amber-400 font-bold p-8">Cargando calendario...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center border-b border-zinc-800 pb-4">
        <div>
          <h2 className="text-2xl font-black text-white flex items-center gap-2">
            <CalendarIcon className="w-7 h-7 text-amber-400" />
            {isCoach ? 'Calendario General' : 'Mi Semana de Entrenamiento'}
          </h2>
          <p className="text-zinc-400 text-sm mt-1">
            {isCoach ? 'Planificación global de todos tus atletas. Usa las flechas para reordenar los bloques.' : 'Toca tu rutina del día para ir a entrenar.'}
          </p>
        </div>
        {isCoach && (
          <button onClick={openAssignModal} className="bg-amber-500 hover:bg-amber-400 text-black font-bold py-2 px-4 rounded-xl flex items-center gap-2 transition-colors shadow-lg shadow-amber-500/20">
            <Plus className="w-5 h-5" /> Asignar Rutina
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-7 gap-4 overflow-x-auto pb-4">
        {days.map(day => {
          const dayAssignments = assignments.filter(a => Number(a.day_of_week) === day.id);

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
                          {/* 🚨 BOTONERA SIEMPRE VISIBLE CON FLECHAS Y PAPELERA */}
                          <div className="flex items-center justify-between mb-2 pb-2 border-b border-zinc-800/80">
                            <span className="text-[10px] font-bold text-zinc-500 flex items-center gap-1 uppercase">
                              <User className="w-3 h-3" /> {assign.athletes?.full_name?.split(' ')[0]}
                            </span>
                            <div className="flex items-center gap-1 bg-zinc-950 px-1 py-0.5 rounded-lg border border-zinc-800">
                              <button 
                                onClick={() => handleMoveAssignment(assign, 'up', dayAssignments)}
                                disabled={idx === 0}
                                className="text-zinc-400 hover:text-amber-400 disabled:opacity-20 p-1"
                                title="Subir bloque"
                              >
                                <ArrowUp className="w-3.5 h-3.5" />
                              </button>
                              <button 
                                onClick={() => handleMoveAssignment(assign, 'down', dayAssignments)}
                                disabled={idx === dayAssignments.length - 1}
                                className="text-zinc-400 hover:text-amber-400 disabled:opacity-20 p-1"
                                title="Bajar bloque"
                              >
                                <ArrowDown className="w-3.5 h-3.5" />
                              </button>
                              <button 
                                onClick={() => handleDeleteAssign(assign.id)} 
                                className="text-zinc-400 hover:text-red-400 p-1 ml-0.5"
                                title="Eliminar"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
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
                  <label className="block text-xs font-bold text-amber-500 uppercase mb-1 flex items-center gap-1.5">
                    Modificar para este día
                  </label>
                  <p className="text-[10px] text-zinc-400 mb-3 leading-tight">Quita ejercicios o edita las series/reps. Esto NO afectará tu plantilla máster original.</p>
                  
                  <div className="space-y-3 bg-zinc-900/50 p-2 rounded-xl border border-zinc-800 max-h-64 overflow-y-auto custom-scrollbar">
                    {customExercises.map((ex, idx) => (
                      <div key={idx} className="bg-zinc-950 p-3 rounded-lg border border-zinc-800/80">
                        <div className="flex justify-between items-start mb-2 border-b border-zinc-800/50 pb-2">
                          <span className="text-xs font-bold text-zinc-200 line-clamp-1 pr-2">{ex.name}</span>
                          
                          <div className="flex items-center gap-1">
                            <button 
                              type="button" 
                              onClick={() => handleMoveUpModal(idx)}
                              disabled={idx === 0}
                              className="text-zinc-600 hover:text-amber-400 disabled:opacity-30 p-1 bg-zinc-900 rounded-md transition-colors shrink-0"
                              title="Mover arriba"
                            >
                              <ArrowUp className="w-4 h-4" />
                            </button>
                            <button 
                              type="button" 
                              onClick={() => handleMoveDownModal(idx)}
                              disabled={idx === customExercises.length - 1}
                              className="text-zinc-600 hover:text-amber-400 disabled:opacity-30 p-1 bg-zinc-900 rounded-md transition-colors shrink-0"
                              title="Mover abajo"
                            >
                              <ArrowDown className="w-4 h-4" />
                            </button>
                            <button 
                              type="button" 
                              onClick={() => handleRemoveExercise(idx)}
                              className="text-zinc-600 hover:text-red-400 p-1 bg-zinc-900 rounded-md transition-colors shrink-0 ml-1"
                              title="Quitar ejercicio"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="block text-[8px] font-bold text-zinc-500 uppercase mb-0.5">Series</label>
                            <input 
                              type="text" 
                              value={ex.sets || ''} 
                              onChange={(e) => handleEditExercise(idx, 'sets', e.target.value)} 
                              className="w-full px-2 py-1.5 bg-zinc-900 border border-zinc-800 rounded text-xs text-white focus:border-amber-500 outline-none" 
                            />
                          </div>
                          <div>
                            <label className="block text-[8px] font-bold text-zinc-500 uppercase mb-0.5">Reps</label>
                            <input 
                              type="text" 
                              value={ex.reps || ''} 
                              onChange={(e) => handleEditExercise(idx, 'reps', e.target.value)} 
                              className="w-full px-2 py-1.5 bg-zinc-900 border border-zinc-800 rounded text-xs text-white focus:border-amber-500 outline-none" 
                            />
                          </div>
                          <div>
                            <label className="block text-[8px] font-bold text-zinc-500 uppercase mb-0.5">Descanso</label>
                            <input 
                              type="text" 
                              value={ex.rest || ''} 
                              onChange={(e) => handleEditExercise(idx, 'rest', e.target.value)} 
                              className="w-full px-2 py-1.5 bg-zinc-900 border border-zinc-800 rounded text-xs text-white focus:border-amber-500 outline-none" 
                              placeholder="Ej. 90s"
                            />
                          </div>
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
    </div>
  );
}