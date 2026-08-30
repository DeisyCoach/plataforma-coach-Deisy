import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase/client';
import { ArrowLeft, Plus, Save, Trash2, Video, Edit3 } from 'lucide-react';

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
    return <div className="flex justify-center items-center h-64 text-gray-500 font-medium">Cargando constructor...</div>;
  }

  if (!routine) {
    return <div className="p-8 text-red-500 font-medium">No se encontró la rutina.</div>;
  }

  return (
    <div className="space-y-6">
      {/* HEADER EDITABLE */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-white p-4 rounded-xl shadow-sm border border-gray-100 gap-4">
        <div className="flex items-start sm:items-center gap-4 w-full">
          <Link 
            to="/coach/routines" 
            className="p-2 bg-gray-50 rounded-lg border border-gray-200 text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors shrink-0"
            title="Volver a mis rutinas"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          
          <div className="flex-1 w-full relative group">
            <div className="absolute -left-6 top-1.5 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity hidden sm:block">
              <Edit3 className="w-4 h-4" />
            </div>
            <input 
              type="text"
              value={routine.name || ''}
              onChange={(e) => setRoutine({ ...routine, name: e.target.value })}
              placeholder="Nombre de la rutina"
              className="text-xl font-bold text-gray-900 bg-transparent border-b border-transparent hover:border-gray-200 focus:border-blue-500 focus:outline-none w-full transition-colors px-1 py-0.5"
            />
            <input 
              type="text"
              value={routine.description || ''}
              onChange={(e) => setRoutine({ ...routine, description: e.target.value })}
              placeholder="Descripción corta (Opcional)"
              className="text-gray-500 text-sm bg-transparent border-b border-transparent hover:border-gray-200 focus:border-blue-500 focus:outline-none w-full transition-colors px-1 mt-1 py-0.5"
            />
          </div>
        </div>
        
        <button 
          onClick={handleSave}
          disabled={saving}
          className="flex items-center justify-center gap-2 bg-green-600 text-white px-6 py-2.5 rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 shrink-0 w-full sm:w-auto"
        >
          <Save className="w-5 h-5" />
          {saving ? 'Guardando...' : 'Guardar Cambios'}
        </button>
      </div>

      {/* LISTA DE EJERCICIOS */}
      <div className="space-y-4">
        {exercises.length === 0 ? (
          <div className="bg-white p-12 rounded-xl shadow-sm border border-gray-100 text-center flex flex-col items-center">
            <p className="text-gray-500 mb-4 text-lg">Esta rutina aún no tiene ejercicios.</p>
            <button 
              onClick={addExercise}
              className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-6 py-3 rounded-xl hover:bg-blue-100 transition-colors font-semibold"
            >
              <Plus className="w-5 h-5" />
              Agregar Primer Ejercicio
            </button>
          </div>
        ) : (
          exercises.map((exercise, index) => (
            <div key={exercise.id || index} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 relative group transition-all hover:shadow-md">
              <div className="flex justify-between items-center mb-4">
                <span className="text-sm font-bold text-gray-400">EJERCICIO {index + 1}</span>
                <button 
                  onClick={() => removeExercise(index)}
                  className="text-gray-400 hover:text-red-500 transition-colors bg-red-50 p-2 rounded-lg"
                  title="Eliminar ejercicio"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                {/* Nombre */}
                <div className="lg:col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-1 uppercase tracking-wider">Nombre del Ejercicio</label>
                  <input 
                    type="text" 
                    value={exercise.name || ''}
                    onChange={(e) => updateExercise(index, 'name', e.target.value)}
                    placeholder="Ej. Sentadilla Libre"
                    className="w-full px-4 py-2 bg-white text-gray-900 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium transition-all placeholder:text-gray-400"
                  />
                </div>

                {/* Series */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1 uppercase tracking-wider">Series</label>
                  <input 
                    type="text" 
                    value={exercise.sets || ''}
                    onChange={(e) => updateExercise(index, 'sets', e.target.value)}
                    placeholder="Ej. 4"
                    className="w-full px-4 py-2 bg-white text-gray-900 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm transition-all placeholder:text-gray-400"
                  />
                </div>

                {/* Reps */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1 uppercase tracking-wider">Reps</label>
                  <input 
                    type="text" 
                    value={exercise.reps || ''}
                    onChange={(e) => updateExercise(index, 'reps', e.target.value)}
                    placeholder="Ej. 10-12"
                    className="w-full px-4 py-2 bg-white text-gray-900 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm transition-all placeholder:text-gray-400"
                  />
                </div>

                {/* Descanso */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1 uppercase tracking-wider">Descanso</label>
                  <input 
                    type="text" 
                    value={exercise.rest || ''}
                    onChange={(e) => updateExercise(index, 'rest', e.target.value)}
                    placeholder="Ej. 90s"
                    className="w-full px-4 py-2 bg-white text-gray-900 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm transition-all placeholder:text-gray-400"
                  />
                </div>

                {/* Enlace de YouTube */}
                <div className="lg:col-span-5">
                  <label className="block text-xs font-semibold text-gray-700 mb-1 uppercase tracking-wider flex items-center gap-1.5 text-red-600">
                    <Video className="w-3.5 h-3.5" /> Enlace de Video (YouTube)
                  </label>
                  <input 
                    type="url" 
                    value={exercise.video_url || ''}
                    onChange={(e) => updateExercise(index, 'video_url', e.target.value)}
                    placeholder="Ej. https://www.youtube.com/watch?v=..."
                    className="w-full px-4 py-2 bg-red-50/40 text-gray-900 border border-red-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-400 text-sm transition-all placeholder:text-gray-400"
                  />
                </div>

                {/* Notas Adicionales */}
                <div className="lg:col-span-5">
                  <label className="block text-xs font-semibold text-gray-700 mb-1 uppercase tracking-wider">Notas de Ejecución</label>
                  <input 
                    type="text" 
                    value={exercise.notes || ''}
                    onChange={(e) => updateExercise(index, 'notes', e.target.value)}
                    placeholder="Notas adicionales (Ej. Bajar lento en 3 segundos, exhalar al subir...)"
                    className="w-full px-4 py-2 bg-yellow-50 text-gray-900 border border-yellow-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-yellow-400 text-sm transition-all placeholder:text-gray-400"
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
          className="w-full py-4 border-2 border-dashed border-gray-300 rounded-xl text-gray-600 hover:text-blue-600 hover:border-blue-400 hover:bg-blue-50 transition-all font-semibold flex items-center justify-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Añadir otro ejercicio
        </button>
      )}
    </div>
  );
}