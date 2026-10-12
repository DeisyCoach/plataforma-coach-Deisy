import { useState, useEffect } from 'react';
import { useAuth } from '../providers/AuthProvider';
import { supabase } from '../lib/supabase/client';
import { Scale, AlertCircle, TrendingUp, Trophy, Activity } from 'lucide-react';
import { Link } from 'react-router-dom';

export function MainPanel() {
  const { user } = useAuth();
  const isCoach = user?.email === 'coach@plataforma.com';
  
  const [athleteData, setAthleteData] = useState<any>(null);
  const [bodyWeights, setBodyWeights] = useState<any[]>([]);
  const [needsCheckin, setNeedsCheckin] = useState(false);
  const [strengthFeedback, setStrengthFeedback] = useState({ title: '', message: '', type: 'neutral' });
  const [loading, setLoading] = useState(true);

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
          .limit(5);
        setBodyWeights(checkins || []);

        // 2. Lógica de Chequeo Faltante (Si no hay chequeo en los últimos 6 días)
        if (!checkins || checkins.length === 0) {
          setNeedsCheckin(true);
        } else {
          const lastCheckinDate = new Date(checkins[0].created_at);
          const diffTime = Math.abs(new Date().getTime() - lastCheckinDate.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          setNeedsCheckin(diffDays > 6);
        }

        // 3. Lógica de Análisis de Fuerza (Feedback Dinámico)
        const { data: logs } = await supabase.from('workout_logs')
          .select('exercise_name, weight_used')
          .eq('athlete_id', athlete.id)
          .order('created_at', { ascending: false })
          .limit(20);

        if (logs && logs.length > 5) {
          // Comparamos el peso de los registros más recientes vs los anteriores
          const recentWeight = logs[0].weight_used;
          const pastWeight = logs[5].weight_used;
          
          if (recentWeight > pastWeight) {
            setStrengthFeedback({ title: '¡MÁS FUERTE QUE NUNCA!', message: `Tus marcas recientes en ${logs[0].exercise_name} están subiendo. ¡Sigue rompiéndola!`, type: 'up' });
          } else if (recentWeight < pastWeight) {
            setStrengthFeedback({ title: 'FASE DE RECUPERACIÓN', message: `Notamos una descarga de peso en ${logs[0].exercise_name}. ¡Recupérate bien, el descanso también es progreso!`, type: 'down' });
          } else {
            setStrengthFeedback({ title: 'MANTENIENDO EL NIVEL', message: `Estás consolidando tu fuerza actual. ¡Preparando el cuerpo para el próximo salto!`, type: 'neutral' });
          }
        }
      }
      setLoading(false);
    };

    fetchAthleteData();
  }, [user, isCoach]);

  if (loading) return <div className="text-amber-500 font-bold p-8 text-center">Cargando tu panel...</div>;

  // VISTA DEL COACH (Se mantiene igual que antes)
  if (isCoach) {
    return (
      <div className="bg-zinc-950 p-10 rounded-3xl shadow-2xl border border-zinc-800 text-center max-w-2xl mx-auto mt-10 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-amber-500/10 blur-3xl rounded-full"></div>
        <div className="w-20 h-20 bg-amber-500 rounded-2xl mx-auto flex items-center justify-center font-black text-black text-4xl shadow-[0_0_20px_rgba(245,158,11,0.3)] mb-6 relative z-10">
          C
        </div>
        <h2 className="text-3xl font-black text-white mb-3 relative z-10">
          Bienvenido a COACH<span className="text-amber-400">APP</span>
        </h2>
        <p className="text-zinc-400 text-sm relative z-10">
          Selecciona una opción en el menú lateral para gestionar entrenamientos, nutrición y evaluar el progreso de tus atletas.
        </p>
      </div>
    );
  }

  // VISTA DEL ATLETA (Interactiva y Personalizada)
  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      {/* 1. Alerta de Chequeo */}
      {needsCheckin && (
        <div className="bg-red-500/10 border border-red-500/30 p-5 rounded-2xl flex items-center gap-4 animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.15)]">
          <AlertCircle className="w-8 h-8 text-red-500 shrink-0" />
          <div>
            <h3 className="text-red-500 font-black text-lg">¡Atención, Mutante!</h3>
            <p className="text-zinc-300 text-sm">Oye, no has subido tu chequeo esta semana o ya toca el nuevo. <Link to="/checkins" className="text-white font-bold underline decoration-red-500">¡Ponte al día aquí!</Link></p>
          </div>
        </div>
      )}

      {/* 2. Saludo Premium */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-8 text-white shadow-2xl relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-amber-500/10 blur-3xl rounded-full pointer-events-none"></div>
        <div className="relative z-10">
          <p className="text-amber-500 text-xs font-black uppercase tracking-widest mb-1">Panel Principal</p>
          <h1 className="text-3xl sm:text-4xl font-black mb-2 leading-tight">
            Bienvenido a <span className="text-amber-400">El Inge Fit App</span>
          </h1>
          <p className="text-zinc-400 font-medium">Aquí está el resumen de tu evolución, {athleteData?.full_name?.split(' ')[0] || 'Atleta'}.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 3. Progreso de Peso Corporal (Movido desde Mi Entrenamiento) */}
        <div className="bg-zinc-950 rounded-3xl border border-zinc-800 p-6 flex flex-col">
          <h3 className="font-black text-white text-lg flex items-center gap-2 mb-4">
            <Scale className="w-5 h-5 text-emerald-400"/> Tu Evolución de Peso
          </h3>
          {bodyWeights.length > 0 ? (
            <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar flex-1 items-center">
              {bodyWeights.map((bw, i) => (
                <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 min-w-[110px] text-center shrink-0">
                  <p className="text-emerald-400 font-black text-2xl mb-1">{bw.fasting_weight} <span className="text-sm">kg</span></p>
                  <p className="text-[10px] text-zinc-500 font-bold uppercase">{new Date(bw.created_at).toLocaleDateString('es-ES', { month: 'short', day: 'numeric'})}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-zinc-500 text-sm italic m-auto">Sube tu primer chequeo para ver tu gráfica.</p>
          )}
        </div>

        {/* 4. Feedback Dinámico de Fuerza */}
        <div className={`rounded-3xl border p-6 flex flex-col justify-center
          ${strengthFeedback.type === 'up' ? 'bg-amber-950/20 border-amber-500/30' : 
            strengthFeedback.type === 'down' ? 'bg-blue-950/20 border-blue-500/30' : 'bg-zinc-950 border-zinc-800'}
        `}>
          <div className="flex items-center gap-3 mb-3">
            <div className={`p-3 rounded-xl shadow-inner ${strengthFeedback.type === 'up' ? 'bg-amber-500/20 text-amber-500' : strengthFeedback.type === 'down' ? 'bg-blue-500/20 text-blue-400' : 'bg-zinc-900 text-zinc-400'}`}>
              {strengthFeedback.type === 'up' ? <Trophy className="w-6 h-6" /> : strengthFeedback.type === 'down' ? <Activity className="w-6 h-6" /> : <TrendingUp className="w-6 h-6" />}
            </div>
            <h3 className="font-black text-white text-lg leading-tight">{strengthFeedback.title || 'ANALIZANDO CARGAS...'}</h3>
          </div>
          <p className="text-zinc-300 text-sm leading-relaxed font-medium">
            {strengthFeedback.message || 'Registra más entrenamientos para que nuestro sistema de inteligencia analice tu fuerza y progresión.'}
          </p>
        </div>
      </div>
    </div>
  );
}