import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase/client';
import { createClient } from '@supabase/supabase-js';
import { UserPlus, Pencil, Trash2, Search, Dumbbell, Utensils, Pill, PauseCircle, PlayCircle, Key, Eye, EyeOff, X } from 'lucide-react';

export function Athletes() {
  const [athletes, setAthletes] = useState<any[]>([]);
  const [athleteDetails, setAthleteDetails] = useState<any>({});
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal Crear
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newFullName, setNewFullName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Modal Editar
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingAthleteId, setEditingAthleteId] = useState<string | null>(null);
  const [editFullName, setEditFullName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [showEditPassword, setShowEditPassword] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => { fetchAthletesAndDetails(); }, []);

  const fetchAthletesAndDetails = async () => {
    const { data: athletesData } = await supabase.from('athletes').select('*').order('created_at', { ascending: false });
    if (!athletesData) return;
    
    const { data: routines } = await supabase.from('athlete_routines').select('athlete_id');
    const { data: meals } = await supabase.from('athlete_meals').select('athlete_id, title');
    const { data: supps } = await supabase.from('athlete_supplements').select('athlete_id');

    const detailsMap: any = {};
    athletesData.forEach(ath => {
      detailsMap[ath.id] = {
        rutinas: routines?.filter(r => r.athlete_id === ath.id).length || 0,
        dieta: meals?.find(m => m.athlete_id === ath.id)?.title || 'Sin dieta',
        suplementos: supps?.filter(s => s.athlete_id === ath.id).length || 0
      };
    });

    setAthleteDetails(detailsMap);
    setAthletes(athletesData);
  };

  // 🚨 CREAR ATLETA NUEVO CON CONTRASEÑA
  const handleAddAthlete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFullName || !newEmail || !newPassword) return alert('Por favor llena todos los campos');
    if (newPassword.length < 6) return alert('La contraseña debe tener al menos 6 caracteres');

    setIsSubmitting(true);

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      if (supabaseUrl && supabaseAnonKey) {
        const tempClient = createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false } });
        await tempClient.auth.signUp({
          email: newEmail,
          password: newPassword,
          options: { data: { full_name: newFullName, role: 'athlete' } }
        });
      }

      const { error: dbError } = await supabase.from('athletes').insert([{ full_name: newFullName, email: newEmail }]);

      if (!dbError) {
        alert(`¡Atleta creado exitosamente!\n\nEmail: ${newEmail}\nContraseña: ${newPassword}`);
        setNewFullName('');
        setNewEmail('');
        setNewPassword('');
        setIsAddModalOpen(false);
        fetchAthletesAndDetails();
      } else {
        alert('Error en base de datos: ' + dbError.message);
      }
    } catch (err: any) {
      alert('Error inesperado: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 🚨 ABRIR MODAL EDITAR ATLETA
  const openEditModal = (athlete: any) => {
    setEditingAthleteId(athlete.id);
    setEditFullName(athlete.full_name);
    setEditEmail(athlete.email);
    setEditPassword('');
    setIsEditModalOpen(true);
  };

  // 🚨 ACTUALIZAR ATLETA EXISTENTE Y ASIGNAR CONTRASEÑA
  const handleUpdateAthlete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAthleteId || !editFullName || !editEmail) return alert('Llena los campos obligatorios');

    setIsSubmitting(true);

    try {
      // 1. Actualizar datos en la tabla principal
      const { error: dbError } = await supabase
        .from('athletes')
        .update({ full_name: editFullName, email: editEmail })
        .eq('id', editingAthleteId);

      if (dbError) throw dbError;

      // 2. Si se ingresó una contraseña, crear/actualizar su cuenta de Auth
      if (editPassword.trim().length > 0) {
        if (editPassword.length < 6) return alert('La contraseña debe tener al menos 6 caracteres');

        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

        if (supabaseUrl && supabaseAnonKey) {
          const tempClient = createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false } });
          
          const { error: authError } = await tempClient.auth.signUp({
            email: editEmail,
            password: editPassword,
            options: { data: { full_name: editFullName, role: 'athlete' } }
          });

          // Si el usuario ya existía en Auth, le enviamos un enlace o le confirmamos
          if (authError && authError.message.includes('already registered')) {
            await tempClient.auth.resetPasswordForEmail(editEmail);
            alert(`Los datos de ${editFullName} fueron actualizados.\n\nEl correo ya estaba registrado en el sistema. Se envió un correo de restablecimiento a ${editEmail} para activar la nueva contraseña.`);
          } else {
            alert(`¡Atleta actualizado correctamente!\n\n${editFullName} ahora puede ingresar con:\nCorreo: ${editEmail}\nContraseña: ${editPassword}`);
          }
        }
      } else {
        alert('Datos actualizados correctamente.');
      }

      setIsEditModalOpen(false);
      fetchAthletesAndDetails();
    } catch (err: any) {
      alert('Error al actualizar: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAthlete = async (id: string, name: string) => {
    const confirmDelete = window.confirm(`¿Estás seguro de eliminar a ${name}? Esto borrará TODO su historial, rutinas y dietas para siempre.`);
    if (!confirmDelete) return;

    try {
      await supabase.from('athlete_routines').delete().eq('athlete_id', id);
      await supabase.from('athlete_meals').delete().eq('athlete_id', id);
      await supabase.from('athlete_supplements').delete().eq('athlete_id', id);
      await supabase.from('workout_logs').delete().eq('athlete_id', id);
      await supabase.from('weekly_checkins').delete().eq('athlete_id', id);

      const { error } = await supabase.from('athletes').delete().eq('id', id);
      
      if (!error) {
        alert(`Atleta ${name} eliminado con éxito.`);
        fetchAthletesAndDetails();
      } else {
        alert('No se pudo eliminar al atleta: ' + error.message);
      }
    } catch (err: any) {
      alert('Ocurrió un error al limpiar los datos: ' + err.message);
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: boolean, name: string) => {
    const action = currentStatus ? 'PAUSAR' : 'REACTIVAR';
    const confirmToggle = window.confirm(`¿Estás seguro de ${action} a ${name}?`);
    if (!confirmToggle) return;

    const { error } = await supabase.from('athletes').update({ is_active: !currentStatus }).eq('id', id);
    if (!error) {
      fetchAthletesAndDetails();
    } else {
      alert('Error al actualizar estado: ' + error.message);
    }
  };

  const filteredAthletes = athletes.filter(a => 
    a.full_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    a.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black text-white">Mis Atletas</h2>
          <p className="text-zinc-400 text-sm mt-1">Gestiona a tus alumnos, asigna contraseñas y revisa sus avances.</p>
        </div>
        <button onClick={() => setIsAddModalOpen(true)} className="bg-amber-500 hover:bg-amber-400 text-black font-bold py-2.5 px-4 rounded-xl flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-colors">
          <UserPlus className="w-5 h-5" /> Agregar Atleta
        </button>
      </div>

      <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 w-5 h-5" />
          <input 
            type="text" 
            placeholder="Buscar atleta por nombre o correo..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-amber-500"
          />
        </div>
      </div>

      <div className="bg-zinc-950 rounded-2xl border border-zinc-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-zinc-300">
            <thead className="bg-zinc-900 border-b border-zinc-800 text-xs uppercase text-zinc-500 font-bold">
              <tr>
                <th className="px-6 py-4">Atleta</th>
                <th className="px-6 py-4">Rutinas</th>
                <th className="px-6 py-4">Dieta / Sups</th>
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {filteredAthletes.map((athlete) => {
                const isActive = athlete.is_active !== false; 
                
                return (
                <tr key={athlete.id} className={`hover:bg-zinc-900/50 transition-colors ${!isActive ? 'opacity-50' : ''}`}>
                  <td className="px-6 py-4">
                    <div className="font-bold text-white flex items-center gap-2">
                      {athlete.full_name}
                      {!isActive && <span className="text-[9px] uppercase tracking-wider bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full border border-red-500/20">Pausado</span>}
                    </div>
                    <div className="text-xs text-zinc-500">{athlete.email}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="flex items-center gap-1.5 text-xs font-bold text-blue-400 bg-blue-400/10 px-2.5 py-1 rounded-full w-fit">
                      <Dumbbell className="w-3.5 h-3.5" /> {athleteDetails[athlete.id]?.rutinas} Rutinas
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-400/10 px-2.5 py-1 rounded-full w-fit"><Utensils className="w-3.5 h-3.5" /></span>
                      <span className="flex items-center gap-1.5 text-xs font-bold text-amber-400 bg-amber-400/10 px-2.5 py-1 rounded-full w-fit"><Pill className="w-3.5 h-3.5" /></span>
                    </div>
                  </td>
                  <td className="px-6 py-4 flex justify-end gap-2">
                    <button 
                      onClick={() => handleToggleStatus(athlete.id, isActive, athlete.full_name)}
                      className={`p-2 rounded-lg transition-colors shadow-sm ${isActive ? 'text-amber-500 hover:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20' : 'text-emerald-500 hover:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20'}`}
                      title={isActive ? "Congelar Atleta" : "Reactivar Atleta"}
                    >
                      {isActive ? <PauseCircle className="w-4 h-4" /> : <PlayCircle className="w-4 h-4" />}
                    </button>
                    
                    {/* 🚨 BOTÓN EDITAR HABILITADO */}
                    <button 
                      onClick={() => openEditModal(athlete)}
                      className="p-2 text-zinc-400 hover:text-white bg-zinc-900 rounded-lg transition-colors"
                      title="Editar Datos / Asignar Contraseña"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>

                    <button 
                      onClick={() => handleDeleteAthlete(athlete.id, athlete.full_name)} 
                      className="p-2 text-zinc-400 hover:text-red-400 bg-zinc-900 rounded-lg transition-colors"
                      title="Eliminar Atleta"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              )})}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL CREAR ATLETA */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleAddAthlete} className="bg-zinc-950 rounded-2xl border border-zinc-800 max-w-sm w-full p-6 space-y-4 shadow-2xl">
            <h3 className="font-bold text-lg text-white flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-amber-500" /> Agregar Nuevo Atleta
            </h3>
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Nombre Completo</label>
              <input type="text" value={newFullName} onChange={e => setNewFullName(e.target.value)} className="w-full px-3 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-white focus:border-amber-500 outline-none" placeholder="Ej. Juan Pérez" required />
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Correo Electrónico</label>
              <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} className="w-full px-3 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-white focus:border-amber-500 outline-none" placeholder="ejemplo@gmail.com" required />
            </div>
            <div>
              <label className="block text-xs font-bold text-amber-500 uppercase mb-1 flex items-center gap-1">
                <Key className="w-3.5 h-3.5" /> Contraseña de Acceso
              </label>
              <div className="relative">
                <input type={showPassword ? "text" : "password"} value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full px-3 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-white focus:border-amber-500 outline-none pr-10" placeholder="Mínimo 6 caracteres" required />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="flex gap-2 pt-2 border-t border-zinc-800/80">
              <button type="button" onClick={() => setIsAddModalOpen(false)} className="w-1/2 py-2.5 bg-zinc-900 text-zinc-400 font-bold rounded-xl hover:bg-zinc-800" disabled={isSubmitting}>Cancelar</button>
              <button type="submit" className="w-1/2 py-2.5 bg-amber-500 text-black font-bold rounded-xl hover:bg-amber-400 disabled:opacity-50" disabled={isSubmitting}>{isSubmitting ? 'Guardando...' : 'Guardar Atleta'}</button>
            </div>
          </form>
        </div>
      )}

      {/* 🚨 MODAL EDITAR ATLETA Y DEFINIR CONTRASEÑA */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleUpdateAthlete} className="bg-zinc-950 rounded-2xl border border-zinc-800 max-w-sm w-full p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-lg text-white flex items-center gap-2">
                <Pencil className="w-5 h-5 text-amber-500" /> Editar Atleta
              </h3>
              <button type="button" onClick={() => setIsEditModalOpen(false)} className="text-zinc-500 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Nombre Completo</label>
              <input type="text" value={editFullName} onChange={e => setEditFullName(e.target.value)} className="w-full px-3 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-white focus:border-amber-500 outline-none" required />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Correo Electrónico</label>
              <input type="email" value={editEmail} onChange={e => setEditEmail(e.target.value)} className="w-full px-3 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-white focus:border-amber-500 outline-none" required />
            </div>

            <div className="border-t border-zinc-800/80 pt-3">
              <label className="block text-xs font-bold text-amber-500 uppercase mb-1 flex items-center gap-1">
                <Key className="w-3.5 h-3.5" /> Asignar / Cambiar Contraseña
              </label>
              <div className="relative">
                <input 
                  type={showEditPassword ? "text" : "password"} 
                  value={editPassword} 
                  onChange={e => setEditPassword(e.target.value)} 
                  className="w-full px-3 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-white focus:border-amber-500 outline-none pr-10 text-sm" 
                  placeholder="Escribe la clave para este atleta" 
                />
                <button type="button" onClick={() => setShowEditPassword(!showEditPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white">
                  {showEditPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[10px] text-zinc-500 mt-1">Si dejas este campo en blanco, su contraseña actual no se modificará.</p>
            </div>

            <div className="flex gap-2 pt-2 border-t border-zinc-800/80">
              <button type="button" onClick={() => setIsEditModalOpen(false)} className="w-1/2 py-2.5 bg-zinc-900 text-zinc-400 font-bold rounded-xl hover:bg-zinc-800" disabled={isSubmitting}>Cancelar</button>
              <button type="submit" className="w-1/2 py-2.5 bg-amber-500 text-black font-bold rounded-xl hover:bg-amber-400 disabled:opacity-50" disabled={isSubmitting}>{isSubmitting ? 'Guardando...' : 'Actualizar'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}