import { AthleteProgress } from '../../pages/coach/AthleteProgress';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { Login } from '../../pages/Login';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { Athletes } from '../../pages/coach/Athletes';
import { Routines } from '../../pages/coach/Routines';
import { RoutineBuilder } from '../../pages/coach/RoutineBuilder';
import { Calendar } from '../../pages/coach/Calendar';
import { AthleteDashboard } from '../../pages/athlete/AthleteDashboard';
import { MealPlans } from '../../pages/coach/MealPlans';
// 🚨 1. IMPORTACIONES CORREGIDAS
import { CheckIns } from '../../pages/CheckIns';
import { Supplements } from '../../pages/Supplements';

const router = createBrowserRouter([
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/',
    element: <DashboardLayout />,
    children: [
      { 
        index: true, 
        element: (
          // 🚨 3. PANTALLA PRINCIPAL ADAPTADA AL TEMA NEGRO/DORADO
          <div className="bg-zinc-950 p-10 rounded-2xl shadow-xl border border-zinc-800 text-center max-w-2xl mx-auto mt-10">
            <div className="w-20 h-20 bg-amber-500 rounded-2xl mx-auto flex items-center justify-center font-black text-black text-4xl shadow-lg shadow-amber-500/20 mb-6">
              C
            </div>
            <h2 className="text-3xl font-black text-white mb-3">
              Bienvenido a COACH<span className="text-amber-400">APP</span>
            </h2>
            <p className="text-zinc-400 text-sm">
              Selecciona una opción en el menú lateral para gestionar entrenamientos, nutrición y evaluar el progreso de tus atletas.
            </p>
          </div>
        ) 
      },
      { path: 'coach/athletes', element: <Athletes /> },
      { path: 'coach/routines', element: <Routines /> },
      { path: 'coach/routines/:id', element: <RoutineBuilder /> },
      { path: 'coach/calendar', element: <Calendar /> },
      { path: 'athlete/dashboard', element: <AthleteDashboard /> },
      { path: 'coach/progress', element: <AthleteProgress /> },
      { path: 'coach/meals', element: <MealPlans /> },
      // 🚨 2. RUTAS CORREGIDAS (Deben coincidir EXACTAMENTE con el menú)
      { path: 'checkins', element: <CheckIns /> },
      { path: 'supplements', element: <Supplements /> },
    ],
  },
  // MAGIA AQUÍ: LA RUTA SALVAVIDAS
  {
    path: '*',
    element: <Navigate to="/login" replace />
  }
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}