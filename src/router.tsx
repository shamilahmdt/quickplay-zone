import { createBrowserRouter } from 'react-router-dom';
import App from './App';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import GamePage from './pages/GamePage';
import About from './pages/About';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      {
        path: '',
        element: <Home />,
      },
      {
        path: 'dashboard',
        element: <Dashboard />,
      },
      {
        path: 'game/:gameId',
        element: <GamePage />,
      },
      {
        path: 'about',
        element: <About />,
      },
    ],
  },
]);

export default router;
