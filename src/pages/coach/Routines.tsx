import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Dumbbell, Search, Plus, X, Copy, Trash2, Edit3 } from 'lucide-react';
import { supabase } from '../../lib/supabase/client';
import { useAuth } from '../../providers/AuthProvider';

export function Routines() {
  const { user } = useAuth();
  const [routines, setRoutines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });

  const fetchRoutines = async () => {
    try {
      const { data, error } = await supabase
        .from('routines')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRoutines(data || []);
    } catch (error) {
      console.error('Error cargando rutinas:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoutines();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setSaving(true);
    try {
      const { error } = await supabase.from('routines').insert([
        {
          coach_id: user.id,
          name: formData.name,
          description: formData.description,
          exercises: []
        }
      ]);

      if (error) throw error;

      setIsModalOpen(false);
      setFormData({ name: '', description: '' });
      fetchRoutines();
    } catch (error) {
      console.error('Error guardando rutina:', error);
      alert('Hubo un error al guardar la rutina.');
    } finally {
      setSaving(false);
    }
  };

  const handleDuplicate = async (routine: any) => {
    if (!user) return;
    
    try {
      // Creamos la copia exacta incluyendo los ejercicios
      const { error } = await supabase.from('routines').insert([
        {
          coach_id: user.id,
          name: `${routine.name} (Copia)`,
          description: routine.description,
          exercises: routine.exercises // Copia todos los ejercicios
        }
      ]);

      if (error) throw error;
      fetchRoutines();
    } catch (error) {
      console.error('Error duplicando rutina:', error);
      alert('Hubo un error al duplicar la rutina.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar esta rutina? Esta acción no se puede deshacer.')) return;

    try {
      const { error } = await supabase.from('routines').delete().eq('id', id);
      if (error) throw error;
      fetchRoutines();
    } catch (error) {
      console.error('Error eliminando rutina:', error);
      alert('Hubo un error al eliminar.');
    }
  };

  // Filtrar rutinas según la barra de búsqueda
  const filteredRoutines = routines.filter(routine => 
    routine.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    routine.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 relative">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Mis Rutinas y Plantillas</h2>
          <p className="text-gray-500 text-sm mt-1">Crea plantillas genéricas o diseña planes específicos para tus atletas.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          <Plus className="w-5 h-5" />
          Crear Rutina
        </button>
      </div>

      {/* BUSCADOR */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-3 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-all">
        <Search className="w-5 h-5 text-gray-400" />
        <input 
          type="text" 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar rutina o plantilla por nombre..." 
          className="flex-1 outline-none text-sm text-gray-900 bg-transparent placeholder:text-gray-400"
        />
        {searchTerm && (
          <button onClick={() => setSearchTerm('')} className="text-gray-400 hover:text-gray-600">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* GRILLA DE RUTINAS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <p className="text-gray-500 col-span-full text-center py-12">Cargando rutinas...</p>
        ) : filteredRoutines.length === 0 ? (
          <div className="col-span-full bg-white p-12 rounded-xl shadow-sm border border-gray-100 text-center">
            <Dumbbell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No se encontraron rutinas. ¡Diseña la primera!</p>
          </div>
        ) : (
          filteredRoutines.map((routine) => {
            const exerciseCount = typeof routine.exercises === 'string' 
              ? JSON.parse(routine.exercises).length 
              : (routine.exercises?.length || 0);

            return (
              <div key={routine.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow flex flex-col h-full">
                <div className="flex-1">
                  <h3 className="font-bold text-lg text-gray-900">{routine.name}</h3>
                  <p className="text-sm text-gray-500 mt-2 line-clamp-2">{routine.description || 'Sin descripción'}</p>
                </div>
                
                <div className="mt-4 pt-4 border-t border-gray-50 flex justify-between items-center">
                  <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md">
                    {exerciseCount} Ejercicios
                  </span>
                  
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => handleDuplicate(routine)}
                      className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                      title="Duplicar como plantilla"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleDelete(routine.id)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Eliminar rutina"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <div className="w-px h-4 bg-gray-200 mx-1"></div>
                    <Link 
                      to={`/coach/routines/${routine.id}`}
                      className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 font-bold transition-colors p-1.5 hover:bg-blue-50 rounded-lg"
                    >
                      <Edit3 className="w-4 h-4" /> Editar
                    </Link>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* MODAL CREAR RUTINA */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">Crear Nueva Rutina</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Nombre de la rutina</label>
                <input 
                  type="text" 
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-200 bg-gray-50 text-gray-900 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  placeholder="Ej. Plantilla Base - Pierna y Glúteo"
                />
              </div>
              
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Descripción</label>
                <textarea 
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-200 bg-gray-50 text-gray-900 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none h-24 transition-all"
                  placeholder="Ej. Enfoque en hipertrofia de cuádriceps..."
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {saving ? 'Guardando...' : 'Guardar Rutina'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}