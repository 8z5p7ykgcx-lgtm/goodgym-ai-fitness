import { Routes, Route } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import WorkoutPage from '@/pages/WorkoutPage/WorkoutPage';
import NotFoundPage from '@/pages/NotFoundPage/NotFoundPage';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<WorkoutPage />} />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
