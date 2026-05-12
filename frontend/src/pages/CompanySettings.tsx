import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import { toast } from 'react-toastify';
import { Building2, Plus, Edit2, Power, PowerOff } from 'lucide-react';

export const CompanySettings: React.FC = () => {
  const [companies, setCompanies] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ code: '', name: '' });

  const loadCompanies = async () => {
    try {
      const res = await api.get('/settings/companies');
      setCompanies(res.data);
    } catch (err) {
      toast.error("Failed to load companies");
    }
  };

  useEffect(() => { loadCompanies(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/settings/companies', formData);
      toast.success("Company added");
      setIsModalOpen(false);
      setFormData({ code: '', name: '' });
      loadCompanies();
    } catch (err) {
      toast.error("Failed to add");
    }
  };

  const toggleStatus = async (id: number, active: boolean) => {
    try {
      await api.patch(`/settings/companies/${id}`, { isActive: !active });
      loadCompanies();
    } catch (err) {
      toast.error("Update failed");
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center">
            <Building2 className="mr-2 text-primary-600" /> Company Management
          </h1>
          <p className="text-slate-500 text-sm">Manage entities for asset ownership.</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="btn-primary flex items-center">
          <Plus className="mr-2 h-4 w-4" /> Add Company
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-bold tracking-wider">
            <tr>
              <th className="px-6 py-4">Code</th>
              <th className="px-6 py-4">Name</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {companies.map(c => (
              <tr key={c.id} className="hover:bg-slate-50/50">
                <td className="px-6 py-4 font-mono font-bold text-primary-700">{c.code}</td>
                <td className="px-6 py-4 text-slate-900">{c.name}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                    c.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {c.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <button onClick={() => toggleStatus(c.id, c.isActive)} className="p-2 hover:bg-slate-100 rounded-lg">
                    {c.isActive ? <PowerOff className="h-4 w-4 text-red-400" /> : <Power className="h-4 w-4 text-green-500" />}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-900">Add New Company</h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Company Code</label>
                <input 
                  type="text" 
                  className="input-field" 
                  required 
                  placeholder="e.g. 01"
                  value={formData.code} 
                  onChange={e => setFormData({...formData, code: e.target.value})} 
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Company Name</label>
                <input 
                  type="text" 
                  className="input-field" 
                  required 
                  placeholder="e.g. Danko Group"
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})} 
                />
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-all">
                  Cancel
                </button>
                <button type="submit" className="btn-primary px-6 py-2">
                  Save Company
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
