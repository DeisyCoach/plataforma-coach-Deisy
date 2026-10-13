import { useState, useEffect } from 'react';
import { Outlet, Navigate, useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../providers/AuthProvider';
import { supabase } from '../../lib/supabase/client';
import { LayoutDashboard, Users, Dumbbell, Calendar, LogOut, Menu, X, TrendingUp, Utensils, Pill, ClipboardCheck } from 'lucide-react';

// 🚨 IMPORT DE TU LOGO
import logoInge from '../../assets/logo.png';

export function DashboardLayout() {
  const { user, isLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // 🚨 Detección dinámica del rol Coach
  const [isCoach, setIsCoach] = useState<boolean>(false);
  const [isRoleChecking, setIsRoleChecking] = useState<boolean>(true);

  useEffect(() => {
    const checkUserRole = async () => {
      if (!user?.email) {
        setIsRoleChecking(false);
        return;
      }

      try {
        const cleanEmail = user.email.trim().toLowerCase();
        
        // Buscamos si el usuario existe en la tabla de atletas
        const { data: athlete } = await supabase
          .from('athletes')
          .select('id')
          .ilike('email', cleanEmail)
          .maybeSingle();

        // Si NO está en la tabla de atletas, es un COACH
        setIsCoach(!athlete);
      } catch (err) {
        console.error("Error al verificar rol en DashboardLayout:", err);
      } finally {
        setIsRoleChecking(false);
      }
    };

    checkUserRole();
  }, [user]);

  if (isLoading || isRoleChecking) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <span className="text-yellow-400 font-bold animate-pulse">Cargando plataforma...</span>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const allMenuItems = [
    { name: 'Panel Principal', path: '/', icon: LayoutDashboard, role: 'ambos' },
    { name: 'Mis Atletas', path: '/coach/athletes', icon: Users, role: 'coach' },
    { name: 'Rutinas', path: '/coach/routines', icon: Dumbbell, role: 'coach' },
    { name: 'Mi Entrenamiento', path: '/athlete/dashboard', icon: Dumbbell, role: 'atleta' },
    { name: 'Calendario', path: '/coach/calendar', icon: Calendar, role: 'ambos' },
    { name: 'Chequeos', path: '/checkins', icon: ClipboardCheck, role: 'ambos' },
    { name: 'Nutrición / Menús', path: isCoach ? '/coach/meals' : '/athlete/nutrition', icon: Utensils, role: 'ambos' },
    { name: 'Suplementos & Ayudas', path: '/supplements', icon: Pill, role: 'ambos' },
    { name: 'Progresión Cargas', path: '/coach/progress', icon: TrendingUp, role: 'ambos' },
  ];

  const menuItems = allMenuItems.filter(item => {
    if (item.role === 'ambos') return true;
    if (isCoach && item.role === 'coach') return true;
    if (!isCoach && item.role === 'atleta') return true;
    return false;
  });

  return (
    <div className="min-h-screen bg-zinc-900 flex flex-col md:flex-row font-sans text-zinc-100">
      
      {/* BARRA SUPERIOR MÓVIL */}
      <div className="md:hidden bg-zinc-950 text-white px-4 py-3 flex items-center justify-between border-b border-zinc-800 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <img src={logoInge} alt="Deisy Coach Elite Logo" className="w-10 h-10 object-contain drop-shadow-[0_0_10px_rgba(250,204,21,0.6)]" />
          <span className="font-black text-lg tracking-wide text-yellow-400">
            {isCoach ? 'Deisy Coach Elite' : 'Portal Atleta'}
          </span>
        </div>
        
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 bg-zinc-900 text-zinc-300 rounded-xl hover:text-white border border-zinc-800"
        >
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* MENÚ LATERAL (SIDEBAR) */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-zinc-950 text-zinc-300 flex flex-col transition-transform duration-300 ease-in-out border-r border-zinc-800/80
        md:static md:translate-x-0 
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* HEADER DESKTOP CON LOGO */}
        <div className="hidden md:flex h-20 items-center px-6 bg-zinc-950 border-b border-zinc-800/80">
          <img src={logoInge} alt="Deisy Coach Elite Logo" className="w-12 h-12 object-contain mr-3 drop-shadow-[0_0_12px_rgba(250,204,21,0.5)]" />
          <div>
            <h1 className="text-lg font-black text-white tracking-wider">DEISY <span className="text-yellow-400">COACH</span></h1>
            <p className="text-[10px] text-yellow-400/90 font-bold uppercase tracking-widest">Elite Performance</p>
          </div>
        </div>

        {/* NAVIGATION LINKS */}
        <nav className="flex-1 py-6 px-3 space-y-1.5 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <Link
                key={item.name}
                to={item.path}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center px-4 py-3 rounded-xl transition-all group ${
                  isActive 
                    ? 'bg-yellow-400 text-black font-black shadow-lg shadow-yellow-400/20' 
                    : 'hover:bg-zinc-900 hover:text-yellow-400 text-zinc-400'
                }`}
              >
                <Icon className={`w-5 h-5 mr-3 transition-colors ${isActive ? 'text-black' : 'text-zinc-500 group-hover:text-yellow-400'}`} />
                <span className="text-sm font-medium">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* USER FOOTER */}
        <div className="p-4 bg-zinc-950 border-t border-zinc-800/80">
          <div className="flex items-center justify-between">
            <div className="truncate pr-2">
              <p className="text-[10px] font-black uppercase tracking-wider text-yellow-400">
                {isCoach ? 'Entrenador Principal' : 'Atleta Oficial'}
              </p>
              <p className="text-xs font-semibold text-zinc-200 truncate" title={user.email}>
                {user.email}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="p-2.5 bg-zinc-900 rounded-xl text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-zinc-800 transition-colors"
              title="Cerrar sesión"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* OVERLAY MÓVIL */}
      {isMobileMenuOpen && (
        <div 
          onClick={() => setIsMobileMenuOpen(false)} 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-30 md:hidden"
        />
      )}

      {/* ÁREA PRINCIPAL */}
      <main className="flex-1 overflow-y-auto w-full bg-zinc-900">
        <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto w-full">
          <Outlet />
        </div>
      </main>

    </div>
  );
}