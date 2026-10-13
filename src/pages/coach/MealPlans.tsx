import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase/client';
import { useAuth } from '../../providers/AuthProvider';
import { Apple, Trash2, Edit, User, Filter, X, Copy, Plus } from 'lucide-react';

export function MealPlans() {
  const { user } = useAuth();
  const [athletes, setAthletes] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [assignedDiets, setAssignedDiets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedAthleteFilter, setSelectedAthleteFilter] = useState('ALL');

  const [newTitle, setNewTitle] = useState('');
  const [newCalories, setNewCalories] = useState('');
  const [newMeals, setNewMeals] = useState([{ name: 'Desayuno', items: '' }, { name: 'Almuerzo', items: '' }, { name: 'Cena', items: '' }]);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingDiet, setEditingDiet] = useState<any>(null);
  const [editMeals, setEditMeals] = useState<any[]>([]);
  
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedTemplateToAssign, setSelectedTemplateToAssign] = useState<any>(null);
  const [selectedAthleteToAssign, setSelectedAthleteToAssign] = useState('');

  useEffect(() => { 
    if (user) {
      fetchData(); 
    }
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [{ data: aData }, { data: tData }, { data: adData }] = await Promise.all([
        supabase.from('athletes').select('*').order('full_name'),
        supabase.from('meal_plans').select('*').order('created_at', { ascending: false }),
        supabase.from('athlete_meals').select('*, athletes(full_name)').order('created_at', { ascending: false })
      ]);
      
      setAthletes(aData || []);
      setTemplates(tData || []);
      setAssignedDiets(adData || []);
    } catch (error) {
      console.error("Error al cargar datos de nutrición:", error);
    }
    setLoading(false);
  };

  // 🚨 GUARDAR PLANTILLA MÁSTER (Con coach_id)
  const handleSaveMaster = async () => {
    if (!newTitle) return alert('Ponle un título a la plantilla');
    if (!user) return alert('No hay sesión activa');

    const { error } = await supabase.from('meal_plans').insert([{ 
      title: newTitle, 
      calories: newCalories, 
      meals: newMeals,
      coach_id: user.id 
    }]);

    if (!error) {
      alert('Plantilla guardada exitosamente');
      setNewTitle(''); 
      setNewCalories('');
      setNewMeals([{ name: 'Desayuno', items: '' }, { name: 'Almuerzo', items: '' }, { name: 'Cena', items: '' }]);
      fetchData();
    } else {
      alert('Error al guardar plantilla: ' + error.message);
    }
  };

  const handleDeleteMaster = async (id: string) => {
    if (!window.confirm('¿Seguro que deseas eliminar esta plantilla maestra? Esto no afectará a los atletas que ya la tengan.')) return;
    await supabase.from('meal_plans').delete().eq('id', id);
    fetchData();
  };

  // 🚨 ASIGNAR PLANTILLA A ATLETA (Con coach_id)
  const handleAssignTemplate = async () => {
    if (!selectedAthleteToAssign || !selectedTemplateToAssign) return alert('Faltan datos');
    if (!user) return alert('No hay sesión activa');

    const { error } = await supabase.from('athlete_meals').insert([{
      athlete_id: selectedAthleteToAssign,
      template_id: selectedTemplateToAssign.id,
      title: selectedTemplateToAssign.title,
      calories: selectedTemplateToAssign.calories,
      meals: selectedTemplateToAssign.meals,
      coach_id: user.id
    }]);

    if (!error) {
      alert('Dieta asignada al atleta');
      setIsAssignModalOpen(false);
      fetchData();
    } else {
      alert('Error al asignar dieta: ' + error.message);
    }
  };

  const openEditModal = (diet: any) => {
    setEditingDiet(diet);
    const parsed = typeof diet.meals === 'string' ? JSON.parse(diet.meals) : (diet.meals || []);
    
    const normalizedMeals = parsed.map((m: any) => ({
      name: m.time || m.name || '',
      items: m.details || m.items || ''
    }));
    
    setEditMeals(normalizedMeals);
    setIsEditModalOpen(true);
  };

  const handleUpdateEditMeal = (index: number, field: string, value: string) => {
    setEditMeals(prev => prev.map((m, i) => i === index ? { ...m, [field]: value } : m));
  };

  const handleSaveEdit = async () => {
    const { error } = await supabase.from('athlete_meals').update({ meals: editMeals }).eq('id', editingDiet.id);
    if (!error) {
      setIsEditModalOpen(false);
      fetchData();
    } else alert('Error: ' + error.message);
  };

  const handleDeleteAssignedDiet = async (id: string) => {
    if (!window.confirm('¿Seguro que deseas eliminar esta dieta asignada al atleta?')) return;
    await supabase.from('athlete_meals').delete().eq('id', id);
    fetchData();
  };

  const filteredDiets = selectedAthleteFilter === 'ALL' 
    ? assignedDiets 
    : assignedDiets.filter(d => String(d.athlete_id) === String(selectedAthleteFilter));

  if (loading) return <div className="p-8 text-amber-500 font-bold text-center">Cargando Nutrición...</div>;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-1 space-y-6">
        <div className="bg-zinc-950 p-6 rounded-2xl border border-zinc-800">
          <h2 className="text-lg font-black text-white flex items-center gap-2 mb-6"><Apple className="text-emerald-500"/> Nueva Plantilla Master</h2>
          <div className="space-y-4">
            <input type="text" placeholder="Título (Ej. Volumen 3000kcal)" value={newTitle} onChange={e => setNewTitle(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 text-white p-3 rounded-xl outline-none focus:border-emerald-500" />
            <input type="text" placeholder="Calorías" value={newCalories} onChange={e => setNewCalories(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 text-white p-3 rounded-xl outline-none focus:border-emerald-500" />
            <div className="pt-4 border-t border-zinc-800">
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-bold text-zinc-500 uppercase">Comidas</span>
                <button onClick={() => setNewMeals([...newMeals, { name: 'Comida', items: '' }])} className="text-emerald-500 text-xs font-bold hover:text-emerald-400">+ Añadir</button>
              </div>
              <div className="space-y-3 max-h-[40vh] overflow-y-auto custom-scrollbar pr-2">
                {newMeals.map((meal, idx) => (
                  <div key={idx} className="bg-zinc-900 p-3 rounded-xl border border-zinc-800 relative">
                    <input type="text" value={meal.name} onChange={e => setNewMeals(newMeals.map((m, i) => i === idx ? { ...m, name: e.target.value } : m))} className="w-full bg-transparent text-sm font-bold text-emerald-400 outline-none mb-2" placeholder="Nombre (Ej. Ayuno)" />
                    <textarea value={meal.items} onChange={e => setNewMeals(newMeals.map((m, i) => i === idx ? { ...m, items: e.target.value } : m))} className="w-full bg-zinc-950 border border-zinc-800 text-sm text-zinc-300 p-2 rounded-lg outline-none min-h-[80px]" placeholder="Alimentos (Usa Enter para lista)" />
                    <button onClick={() => setNewMeals(newMeals.filter((_, i) => i !== idx))} className="absolute top-3 right-3 text-zinc-600 hover:text-red-500"><Trash2 className="w-4 h-4"/></button>
                  </div>
                ))}
              </div>
            </div>
            <button onClick={handleSaveMaster} className="w-full py-3 bg-amber-500 text-black font-black uppercase rounded-xl hover:bg-amber-400 transition-colors mt-4">Guardar Plantilla</button>
          </div>
        </div>
      </div>

      <div className="lg:col-span-2 space-y-10">
        <div>
          <h2 className="text-lg font-black text-white mb-4">Plantillas Disponibles</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {templates.map(t => (
              <div key={t.id} className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 relative group transition-all hover:border-amber-500/30">
                <h3 className="font-black text-amber-500 text-lg mb-1 pr-6">{t.title}</h3>
                {t.calories && <p className="text-xs text-zinc-400 font-bold mb-4">{t.calories} kcal</p>}
                <button onClick={() => handleDeleteMaster(t.id)} className="absolute top-4 right-4 text-zinc-600 hover:text-red-500 transition-colors" title="Eliminar Plantilla"><Trash2 className="w-4 h-4"/></button>
                <button onClick={() => { setSelectedTemplateToAssign(t); setIsAssignModalOpen(true); }} className="w-full py-2 bg-amber-500/10 text-amber-500 font-bold rounded-lg border border-amber-500/30 hover:bg-amber-500 hover:text-black transition-colors flex justify-center items-center gap-2"><Copy className="w-4 h-4"/> Asignar a Atleta</button>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-2 border-b border-zinc-800">
            <h2 className="text-lg font-black text-white">Dietas Activas</h2>
            <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2">
              <Filter className="w-4 h-4 text-emerald-500" />
              <select value={selectedAthleteFilter} onChange={e => setSelectedAthleteFilter(e.target.value)} className="bg-zinc-900 text-white font-bold text-sm outline-none cursor-pointer">
                <option value="ALL" className="bg-zinc-900">Todos los atletas</option>
                {athletes.map(a => <option key={a.id} value={a.id} className="bg-zinc-900">{a.full_name}</option>)}
              </select>
            </div>
          </div>
          <div className="space-y-4">
            {filteredDiets.map(diet => (
              <div key={diet.id} className="bg-zinc-950 p-5 rounded-xl border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-black text-amber-500 uppercase tracking-widest mb-1 flex items-center gap-1.5"><User className="w-3 h-3"/> {diet.athletes?.full_name}</p>
                  <h3 className="font-bold text-white text-lg">{diet.title}</h3>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => handleDeleteAssignedDiet(diet.id)} className="p-2.5 bg-zinc-900 text-zinc-500 hover:text-red-500 rounded-lg border border-zinc-800 transition-colors" title="Eliminar Dieta">
                    <Trash2 className="w-4 h-4"/>
                  </button>
                  <button onClick={() => openEditModal(diet)} className="py-2 px-4 bg-zinc-900 text-amber-500 font-bold rounded-lg border border-zinc-800 hover:border-amber-500 transition-colors flex items-center gap-2">
                    <Edit className="w-4 h-4"/> Editar Individual
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {isAssignModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-950 rounded-2xl border border-zinc-800 w-full max-w-sm p-6">
            <h3 className="font-bold text-white mb-2">Asignar a Atleta</h3>
            <p className="text-sm text-amber-500 mb-4 font-bold">{selectedTemplateToAssign?.title}</p>
            <select value={selectedAthleteToAssign} onChange={e => setSelectedAthleteToAssign(e.target.value)} className="w-full px-3 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white outline-none focus:border-amber-500 mb-4">
              <option value="">-- Selecciona el Atleta --</option>
              {athletes.map(a => <option key={a.id} value={a.id}>{a.full_name}</option>)}
            </select>
            <div className="flex gap-2">
              <button onClick={() => setIsAssignModalOpen(false)} className="w-1/2 py-2.5 bg-zinc-900 text-zinc-400 font-bold rounded-xl">Cancelar</button>
              <button onClick={handleAssignTemplate} className="w-1/2 py-2.5 bg-amber-500 text-black font-bold rounded-xl">Asignar</button>
            </div>
          </div>
        </div>
      )}

      {isEditModalOpen && editingDiet && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-950 rounded-2xl border border-zinc-800 w-full max-w-2xl p-6 flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center mb-4 border-b border-zinc-800 pb-4">
              <div>
                <p className="text-xs font-black text-amber-500 uppercase">{editingDiet.athletes?.full_name}</p>
                <h3 className="font-bold text-white text-lg flex items-center gap-2"><Edit className="w-4 h-4"/> Editar Dieta</h3>
              </div>
              <button onClick={() => setIsEditModalOpen(false)} className="text-zinc-500 hover:text-white"><X className="w-5 h-5"/></button>
            </div>
            <div className="space-y-4 overflow-y-auto pr-2 custom-scrollbar flex-1 mb-4">
              {editMeals.map((meal, idx) => (
                <div key={idx} className="bg-zinc-900 p-4 rounded-xl border border-zinc-800 relative">
                  <button onClick={() => setEditMeals(prev => prev.filter((_, i) => i !== idx))} className="absolute top-4 right-4 text-zinc-500 hover:text-red-500 transition-colors">
                    <Trash2 className="w-5 h-5"/>
                  </button>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Nombre de la Comida</label>
                  <input type="text" value={meal.name} onChange={e => handleUpdateEditMeal(idx, 'name', e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 text-amber-400 font-bold p-2.5 rounded-lg outline-none focus:border-amber-500 mb-3 pr-10" />
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Alimentos / Porciones</label>
                  <textarea value={meal.items} onChange={e => handleUpdateEditMeal(idx, 'items', e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 text-sm text-white p-3 rounded-lg outline-none focus:border-amber-500 min-h-[100px]" />
                </div>
              ))}
              <button onClick={() => setEditMeals(prev => [...prev, { name: 'Nueva Comida', items: '' }])} className="w-full py-4 border-2 border-dashed border-zinc-800 text-zinc-400 font-bold rounded-xl hover:border-amber-500 hover:text-amber-500 transition-colors flex justify-center items-center gap-2">
                <Plus className="w-5 h-5"/> Añadir Otra Comida a este Atleta
              </button>
            </div>
            <button onClick={handleSaveEdit} className="w-full py-3.5 bg-amber-500 text-black font-black uppercase rounded-xl hover:bg-amber-400">Guardar Cambios del Atleta</button>
          </div>
        </div>
      )}
    </div>
  );
}