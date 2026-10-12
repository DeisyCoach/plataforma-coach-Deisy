import { useState, useEffect } from 'react';
import { useAuth } from '../providers/AuthProvider';
import { supabase } from '../lib/supabase/client';
import { Scale, AlertCircle, TrendingUp, Trophy, Activity } from 'lucide-react';
import { Link } from 'react-router-dom';
import { LineChart, Line, XAxis, Tooltip, ResponsiveContainer } from 'recharts';

export function MainPanel() {
  const { user } = useAuth();
  const isCoach = user?.email === 'coach@plataforma.com';
  
  const [athleteData, setAthleteData] = useState<any>(null);
  const [weightChartData, setWeightChartData] = useState<any[]>([]);
  const [needsCheckin, setNeedsCheckin] = useState(false);
  const [strengthFeedback, setStrengthFeedback] = useState({ title: '', message: '', type: 'neutral' });
  const [loading, setLoading] = useState(true);

  // 🧠 Diccionario inteligente para detectar el grupo muscular
  const getMuscleGroup = (exerciseName: string) => {
    const name = exerciseName.toLowerCase();
    if (/(pierna|cuadricep|femoral|gluteo|sentadilla|prensa|extensi[óo]n|zancada|hip thrust|pantorrilla|peso muerto)/.test(name)) return 'Pierna/Glúteo';
    if (/(espalda|dominada|remo|jal[óo]n|pull up|lumbar)/.test(name)) return 'Espalda';
    if (/(pecho|press|apertura|pectoral|push up|flexi[óo]n)/.test(name) && !/(militar|hombro)/.test(name)) return 'Pecho';
    if (/(hombro|militar|elevaci[óo]n|p[áa]jaro|deltoide)/.test(name)) return 'Hombro';
    if (/(biceps|triceps|curl|copa|martillo|brazo)/.test(name)) return 'Brazo';
    return 'tus entrenamientos';
  };

  useEffect(() => {
    if (isCoach) {
      setLoading(false);
      return;
    }

    const fetchAthleteData = async () => {
      const cleanEmail = user?.email?.trim().toLowerCase();
      const { data: athlete } = await supabase.from('athletes').select('*').ilike('email', cleanEmail || '').single();
      
      if (athlete) {
        setAthleteData(athlete);
        
        // 1. Cargar pesos corporales
        const { data: checkins } = await supabase.from('weekly_checkins')
          .select('fasting_weight, created_at')
          .eq('athlete_id', athlete.id)
          .order('created_at', { ascending: false })
          .limit(6);
        
        if (checkins) {
          const chartData = checkins.map(c => ({
            fecha: new Date(c.created_at).toLocaleDateString('es-ES', { month: 'short', day: 'numeric'}),
            peso: parseFloat(c.fasting_weight)
          })).reverse();
          setWeightChartData(chartData);
        }

        // 2. Lógica de Chequeo Faltante
        if (!checkins || checkins.length === 0) {
          setNeedsCheckin(true);
        } else {
          const lastCheckinDate = new Date(checkins[0].created_at);
          const diffTime = Math.abs(new Date().getTime() - lastCheckinDate.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          setNeedsCheckin(diffDays > 6);
        }

        // 3. Lógica AVANZADA de Análisis de Fuerza
        const { data: logs } = await supabase.from('workout_logs')
          .select('exercise_name, weight_used, reps_done, created_at')
          .eq('athlete_id', athlete.id)
          .order('created_at', { ascending: false })
          .limit(100);

        if (logs && logs.length > 0) {
          // Agrupamos los logs por ejercicio para comparar
          const logsByExercise = logs.reduce((acc: any, log: any) => {
            const name = log.exercise_name.trim();
            if (!acc[name]) acc[name] = [];
            acc[name].push(log);
            return acc;
          }, {});

          let feedbackSet = false;

          // Buscamos el primer ejercicio que tenga progreso reciente
          for (const [exerciseName, exerciseLogs] of Object.entries(logsByExercise)) {
            const logsArray = exerciseLogs as any[];
            if (logsArray.length >= 2) {
              const recent = logsArray[0]; // El más nuevo
              const previous = logsArray[1]; // El anterior

              const muscleGroup = getMuscleGroup(exerciseName);

              // Subió peso o subió reps con el mismo peso
              if (recent.weight_used > previous.weight_used || (recent.weight_used === previous.weight_used && recent.reps_done > previous.reps_done)) {
                setStrengthFeedback({ 
                  title: '¡EXCELENTE PROGRESO!', 
                  message: `Vas muy bien. Recientemente aumentaste tus cargas o repeticiones en ${muscleGroup} (${exerciseName}). ¡A seguir mutando!`, 
                  type: 'up' 
                });
                feedbackSet = true;
                break;
              } 
              // Bajó peso (Descarga)
              else if (recent.weight_used < previous.weight_used) {
                setStrengthFeedback({ 
                  title: 'FASE DE RECUPERACIÓN', 
                  message: `Notamos una descarga de peso en ${muscleGroup} (${exerciseName}). Recuerda que el descanso y control de cargas también es progreso.`, 
                  type: 'down' 
                });
                feedbackSet = true;
                break;
              }
            }
          }

          // Si no encontró subidas ni bajadas, asume mantenimiento
          if (!feedbackSet && logs.length > 0) {
            setStrengthFeedback({ 
              title: 'MANTENIENDO EL NIVEL', 
              message: `Tus cargas recientes se mantienen sólidas. ¡Estás consolidando tu fuerza para el próximo salto!`, 
              type: 'neutral' 
            });
          }
        }
      }
      setLoading(false);
    };

    fetchAthleteData();
  }, [user, isCoach]);

  if (loading) return <div className="text-amber-500 font-bold p-8 text-center">Cargando tu panel...</div>;

  if (isCoach) {
    return (
      <div className="bg-zinc-950 p-10 rounded-3xl shadow-2xl border border-zinc-800 text-center max-w-2xl mx-auto mt-10 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-amber-500/10 blur-3xl rounded-full"></div>
        <div className="w-20 h-20 bg-amber-500 rounded-2xl mx-auto flex items-center justify-center font-black text-black text-4xl shadow-[0_0_20px_rgba(245,158,11,0.3)] mb-6 relative z-10">C</div>
        <h2 className="text-3xl font-black text-white mb-3 relative z-10">Bienvenido a COACH<span className="text-amber-400">APP</span></h2>
        <p className="text-zinc-400 text-sm relative z-10">Selecciona una opción en el menú lateral para gestionar entrenamientos, nutrición y evaluar el progreso de tus atletas.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {needsCheckin && (
        <div className="bg-red-500/10 border border-red-500/30 p-5 rounded-2xl flex items-center gap-4 animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.15)]">
          <AlertCircle className="w-8 h-8 text-red-500 shrink-0" />
          <div>
            <h3 className="text-red-500 font-black text-lg">¡Atención, Mutante!</h3>
            <p className="text-zinc-300 text-sm">Oye, no has subido tu chequeo esta semana o ya toca el nuevo. <Link to="/checkins" className="text-white font-bold underline decoration-red-500">¡Ponte al día aquí!</Link></p>
          </div>
        </div>
      )}

      <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-8 text-white shadow-2xl relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-amber-500/10 blur-3xl rounded-full pointer-events-none"></div>
        <div className="relative z-10">
          <p className="text-amber-500 text-xs font-black uppercase tracking-widest mb-1">Panel Principal</p>
          <h1 className="text-3xl sm:text-4xl font-black mb-2 leading-tight">
            Bienvenido a <span className="text-amber-400">El Inge Fit App</span>
          </h1>
          <p className="text-zinc-300 font-medium mb-1">Aquí está el resumen de tu evolución, {athleteData?.full_name?.split(' ')[0] || 'Atleta'}.</p>
          <p className="text-zinc-500 text-sm">Navega en el menú lateral para ver tu entrenamiento, dieta o subir tus chequeos.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* GRÁFICA DE PESO CORPORAL */}
        <div className="bg-zinc-950 rounded-3xl border border-zinc-800 p-6 flex flex-col h-[280px]">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-black text-white text-lg flex items-center gap-2">
              <Scale className="w-5 h-5 text-emerald-400"/> Evolución de Peso
            </h3>
            {weightChartData.length > 0 && (
              <span className="text-emerald-400 font-black bg-emerald-500/10 px-3 py-1 rounded-lg">
                Actual: {weightChartData[weightChartData.length - 1].peso} kg
              </span>
            )}
          </div>
          
          <div className="flex-1 w-full h-full min-h-[150px]">
            {weightChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weightChartData} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                  <XAxis dataKey="fecha" stroke="#52525b" fontSize={10} tickMargin={8} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px' }} 
                    itemStyle={{ color: '#10b981', fontWeight: 'bold' }}
                    labelStyle={{ color: '#a1a1aa', fontSize: '12px' }}
                  />
                  <Line type="monotone" dataKey="peso" name="Peso (kg)" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981' }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-zinc-500 text-sm italic">
                Sube tu primer chequeo para generar tu gráfica.
              </div>
            )}
          </div>
        </div>

        {/* FEEDBACK DINÁMICO */}
        <div className={`rounded-3xl border p-6 flex flex-col justify-center h-[280px]
          ${strengthFeedback.type === 'up' ? 'bg-amber-950/20 border-amber-500/30' : 
            strengthFeedback.type === 'down' ? 'bg-blue-950/20 border-blue-500/30' : 'bg-zinc-950 border-zinc-800'}
        `}>
          <div className="flex items-center gap-3 mb-4">
            <div className={`p-4 rounded-xl shadow-inner ${strengthFeedback.type === 'up' ? 'bg-amber-500/20 text-amber-500' : strengthFeedback.type === 'down' ? 'bg-blue-500/20 text-blue-400' : 'bg-zinc-900 text-zinc-400'}`}>
              {strengthFeedback.type === 'up' ? <Trophy className="w-8 h-8" /> : strengthFeedback.type === 'down' ? <Activity className="w-8 h-8" /> : <TrendingUp className="w-8 h-8" />}
            </div>
            <h3 className="font-black text-white text-xl leading-tight">{strengthFeedback.title || 'ANALIZANDO CARGAS...'}</h3>
          </div>
          <p className="text-zinc-300 text-[15px] leading-relaxed font-medium">
            {strengthFeedback.message || 'Registra más entrenamientos para que nuestro sistema de inteligencia analice tu fuerza y progresión.'}
          </p>
        </div>
      </div>
    </div>
  );
}