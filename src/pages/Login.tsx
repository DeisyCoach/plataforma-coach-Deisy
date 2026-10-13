import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../providers/AuthProvider';
import { supabase } from '../lib/supabase/client';
import { Mail, Lock, AlertCircle, CheckCircle2, ArrowLeft, KeyRound } from 'lucide-react';

// 🚨 Importamos tu logo para la pantalla principal
import logoInge from '../assets/logo-elite.png';

export function Login() {
  const { user } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  
  // 🚨 Estado para saber si estamos en modo "Recuperar Contraseña"
  const [isResetMode, setIsResetMode] = useState(false);

  // Si ya está logueado, lo mandamos al panel
  if (user) {
    return <Navigate to="/" replace />;
  }

  // Función normal de Iniciar Sesión
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) setError('Correo o contraseña incorrectos.');
    setLoading(false);
  };

  // Función: Enviar correo de recuperación
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Por favor, ingresa tu correo electrónico primero.');
      return;
    }
    setLoading(true);
    setError('');
    setMessage('');

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });

    if (error) {
      setError('Hubo un error al enviar el correo. Verifica que esté bien escrito.');
    } else {
      setMessage('¡Enlace de recuperación enviado! Revisa tu bandeja de entrada o spam.');
      setTimeout(() => setIsResetMode(false), 5000); // Vuelve al login tras 5 segundos
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Luces de fondo decorativas en amarillo encendido */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-yellow-400/10 blur-[120px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-yellow-500/5 blur-[120px] rounded-full pointer-events-none"></div>

      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-8 shadow-2xl relative z-10">
        
        {/* LOGO Y TÍTULO */}
        <div className="flex flex-col items-center mb-8">
          <img src={logoInge} alt="Deisy Coach Elite Logo" className="w-28 h-28 object-contain drop-shadow-[0_0_18px_rgba(250,204,21,0.5)] mb-4" />
          <h1 className="text-2xl font-black text-white tracking-wide text-center">
            {isResetMode ? 'RECUPERAR CUENTA' : 'DEISY COACH ELITE'}
          </h1>
          <p className="text-xs text-yellow-400 font-bold uppercase tracking-widest mt-1">
            {isResetMode ? 'Te enviaremos un enlace' : 'Panel de Rendimiento'}
          </p>
        </div>

        {/* MENSAJES DE ERROR O ÉXITO */}
        {error && (
          <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-2 text-red-400 text-sm font-bold">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p>{error}</p>
          </div>
        )}
        {message && (
          <div className="mb-6 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-start gap-2 text-emerald-400 text-sm font-bold">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <p>{message}</p>
          </div>
        )}

        {/* FORMULARIO */}
        <form onSubmit={isResetMode ? handleResetPassword : handleLogin} className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Correo Electrónico</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
              <input
                type="email"
                placeholder="tu@correo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white font-medium focus:outline-none focus:border-yellow-400 transition-colors"
                required
              />
            </div>
          </div>

          {!isResetMode && (
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Contraseña</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white font-medium focus:outline-none focus:border-yellow-400 transition-colors"
                  required={!isResetMode}
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-yellow-400 hover:bg-yellow-300 text-black font-black uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-yellow-400/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Cargando...' : isResetMode ? 'Enviar Enlace' : 'Ingresar'}
          </button>
        </form>

        {/* BOTÓN PARA CAMBIAR ENTRE LOGIN Y RECUPERAR */}
        <div className="mt-8 text-center">
          {isResetMode ? (
            <button 
              onClick={() => { setIsResetMode(false); setError(''); setMessage(''); }}
              className="text-sm font-bold text-zinc-400 hover:text-yellow-400 flex items-center justify-center gap-2 w-full transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Volver a Iniciar Sesión
            </button>
          ) : (
            <button 
              onClick={() => { setIsResetMode(true); setError(''); setMessage(''); }}
              className="text-sm font-bold text-zinc-400 hover:text-yellow-400 flex items-center justify-center gap-2 w-full transition-colors"
            >
              <KeyRound className="w-4 h-4" /> ¿Olvidaste tu contraseña?
            </button>
          )}
        </div>

      </div>
    </div>
  );
}