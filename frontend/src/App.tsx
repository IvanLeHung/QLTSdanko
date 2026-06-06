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
import { ImportAssetsHistory } from './pages/ImportAssetsHistory';
import { DamageReport } from './pages/DamageReport';
import { LostReport } from './pages/LostReport';
import { Liquidation } from './pages/Liquidation';
import { DocumentLibrary } from './pages/DocumentLibrary';
import { PrintCenter } from './pages/PrintCenter';
import { ActivityLogs } from './pages/ActivityLogs';
import { UserPermissions } from './pages/UserPermissions';
import { ForceChangePassword } from './pages/ForceChangePassword';

// Import CCDC (Tools & Equipment) components
import { ToolList } from './pages/ToolList';
import { CreateTool } from './pages/CreateTool';
import { ToolDetail } from './pages/ToolDetail';
import { ImportTools } from './pages/ImportTools';
import { ImportToolsInvoice } from './pages/ImportToolsInvoice';

const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  
  if (user.mustChangePassword) {
    return <Navigate to="/force-change-password" />;
  }
  
  return <Layout>{children}</Layout>;
};

import { ModalProvider } from './context/ModalContext';

function App() {
  return (
    <AuthProvider>
      <ModalProvider>
        <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/force-change-password" element={<ForceChangePassword />} />
          
          <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/assets" element={<PrivateRoute><AssetList /></PrivateRoute>} />
          <Route path="/assets/new" element={<PrivateRoute><CreateAsset /></PrivateRoute>} />
          <Route path="/assets/:id" element={<PrivateRoute><AssetDetail /></PrivateRoute>} />
          <Route path="/assets/assign" element={<PrivateRoute><AssetAssign /></PrivateRoute>} />
          
          {/* CCDC (Tools & Equipment) Routes */}
          <Route path="/tools" element={<PrivateRoute><ToolList /></PrivateRoute>} />
          <Route path="/tools/new" element={<PrivateRoute><CreateTool /></PrivateRoute>} />
          <Route path="/tools/:id" element={<PrivateRoute><ToolDetail /></PrivateRoute>} />
          <Route path="/tools/import" element={<PrivateRoute><ImportTools /></PrivateRoute>} />
          <Route path="/tools/import-invoice" element={<PrivateRoute><ImportToolsInvoice /></PrivateRoute>} />
          
          <Route path="/settings/classification" element={<PrivateRoute><ClassificationSettings /></PrivateRoute>} />
          <Route path="/settings/companies" element={<PrivateRoute><CompanySettings /></PrivateRoute>} />
          
          <Route path="/inventory" element={<PrivateRoute><InventoryList /></PrivateRoute>} />
          <Route path="/inventory/:id" element={<PrivateRoute><InventoryDetail /></PrivateRoute>} />
          <Route path="/handover" element={<PrivateRoute><HandoverTransfer /></PrivateRoute>} />
          <Route path="/operational/damage" element={<PrivateRoute><DamageReport /></PrivateRoute>} />
          <Route path="/operational/lost" element={<PrivateRoute><LostReport /></PrivateRoute>} />
          <Route path="/operational/liquidation" element={<PrivateRoute><Liquidation /></PrivateRoute>} />
          <Route path="/import/assets" element={<PrivateRoute><ImportAssets /></PrivateRoute>} />
          <Route path="/import/assets-history" element={<PrivateRoute><ImportAssetsHistory /></PrivateRoute>} />
          <Route path="/documents" element={<PrivateRoute><DocumentLibrary /></PrivateRoute>} />
          <Route path="/print-center" element={<PrivateRoute><PrintCenter /></PrivateRoute>} />
          <Route path="/activity-logs" element={<PrivateRoute><ActivityLogs /></PrivateRoute>} />
          <Route path="/settings/permissions" element={<PrivateRoute><UserPermissions /></PrivateRoute>} />
          
          <Route path="/" element={<Navigate to="/dashboard" />} />
        </Routes>
      </BrowserRouter>
      </ModalProvider>
      <ToastContainer position="bottom-right" />
    </AuthProvider>
  );
}

export default App;
