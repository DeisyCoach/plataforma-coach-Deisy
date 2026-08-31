import { useState, useEffect } from 'react';
import { useAuth } from '../../providers/AuthProvider';
import { supabase } from '../../lib/supabase/client';
import { useLocation } from 'react-router-dom';
import { Dumbbell, CheckCircle2, Flame, CalendarIcon, Scale, Clock, MessageSquare, Video, ChevronUp, ChevronDown, Trophy } from 'lucide-react';

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
  const currentDayOfWeek = todayIndex === 0 ? 7 : todayIndex; 
  
  const targetDay = location.state?.selectedDay || currentDayOfWeek;
  const daysName = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

  const getYoutubeEmbedUrl = (url: string) => {
    if (!url || typeof url !== 'string') return null;
    const regExp = /^.*(?:youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|shorts\/)([^#\&\?]{11}).*/;
    const match = url.match(regExp);
    return match ? `https://www.youtube.com/embed/${match[1]}` : null;
  };

  useEffect(() => {
    const fetchPortalData = async () => {
      if (!user) return;
      try {
        const { data: athlete } = await supabase.from('athletes').select('*').eq('email', user.email).single();
        setAthleteData(athlete);

        if (athlete) {
          const { data: checkins } = await supabase.from('weekly_checkins').select('fasting_weight, created_at').eq('athlete_id', athlete.id).order('created_at', { ascending: false }).limit(5);
          setBodyWeights(checkins || []);

          // 🚨 CONSULTA CORREGIDA: Trae las rutinas del día respetando exactamente el order_index asignado por el Coach
          const { data: assignments } = await supabase
            .from('athlete_routines')
            .select('id, day_of_week, custom_exercises, order_index, routines(id, name, exercises)')
            .eq('athlete_id', athlete.id)
            .order('order_index', { ascending: true, nullsFirst: false });
          
          const dayAssignments = assignments?.filter(a => Number(a.day_of_week) === targetDay) || [];
          setActiveRoutines(dayAssignments);

          const { data: pastLogs } = await supabase.from('workout_logs').select('exercise_name, weight_used, reps_done').eq('athlete_id', athlete.id).order('created_at', { ascending: false });
          
          const initialLogs: any = {};
          const records: any = {};

          dayAssignments.forEach(assign => {
             const rawExercises = assign.custom_exercises || assign.routines.exercises || [];
             const parsed = typeof rawExercises === 'string' ? JSON.parse(rawExercises) : rawExercises;
             
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

  const handleLogChange = (key: string, field: 'weight'|'reps', value: string) => {
    setExerciseLogs(prev => ({ ...prev, [key]: { ...prev[key], [field]: value } }));
  };

  const saveLog = async (assignmentId: string, routineId: string, exercise: any, index: number) => {
    const key = `${assignmentId}-${exercise.id || index}`;
    const logData = exerciseLogs[key];
    if (!athleteData) return;

    await supabase.from('workout_logs').insert([{
      athlete_id: athleteData.id, routine_id: routineId,
      exercise_name: exercise.name || `Ejercicio ${index + 1}`,
      weight_used: parseFloat(logData.weight || '0'), reps_done: parseInt(logData.reps || '0')
    }]);

    setExerciseLogs(prev => ({ ...prev, [key]: { ...prev[key], done: true } }));
  };

  const handleFinishWorkout = () => {
    confetti({
      particleCount: 200,
      spread: 90,
      origin: { y: 0.6 },
      colors: ['#f59e0b', '#fbbf24', '#ffffff', '#10b981']
    });
    setWorkoutFinished(true);
  };

  if (loading) return <div className="text-center py-12 text-amber-400 font-bold">Cargando portal...</div>;

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 blur-3xl rounded-full pointer-events-none"></div>
        <div className="relative z-10 flex justify-between items-start">
          <div>
            <p className="text-amber-500 text-xs font-bold uppercase tracking-widest flex items-center gap-1.5 mb-1">
              <CalendarIcon className="w-3.5 h-3.5" /> 
              {targetDay === currentDayOfWeek ? 'Hoy' : daysName[targetDay]}
            </p>
            <h2 className="text-2xl font-black">¡A entrenar, {athleteData?.full_name?.split(' ')[0] || 'Atleta'}! 💪</h2>
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
          {activeRoutines.map((assignment) => {
            const routine = assignment.routines;
            const rawExercises = assignment.custom_exercises || routine.exercises || [];
            const exercises = typeof rawExercises === 'string' ? JSON.parse(rawExercises) : rawExercises;

            return (
              <div key={assignment.id} className="space-y-4">
                <h3 className="text-xl font-black text-white border-b border-zinc-800 pb-2">{routine.name}</h3>
                
                {exercises.map((exercise: any, index: number) => {
                  const key = `${assignment.id}-${exercise.id || index}`;
                  const currentLog = exerciseLogs[key] || { weight: '', reps: '', done: false };
                  const pastRecord = pastRecords[exercise.name];
                  const rawVideoLink = exercise.videoUrl || exercise.video_url || exercise.youtubeLink || exercise.video || exercise.url || exercise.link || '';
                  const videoEmbed = getYoutubeEmbedUrl(rawVideoLink);
                  const isVideoOpen = expandedVideo === key;

                  return (
                    <div key={key} className={`p-4 rounded-xl border transition-all ${currentLog.done ? 'bg-amber-500/10 border-amber-500/30' : 'bg-zinc-950 border-zinc-800'}`}>
                      <div className="flex justify-between items-start mb-3">
                        <div className="w-full">
                          <h5 className="font-bold text-white text-lg leading-tight mb-2">{exercise.name}</h5>
                          <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-400 font-bold uppercase">
                            <span className="bg-zinc-900 px-2.5 py-1 rounded-md border border-zinc-800">{exercise.sets} Series</span>
                            <span className="bg-zinc-900 px-2.5 py-1 rounded-md border border-zinc-800">{exercise.reps} Reps</span>
                            {exercise.rest && (
                              <span className="flex items-center gap-1 bg-zinc-900 px-2.5 py-1 rounded-md border border-zinc-800 text-zinc-300">
                                <Clock className="w-3.5 h-3.5" /> {exercise.rest}
                              </span>
                            )}
                          </div>

                          {exercise.notes && (
                            <div className="mt-3 bg-zinc-900/80 p-3 rounded-lg border border-zinc-800/80 text-sm text-zinc-300 flex items-start gap-2">
                              <MessageSquare className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                              <p className="whitespace-pre-wrap">{exercise.notes}</p>
                            </div>
                          )}

                          {videoEmbed && (
                            <div className="mt-3">
                              <button 
                                onClick={() => setExpandedVideo(isVideoOpen ? null : key)}
                                className="flex items-center gap-2 text-xs font-bold text-amber-400 bg-amber-400/10 hover:bg-amber-400/20 px-3 py-2 rounded-lg border border-amber-400/20 transition-colors"
                              >
                                <Video className="w-4 h-4" />
                                {isVideoOpen ? 'Ocultar técnica' : 'Revisar técnica'}
                                {isVideoOpen ? <ChevronUp className="w-3.5 h-3.5 ml-1" /> : <ChevronDown className="w-3.5 h-3.5 ml-1" />}
                              </button>
                              {isVideoOpen && (
                                <div className="mt-3 rounded-xl overflow-hidden border border-zinc-800 shadow-md">
                                  <iframe className="w-full aspect-video" src={videoEmbed} title={`Video de ${exercise.name}`} frameBorder="0" allowFullScreen></iframe>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        {currentLog.done && <span className="text-xs font-bold text-amber-500 flex items-center gap-1 shrink-0 ml-3"><CheckCircle2 className="w-4 h-4" /> Listo</span>}
                      </div>

                      {pastRecord && !currentLog.done && (
                        <div className="mb-3 bg-zinc-900 border border-zinc-800 p-2.5 rounded-lg text-xs text-zinc-400 flex items-center gap-2">
                          <Dumbbell className="w-3.5 h-3.5 text-zinc-500" />
                          Última vez alzaste: <b className="text-white text-sm">{pastRecord.weight} kg</b> x {pastRecord.reps} reps
                        </div>
                      )}

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-3 border-t border-zinc-800/50 items-end mt-2">
                        <div>
                          <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Peso (Kg/Lb)</label>
                          <input type="number" value={currentLog.weight} onChange={(e) => handleLogChange(key, 'weight', e.target.value)} disabled={currentLog.done} className="w-full px-3 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-sm font-bold text-white focus:border-amber-500 disabled:opacity-50" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Reps Hoy</label>
                          <input type="number" value={currentLog.reps} onChange={(e) => handleLogChange(key, 'reps', e.target.value)} disabled={currentLog.done} className="w-full px-3 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-sm font-bold text-white focus:border-amber-500 disabled:opacity-50" />
                        </div>
                        <div className="col-span-2 sm:col-span-1">
                          <button onClick={() => saveLog(assignment.id, routine.id, exercise, index)} disabled={currentLog.done} className="w-full py-2.5 px-3 bg-amber-500 text-black rounded-lg text-xs font-bold hover:bg-amber-400 disabled:opacity-50 disabled:bg-zinc-800 disabled:text-zinc-500">
                            {currentLog.done ? 'Registrado' : 'Guardar Datos'}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}

          <div className="pt-6">
            {!workoutFinished ? (
              <button 
                onClick={handleFinishWorkout}
                className="w-full py-5 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-black font-black uppercase tracking-widest rounded-2xl shadow-[0_0_30px_rgba(245,158,11,0.2)] hover:shadow-[0_0_40px_rgba(245,158,11,0.4)] transition-all flex items-center justify-center gap-3 text-lg scale-100 hover:scale-[1.02]"
              >
                <Trophy className="w-6 h-6" /> Terminar Entrenamiento
              </button>
            ) : (
              <div className="w-full py-8 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-center animate-pulse shadow-[0_0_30px_rgba(16,185,129,0.1)]">
                <h3 className="text-3xl font-black text-emerald-400 mb-2">¡BRUTAL! 🔥</h3>
                <p className="text-zinc-300 font-bold">Entrenamiento completado.</p>
                <p className="text-xs text-emerald-500/80 mt-1 uppercase tracking-widest">Estás un paso más cerca de tu meta</p>
              </div>
            )}
          </div>

        </div>
      ) : (
        <div className="bg-zinc-950 rounded-2xl border border-zinc-800 p-10 text-center">
          <h3 className="font-black text-white text-xl mb-2">Día de Descanso</h3>
          <p className="text-sm text-zinc-500">Recupérate, no tienes rutinas asignadas para este día.</p>
        </div>
      )}
    </div>
  );
}