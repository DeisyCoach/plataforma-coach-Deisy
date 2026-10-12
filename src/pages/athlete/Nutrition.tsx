import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase/client';
import { useAuth } from '../../providers/AuthProvider';
import { Utensils, Flame, Coffee, Sun, Moon, Apple, Info } from 'lucide-react';

export function Nutrition() {
  const { user } = useAuth();
  const [diet, setDiet] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDiet = async () => {
      if (!user) return;
      const cleanEmail = user.email?.trim().toLowerCase();
      const { data: athlete } = await supabase.from('athletes').select('id, full_name').ilike('email', cleanEmail || '').single();
      
      if (athlete) {
        // 🚨 NOMBRES DE TABLA CORREGIDO A: athlete_meals
        const { data } = await supabase.from('athlete_meals').select('*').eq('athlete_id', athlete.id).order('created_at', { ascending: false }).limit(1).single();
        if (data) setDiet(data);
      }
      setLoading(false);
    };
    fetchDiet();
  }, [user]);

  const getMealStyle = (name: string = '') => {
    const lower = name.toLowerCase();
    if (lower.includes('ayuno')) return { icon: <Coffee className="w-6 h-6 text-blue-400" />, color: 'border-blue-500/30 bg-blue-950/10' };
    if (lower.includes('desayuno')) return { icon: <Sun className="w-6 h-6 text-amber-400" />, color: 'border-amber-500/30 bg-amber-950/10' };
    if (lower.includes('almuerzo')) return { icon: <Utensils className="w-6 h-6 text-orange-400" />, color: 'border-orange-500/30 bg-orange-950/10' };
    if (lower.includes('cena')) return { icon: <Moon className="w-6 h-6 text-indigo-400" />, color: 'border-indigo-500/30 bg-indigo-950/10' };
    return { icon: <Apple className="w-6 h-6 text-emerald-400" />, color: 'border-emerald-500/30 bg-emerald-950/10' };
  };

  if (loading) return <div className="text-center py-12 text-amber-400 font-bold">Cargando tu plan nutricional...</div>;

  if (!diet) return (
    <div className="max-w-xl mx-auto mt-10 p-10 bg-zinc-950 rounded-3xl border border-zinc-800 text-center">
      <Apple className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
      <h2 className="text-2xl font-black text-white mb-2">Sin plan activo</h2>
      <p className="text-zinc-500 text-sm">Tu coach aún no te ha asignado un plan nutricional para esta etapa. ¡Pídele que te actualice!</p>
    </div>
  );

  const meals = typeof diet.meals === 'string' ? JSON.parse(diet.meals) : (diet.meals || []);

  return (
    <div className="max-w-2xl mx-auto space-y-8 pb-12">
      <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-8 text-white shadow-2xl relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-emerald-500/10 blur-3xl rounded-full pointer-events-none"></div>
        <div className="relative z-10">
          <p className="text-emerald-500 text-xs font-black uppercase tracking-widest flex items-center gap-2 mb-2">
            <Flame className="w-4 h-4" /> Plan Activo
          </p>
          <h1 className="text-3xl sm:text-4xl font-black mb-2 leading-tight">{diet.title}</h1>
          {diet.calories && (
            <div className="inline-flex items-center gap-2 bg-zinc-900 border border-zinc-800 px-4 py-2 rounded-xl mt-2">
              <Info className="w-4 h-4 text-zinc-400" />
              <span className="text-sm font-bold text-zinc-300">Objetivo: <b className="text-emerald-400">{diet.calories} kcal</b></span>
            </div>
          )}
        </div>
      </div>
      <div className="space-y-6">
        {meals.map((meal: any, idx: number) => {
          const style = getMealStyle(meal.name);
          return (
            <div key={idx} className={`rounded-3xl border ${style.color} overflow-hidden shadow-lg transition-transform hover:scale-[1.01]`}>
              <div className="bg-zinc-900/80 px-6 py-4 border-b border-zinc-800/50 flex items-center gap-4">
                <div className="p-3 bg-zinc-950 rounded-2xl shadow-inner border border-zinc-800/50">{style.icon}</div>
                <h3 className="text-xl font-black text-white uppercase tracking-wider">{meal.name}</h3>
              </div>
              <div className="p-6 bg-zinc-950/80">
                <p className="text-zinc-300 text-[15px] whitespace-pre-wrap leading-relaxed font-medium">{meal.items}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}