import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase/client';
import { useAuth } from '../../providers/AuthProvider';
import { TrendingUp, User, Filter, Dumbbell } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export function AthleteProgress() {
  const { user } = useAuth();
  const isCoach = user?.email === 'coach@plataforma.com';
  
  const [logs, setLogs] = useState<any[]>([]);
  const [athletes, setAthletes] = useState<any[]>([]);
  const [assignedRoutines, setAssignedRoutines] = useState<any[]>([]);
  const [selectedAthlete, setSelectedAthlete] = useState('');
  const [selectedRoutine, setSelectedRoutine] = useState('ALL');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    let targetAthleteId = '';

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
      await loadAthleteData(targetAthleteId);
    }
    setLoading(false);
  };

  const loadAthleteData = async (athleteId: string) => {
    // 1. Cargar el historial completo de entrenamientos
    const { data: logsData } = await supabase
      .from('workout_logs')
      .select('*')
      .eq('athlete_id', athleteId)
      .order('created_at', { ascending: true });
    setLogs(logsData || []);

    // 2. Cargar SOLO las rutinas asignadas a este atleta para el filtro
    const { data: assignments } = await supabase
      .from('athlete_routines')
      .select('custom_exercises, routines(id, name)')
      .eq('athlete_id', athleteId);
    
    if (assignments) {
      setAssignedRoutines(assignments);
    }
  };

  const handleAthleteChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const athleteId = e.target.value;
    setSelectedAthlete(athleteId);
    setSelectedRoutine('ALL'); // Resetear filtro de rutina al cambiar de atleta
    loadAthleteData(athleteId);
  };

  // Filtrar logs dependiendo de la rutina seleccionada
  const getFilteredLogs = () => {
    if (selectedRoutine === 'ALL') return logs;
    
    // Buscar todas las asignaciones que coincidan con la rutina seleccionada
    const routineAssignments = assignedRoutines.filter(a => a.routines?.id === selectedRoutine);
    
    // Extraer todos los nombres de los ejercicios de esas rutinas
    let validExerciseNames: string[] = [];
    routineAssignments.forEach(assignment => {
      const parsed = typeof assignment.custom_exercises === 'string' 
        ? JSON.parse(assignment.custom_exercises) 
        : (assignment.custom_exercises || []);
      
      parsed.forEach((ex: any) => {
        if (ex.name) validExerciseNames.push(ex.name.trim().toLowerCase());
      });
    });

    // Devolver los logs que coincidan con esos nombres
    return logs.filter(log => validExerciseNames.includes((log.exercise_name || '').trim().toLowerCase()));
  };

  // Agrupar logs por nombre de ejercicio para pintarlos
  const groupedLogs = getFilteredLogs().reduce((acc: any, log: any) => {
    const key = (log.exercise_name || '').trim();
    if (!acc[key]) acc[key] = [];
    acc[key].push({
      date: new Date(log.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'numeric' }),
      peso: log.weight_used,
      reps: log.reps_done
    });
    return acc;
  }, {});

  // Extraer nombres de rutinas únicas asignadas para poblar el select
  const uniqueRoutinesMap = new Map();
  assignedRoutines.forEach(a => {
    if (a.routines) uniqueRoutinesMap.set(a.routines.id, a.routines.name);
  });
  const uniqueRoutinesList = Array.from(uniqueRoutinesMap.entries());

  // Tooltip personalizado para la gráfica
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-zinc-800 border border-zinc-700 p-3 rounded-lg shadow-xl">
          <p className="text-zinc-400 text-xs mb-1">{label}</p>
          <p className="text-amber-400 font-black">{payload[0].value} kg <span className="text-zinc-300 text-sm font-normal">x {payload[0].payload.reps} reps</span></p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <div className="border-b border-zinc-800 pb-4">
        <h2 className="text-2xl font-black text-white flex items-center gap-2 mb-2">
          <TrendingUp className="w-7 h-7 text-amber-500" /> Mi Evolución de Cargas
        </h2>
        <p className="text-zinc-400 text-sm">Tus récords y avances en el tiempo.</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        {isCoach && (
          <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 flex-1">
            <User className="w-4 h-4 text-amber-500" />
            <select 
              value={selectedAthlete} 
              onChange={handleAthleteChange} 
              className="bg-transparent text-white font-bold text-sm outline-none w-full"
            >
              {athletes.map(a => <option key={a.id} value={a.id} className="bg-zinc-900">{a.full_name}</option>)}
            </select>
          </div>
        )}

        <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 flex-1 shadow-lg shadow-amber-500/5">
          <Filter className="w-4 h-4 text-emerald-500" />
          <select 
            value={selectedRoutine} 
            onChange={(e) => setSelectedRoutine(e.target.value)} 
            className="bg-transparent text-white font-bold text-sm outline-none w-full"
          >
            <option value="ALL" className="bg-zinc-900">Todos los ejercicios guardados</option>
            {uniqueRoutinesList.map(([id, name]) => (
              <option key={id} value={id} className="bg-zinc-900">Rutina: {name}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <p className="text-amber-500 font-bold">Cargando métricas...</p>
      ) : Object.keys(groupedLogs).length === 0 ? (
        <div className="bg-zinc-950 p-8 rounded-2xl border border-zinc-800 text-center">
          <Dumbbell className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
          <p className="text-zinc-500">No hay registros de cargas guardados para esta selección.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedLogs).map(([exerciseName, chartData]: [string, any]) => (
            <div key={exerciseName} className="bg-zinc-950 p-6 rounded-2xl border border-zinc-800 shadow-xl">
              <h3 className="font-black text-amber-500 text-lg flex items-center gap-2 mb-6">
                <Dumbbell className="w-5 h-5" /> {exerciseName}
              </h3>
              
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                    <XAxis dataKey="date" stroke="#52525b" fontSize={10} tickMargin={10} />
                    <YAxis stroke="#52525b" fontSize={10} />
                    <Tooltip content={<CustomTooltip />} />
                    <Line 
                      type="monotone" 
                      dataKey="peso" 
                      stroke="#f59e0b" 
                      strokeWidth={3} 
                      dot={{ r: 4, fill: '#f59e0b', strokeWidth: 0 }} 
                      activeDot={{ r: 6, fill: '#fcd34d' }} 
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}