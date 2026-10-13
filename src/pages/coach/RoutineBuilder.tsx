import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase/client';
import { ArrowLeft, Plus, Save, Trash2, Video, Edit3, ArrowUp, ArrowDown } from 'lucide-react';

export function RoutineBuilder() {
  const { id } = useParams();
  
  const [routine, setRoutine] = useState<any>(null);
  const [exercises, setExercises] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchRoutine = async () => {
      try {
        const { data, error } = await supabase
          .from('routines')
          .select('*')
          .eq('id', id)
          .single();

        if (error) throw error;
        setRoutine(data);
        
        const parsedExercises = typeof data.exercises === 'string' 
          ? JSON.parse(data.exercises) 
          : (data.exercises || []);
        
        setExercises(parsedExercises);
      } catch (error) {
        console.error('Error al cargar la rutina:', error);
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchRoutine();
  }, [id]);

  const addExercise = () => {
    setExercises([
      ...exercises,
      {
        id: crypto.randomUUID(),
        name: '',
        sets: '',
        reps: '',
        rest: '',
        notes: '',
        video_url: ''
      }
    ]);
  };

  const updateExercise = (index: number, field: string, value: string) => {
    const newExercises = [...exercises];
    newExercises[index] = { ...newExercises[index], [field]: value };
    setExercises(newExercises);
  };

  const removeExercise = (index: number) => {
    const newExercises = exercises.filter((_, i) => i !== index);
    setExercises(newExercises);
  };

  const moveExerciseUp = (index: number) => {
    if (index === 0) return;
    const newExercises = [...exercises];
    const temp = newExercises[index - 1];
    newExercises[index - 1] = newExercises[index];
    newExercises[index] = temp;
    setExercises(newExercises);
  };

  const moveExerciseDown = (index: number) => {
    if (index === exercises.length - 1) return;
    const newExercises = [...exercises];
    const temp = newExercises[index + 1];
    newExercises[index + 1] = newExercises[index];
    newExercises[index] = temp;
    setExercises(newExercises);
  };

  const handleSave = async () => {
    if (!routine.name.trim()) return alert('El nombre de la rutina no puede estar vacío');
    setSaving(true);
    try {
      const { error } = await supabase
        .from('routines')
        .update({ 
          name: routine.name,
          description: routine.description,
          exercises: exercises 
        })
        .eq('id', id);

      if (error) throw error;
      alert('¡Rutina actualizada con éxito!');
    } catch (error) {
      console.error('Error guardando la rutina:', error);
      alert('Hubo un error al guardar.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64 text-amber-500 font-bold">Cargando constructor de rutinas...</div>;
  }

  if (!routine) {
    return <div className="p-8 text-red-500 font-medium">No se encontró la rutina.</div>;
  }

  return (
    <div className="space-y-6">
      {/* HEADER EDITABLE */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-zinc-950 p-6 rounded-2xl border border-zinc-800 shadow-2xl gap-4">
        <div className="flex items-start sm:items-center gap-4 w-full">
          <Link 
            to="/coach/routines" 
            className="p-2.5 bg-zinc-900 rounded-xl border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors shrink-0"
            title="Volver a mis rutinas"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          
          <div className="flex-1 w-full relative group">
            <div className="absolute -left-6 top-2 text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity hidden sm:block">
              <Edit3 className="w-4 h-4" />
            </div>
            <input 
              type="text"
              value={routine.name || ''}
              onChange={(e) => setRoutine({ ...routine, name: e.target.value })}
              placeholder="Nombre de la rutina"
              className="text-2xl font-black text-white bg-transparent border-b border-transparent hover:border-zinc-800 focus:border-amber-500 focus:outline-none w-full transition-colors px-1 py-0.5"
            />
            <input 
              type="text"
              value={routine.description || ''}
              onChange={(e) => setRoutine({ ...routine, description: e.target.value })}
              placeholder="Descripción corta (Opcional)"
              className="text-zinc-400 text-sm bg-transparent border-b border-transparent hover:border-zinc-800 focus:border-amber-500 focus:outline-none w-full transition-colors px-1 mt-1 py-0.5"
            />
          </div>
        </div>
        
        <button 
          onClick={handleSave}
          disabled={saving}
          className="flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-black font-black px-6 py-3 rounded-xl transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50 shrink-0 w-full sm:w-auto"
        >
          <Save className="w-5 h-5" />
          {saving ? 'Guardando...' : 'Guardar Cambios'}
        </button>
      </div>

      {/* LISTA DE EJERCICIOS */}
      <div className="space-y-4">
        {exercises.length === 0 ? (
          <div className="bg-zinc-950 p-12 rounded-2xl border border-zinc-800 text-center flex flex-col items-center">
            <p className="text-zinc-500 mb-4 text-lg font-medium">Esta rutina aún no tiene ejercicios.</p>
            <button 
              onClick={addExercise}
              className="inline-flex items-center gap-2 bg-amber-500/10 text-amber-400 border border-amber-500/30 px-6 py-3 rounded-xl hover:bg-amber-500 hover:text-black transition-all font-bold"
            >
              <Plus className="w-5 h-5" />
              Agregar Primer Ejercicio
            </button>
          </div>
        ) : (
          exercises.map((exercise, index) => (
            <div key={exercise.id || index} className="bg-zinc-950 p-6 rounded-2xl border border-zinc-800 relative group transition-all hover:border-zinc-700 shadow-xl">
              <div className="flex justify-between items-center mb-4 pb-3 border-b border-zinc-800/80">
                <span className="text-xs font-black text-amber-500 uppercase tracking-widest">EJERCICIO {index + 1}</span>
                
                {/* BOTONERA (SUBIR, BAJAR, ELIMINAR) */}
                <div className="flex items-center gap-1 bg-zinc-900 p-1 rounded-xl border border-zinc-800">
                  <button 
                    onClick={() => moveExerciseUp(index)}
                    disabled={index === 0}
                    className="text-zinc-400 hover:text-amber-400 disabled:opacity-30 transition-colors p-1.5 rounded-lg"
                    title="Mover hacia arriba"
                  >
                    <ArrowUp className="w-4 h-4" />
                  </button>
                  
                  <button 
                    onClick={() => moveExerciseDown(index)}
                    disabled={index === exercises.length - 1}
                    className="text-zinc-400 hover:text-amber-400 disabled:opacity-30 transition-colors p-1.5 rounded-lg"
                    title="Mover hacia abajo"
                  >
                    <ArrowDown className="w-4 h-4" />
                  </button>

                  <button 
                    onClick={() => removeExercise(index)}
                    className="text-zinc-500 hover:text-red-400 transition-colors p-1.5 rounded-lg ml-1"
                    title="Eliminar ejercicio"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                {/* Nombre */}
                <div className="lg:col-span-2">
                  <label className="block text-xs font-bold text-zinc-400 mb-1 uppercase tracking-wider">Nombre del Ejercicio</label>
                  <input 
                    type="text" 
                    value={exercise.name || ''}
                    onChange={(e) => updateExercise(index, 'name', e.target.value)}
                    placeholder="Ej. Sentadilla Libre"
                    className="w-full px-4 py-2.5 bg-zinc-900 text-white border border-zinc-800 rounded-xl focus:outline-none focus:border-amber-500 text-sm font-bold transition-all placeholder:text-zinc-600"
                  />
                </div>

                {/* Series */}
                <div>
                  <label className="block text-xs font-bold text-zinc-400 mb-1 uppercase tracking-wider">Series</label>
                  <input 
                    type="text" 
                    value={exercise.sets || ''}
                    onChange={(e) => updateExercise(index, 'sets', e.target.value)}
                    placeholder="Ej. 4"
                    className="w-full px-4 py-2.5 bg-zinc-900 text-white border border-zinc-800 rounded-xl focus:outline-none focus:border-amber-500 text-sm transition-all placeholder:text-zinc-600"
                  />
                </div>

                {/* Reps */}
                <div>
                  <label className="block text-xs font-bold text-zinc-400 mb-1 uppercase tracking-wider">Reps</label>
                  <input 
                    type="text" 
                    value={exercise.reps || ''}
                    onChange={(e) => updateExercise(index, 'reps', e.target.value)}
                    placeholder="Ej. 10-12"
                    className="w-full px-4 py-2.5 bg-zinc-900 text-white border border-zinc-800 rounded-xl focus:outline-none focus:border-amber-500 text-sm transition-all placeholder:text-zinc-600"
                  />
                </div>

                {/* Descanso */}
                <div>
                  <label className="block text-xs font-bold text-zinc-400 mb-1 uppercase tracking-wider">Descanso</label>
                  <input 
                    type="text" 
                    value={exercise.rest || ''}
                    onChange={(e) => updateExercise(index, 'rest', e.target.value)}
                    placeholder="Ej. 90s"
                    className="w-full px-4 py-2.5 bg-zinc-900 text-white border border-zinc-800 rounded-xl focus:outline-none focus:border-amber-500 text-sm transition-all placeholder:text-zinc-600"
                  />
                </div>

                {/* Enlace de YouTube */}
                <div className="lg:col-span-5">
                  <label className="block text-xs font-bold text-red-400 mb-1 uppercase tracking-wider flex items-center gap-1.5">
                    <Video className="w-3.5 h-3.5" /> Enlace de Video (YouTube)
                  </label>
                  <input 
                    type="url" 
                    value={exercise.video_url || ''}
                    onChange={(e) => updateExercise(index, 'video_url', e.target.value)}
                    placeholder="Ej. https://www.youtube.com/watch?v=..."
                    className="w-full px-4 py-2.5 bg-zinc-900 text-white border border-red-500/30 rounded-xl focus:outline-none focus:border-red-500 text-sm transition-all placeholder:text-zinc-600"
                  />
                </div>

                {/* Notas Adicionales */}
                <div className="lg:col-span-5">
                  <label className="block text-xs font-bold text-amber-500 mb-1 uppercase tracking-wider">Notas de Ejecución</label>
                  <input 
                    type="text" 
                    value={exercise.notes || ''}
                    onChange={(e) => updateExercise(index, 'notes', e.target.value)}
                    placeholder="Notas adicionales (Ej. Bajar lento en 3 segundos, exhalar al subir...)"
                    className="w-full px-4 py-2.5 bg-zinc-900 text-white border border-amber-500/30 rounded-xl focus:outline-none focus:border-amber-500 text-sm transition-all placeholder:text-zinc-600"
                  />
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {exercises.length > 0 && (
        <button 
          onClick={addExercise}
          className="w-full py-4 border-2 border-dashed border-zinc-800 rounded-2xl text-zinc-400 hover:text-amber-400 hover:border-amber-500 hover:bg-amber-500/5 transition-all font-bold flex items-center justify-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Añadir otro ejercicio
        </button>
      )}
    </div>
  );
}