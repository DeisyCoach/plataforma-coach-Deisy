import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase/client';
import { useAuth } from '../../providers/AuthProvider';
import { TrendingUp, Dumbbell } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export function AthleteProgress() {
  const { user } = useAuth();
  const isCoach = user?.email === 'coach@plataforma.com';

  const [athletes, setAthletes] = useState<any[]>([]);
  const [selectedAthlete, setSelectedAthlete] = useState('');
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInitialData();
  }, [user]);

  const fetchInitialData = async () => {
    setLoading(true);
    if (isCoach) {
      // Si es Coach, trae a todos los atletas para el menú desplegable
      const { data } = await supabase.from('athletes').select('*').order('full_name');
      setAthletes(data || []);
      if (data && data.length > 0) {
        setSelectedAthlete(data[0].id);
        fetchLogs(data[0].id);
      }
    } else {
      // Si es Atleta, busca SOLO su ID y bloquea el menú
      const { data: athlete } = await supabase.from('athletes').select('id').eq('email', user?.email).single();
      if (athlete) {
        fetchLogs(athlete.id);
      }
    }
    setLoading(false);
  };

  const fetchLogs = async (athleteId: string) => {
    const { data } = await supabase.from('workout_logs')
      .select('*')
      .eq('athlete_id', athleteId)
      .order('created_at', { ascending: true }); // Ascendente para que la gráfica avance de izquierda a derecha
    setLogs(data || []);
  };

  const handleAthleteChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setSelectedAthlete(id);
    fetchLogs(id);
  };

  // Agrupamos los datos por cada ejercicio para crear múltiples gráficas
  const groupedLogs = logs.reduce((acc: any, log: any) => {
    if (!acc[log.exercise_name]) acc[log.exercise_name] = [];
    
    const dateObj = new Date(log.created_at);
    const dateStr = `${dateObj.getDate()}/${dateObj.getMonth() + 1}`; // Formato corto: 15/8
    
    acc[log.exercise_name].push({
      date: dateStr,
      weight: log.weight_used,
      reps: log.reps_done,
      fullDate: dateObj.toLocaleDateString()
    });
    return acc;
  }, {});

  if (loading) return <div className="text-amber-400 font-bold p-8">Cargando progreso...</div>;

  return (
    <div className="space-y-8">
      {/* CABECERA (Adaptable si es Coach o Atleta) */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-zinc-800 pb-4">
        <div>
          <h2 className="text-2xl font-black text-white flex items-center gap-2">
            <TrendingUp className="w-7 h-7 text-amber-400" />
            {isCoach ? 'Progresión de Cargas' : 'Mi Evolución de Cargas'}
          </h2>
          <p className="text-zinc-400 text-sm mt-1">
            {isCoach ? 'Historial gráfico de pesos registrados por tus atletas.' : 'Tus récords y avances en el tiempo.'}
          </p>
        </div>
        
        {/* SELECTOR (Solo visible para el Coach) */}
        {isCoach && (
          <div className="w-full md:w-64">
            <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Seleccionar Atleta</label>
            <select 
              value={selectedAthlete} 
              onChange={handleAthleteChange} 
              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-amber-500"
            >
               {athletes.map(a => <option key={a.id} value={a.id}>{a.full_name}</option>)}
            </select>
          </div>
        )}
      </div>

      {/* ÁREA DE GRÁFICAS */}
      <div className="space-y-8">
        {Object.keys(groupedLogs).length === 0 ? (
           <div className="bg-zinc-950 p-10 rounded-2xl border border-zinc-800 text-center text-zinc-500">
             Aún no hay registros de entrenamiento guardados.
           </div>
        ) : (
           Object.keys(groupedLogs).map(exercise => (
             <div key={exercise} className="bg-zinc-950 p-4 md:p-6 rounded-2xl border border-zinc-800 shadow-lg">
                <h3 className="text-lg font-black text-white mb-6 flex items-center gap-2 border-b border-zinc-800/50 pb-2">
                  <Dumbbell className="text-amber-500 w-5 h-5" /> {exercise}
                </h3>
                
                {/* GRÁFICA DE LÍNEAS */}
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={groupedLogs[exercise]} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                      <XAxis dataKey="date" stroke="#71717a" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis stroke="#71717a" fontSize={11} tickLine={false} axisLine={false} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '12px', color: '#fff' }}
                        itemStyle={{ color: '#f59e0b', fontWeight: 'bold' }}
                        labelStyle={{ color: '#a1a1aa', marginBottom: '4px', fontSize: '12px' }}
                        formatter={(value: any, name: any, props: any) => [`${value} kg  (${props.payload.reps} reps)`, 'Levantamiento']}
                        labelFormatter={(label, payloads) => payloads.length > 0 ? payloads[0].payload.fullDate : label}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="weight" 
                        stroke="#f59e0b" 
                        strokeWidth={3} 
                        dot={{ r: 4, fill: '#09090b', stroke: '#f59e0b', strokeWidth: 2 }} 
                        activeDot={{ r: 6, fill: '#f59e0b' }} 
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
             </div>
           ))
        )}
      </div>
    </div>
  );
}