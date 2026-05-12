import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { toast } from 'react-toastify';
import { ArrowLeft, Save, AlertCircle } from 'lucide-react';

export const BulkAssign: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const selectedIds = location.state?.selectedIds || [];
  
  const [formData, setFormData] = useState({
    newStatus: 'ASSIGNED',
    newUserName: '',
    newPosition: '',
    newDepartmentName: '',
    newLocationName: '',
    newCityName: '',
    effectiveAt: new Date().toISOString().split('T')[0],
    note: ''
  });

  if (selectedIds.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-20 bg-white rounded-xl border border-dashed border-slate-300">
        <AlertCircle className="h-12 w-12 text-slate-300 mb-4" />
        <p className="text-slate-500">No assets selected for assignment.</p>
        <button onClick={() => navigate('/assets')} className="btn-primary mt-4">Go to Assets</button>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post('/assets/bulk-assign', {
        assetIds: selectedIds,
        ...formData
      });
      toast.success(`Successfully updated ${res.data.updatedCount} assets.`);
      if (res.data.failedList.length > 0) {
        toast.warning(`${res.data.failedList.length} assets failed to update.`);
      }
      navigate('/assets');
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Assignment failed");
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <button onClick={() => navigate(-1)} className="flex items-center text-slate-600 hover:text-slate-900">
        <ArrowLeft className="mr-2 h-4 w-4" /> Cancel
      </button>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-200 bg-slate-50">
          <h2 className="text-xl font-bold text-slate-800">Bulk Assign / Transfer</h2>
          <p className="text-sm text-slate-500 mt-1">Applying changes to {selectedIds.length} selected assets.</p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">New Status</label>
              <select 
                className="input-field"
                value={formData.newStatus}
                onChange={e => setFormData({...formData, newStatus: e.target.value})}
              >
                <option value="ASSIGNED">ASSIGNED</option>
                <option value="IN_STOCK">IN_STOCK</option>
                <option value="UNDER_REPAIR">UNDER_REPAIR</option>
                <option value="PENDING_DISPOSAL">PENDING_DISPOSAL</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Effective Date</label>
              <input 
                type="date" 
                className="input-field"
                value={formData.effectiveAt}
                onChange={e => setFormData({...formData, effectiveAt: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">New User Name</label>
              <input 
                type="text" 
                placeholder="Full name of the recipient"
                className="input-field"
                value={formData.newUserName}
                onChange={e => setFormData({...formData, newUserName: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Position</label>
              <input 
                type="text" 
                className="input-field"
                value={formData.newPosition}
                onChange={e => setFormData({...formData, newPosition: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Department</label>
              <input 
                type="text" 
                className="input-field"
                value={formData.newDepartmentName}
                onChange={e => setFormData({...formData, newDepartmentName: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Location</label>
              <input 
                type="text" 
                className="input-field"
                value={formData.newLocationName}
                onChange={e => setFormData({...formData, newLocationName: e.target.value})}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-bold text-slate-700">Note / Reason</label>
              <textarea 
                className="input-field h-24"
                placeholder="Details of this transfer..."
                value={formData.note}
                onChange={e => setFormData({...formData, note: e.target.value})}
              />
            </div>
          </div>

          <div className="pt-6 border-t border-slate-100 flex justify-end">
            <button type="submit" className="btn-primary flex items-center px-8">
              <Save className="mr-2 h-5 w-5" /> Execute Assignment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
