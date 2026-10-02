import { Routes, Route, Navigate } from 'react-router-dom';
import ClientePage from './pages/ClientePage.jsx';
import GestaoPage from './pages/GestaoPage.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<ClientePage />} />
      <Route path="/gestao" element={<GestaoPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
