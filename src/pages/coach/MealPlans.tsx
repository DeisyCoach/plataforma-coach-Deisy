import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase/client';
import { useAuth } from '../../providers/AuthProvider';
import { Utensils, Plus, Trash2, Apple, Edit3, Save } from 'lucide-react';

export function MealPlans() {
  const { user } = useAuth();
  const isCoach = user?.email === 'coach@plataforma.com';

  const [masterPlans, setMasterPlans] = useState<any[]>([]);
  const [athletes, setAthletes] = useState<any[]>([]);
  const [athleteMeals, setAthleteMeals] = useState<any[]>([]);
  
  const [title, setTitle] = useState('');
  const [calories, setCalories] = useState('');
  const [meals, setMeals] = useState([{ time: 'Desayuno', name: '', details: '' }, { time: 'Almuerzo', name: '', details: '' }, { time: 'Cena', name: '', details: '' }]);

  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [selectedAthleteId, setSelectedAthleteId] = useState('');
  const [editingClone, setEditingClone] = useState<any>(null);

  useEffect(() => { fetchData(); }, [user]);

  const fetchData = async () => {
    if (isCoach) {
      const { data: plansData } = await supabase.from('meal_plans').select('*').order('created_at', { ascending: false });
      const { data: athletesData } = await supabase.from('athletes').select('*').order('full_name');
      const { data: clonesData } = await supabase.from('athlete_meals').select('*, athletes(full_name)').order('created_at', { ascending: false });
      setMasterPlans(plansData || []); setAthletes(athletesData || []); setAthleteMeals(clonesData || []);
    } else {
      const { data: athlete } = await supabase.from('athletes').select('id').eq('email', user?.email).single();
      if (athlete) {
        const { data: myMeals } = await supabase.from('athlete_meals').select('*').eq('athlete_id', athlete.id);
        setAthleteMeals(myMeals || []);
      }
    }
  };

  const addMealField = () => setMeals([...meals, { time: 'Snack', name: '', details: '' }]);
  const handleMealChange = (index: number, field: string, value: string) => {
    const updated = [...meals];
    updated[index] = { ...updated[index], [field]: value };
    setMeals(updated);
  };
  const removeMealField = (index: number) => setMeals(meals.filter((_, i) => i !== index));

  const handleCreateMaster = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return alert('Ingresa un título.');
    const { error } = await supabase.from('meal_plans').insert([{ title, calories: parseInt(calories) || 0, meals: JSON.stringify(meals) }]);
    if (!error) {
      setTitle(''); setCalories(''); setMeals([{ time: 'Desayuno', name: '', details: '' }, { time: 'Almuerzo', name: '', details: '' }, { time: 'Cena', name: '', details: '' }]);
      fetchData();
    }
  };

  const handleAssignPlan = async () => {
    if (!selectedPlan || !selectedAthleteId) return alert('Selecciona un atleta y un plan.');
    
    let parsedMeals = [];
    if (typeof selectedPlan.meals === 'string') {
      parsedMeals = JSON.parse(selectedPlan.meals);
    } else {
      parsedMeals = selectedPlan.meals;
    }

    await supabase.from('athlete_meals').delete().eq('athlete_id', selectedAthleteId);
    
    const { error } = await supabase.from('athlete_meals').insert([{
      athlete_id: selectedAthleteId, 
      title: selectedPlan.title, 
      description: selectedPlan.description || '',
      calories: selectedPlan.calories || 0, 
      meals: parsedMeals
    }]);

    if (error) {
      console.error(error);
      alert('Error al asignar la dieta: ' + error.message);
    } else {
      alert('¡Dieta asignada exitosamente!');
      setSelectedPlan(null); 
      fetchData();
    }
  };

  const saveIndividualEdit = async () => {
    if (!editingClone) return;
    const { error } = await supabase.from('athlete_meals').update({
      title: editingClone.title, calories: editingClone.calories, meals: JSON.stringify(editingClone.mealsParsed)
    }).eq('id', editingClone.id);
    if (!error) { setEditingClone(null); fetchData(); }
  };

  const handleEditCloneMeal = (index: number, field: string, value: string) => {
    const updatedMeals = [...editingClone.mealsParsed];
    updatedMeals[index] = { ...updatedMeals[index], [field]: value };
    setEditingClone({ ...editingClone, mealsParsed: updatedMeals });
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-black text-white flex items-center gap-2">
          <Utensils className="w-7 h-7 text-amber-400" /> {isCoach ? 'Gestión Nutricional' : 'Mi Plan Nutricional'}
        </h2>
      </div>

      {isCoach ? (
        <div className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="bg-zinc-950 p-6 rounded-2xl border border-zinc-800 space-y-4">
              <h3 className="font-bold text-white flex items-center gap-2 border-b border-zinc-800 pb-3"><Apple className="w-5 h-5 text-amber-400" /> Nueva Plantilla Master</h3>
              <form onSubmit={handleCreateMaster} className="space-y-4">
                <input type="text" placeholder="Título (Ej. Volumen 3000kcal)" value={title} onChange={e => setTitle(e.target.value)} className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500" />
                <input type="number" placeholder="Calorías" value={calories} onChange={e => setCalories(e.target.value)} className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500" />
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-zinc-400 uppercase">Comidas</label>
                    <button type="button" onClick={addMealField} className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1"><Plus className="w-3 h-3"/> Añadir</button>
                  </div>
                  {meals.map((m, i) => (
                    <div key={i} className="bg-zinc-900 p-2 rounded-lg border border-zinc-800 space-y-2">
                      <div className="flex gap-2">
                        <input type="text" placeholder="Tiempo" value={m.time} onChange={e => handleMealChange(i, 'time', e.target.value)} className="w-1/3 bg-zinc-950 border border-zinc-700 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-amber-500" />
                        <input type="text" placeholder="Plato" value={m.name} onChange={e => handleMealChange(i, 'name', e.target.value)} className="w-2/3 bg-zinc-950 border border-zinc-700 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-amber-500" />
                      </div>
                      <div className="flex gap-2 items-start">
                        {/* 🚨 AQUÍ EL CAMBIO A TEXTAREA PARA LA MASTER */}
                        <textarea rows={3} placeholder="Alimentos (Usa 'Enter' para lista)" value={m.details} onChange={e => handleMealChange(i, 'details', e.target.value)} className="w-full bg-zinc-950 border border-zinc-700 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-amber-500 resize-none" />
                        {meals.length > 1 && <button type="button" onClick={() => removeMealField(i)} className="text-red-400 mt-1"><Trash2 className="w-4 h-4"/></button>}
                      </div>
                    </div>
                  ))}
                </div>
                <button type="submit" className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-black rounded-xl font-bold text-sm transition-colors shadow-lg shadow-amber-500/20">Guardar Plantilla</button>
              </form>
            </div>

            <div className="lg:col-span-2 space-y-4">
              <h3 className="font-bold text-white text-lg">Plantillas Disponibles</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {masterPlans.map(plan => (
                  <div key={plan.id} className="bg-zinc-950 rounded-2xl border border-zinc-800 p-5 space-y-4">
                    <h4 className="font-bold text-amber-400">{plan.title}</h4>
                    <button onClick={() => setSelectedPlan(plan)} className="w-full py-2 bg-amber-500/10 hover:bg-amber-500 hover:text-black border border-amber-500/50 text-amber-500 rounded-xl text-xs font-bold transition-colors">
                      Asignar (Clonar) a Atleta
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-zinc-800">
            <h3 className="font-bold text-white text-lg mb-4">Dietas Activas (Edición Individual)</h3>
            <div className="grid grid-cols-1 gap-4">
              {athleteMeals.map(clone => {
                const isEditing = editingClone?.id === clone.id;
                const parsedMeals = typeof clone.meals === 'string' ? JSON.parse(clone.meals) : clone.meals;
                
                return (
                  <div key={clone.id} className="bg-zinc-900 p-5 rounded-2xl border border-zinc-800">
                    <div className="flex justify-between items-start mb-3 border-b border-zinc-800 pb-2">
                      <div>
                        <span className="text-xs text-amber-500 font-bold uppercase tracking-wider">{clone.athletes?.full_name}</span>
                        {isEditing ? (
                          <input type="text" value={editingClone.title} onChange={e => setEditingClone({...editingClone, title: e.target.value})} className="block w-full mt-1 bg-zinc-950 border border-zinc-700 rounded p-1 text-white text-sm focus:outline-none focus:border-amber-500" />
                        ) : (
                          <h4 className="font-bold text-white text-lg">{clone.title}</h4>
                        )}
                      </div>
                      {isEditing ? (
                        <button onClick={saveIndividualEdit} className="text-emerald-400 bg-emerald-400/10 p-2 rounded-lg flex items-center gap-1 hover:bg-emerald-400/20"><Save className="w-4 h-4"/> Guardar Atleta</button>
                      ) : (
                        <button onClick={() => setEditingClone({ ...clone, mealsParsed: parsedMeals })} className="text-amber-400 bg-amber-400/10 p-2 rounded-lg flex items-center gap-1 hover:bg-amber-400/20"><Edit3 className="w-4 h-4"/> Editar Individual</button>
                      )}
                    </div>

                    {isEditing ? (
                      <div className="space-y-3 mt-2">
                        {editingClone.mealsParsed.map((m: any, i: number) => (
                          <div key={i} className="flex flex-col gap-2 bg-zinc-950 p-3 rounded-lg border border-zinc-800">
                            <div className="flex gap-2">
                              <input type="text" value={m.time} onChange={e => handleEditCloneMeal(i, 'time', e.target.value)} className="w-1/3 bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-amber-500" />
                              <input type="text" value={m.name} onChange={e => handleEditCloneMeal(i, 'name', e.target.value)} className="w-2/3 bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-amber-500" />
                            </div>
                            {/* 🚨 AQUÍ EL CAMBIO A TEXTAREA PARA LA EDICIÓN INDIVIDUAL */}
                            <textarea rows={3} value={m.details} onChange={e => handleEditCloneMeal(i, 'details', e.target.value)} className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-amber-500 resize-none" placeholder="Alimentos (Usa 'Enter' para lista)" />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3">
                        {parsedMeals.map((m: any, i: number) => (
                          <div key={i} className="bg-zinc-950 p-3 rounded-xl border border-zinc-800">
                             <div className="flex items-center gap-2 mb-1">
                                <span className="font-bold text-xs text-amber-500 uppercase">{m.time}</span>
                                <span className="text-sm font-bold text-white">{m.name}</span>
                             </div>
                             {/* 🚨 AQUÍ EL CAMBIO PARA QUE RECONOZCA LOS SALTOS DE LÍNEA: whitespace-pre-wrap */}
                             <p className="text-xs text-zinc-400 whitespace-pre-wrap">{m.details}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {athleteMeals.map(plan => {
            const parsedMeals = typeof plan.meals === 'string' ? JSON.parse(plan.meals) : plan.meals;
            return (
              <div key={plan.id} className="bg-zinc-950 rounded-2xl border border-zinc-800 p-6 space-y-4 shadow-lg">
                <h3 className="text-xl font-bold text-amber-400">{plan.title}</h3>
                <div className="space-y-3">
                  {parsedMeals.map((m: any, idx: number) => (
                    <div key={idx} className="p-4 bg-zinc-900 rounded-xl border border-zinc-800">
                      <span className="font-bold text-xs text-amber-500 uppercase">{m.time}</span>
                      <h5 className="font-bold text-white text-base mt-1 mb-2">{m.name}</h5>
                      {/* 🚨 Y AQUÍ PARA EL ATLETA FINAL: whitespace-pre-wrap */}
                      <p className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed">{m.details}</p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedPlan && isCoach && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-950 rounded-2xl border border-zinc-800 max-w-md w-full p-6 space-y-4">
            <h3 className="font-bold text-lg text-white">Clonar Dieta a Atleta</h3>
            <select value={selectedAthleteId} onChange={(e) => setSelectedAthleteId(e.target.value)} className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-amber-500">
              <option value="">-- Selecciona Atleta --</option>
              {athletes.map(a => <option key={a.id} value={a.id}>{a.full_name}</option>)}
            </select>
            <div className="flex gap-2">
              <button onClick={() => setSelectedPlan(null)} className="w-1/2 py-2 bg-zinc-900 text-zinc-400 rounded-xl hover:bg-zinc-800">Cancelar</button>
              <button onClick={handleAssignPlan} className="w-1/2 py-2 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl shadow-lg shadow-amber-500/20">Asignar Dieta</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}