import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import Login from './pages/login';
import Register from './pages/Register';
import AdminDashboard from './pages/AdminDashboard.jsx';
import UserDashboard from './pages/UserDashboard.jsx';
import VolunteerDashboard from './pages/VolunteerDashboard.jsx';
import ProfileSettings from './pages/UserDashboardPages/profileSettings.jsx';
import CreateRequest from './pages/UserDashboardPages/CreateRequest.jsx';
import FindResources from './pages/UserDashboardPages/FindResources.tsx';
import MyRequests from './pages/UserDashboardPages/MyRequests.jsx';
import Shelters from './pages/UserDashboardPages/Shelters.jsx';

function App() {
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const ProtectedRoute = ({ roles, children }) => {
    if (!localStorage.getItem('token') || !user) return <Navigate to="/" replace />;
    return roles.includes(user.role?.toLowerCase()) ? children : <Navigate to="/" replace />;
  };

  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/admin" element={<ProtectedRoute roles={['admin']}><AdminDashboard /></ProtectedRoute>} />
      <Route path="/volunteer" element={<ProtectedRoute roles={['volunteer']}><VolunteerDashboard /></ProtectedRoute>} />
      <Route path="/citizen" element={<ProtectedRoute roles={['citizen']}><UserDashboard /></ProtectedRoute>} />
      <Route path="/create-request" element={<ProtectedRoute roles={['citizen']}><CreateRequest /></ProtectedRoute>} />
      <Route path="/find-resources" element={<ProtectedRoute roles={['citizen']}><FindResources /></ProtectedRoute>} />
      <Route path="/my-requests" element={<ProtectedRoute roles={['citizen']}><MyRequests /></ProtectedRoute>} />
      <Route path="/shelters" element={<ProtectedRoute roles={['citizen']}><Shelters /></ProtectedRoute>} />
      <Route path="/profiles" element={<ProtectedRoute roles={['citizen', 'volunteer', 'admin']}><ProfileSettings /></ProtectedRoute>} />
    </Routes>
  );
}

export default App;
