import { useState } from 'react';
import { Outlet, Navigate, useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../providers/AuthProvider';
import { LayoutDashboard, Users, Dumbbell, Calendar, LogOut, Menu, X, TrendingUp, Utensils, Pill, ClipboardCheck } from 'lucide-react';

// 🚨 AQUÍ ESTÁ EL IMPORT INFALIBLE DE TU LOGO
import logoInge from '../../assets/logo.png';

export function DashboardLayout() {
  const { user, isLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <span className="text-amber-400 font-semibold animate-pulse">Cargando plataforma...</span>
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

  const isCoach = user.email === 'coach@plataforma.com';

  const allMenuItems = [
    { name: 'Panel Principal', path: '/', icon: LayoutDashboard, role: 'ambos' },
    { name: 'Mis Atletas', path: '/coach/athletes', icon: Users, role: 'coach' },
    { name: 'Rutinas', path: '/coach/routines', icon: Dumbbell, role: 'coach' },
    { name: 'Mi Entrenamiento', path: '/athlete/dashboard', icon: Dumbbell, role: 'atleta' },
    { name: 'Calendario', path: '/coach/calendar', icon: Calendar, role: 'ambos' },
    { name: 'Chequeos', path: '/checkins', icon: ClipboardCheck, role: 'ambos' },
    { name: 'Nutrición / Menús', path: '/coach/meals', icon: Utensils, role: 'ambos' },
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
          {/* 🚨 USAMOS LA VARIABLE DEL LOGO AQUÍ */}
          <img src={logoInge} alt="El Inge Fit Logo" className="w-10 h-10 object-contain drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
          <span className="font-bold text-lg tracking-wide text-amber-400">
            {isCoach ? 'El Inge Fit' : 'Portal Atleta'}
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
          {/* 🚨 USAMOS LA VARIABLE DEL LOGO AQUÍ TAMBIÉN */}
          <img src={logoInge} alt="El Inge Fit Logo" className="w-12 h-12 object-contain mr-3 drop-shadow-[0_0_10px_rgba(245,158,11,0.3)]" />
          <div>
            <h1 className="text-lg font-black text-white tracking-wider">EL INGE <span className="text-amber-400">FIT</span></h1>
            <p className="text-[10px] text-amber-500/80 font-bold uppercase tracking-widest">Team Performance</p>
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
                    ? 'bg-amber-500 text-black font-bold shadow-lg shadow-amber-500/20' 
                    : 'hover:bg-zinc-900 hover:text-amber-400 text-zinc-400'
                }`}
              >
                <Icon className={`w-5 h-5 mr-3 transition-colors ${isActive ? 'text-black' : 'text-zinc-500 group-hover:text-amber-400'}`} />
                <span className="text-sm font-medium">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* USER FOOTER */}
        <div className="p-4 bg-zinc-950 border-t border-zinc-800/80">
          <div className="flex items-center justify-between">
            <div className="truncate pr-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-amber-500">
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