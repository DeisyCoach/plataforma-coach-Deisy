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
// 🚨 IMPORTAMOS LA NUEVA PANTALLA DE NUTRICIÓN DEL ATLETA
import { Nutrition as AthleteNutrition } from '../../pages/athlete/Nutrition';
// 🚨 IMPORTAMOS EL NUEVO PANEL PRINCIPAL (DASHBOARD INTELIGENTE)
import { MainPanel } from '../../pages/MainPanel';
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
        // 🚨 AQUÍ CONECTAMOS EL NUEVO PANEL INTELIGENTE AL INICIO DE LA APP
        index: true, 
        element: <MainPanel />
      },
      // --- RUTAS DEL COACH ---
      { path: 'coach/athletes', element: <Athletes /> },
      { path: 'coach/routines', element: <Routines /> },
      { path: 'coach/routines/:id', element: <RoutineBuilder /> },
      { path: 'coach/calendar', element: <Calendar /> },
      { path: 'coach/progress', element: <AthleteProgress /> },
      { path: 'coach/meals', element: <MealPlans /> },
      
      // --- RUTAS DEL ATLETA ---
      { path: 'athlete/dashboard', element: <AthleteDashboard /> },
      { path: 'athlete/nutrition', element: <AthleteNutrition /> },
      { path: 'athlete/meals', element: <AthleteNutrition /> },

      // --- RUTAS COMPARTIDAS ---
      { path: 'checkins', element: <CheckIns /> },
      { path: 'supplements', element: <Supplements /> },
    ],
  },
  // LA RUTA SALVAVIDAS
  {
    path: '*',
    element: <Navigate to="/login" replace />
  }
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}