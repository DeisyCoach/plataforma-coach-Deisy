import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase/client';
import { useAuth } from '../providers/AuthProvider';
import { Pill, Plus, Trash2, Clock, Calendar, MessageSquare, Save } from 'lucide-react';

export function Supplements() {
  const { user } = useAuth();
  
  // 🚨 Detección dinámica del rol Coach
  const [isCoach, setIsCoach] = useState<boolean>(false);
  const [athletes, setAthletes] = useState<any[]>([]);
  const [selectedAthleteId, setSelectedAthleteId] = useState('');
  const [supplementsData, setSupplementsData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Arreglo para permitir MÚLTIPLES suplementos a la vez
  const [suppsList, setSuppsList] = useState([
    { name: '', dosage: '', frequency: '', schedule: '', notes: '' }
  ]);

  useEffect(() => {
    if (user) {
      checkRoleAndFetchData();
    }
  }, [user, selectedAthleteId]);

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

      // 2. Carga de datos según el rol
      if (coachRole) {
        const { data: athletesData } = await supabase.from('athletes').select('*').order('full_name');
        setAthletes(athletesData || []);

        if (selectedAthleteId) {
          const { data: supps } = await supabase
            .from('athlete_supplements')
            .select('*')
            .eq('athlete_id', selectedAthleteId);
          setSupplementsData(supps || []);
        } else {
          setSupplementsData([]);
        }
      } else if (athlete) {
        const { data: supps } = await supabase
          .from('athlete_supplements')
          .select('*')
          .eq('athlete_id', athlete.id);
        setSupplementsData(supps || []);
      }
    } catch (err) {
      console.error("Error en Supplements:", err);
    } finally {
      setLoading(false);
    }
  };

  // --- LÓGICA MÚLTIPLE ---
  const addSuppField = () => {
    setSuppsList([...suppsList, { name: '', dosage: '', frequency: '', schedule: '', notes: '' }]);
  };

  const handleSuppChange = (index: number, field: string, value: string) => {
    const updated = [...suppsList];
    updated[index] = { ...updated[index], [field]: value };
    setSuppsList(updated);
  };

  const removeSuppField = (index: number) => {
    setSuppsList(suppsList.filter((_, i) => i !== index));
  };

  const handleSaveProtocol = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAthleteId) return alert('Selecciona un atleta primero.');

    const validSupps = suppsList.filter(s => s.name.trim() !== '');
    if (validSupps.length === 0) return alert('Debes llenar al menos el nombre de un suplemento.');

    const insertData = validSupps.map(s => ({
      athlete_id: selectedAthleteId,
      name: s.name,
      dosage: s.dosage || 'N/A',
      frequency: s.frequency || 'N/A',
      schedule: s.schedule || 'N/A',
      notes: s.notes || '',
      coach_id: user?.id
    }));

    const { error } = await supabase.from('athlete_supplements').insert(insertData);

    if (error) {
      console.error(error);
      alert('Error al guardar: ' + error.message);
    } else {
      alert(`¡${validSupps.length} suplemento(s) asignados con éxito!`);
      setSuppsList([{ name: '', dosage: '', frequency: '', schedule: '', notes: '' }]);
      checkRoleAndFetchData();
    }
  };

  const handleDelete = async (id: string) => {
    await supabase.from('athlete_supplements').delete().eq('id', id);
    checkRoleAndFetchData();
  };

  if (loading) return <div className="p-8 text-amber-500 font-bold text-center">Cargando Suplementación...</div>;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-black text-white flex items-center gap-2">
          <Pill className="w-7 h-7 text-amber-400" /> Suplementación & Ayudas
        </h2>
        <p className="text-zinc-400 text-sm mt-1">
          {isCoach ? 'Asigna uno o múltiples suplementos de un solo golpe al protocolo del atleta.' : 'Tu protocolo de suplementación asignado.'}
        </p>
      </div>

      {isCoach && (
        <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800 max-w-md shadow-xl">
          <label className="block text-xs font-bold text-amber-400 uppercase mb-2">Seleccionar Atleta</label>
          <select
            value={selectedAthleteId}
            onChange={(e) => setSelectedAthleteId(e.target.value)}
            className="w-full px-3 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-sm font-bold text-white focus:outline-none focus:border-amber-500"
          >
            <option value="">-- Selecciona un Atleta --</option>
            {athletes.map(a => <option key={a.id} value={a.id}>{a.full_name}</option>)}
          </select>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* FORMULARIO MÚLTIPLE PARA EL COACH */}
        {isCoach && selectedAthleteId && (
          <form onSubmit={handleSaveProtocol} className="lg:col-span-2 bg-zinc-950 p-6 rounded-2xl border border-zinc-800 space-y-4 h-fit shadow-xl">
            <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
              <h3 className="font-bold text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-amber-400" /> Añadir Protocolo
              </h3>
              <button type="button" onClick={addSuppField} className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 bg-amber-500/10 px-3 py-1.5 rounded-lg border border-amber-500/20 transition-all">
                <Plus className="w-3 h-3"/> Añadir otro suplemento
              </button>
            </div>

            <div className="space-y-4">
              {suppsList.map((supp, index) => (
                <div key={index} className="bg-zinc-900 p-4 rounded-xl border border-zinc-800 relative">
                  {suppsList.length > 1 && (
                    <button type="button" onClick={() => removeSuppField(index)} className="absolute top-3 right-3 text-red-400 hover:text-red-300 bg-zinc-950 p-1.5 rounded-md">
                      <Trash2 className="w-4 h-4"/>
                    </button>
                  )}
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Nombre</label>
                      <input type="text" placeholder="Ej. Creatina" value={supp.name} onChange={e => handleSuppChange(index, 'name', e.target.value)} className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-white focus:border-amber-500" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Dosis</label>
                      <input type="text" placeholder="Ej. 5g" value={supp.dosage} onChange={e => handleSuppChange(index, 'dosage', e.target.value)} className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-white focus:border-amber-500" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Frecuencia</label>
                      <input type="text" placeholder="Ej. Diaria" value={supp.frequency} onChange={e => handleSuppChange(index, 'frequency', e.target.value)} className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-white focus:border-amber-500" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Horario</label>
                      <input type="text" placeholder="Ej. Post-entreno" value={supp.schedule} onChange={e => handleSuppChange(index, 'schedule', e.target.value)} className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-white focus:border-amber-500" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Observaciones</label>
                    <input type="text" placeholder="Ej. Tomar con abundante agua" value={supp.notes} onChange={e => handleSuppChange(index, 'notes', e.target.value)} className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-white focus:border-amber-500" />
                  </div>
                </div>
              ))}
            </div>

            <button type="submit" className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-black rounded-xl font-bold text-sm transition-colors shadow-lg shadow-amber-500/20 flex justify-center items-center gap-2">
              <Save className="w-4 h-4"/> Guardar Todo en Protocolo
            </button>
          </form>
        )}

        {/* LISTA DE SUPLEMENTOS ASIGNADOS */}
        <div className={isCoach ? "lg:col-span-1 space-y-4" : "lg:col-span-3 space-y-4"}>
          <h3 className="font-bold text-white text-lg">Asignados Actuales</h3>
          <div className="grid grid-cols-1 gap-4">
            {supplementsData.length === 0 ? (
              <p className="text-zinc-500 text-sm bg-zinc-950 p-4 rounded-xl border border-zinc-800">
                {isCoach && !selectedAthleteId 
                  ? "Selecciona un atleta arriba para ver o asignar su suplementación." 
                  : "No hay suplementos registrados."}
              </p>
            ) : (
              supplementsData.map((s) => (
                <div key={s.id} className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 space-y-3 relative shadow-xl">
                  {isCoach && (
                    <button onClick={() => handleDelete(s.id)} className="absolute top-3 right-3 text-red-400 hover:text-red-300 bg-zinc-900 p-1.5 rounded-md">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <div className="pr-8">
                    <h4 className="font-bold text-amber-400 text-sm">{s.name}</h4>
                    <span className="text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full mt-1 inline-block">{s.dosage}</span>
                  </div>
                  <div className="space-y-1 text-[11px] text-zinc-400 pt-2 border-t border-zinc-900">
                    <p className="flex items-center gap-1.5"><Calendar className="w-3 h-3 text-zinc-500" /> <b>Frec:</b> {s.frequency}</p>
                    <p className="flex items-center gap-1.5"><Clock className="w-3 h-3 text-zinc-500" /> <b>Hora:</b> {s.schedule}</p>
                    {s.notes && <p className="flex items-start gap-1 text-zinc-300 mt-2 bg-zinc-900 p-2 rounded-lg italic"><MessageSquare className="w-3 h-3 text-amber-400 mt-0.5" /> {s.notes}</p>}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}