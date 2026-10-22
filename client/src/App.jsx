import { Routes, Route, Navigate } from 'react-router-dom';
import FormPage from './pages/FormPage.jsx';
import Login from './admin/Login.jsx';
import AdminLayout from './admin/AdminLayout.jsx';
import Submissions from './admin/Submissions.jsx';
import Groups from './admin/Groups.jsx';
import Fields from './admin/Fields.jsx';
import Monitor from './admin/Monitor.jsx';
import Options from './admin/Options.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<FormPage />} />
      <Route path="/admin/login" element={<Login />} />
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<Submissions />} />
        <Route path="monitor" element={<Monitor />} />
        <Route path="groups" element={<Groups />} />
        <Route path="fields" element={<Fields />} />
        <Route path="options" element={<Options />} />
      </Route>
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}
