import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase/client';
import { useAuth } from '../../providers/AuthProvider';
import { TrendingUp, User, Filter, Dumbbell } from 'lucide-react';

export function AthleteProgress() {
  const { user } = useAuth();
  const isCoach = user?.email === 'coach@plataforma.com';
  
  const [logs, setLogs] = useState<any[]>([]);
  const [athletes, setAthletes] = useState<any[]>([]);
  const [routines, setRoutines] = useState<any[]>([]);
  const [selectedAthlete, setSelectedAthlete] = useState('');
  const [selectedRoutine, setSelectedRoutine] = useState('ALL');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    let targetAthleteId = '';

    // Cargar Rutinas Maestras para el filtro
    const { data: routinesData } = await supabase.from('routines').select('*').order('name');
    if (routinesData) setRoutines(routinesData);

    if (isCoach) {
      const { data: athletesData } = await supabase.from('athletes').select('*').order('full_name');
      setAthletes(athletesData || []);
      if (athletesData && athletesData.length > 0) {
        targetAthleteId = athletesData[0].id;
        setSelectedAthlete(targetAthleteId);
      }
    } else {
      const cleanEmail = user?.email?.trim().toLowerCase();
      const { data: athlete } = await supabase.from('athletes').select('id').ilike('email', cleanEmail || '').single();
      if (athlete) targetAthleteId = athlete.id;
    }

    if (targetAthleteId) {
      await fetchLogsForAthlete(targetAthleteId);
    }
    setLoading(false);
  };

  const fetchLogsForAthlete = async (athleteId: string) => {
    const { data } = await supabase
      .from('workout_logs')
      .select('*')
      .eq('athlete_id', athleteId)
      .order('created_at', { ascending: true });
    setLogs(data || []);
  };

  // Filtrar logs por Rutina Maestra
  const getFilteredLogs = () => {
    if (selectedRoutine === 'ALL') return logs;
    
    const routine = routines.find(r => r.id === selectedRoutine);
    if (!routine || !routine.exercises) return [];

    const parsedExercises = typeof routine.exercises === 'string' ? JSON.parse(routine.exercises) : routine.exercises;
    // Limpiamos los nombres para evitar errores de espacios
    const validExerciseNames = parsedExercises.map((ex: any) => (ex.name || '').trim().toLowerCase());

    return logs.filter(log => validExerciseNames.includes((log.exercise_name || '').trim().toLowerCase()));
  };

  // Agrupar los logs filtrados por nombre de ejercicio
  const groupedLogs = getFilteredLogs().reduce((acc: any, log: any) => {
    const key = (log.exercise_name || '').trim();
    if (!acc[key]) acc[key] = [];
    acc[key].push(log);
    return acc;
  }, {});

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <div className="border-b border-zinc-800 pb-4">
        <h2 className="text-2xl font-black text-white flex items-center gap-2 mb-2">
          <TrendingUp className="w-7 h-7 text-amber-500" /> Mi Evolución de Cargas
        </h2>
        <p className="text-zinc-400 text-sm">Tus récords y avances en el tiempo por rutina.</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        {isCoach && (
          <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 flex-1">
            <User className="w-4 h-4 text-amber-500" />
            <select 
              value={selectedAthlete} 
              onChange={(e) => { setSelectedAthlete(e.target.value); fetchLogsForAthlete(e.target.value); }} 
              className="bg-transparent text-white font-bold text-sm outline-none w-full"
            >
              {athletes.map(a => <option key={a.id} value={a.id} className="bg-zinc-900">{a.full_name}</option>)}
            </select>
          </div>
        )}

        {/* 🚨 NUEVO FILTRO POR RUTINA MAESTRA */}
        <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 flex-1 shadow-lg shadow-amber-500/5">
          <Filter className="w-4 h-4 text-emerald-500" />
          <select 
            value={selectedRoutine} 
            onChange={(e) => setSelectedRoutine(e.target.value)} 
            className="bg-transparent text-white font-bold text-sm outline-none w-full"
          >
            <option value="ALL" className="bg-zinc-900">Ver todos los ejercicios</option>
            {routines.map(r => <option key={r.id} value={r.id} className="bg-zinc-900">Rutina: {r.name}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <p className="text-amber-500 font-bold">Cargando métricas...</p>
      ) : Object.keys(groupedLogs).length === 0 ? (
        <div className="bg-zinc-950 p-8 rounded-2xl border border-zinc-800 text-center">
          <Dumbbell className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
          <p className="text-zinc-500">No hay registros de cargas para esta selección.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedLogs).map(([exerciseName, exerciseLogs]: [string, any]) => {
            const maxWeight = Math.max(...exerciseLogs.map((l: any) => l.weight_used || 0));
            return (
              <div key={exerciseName} className="bg-zinc-950 p-6 rounded-2xl border border-zinc-800 shadow-xl transition-transform hover:scale-[1.01]">
                <h3 className="font-black text-amber-500 text-lg flex items-center gap-2 mb-6">
                  <Dumbbell className="w-5 h-5" /> {exerciseName}
                </h3>
                
                {/* Minigráfica Visual */}
                <div className="h-32 flex items-end gap-2 mt-4 pt-4 border-t border-zinc-800/50">
                  {exerciseLogs.map((log: any, i: number) => {
                    const heightPercentage = maxWeight > 0 ? ((log.weight_used || 0) / maxWeight) * 100 : 0;
                    return (
                      <div key={i} className="flex-1 flex flex-col justify-end items-center group relative min-w-[30px]">
                        {/* Tooltip Hover */}
                        <div className="opacity-0 group-hover:opacity-100 absolute -top-12 bg-zinc-800 text-white text-[10px] p-2 rounded-lg pointer-events-none transition-opacity whitespace-nowrap z-10 border border-zinc-700">
                          <span className="font-bold text-amber-400">{log.weight_used} kg</span> x {log.reps_done} reps<br/>
                          <span className="text-zinc-400">{new Date(log.created_at).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })}</span>
                        </div>
                        <div 
                          className="w-full bg-gradient-to-t from-amber-600/20 to-amber-500 rounded-t-sm transition-all hover:brightness-125" 
                          style={{ height: `${Math.max(heightPercentage, 5)}%` }}
                        ></div>
                        <span className="text-[9px] text-zinc-500 mt-2 font-bold rotate-45 origin-left">
                          {new Date(log.created_at).toLocaleDateString('es-ES', { month: 'numeric', day: 'numeric' })}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}