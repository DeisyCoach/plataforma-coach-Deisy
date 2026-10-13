import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase/client';
import { useAuth } from '../providers/AuthProvider';
import { ClipboardCheck, Scale, CheckCircle2, AlertCircle, Send } from 'lucide-react';

export function CheckIns() {
  const { user } = useAuth();

  // 🚨 Detección dinámica de Coach / Atleta
  const [isCoach, setIsCoach] = useState<boolean>(false);
  const [athletes, setAthletes] = useState<any[]>([]);
  const [checkIns, setCheckIns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados del formulario para el Atleta
  const [fastingWeight, setFastingWeight] = useState('');
  const [recovery, setRecovery] = useState(3);
  const [strength, setStrength] = useState(3);
  const [libido, setLibido] = useState(3);
  const [rest, setRest] = useState(3);
  const [discomfort, setDiscomfort] = useState(3);
  const [digestion, setDigestion] = useState(3);
  const [notes, setNotes] = useState('');

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

      // 1. Verificamos si existe en la tabla de atletas
      const { data: athlete } = await supabase
        .from('athletes')
        .select('id')
        .ilike('email', cleanEmail)
        .maybeSingle();

      const coachRole = !athlete;
      setIsCoach(coachRole);

      // 2. Cargamos datos según el rol
      if (coachRole) {
        const { data: athletesData } = await supabase.from('athletes').select('*').order('full_name');
        const { data: checkinsData } = await supabase
          .from('weekly_checkins')
          .select('*, athletes(full_name, email)')
          .order('created_at', { ascending: false });

        setAthletes(athletesData || []);
        setCheckIns(checkinsData || []);
      } else if (athlete) {
        const { data: myCheckins } = await supabase
          .from('weekly_checkins')
          .select('*')
          .eq('athlete_id', athlete.id)
          .order('created_at', { ascending: false });

        setCheckIns(myCheckins || []);
      }
    } catch (err) {
      console.error("Error en CheckIns:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitCheckin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fastingWeight) return alert('Por favor ingresa tu peso en ayunas.');

    const cleanEmail = user?.email?.trim().toLowerCase();
    const { data: athlete } = await supabase.from('athletes').select('id').ilike('email', cleanEmail || '').single();
    if (!athlete) return alert('Atleta no encontrado.');

    const { error } = await supabase.from('weekly_checkins').insert([
      { 
        athlete_id: athlete.id, 
        fasting_weight: parseFloat(fastingWeight), 
        recovery, 
        strength, 
        libido, 
        rest, 
        discomfort, 
        digestion, 
        notes 
      }
    ]);

    if (!error) {
      alert('¡Chequeo semanal enviado con éxito!');
      setFastingWeight(''); 
      setNotes(''); 
      checkRoleAndFetchData();
    } else { 
      alert('Error al enviar el chequeo: ' + error.message); 
    }
  };

  const isUpdated = (dateString: string) => {
    if (!dateString) return false;
    const diffDays = (new Date().getTime() - new Date(dateString).getTime()) / (1000 * 3600 * 24);
    return diffDays <= 7;
  };

  if (loading) return <div className="p-8 text-amber-500 font-bold text-center">Cargando módulo de Chequeos...</div>;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-black text-white flex items-center gap-2">
          <ClipboardCheck className="w-7 h-7 text-amber-400" /> 
          {isCoach ? 'Control de Chequeos Semanales' : 'Mi Chequeo del Sábado'}
        </h2>
        <p className="text-zinc-400 text-sm mt-1">
          {isCoach ? 'Monitorea el cumplimiento y el progreso del peso corporal de tus alumnos.' : 'Sube tu peso en ayunas y califica tus sensaciones del 0 al 5.'}
        </p>
      </div>

      {isCoach ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {athletes.map((ath) => {
            const athleteHistory = checkIns.filter(c => c.athlete_id === ath.id);
            const lastCheckin = athleteHistory[0];
            const updated = lastCheckin && isUpdated(lastCheckin.created_at);

            return (
              <div key={ath.id} className="bg-zinc-950 border border-zinc-800 p-5 rounded-2xl flex flex-col justify-between space-y-4 shadow-xl">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-white text-base">{ath.full_name}</h4>
                    <p className="text-xs text-zinc-500">{ath.email}</p>
                  </div>
                  {updated ? (
                    <span className="flex items-center gap-1 text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full"><CheckCircle2 className="w-3.5 h-3.5" /> Chequeo OK</span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs font-bold text-red-400 bg-red-500/10 border border-red-500/20 px-2.5 py-1 rounded-full"><AlertCircle className="w-3.5 h-3.5" /> Pendiente</span>
                  )}
                </div>

                {lastCheckin ? (
                  <div className="bg-zinc-900/80 p-3 rounded-xl border border-zinc-800 text-xs space-y-2">
                    {athleteHistory.length > 0 && (
                      <div className="flex gap-2 overflow-x-auto pb-3 mb-2 border-b border-zinc-800/80 custom-scrollbar">
                        {athleteHistory.slice(0, 5).map((bw, i) => (
                          <div key={i} className="bg-zinc-950 border border-zinc-800 rounded-lg p-2 min-w-[70px] text-center shrink-0">
                            <p className="text-emerald-400 font-black text-sm">{bw.fasting_weight} <span className="text-[10px]">kg</span></p>
                            <p className="text-[9px] text-zinc-500 font-bold uppercase">{new Date(bw.created_at).toLocaleDateString('es-ES', { month: 'short', day: 'numeric'})}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex justify-between text-zinc-300">
                      <span>Último peso: <b className="text-amber-400">{lastCheckin.fasting_weight} kg</b></span>
                      <span className="text-zinc-500">{new Date(lastCheckin.created_at).toLocaleDateString()}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-1 text-[11px] text-zinc-400 pt-1 border-t border-zinc-800">
                      <span>Rec: <b className="text-white">{lastCheckin.recovery}/5</b></span>
                      <span>Fue: <b className="text-white">{lastCheckin.strength}/5</b></span>
                      <span>Lib: <b className="text-white">{lastCheckin.libido}/5</b></span>
                      <span>Sue: <b className="text-white">{lastCheckin.rest}/5</b></span>
                      <span>Mol: <b className="text-white">{lastCheckin.discomfort}/5</b></span>
                      <span>Dig: <b className="text-white">{lastCheckin.digestion}/5</b></span>
                    </div>
                    {lastCheckin.notes && <p className="text-[11px] italic text-zinc-400 mt-2 bg-zinc-950 p-2 rounded">"{lastCheckin.notes}"</p>}
                  </div>
                ) : (
                  <p className="text-xs text-zinc-600">Sin chequeos registrados aún.</p>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* VISTA DEL ATLETA */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <form onSubmit={handleSubmitCheckin} className="bg-zinc-950 p-6 rounded-2xl border border-zinc-800 space-y-5 lg:col-span-1 shadow-xl">
            <h3 className="font-bold text-white text-base border-b border-zinc-800 pb-3 flex items-center gap-2"><Scale className="w-5 h-5 text-amber-400" /> Registrar Chequeo</h3>
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Peso en Ayunas (kg)</label>
              <input type="number" step="0.1" placeholder="Ej. 75.5" value={fastingWeight} onChange={(e) => setFastingWeight(e.target.value)} className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-amber-400 font-bold focus:outline-none focus:border-amber-500" />
            </div>
            {[
              { label: 'Recuperación Muscular', val: recovery, set: setRecovery },
              { label: 'Fuerza en Entrenamientos', val: strength, set: setStrength },
              { label: 'Libido / Energía Sexual', val: libido, set: setLibido },
              { label: 'Calidad de Descanso / Sueño', val: rest, set: setRest },
              { label: 'Molestias / Dolores Articulares', val: discomfort, set: setDiscomfort },
              { label: 'Digestión / Inflamación', val: digestion, set: setDigestion },
            ].map((item, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between text-xs text-zinc-300"><span>{item.label}</span><b className="text-amber-400">{item.val} / 5</b></div>
                <input type="range" min="0" max="5" value={item.val} onChange={(e) => item.set(parseInt(e.target.value, 10))} className="w-full accent-amber-500 bg-zinc-800 rounded-lg h-2 cursor-pointer" />
              </div>
            ))}
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Notas Adicionales</label>
              <textarea rows={2} placeholder="¿Algo especial que quieras comunicarle al Coach?" value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-sm text-zinc-200 focus:outline-none focus:border-amber-500" />
            </div>
            <button type="submit" className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-black rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20"><Send className="w-4 h-4" /> Enviar Chequeo</button>
          </form>

          <div className="lg:col-span-2 space-y-4">
            <h3 className="font-bold text-white text-lg">Tu Historial de Peso Corporal</h3>
            <div className="space-y-3">
              {checkIns.map((c) => (
                <div key={c.id} className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 flex justify-between items-center shadow-lg">
                  <div>
                    <span className="text-amber-400 font-bold text-lg">{c.fasting_weight} kg</span>
                    <p className="text-xs text-zinc-500">{new Date(c.created_at).toLocaleDateString()} - Sábado de Chequeo</p>
                    {c.notes && <p className="text-xs text-zinc-400 mt-1 italic">"{c.notes}"</p>}
                  </div>
                  <div className="text-right text-xs text-zinc-400">
                    <p>Sueño: <b className="text-white">{c.rest}/5</b> | Digestión: <b className="text-white">{c.digestion}/5</b></p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}