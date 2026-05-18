import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { AuthProvider, useAuth } from './context/AuthContext';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { AssetList } from './pages/AssetList';
import { AssetDetail } from './pages/AssetDetail';
import { AssetAssign } from './pages/AssetAssign';
import { InventoryList } from './pages/InventoryList';
import { InventoryDetail } from './pages/InventoryDetail';
import { CreateAsset } from './pages/CreateAsset';
import { ClassificationSettings } from './pages/ClassificationSettings';
import { CompanySettings } from './pages/CompanySettings';
import { HandoverTransfer } from './pages/HandoverTransfer';
import { ImportAssets } from './pages/ImportAssets';
import { DamageReport } from './pages/DamageReport';
import { LostReport } from './pages/LostReport';
import { Liquidation } from './pages/Liquidation';
import { DocumentLibrary } from './pages/DocumentLibrary';
import { PrintCenter } from './pages/PrintCenter';
import { ActivityLogs } from './pages/ActivityLogs';
import { UserPermissions } from './pages/UserPermissions';
import { ForceChangePassword } from './pages/ForceChangePassword';

const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  
  if (user.mustChangePassword) {
    return <Navigate to="/force-change-password" />;
  }
  
  return <Layout>{children}</Layout>;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/force-change-password" element={<ForceChangePassword />} />
          
          <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/assets" element={<PrivateRoute><AssetList /></PrivateRoute>} />
          <Route path="/assets/new" element={<PrivateRoute><CreateAsset /></PrivateRoute>} />
          <Route path="/assets/:id" element={<PrivateRoute><AssetDetail /></PrivateRoute>} />
          <Route path="/assets/assign" element={<PrivateRoute><AssetAssign /></PrivateRoute>} />
          
          <Route path="/settings/classification" element={<PrivateRoute><ClassificationSettings /></PrivateRoute>} />
          <Route path="/settings/companies" element={<PrivateRoute><CompanySettings /></PrivateRoute>} />
          
          <Route path="/inventory" element={<PrivateRoute><InventoryList /></PrivateRoute>} />
          <Route path="/inventory/:id" element={<PrivateRoute><InventoryDetail /></PrivateRoute>} />
          <Route path="/handover" element={<PrivateRoute><HandoverTransfer /></PrivateRoute>} />
          <Route path="/operational/damage" element={<PrivateRoute><DamageReport /></PrivateRoute>} />
          <Route path="/operational/lost" element={<PrivateRoute><LostReport /></PrivateRoute>} />
          <Route path="/operational/liquidation" element={<PrivateRoute><Liquidation /></PrivateRoute>} />
          <Route path="/import/assets" element={<PrivateRoute><ImportAssets /></PrivateRoute>} />
          <Route path="/documents" element={<PrivateRoute><DocumentLibrary /></PrivateRoute>} />
          <Route path="/print-center" element={<PrivateRoute><PrintCenter /></PrivateRoute>} />
          <Route path="/activity-logs" element={<PrivateRoute><ActivityLogs /></PrivateRoute>} />
          <Route path="/settings/permissions" element={<PrivateRoute><UserPermissions /></PrivateRoute>} />
          
          <Route path="/" element={<Navigate to="/dashboard" />} />
        </Routes>
      </BrowserRouter>
      <ToastContainer position="bottom-right" />
    </AuthProvider>
  );
}

export default App;
