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
      setLoading(true);
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
    if (user) {
      fetchRoutines();
    }
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return alert('No hay sesión activa');
    
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
    if (!user) return alert('No hay sesión activa');
    
    try {
      const { error } = await supabase.from('routines').insert([
        {
          coach_id: user.id,
          name: `${routine.name} (Copia)`,
          description: routine.description,
          exercises: routine.exercises
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

  const filteredRoutines = routines.filter(routine => 
    routine.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    routine.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 relative">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-zinc-800 pb-4">
        <div>
          <h2 className="text-2xl font-black text-white">Mis Rutinas y Plantillas</h2>
          <p className="text-zinc-400 text-sm mt-1">Crea plantillas genéricas o diseña planes específicos para tus atletas.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-black font-bold px-4 py-2.5 rounded-xl transition-colors shadow-lg shadow-amber-500/20"
        >
          <Plus className="w-5 h-5" />
          Crear Rutina
        </button>
      </div>

      {/* BUSCADOR */}
      <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800 flex items-center gap-3 focus-within:border-amber-500 transition-all">
        <Search className="w-5 h-5 text-zinc-500" />
        <input 
          type="text" 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar rutina o plantilla por nombre..." 
          className="flex-1 outline-none text-sm text-white bg-transparent placeholder:text-zinc-600"
        />
        {searchTerm && (
          <button onClick={() => setSearchTerm('')} className="text-zinc-500 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* GRILLA DE RUTINAS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <p className="text-amber-500 font-bold col-span-full text-center py-12">Cargando rutinas...</p>
        ) : filteredRoutines.length === 0 ? (
          <div className="col-span-full bg-zinc-950 p-12 rounded-2xl border border-zinc-800 text-center">
            <Dumbbell className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
            <p className="text-zinc-500">No se encontraron rutinas. ¡Diseña la primera!</p>
          </div>
        ) : (
          filteredRoutines.map((routine) => {
            const exerciseCount = typeof routine.exercises === 'string' 
              ? JSON.parse(routine.exercises).length 
              : (routine.exercises?.length || 0);

            return (
              <div key={routine.id} className="bg-zinc-950 p-6 rounded-2xl border border-zinc-800 hover:border-zinc-700 transition-all shadow-xl flex flex-col h-full group">
                <div className="flex-1">
                  <h3 className="font-bold text-lg text-white group-hover:text-amber-400 transition-colors">{routine.name}</h3>
                  <p className="text-sm text-zinc-400 mt-2 line-clamp-2">{routine.description || 'Sin descripción'}</p>
                </div>
                
                <div className="mt-4 pt-4 border-t border-zinc-900 flex justify-between items-center">
                  <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-3 py-1 rounded-lg border border-amber-500/20">
                    {exerciseCount} Ejercicios
                  </span>
                  
                  <div className="flex items-center gap-1.5">
                    <button 
                      onClick={() => handleDuplicate(routine)}
                      className="p-2 text-zinc-500 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors"
                      title="Duplicar como plantilla"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleDelete(routine.id)}
                      className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                      title="Eliminar rutina"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <div className="w-px h-4 bg-zinc-800 mx-1"></div>
                    <Link 
                      to={`/coach/routines/${routine.id}`}
                      className="flex items-center gap-1.5 text-xs text-amber-500 hover:text-black hover:bg-amber-500 font-bold transition-all p-2 rounded-lg border border-amber-500/30"
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
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-zinc-800">
              <h3 className="text-lg font-bold text-white">Crear Nueva Rutina</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-zinc-500 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Nombre de la rutina</label>
                <input 
                  type="text" 
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-4 py-2.5 bg-zinc-900 border border-zinc-800 text-white rounded-xl focus:outline-none focus:border-amber-500 transition-all text-sm"
                  placeholder="Ej. Plantilla Base - Pierna y Glúteo"
                />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Descripción</label>
                <textarea 
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full px-4 py-2.5 bg-zinc-900 border border-zinc-800 text-white rounded-xl focus:outline-none focus:border-amber-500 resize-none h-24 transition-all text-sm"
                  placeholder="Ej. Enfoque en hipertrofia de cuádriceps..."
                />
              </div>

              <div className="pt-4 flex gap-3 border-t border-zinc-800/80">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2.5 bg-zinc-900 text-zinc-400 font-bold rounded-xl hover:bg-zinc-800 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={saving}
                  className="flex-1 px-4 py-2.5 bg-amber-500 text-black rounded-xl font-bold hover:bg-amber-400 transition-colors disabled:opacity-50"
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