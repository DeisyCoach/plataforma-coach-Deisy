import { useState, useEffect } from 'react';
import { useAuth } from '../../providers/AuthProvider';
import { supabase } from '../../lib/supabase/client';
import { useLocation } from 'react-router-dom';
import { Dumbbell, CheckCircle2, Flame, CalendarIcon, Scale, Clock, MessageSquare, Video, ChevronUp, ChevronDown, Trophy, Layers, Zap } from 'lucide-react';
import confetti from 'canvas-confetti';

export function AthleteDashboard() {
  const { user } = useAuth();
  const location = useLocation();
  const [athleteData, setAthleteData] = useState<any>(null);
  const [activeRoutines, setActiveRoutines] = useState<any[]>([]);
  const [exerciseLogs, setExerciseLogs] = useState<Record<string, { weight: string; reps: string; done: boolean }>>({});
  const [pastRecords, setPastRecords] = useState<Record<string, { weight: number; reps: number }>>({});
  const [bodyWeights, setBodyWeights] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedVideo, setExpandedVideo] = useState<string | null>(null);
  const [workoutFinished, setWorkoutFinished] = useState(false);

  const localDate = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Bogota" }));
  const todayIndex = localDate.getDay(); 
  const targetDay = location.state?.selectedDay || (todayIndex === 0 ? 7 : todayIndex);
  const daysName = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

  const getYoutubeEmbedUrl = (url: string) => {
    if (!url || typeof url !== 'string') return null;
    const match = url.match(/^.*(?:youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|shorts\/)([^#\&\?]{11}).*/);
    return match ? `https://www.youtube.com/embed/${match[1]}` : null;
  };

  useEffect(() => {
    const fetchPortalData = async () => {
      if (!user) return;
      try {
        const cleanEmail = user.email?.trim().toLowerCase();
        const { data: athlete } = await supabase.from('athletes').select('*').ilike('email', cleanEmail || '').single();
        setAthleteData(athlete);

        if (athlete) {
          const { data: checkins } = await supabase.from('weekly_checkins').select('fasting_weight, created_at').eq('athlete_id', athlete.id).order('created_at', { ascending: false }).limit(5);
          setBodyWeights(checkins || []);

          const { data: assignments } = await supabase.from('athlete_routines').select('id, day_of_week, custom_exercises, order_index, routines(id, name)').eq('athlete_id', athlete.id).order('order_index', { ascending: true, nullsFirst: false });
          const dayAssignments = assignments?.filter(a => Number(a.day_of_week) === targetDay) || [];
          setActiveRoutines(dayAssignments);

          const { data: pastLogs } = await supabase.from('workout_logs').select('exercise_name, weight_used, reps_done').eq('athlete_id', athlete.id).order('created_at', { ascending: false });
          const initialLogs: any = {};
          const records: any = {};

          dayAssignments.forEach(assign => {
             const parsed = typeof assign.custom_exercises === 'string' ? JSON.parse(assign.custom_exercises) : (assign.custom_exercises || []);
             parsed.forEach((ex: any, i: number) => {
                const compositeKey = `${assign.id}-${ex.id || i}`;
                initialLogs[compositeKey] = { weight: '', reps: ex.reps || '', done: false };
                const lastLog = pastLogs?.find(log => log.exercise_name === ex.name);
                if (lastLog) records[ex.name] = { weight: lastLog.weight_used, reps: lastLog.reps_done };
             });
          });
          setExerciseLogs(initialLogs);
          setPastRecords(records);
        }
      } catch (error) { console.error(error); } finally { setLoading(false); }
    };
    fetchPortalData();
  }, [user, targetDay]);

  const handleLogChange = (key: string, field: 'weight'|'reps', value: string) => setExerciseLogs(prev => ({ ...prev, [key]: { ...prev[key], [field]: value } }));

  const saveLog = async (assignmentId: string, exercise: any, index: number) => {
    const key = `${assignmentId}-${exercise.id || index}`;
    const logData = exerciseLogs[key];
    if (!athleteData) return;
    await supabase.from('workout_logs').insert([{
      athlete_id: athleteData.id, routine_id: assignmentId, exercise_name: exercise.name,
      weight_used: parseFloat(logData.weight || '0'), reps_done: parseInt(logData.reps || '0')
    }]);
    setExerciseLogs(prev => ({ ...prev, [key]: { ...prev[key], done: true } }));
  };

  const handleFinishWorkout = () => {
    confetti({ particleCount: 200, spread: 90, origin: { y: 0.6 }, colors: ['#f59e0b', '#fbbf24', '#ffffff'] });
    setWorkoutFinished(true);
  };

  // 🚨 Función para agrupar ejercicios por Biserie/Superserie
  const groupExercises = (exercises: any[]) => {
    const grouped: any[] = [];
    let currentGroup: any = null;

    exercises.forEach((ex, index) => {
      // Si el ejercicio es parte de un grupo (biserie, superserie, etc.)
      if (ex.group_type && ex.group_type !== 'normal') {
        // Si ya estamos en un grupo y la etiqueta coincide (Ej: A1 == A1), lo añadimos al grupo actual
        if (currentGroup && currentGroup.tag === ex.group_tag && currentGroup.type === ex.group_type) {
          currentGroup.items.push({ ...ex, originalIndex: index });
        } else {
          // Si es un grupo nuevo, cerramos el anterior (si existe) y creamos uno nuevo
          if (currentGroup) grouped.push(currentGroup);
          currentGroup = {
            isGroup: true,
            type: ex.group_type,
            tag: ex.group_tag,
            items: [{ ...ex, originalIndex: index }]
          };
        }
      } else {
        // Si el ejercicio es 'normal'
        if (currentGroup) {
          grouped.push(currentGroup);
          currentGroup = null;
        }
        grouped.push({ ...ex, originalIndex: index, isGroup: false });
      }
    });

    if (currentGroup) {
      grouped.push(currentGroup);
    }

    return grouped;
  };

  if (loading) return <div className="text-center py-12 text-amber-400 font-bold">Cargando portal...</div>;

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 blur-3xl rounded-full pointer-events-none"></div>
        <div className="relative z-10 flex justify-between items-start">
          <div>
            <p className="text-amber-500 text-xs font-bold uppercase tracking-widest flex items-center gap-1.5 mb-1">
              <CalendarIcon className="w-3.5 h-3.5" /> Hoy es {daysName[targetDay]}
            </p>
            <h2 className="text-2xl font-black">¡A mutar, {athleteData?.full_name?.split(' ')[0]}! 💪</h2>
          </div>
          <div className="bg-amber-500/10 p-3 rounded-xl"><Flame className="w-6 h-6 text-amber-500" /></div>
        </div>
      </div>

      {bodyWeights.length > 0 && (
        <div className="bg-zinc-950 rounded-2xl border border-zinc-800 p-4">
          <h3 className="font-bold text-white text-sm flex items-center gap-2 mb-3"><Scale className="w-4 h-4 text-emerald-400"/> Tu Evolución de Peso en Ayunas</h3>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {bodyWeights.map((bw, i) => (
              <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 min-w-[100px] text-center">
                <p className="text-emerald-400 font-black text-lg">{bw.fasting_weight} <span className="text-xs">kg</span></p>
                <p className="text-[10px] text-zinc-500 font-bold uppercase">{new Date(bw.created_at).toLocaleDateString('es-ES', { month: 'short', day: 'numeric'})}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeRoutines.length > 0 ? (
        <div className="space-y-10">
          {activeRoutines.map((assignment, bIdx) => {
            const rawExercises = typeof assignment.custom_exercises === 'string' ? JSON.parse(assignment.custom_exercises) : (assignment.custom_exercises || []);
            const groupedExercises = groupExercises(rawExercises); // 🚨 Agrupamos los ejercicios aquí

            return (
              <div key={assignment.id} className="space-y-4">
                <h3 className="text-xl font-black text-white border-b border-zinc-800 pb-2 uppercase">{assignment.routines?.name || `BLOQUE DE TRABAJO ${bIdx + 1}`}</h3>
                
                {groupedExercises.map((groupOrEx: any, renderIndex: number) => {
                  
                  // --- RENDERIZAR GRUPO DE EJERCICIOS (Biserie/Superserie) ---
                  if (groupOrEx.isGroup) {
                    return (
                      <div key={`group-${renderIndex}`} className="rounded-xl border border-amber-500/40 bg-amber-950/10 shadow-[0_0_15px_rgba(245,158,11,0.08)] overflow-hidden">
                        {/* Cinta de encabezado del grupo */}
                        <div className="bg-amber-500/20 border-b border-amber-500/30 px-4 py-2 flex justify-between items-center">
                          <span className="text-xs font-black text-amber-400 uppercase tracking-widest flex items-center gap-1.5">
                            {groupOrEx.type === 'biserie' && <Flame className="w-4 h-4" />}
                            {groupOrEx.type === 'superserie' && <Zap className="w-4 h-4" />}
                            {groupOrEx.type === 'circuito' && <Layers className="w-4 h-4" />}
                            {groupOrEx.type}
                          </span>
                          {groupOrEx.tag && <span className="bg-amber-500 text-black px-2.5 py-1 rounded text-xs font-black">{groupOrEx.tag}</span>}
                        </div>

                        {/* Iterar sobre los ejercicios del grupo */}
                        <div className="p-4 space-y-6">
                          {groupOrEx.items.map((exercise: any, idx: number) => {
                            const originalIndex = exercise.originalIndex;
                            const key = `${assignment.id}-${exercise.id || originalIndex}`;
                            const currentLog = exerciseLogs[key] || { weight: '', reps: '', done: false };
                            const pastRecord = pastRecords[exercise.name];
                            const videoEmbed = getYoutubeEmbedUrl(exercise.videoUrl || exercise.link || '');
                            const isVideoOpen = expandedVideo === key;

                            return (
                              <div key={key} className={`relative ${idx !== groupOrEx.items.length - 1 ? 'border-b border-zinc-800/80 pb-6' : ''}`}>
                                <div className="flex justify-between items-start mb-3">
                                  <div className="w-full">
                                    <h5 className="font-bold text-white text-lg leading-tight mb-2 pr-4">{exercise.name}</h5>
                                    <div className="flex flex-wrap gap-2 text-[10px] font-bold uppercase">
                                      <span className="bg-zinc-900 text-zinc-300 px-2.5 py-1 rounded-md border border-zinc-800">{exercise.sets} Series</span>
                                      <span className="bg-zinc-900 text-zinc-300 px-2.5 py-1 rounded-md border border-zinc-800">{exercise.reps} Reps</span>
                                      {exercise.rest && <span className="bg-zinc-900 text-amber-400 px-2.5 py-1 rounded-md border border-zinc-800 flex items-center gap-1"><Clock className="w-3 h-3" /> {exercise.rest}</span>}
                                    </div>

                                    {exercise.notes && (
                                      <div className="mt-3 bg-amber-500/10 p-3 rounded-lg border border-amber-500/20 text-sm text-amber-100/90 flex items-start gap-2">
                                        <MessageSquare className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                                        <p className="whitespace-pre-wrap">{exercise.notes}</p>
                                      </div>
                                    )}

                                    {videoEmbed && (
                                      <div className="mt-3">
                                        <button onClick={() => setExpandedVideo(isVideoOpen ? null : key)} className="flex items-center gap-2 text-xs font-bold text-amber-400 bg-amber-400/10 hover:bg-amber-400/20 px-3 py-2 rounded-lg transition-colors">
                                          <Video className="w-4 h-4" /> {isVideoOpen ? 'Ocultar técnica' : 'Revisar técnica'}
                                          {isVideoOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                        </button>
                                        {isVideoOpen && (
                                          <div className="mt-3 rounded-xl overflow-hidden border border-zinc-800 shadow-md">
                                            <iframe className="w-full aspect-video" src={videoEmbed} allowFullScreen></iframe>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {pastRecord && !currentLog.done && (
                                  <div className="mb-4 bg-zinc-900/80 border border-zinc-800 p-3 rounded-lg text-xs text-zinc-400 flex items-center gap-2">
                                    <Dumbbell className="w-4 h-4 text-amber-500" />
                                    Último registro: <b className="text-white text-sm">{pastRecord.weight} kg</b> x {pastRecord.reps} reps
                                  </div>
                                )}

                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-3 items-end">
                                  <div>
                                    <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Peso (Kg/Lb)</label>
                                    <input type="number" value={currentLog.weight} onChange={(e) => handleLogChange(key, 'weight', e.target.value)} disabled={currentLog.done} className="w-full px-3 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-sm font-bold text-white focus:border-amber-500 outline-none disabled:opacity-50" />
                                  </div>
                                  <div>
                                    <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Reps Hoy</label>
                                    <input type="number" value={currentLog.reps} onChange={(e) => handleLogChange(key, 'reps', e.target.value)} disabled={currentLog.done} className="w-full px-3 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-sm font-bold text-white focus:border-amber-500 outline-none disabled:opacity-50" />
                                  </div>
                                  <div className="col-span-2 sm:col-span-1">
                                    <button onClick={() => saveLog(assignment.id, exercise, originalIndex)} disabled={currentLog.done} className="w-full py-2.5 px-3 bg-amber-500 text-black rounded-lg text-sm font-black uppercase hover:bg-amber-400 transition-all disabled:opacity-50 disabled:bg-emerald-500/20 disabled:text-emerald-400 flex items-center justify-center gap-2">
                                      {currentLog.done ? <><CheckCircle2 className="w-4 h-4"/> Listo</> : 'Guardar'}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  }

                  // --- RENDERIZAR EJERCICIO INDIVIDUAL ---
                  const exercise = groupOrEx;
                  const originalIndex = exercise.originalIndex;
                  const key = `${assignment.id}-${exercise.id || originalIndex}`;
                  const currentLog = exerciseLogs[key] || { weight: '', reps: '', done: false };
                  const pastRecord = pastRecords[exercise.name];
                  const videoEmbed = getYoutubeEmbedUrl(exercise.videoUrl || exercise.link || '');
                  const isVideoOpen = expandedVideo === key;

                  return (
                    <div key={key} className={`p-4 rounded-xl border transition-all relative overflow-hidden ${currentLog.done ? 'bg-zinc-900 border-emerald-500/30' : 'bg-zinc-950 border-zinc-800'}`}>
                      <div className="flex justify-between items-start mb-4">
                        <div className="w-full">
                          <h5 className="font-bold text-white text-lg leading-tight mb-2 pr-4">{exercise.name}</h5>
                          <div className="flex flex-wrap gap-2 text-[10px] font-bold uppercase">
                            <span className="bg-zinc-900 text-zinc-300 px-2.5 py-1 rounded-md border border-zinc-800">{exercise.sets} Series</span>
                            <span className="bg-zinc-900 text-zinc-300 px-2.5 py-1 rounded-md border border-zinc-800">{exercise.reps} Reps</span>
                            {exercise.rest && <span className="bg-zinc-900 text-amber-400 px-2.5 py-1 rounded-md border border-zinc-800 flex items-center gap-1"><Clock className="w-3 h-3" /> {exercise.rest}</span>}
                          </div>

                          {exercise.notes && (
                            <div className="mt-3 bg-zinc-900/80 p-3 rounded-lg border border-zinc-800/80 text-sm text-zinc-300 flex items-start gap-2">
                              <MessageSquare className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                              <p className="whitespace-pre-wrap">{exercise.notes}</p>
                            </div>
                          )}

                          {videoEmbed && (
                            <div className="mt-3">
                              <button onClick={() => setExpandedVideo(isVideoOpen ? null : key)} className="flex items-center gap-2 text-xs font-bold text-amber-400 bg-amber-400/10 hover:bg-amber-400/20 px-3 py-2 rounded-lg transition-colors">
                                <Video className="w-4 h-4" /> {isVideoOpen ? 'Ocultar técnica' : 'Revisar técnica'}
                                {isVideoOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                              </button>
                              {isVideoOpen && (
                                <div className="mt-3 rounded-xl overflow-hidden border border-zinc-800 shadow-md">
                                  <iframe className="w-full aspect-video" src={videoEmbed} allowFullScreen></iframe>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {pastRecord && !currentLog.done && (
                        <div className="mb-4 bg-zinc-900/80 border border-zinc-800 p-3 rounded-lg text-xs text-zinc-400 flex items-center gap-2">
                          <Dumbbell className="w-4 h-4 text-amber-500" />
                          Último registro: <b className="text-white text-sm">{pastRecord.weight} kg</b> x {pastRecord.reps} reps
                        </div>
                      )}

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-4 border-t border-zinc-800/80 items-end">
                        <div>
                          <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Peso (Kg/Lb)</label>
                          <input type="number" value={currentLog.weight} onChange={(e) => handleLogChange(key, 'weight', e.target.value)} disabled={currentLog.done} className="w-full px-3 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-sm font-bold text-white focus:border-amber-500 outline-none disabled:opacity-50" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Reps Hoy</label>
                          <input type="number" value={currentLog.reps} onChange={(e) => handleLogChange(key, 'reps', e.target.value)} disabled={currentLog.done} className="w-full px-3 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-sm font-bold text-white focus:border-amber-500 outline-none disabled:opacity-50" />
                        </div>
                        <div className="col-span-2 sm:col-span-1">
                          <button onClick={() => saveLog(assignment.id, exercise, originalIndex)} disabled={currentLog.done} className="w-full py-2.5 px-3 bg-amber-500 text-black rounded-lg text-sm font-black uppercase hover:bg-amber-400 transition-all disabled:opacity-50 disabled:bg-emerald-500/20 disabled:text-emerald-400 flex items-center justify-center gap-2">
                            {currentLog.done ? <><CheckCircle2 className="w-4 h-4"/> Listo</> : 'Guardar'}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}

          <div className="pt-8">
            {!workoutFinished ? (
              <button onClick={handleFinishWorkout} className="w-full py-5 bg-gradient-to-r from-amber-500 to-amber-400 text-black font-black uppercase tracking-widest rounded-2xl shadow-[0_0_30px_rgba(245,158,11,0.2)] hover:scale-[1.02] transition-all flex items-center justify-center gap-3 text-lg">
                <Trophy className="w-6 h-6" /> Finalizar Entrenamiento
              </button>
            ) : (
              <div className="w-full py-8 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-center animate-pulse">
                <h3 className="text-3xl font-black text-emerald-400 mb-2">¡BRUTAL! 🔥</h3>
                <p className="text-zinc-300 font-bold">Registro guardado exitosamente.</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-zinc-950 rounded-2xl border border-zinc-800 p-10 text-center mt-10">
          <h3 className="font-black text-white text-xl mb-2">Día de Descanso</h3>
          <p className="text-sm text-zinc-500">El músculo crece cuando descansas. Recupera energías para mañana.</p>
        </div>
      )}
    </div>
  );
}