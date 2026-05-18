import React, { useEffect, useState } from 'react';
import api from '../lib/api';
import { Plus, Download, Printer } from 'lucide-react';
import { format } from 'date-fns';

export const HandoverList: React.FC = () => {
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDocs = async () => {
      try {
        const res = await api.get('/handover');
        setDocuments(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchDocs();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Handover Documents (BBBG)</h2>
          <p className="text-slate-500 text-sm">Track asset handovers and generate official documents.</p>
        </div>
        <button className="btn-primary flex items-center opacity-50 cursor-not-allowed">
          <Plus className="mr-2 h-5 w-5" /> New Handover
        </button>
      </div>

      <div className="table-container">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="p-4">Document No</th>
              <th className="p-4">Recipient</th>
              <th className="p-4">Department</th>
              <th className="p-4">Items</th>
              <th className="p-4">Date</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={6} className="p-8 text-center text-slate-500">Loading documents...</td></tr>
            ) : documents.length === 0 ? (
              <tr><td colSpan={6} className="p-8 text-center text-slate-500">No handover documents found.</td></tr>
            ) : documents.map((doc) => (
              <tr key={doc.id} className="hover:bg-slate-50/50">
                <td className="p-4 font-mono font-bold text-primary-700">{doc.documentNo}</td>
                <td className="p-4">
                  <div className="font-medium text-slate-900">{doc.recipientName}</div>
                  <div className="text-xs text-slate-500">{doc.recipientPosition}</div>
                </td>
                <td className="p-4 text-slate-600">{doc.recipientDepartment}</td>
                <td className="p-4">
                  <span className="bg-slate-100 px-2 py-0.5 rounded-full text-xs font-medium text-slate-600">
                    {doc._count?.items || 0} Assets
                  </span>
                </td>
                <td className="p-4 text-slate-500">{format(new Date(doc.createdAt), 'dd/MM/yyyy')}</td>
                <td className="p-4 text-right">
                  <div className="flex justify-end space-x-2">
                    <button className="p-2 hover:bg-white rounded border border-slate-200 text-slate-600 hover:text-primary-600 shadow-sm" title="Print PDF">
                      <Printer className="h-4 w-4" />
                    </button>
                    <button className="p-2 hover:bg-white rounded border border-slate-200 text-slate-600 hover:text-primary-600 shadow-sm" title="Download Excel">
                      <Download className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
