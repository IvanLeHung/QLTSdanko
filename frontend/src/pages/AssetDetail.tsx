import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { 
  ArrowLeft, 
  Copy, 
  Save, 
  History as HistoryIcon, 
  Wrench, 
  UserPlus, 
  ClipboardCheck,
  FileText,
  DollarSign,
  Calendar,
  Building
} from 'lucide-react';
import { toast } from 'react-toastify';
import { format } from 'date-fns';

export const AssetDetail: React.FC = () => {
  const { id } = useParams();
  const [asset, setAsset] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('general');
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState('');
  const navigate = useNavigate();

  const fetchAsset = async () => {
    try {
      const res = await api.get(`/assets/${id}`);
      setAsset(res.data);
      setEditedName(res.data.assetName);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load asset details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAsset();
  }, [id]);

  const handleSaveName = async () => {
    if (!editedName.trim()) {
      toast.error("Tên tài sản không được để trống");
      return;
    }

    try {
      await api.patch(`/assets/${id}`, { assetName: editedName });
      toast.success("Đã cập nhật tên tài sản");
      setIsEditing(false);
      fetchAsset();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Lỗi khi cập nhật tên");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
    </div>
  );
  if (!asset) return <div className="text-center py-12 text-slate-500 font-bold">Asset not found</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="flex items-center text-slate-500 hover:text-slate-900 transition-colors">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to list
        </button>
        <div className="flex space-x-3">
          {isEditing ? (
            <>
              <button onClick={() => setIsEditing(false)} className="btn-secondary">
                Hủy
              </button>
              <button onClick={handleSaveName} className="btn-primary flex items-center">
                <Save className="mr-2 h-4 w-4" /> Lưu tên mới
              </button>
            </>
          ) : (
            <button onClick={() => setIsEditing(true)} className="btn-secondary flex items-center">
              <FileText className="mr-2 h-4 w-4" /> Sửa tên tài sản
            </button>
          )}
          <button className="btn-primary">
            Asset Actions
          </button>
        </div>
      </div>

      {/* Main Info Card */}
      <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
        <div className="p-8 md:p-10 bg-slate-50/50 border-b border-slate-200">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-2">
                <span className="text-xs font-bold text-primary-600 bg-primary-50 px-2 py-1 rounded">ASSET_IDENTITY</span>
                <button onClick={() => copyToClipboard(asset.assetCode)} className="text-slate-300 hover:text-slate-500 transition-colors">
                  <Copy className="h-4 w-4" />
                </button>
              </div>
              <h1 className="text-4xl font-black text-slate-900 font-mono tracking-tighter uppercase">{asset.assetCode}</h1>
              
              {isEditing ? (
                <div className="mt-4">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Tên tài sản (đầy đủ)</label>
                  <textarea 
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    className="w-full text-xl font-bold text-slate-900 border-2 border-primary-100 rounded-xl p-3 focus:border-primary-500 focus:ring-0 transition-all bg-white shadow-inner"
                    rows={2}
                  />
                </div>
              ) : (
                <p className="text-2xl font-bold text-slate-600 mt-2">{asset.assetName}</p>
              )}

              <div className="flex items-center mt-3 text-slate-400 text-sm font-medium">
                <Building className="h-4 w-4 mr-2" />
                {asset.companyName} ({asset.companyCode})
              </div>
            </div>
            <div className="flex flex-col items-end">
              <span className={`px-6 py-2 rounded-2xl text-xs font-black uppercase tracking-widest border-2 shadow-sm ${
                asset.status === 'IN_STOCK' ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                asset.status === 'ASSIGNED' ? "bg-sky-50 text-sky-700 border-sky-100" :
                "bg-slate-50 text-slate-700 border-slate-100"
              }`}>
                {asset.status}
              </span>
              <p className="text-[10px] text-slate-400 mt-2 font-bold uppercase tracking-tighter">Current Status</p>
            </div>
          </div>
        </div>

        {/* Tabs Navigation */}
        <div className="flex border-b border-slate-200 bg-white overflow-x-auto no-scrollbar">
          {[
            { id: 'general', name: 'Thông tin chung', icon: FileText },
            { id: 'accounting', name: 'Mua sắm & Kế toán', icon: DollarSign },
            { id: 'lifecycle', name: 'Lịch sử vòng đời', icon: HistoryIcon },
            { id: 'assignments', name: 'Lịch sử bàn giao', icon: UserPlus },
            { id: 'logs', name: 'Nhật ký chỉnh sửa', icon: ClipboardCheck },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-8 py-5 text-sm font-bold border-b-4 flex items-center space-x-3 transition-all whitespace-nowrap ${
                activeTab === tab.id 
                  ? "border-primary-600 text-primary-600 bg-primary-50/20" 
                  : "border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-50"
              }`}
            >
              <tab.icon className="h-5 w-5" />
              <span>{tab.name}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="p-8 md:p-12">
          {activeTab === 'general' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
              <section className="space-y-6">
                <div className="flex items-center space-x-2 border-b border-slate-100 pb-2">
                  <div className="w-1.5 h-4 bg-primary-600 rounded-full"></div>
                  <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">Classification</h3>
                </div>
                <div className="space-y-1">
                  <DetailRow label="Category (L2)" value={asset.level2Name} />
                  <DetailRow label="Subcategory (L3)" value={asset.level3Name} />
                  <DetailRow label="Classification (L4)" value={asset.level4Name} />
                  <DetailRow label="Serial Number" value={asset.serialNumber} copy />
                  <DetailRow label="Unit" value={asset.unit} />
                  <DetailRow label="Giấy tờ" value={asset.documentNote} />
                </div>
              </section>

              <section className="space-y-6">
                <div className="flex items-center space-x-2 border-b border-slate-100 pb-2">
                  <div className="w-1.5 h-4 bg-primary-600 rounded-full"></div>
                  <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">Usage Details</h3>
                </div>
                <div className="space-y-1">
                  <DetailRow label="Current User" value={asset.currentUserName} />
                  <DetailRow label="Position" value={asset.currentPosition} />
                  <DetailRow label="Department" value={asset.departmentName} />
                  <DetailRow label="Location" value={asset.locationName} />
                  <DetailRow label="City" value={asset.cityName} />
                  <DetailRow label="Ngày bàn giao" value={asset.handoverDate ? format(new Date(asset.handoverDate), 'dd/MM/yyyy') : '-'} />
                </div>
              </section>

              <section className="space-y-6">
                <div className="flex items-center space-x-2 border-b border-slate-100 pb-2">
                  <div className="w-1.5 h-4 bg-primary-600 rounded-full"></div>
                  <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">System Info</h3>
                </div>
                <div className="space-y-1">
                  <DetailRow label="Date Registered" value={format(new Date(asset.createdAt), 'dd/MM/yyyy HH:mm')} />
                  <DetailRow label="Last Update" value={format(new Date(asset.updatedAt), 'dd/MM/yyyy HH:mm')} />
                  <DetailRow label="Internal ID" value={`#${asset.id}`} />
                </div>
              </section>
            </div>
          )}

          {activeTab === 'accounting' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-4xl">
               <section className="space-y-6">
                <div className="flex items-center space-x-2 border-b border-slate-100 pb-2">
                  <DollarSign className="h-4 w-4 text-emerald-600" />
                  <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">Financials</h3>
                </div>
                <div className="space-y-1">
                  <DetailRow label="Purchase Price (Ex VAT)" value={`${asset.purchasePriceExVat?.toLocaleString()} ₫`} />
                  <DetailRow label="Supplier" value={asset.supplierName} />
                  <DetailRow label="Usage Purpose" value={asset.usagePurpose} />
                </div>
              </section>

              <section className="space-y-6">
                <div className="flex items-center space-x-2 border-b border-slate-100 pb-2">
                  <Calendar className="h-4 w-4 text-sky-600" />
                  <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">Timeline</h3>
                </div>
                <div className="space-y-1">
                  <DetailRow label="Purchase Date" value={asset.purchaseDate ? format(new Date(asset.purchaseDate), 'dd/MM/yyyy') : '-'} />
                  <DetailRow label="Depreciation End" value={asset.depreciationEndDate ? format(new Date(asset.depreciationEndDate), 'dd/MM/yyyy') : '-'} />
                </div>
              </section>
            </div>
          )}

          {activeTab === 'lifecycle' && (
            <div className="space-y-6 max-w-3xl">
              {asset.events.length === 0 ? (
                <p className="text-slate-400 italic">No events recorded yet.</p>
              ) : asset.events.map((event: any) => (
                <div key={event.id} className="relative pl-10 pb-8 last:pb-0 border-l-2 border-slate-100">
                  <div className="absolute left-[-9px] top-0 w-4 h-4 bg-primary-600 rounded-full border-4 border-white shadow-sm"></div>
                  <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-black text-slate-900">{event.eventType}</p>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        {format(new Date(event.eventDate), 'dd/MM/yyyy HH:mm')}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 leading-relaxed">{event.description}</p>
                    {event.newStatus && (
                      <div className="mt-3 inline-flex items-center px-3 py-1 rounded-full bg-white border border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-widest shadow-sm">
                        Status Change: {event.newStatus}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'assignments' && (
             <div className="table-container rounded-2xl overflow-hidden border-slate-100 shadow-xl shadow-slate-100">
               <table className="w-full text-left text-sm">
                  <thead className="bg-slate-900 text-white">
                    <tr>
                      <th className="p-4 font-bold uppercase tracking-widest text-[10px]">Date</th>
                      <th className="p-4 font-bold uppercase tracking-widest text-[10px]">Recipient User</th>
                      <th className="p-4 font-bold uppercase tracking-widest text-[10px]">Department</th>
                      <th className="p-4 font-bold uppercase tracking-widest text-[10px]">Location</th>
                      <th className="p-4 font-bold uppercase tracking-widest text-[10px]">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {asset.assignments.length === 0 ? (
                      <tr><td colSpan={5} className="p-8 text-center text-slate-400 italic">No assignment history found.</td></tr>
                    ) : asset.assignments.map((asgn: any) => (
                      <tr key={asgn.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-4 font-mono font-bold text-slate-400">{format(new Date(asgn.effectiveAt), 'dd/MM/yyyy')}</td>
                        <td className="p-4 font-bold text-slate-900">{asgn.newUserName}</td>
                        <td className="p-4 text-slate-600">{asgn.newDepartmentName}</td>
                        <td className="p-4 text-slate-600">{asgn.newLocationName}</td>
                        <td className="p-4">
                          <span className="px-3 py-1 rounded-full bg-slate-100 text-[10px] font-black uppercase tracking-tighter">{asgn.newStatus}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
               </table>
             </div>
          )}

          {activeTab === 'logs' && (
             <div className="space-y-6 max-w-4xl">
               {(!asset.auditLogs || asset.auditLogs.length === 0) ? (
                 <p className="text-slate-400 italic">Chưa có lịch sử thay đổi từ hệ thống log mới.</p>
               ) : (
                 <div className="space-y-4">
                   {asset.auditLogs.map((log: any) => (
                     <div key={log.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:border-primary-200 transition-colors">
                       <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                         <div className="flex items-center space-x-3">
                           <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest ${
                             log.action === 'CREATE' ? 'bg-emerald-100 text-emerald-700' :
                             log.action === 'UPDATE' ? 'bg-amber-100 text-amber-700' :
                             'bg-slate-200 text-slate-700'
                           }`}>
                             {log.action}
                           </span>
                           <span className="text-sm font-bold text-slate-700">{log.performedBy}</span>
                         </div>
                         <span className="text-[11px] font-medium text-slate-400">
                           {format(new Date(log.createdAt), 'dd/MM/yyyy HH:mm:ss')}
                         </span>
                       </div>
                       <div className="p-4">
                         {renderAuditDetails(log.details)}
                       </div>
                     </div>
                   ))}
                 </div>
               )}
             </div>
          )}
        </div>
      </div>
    </div>
  );
};

const renderAuditDetails = (detailsStr: string) => {
  if (!detailsStr) return <p className="text-xs text-slate-400 italic">Không có chi tiết thay đổi.</p>;
  try {
    const details = JSON.parse(detailsStr);
    
    // If it's a field-by-field change (from logAssetChange)
    if (typeof details === 'object' && !Array.isArray(details)) {
      return (
        <div className="grid grid-cols-1 gap-2">
          {Object.entries(details).map(([field, values]: [string, any]) => (
            <div key={field} className="flex items-center space-x-4 text-xs">
              <span className="w-24 font-bold text-slate-500 uppercase tracking-tighter shrink-0">{field}</span>
              <div className="flex items-center space-x-2 flex-1 overflow-hidden">
                <span className="text-slate-400 line-through truncate">{String(values.old || 'null')}</span>
                <span className="text-slate-300">→</span>
                <span className="text-emerald-600 font-bold truncate">{String(values.new || 'null')}</span>
              </div>
            </div>
          ))}
        </div>
      );
    }
    
    return <pre className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded">{JSON.stringify(details, null, 2)}</pre>;
  } catch (e) {
    return <p className="text-xs text-slate-600">{detailsStr}</p>;
  }
};

const DetailRow: React.FC<{ label: string, value: any, copy?: boolean }> = ({ label, value, copy }) => (
  <div className="flex flex-col py-3 border-b border-slate-50 last:border-0">
    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{label}</span>
    <div className="flex items-center space-x-2">
      <span className="text-sm font-bold text-slate-900">{value || '-'}</span>
      {copy && value && (
        <button onClick={() => navigator.clipboard.writeText(value)} className="text-slate-300 hover:text-primary-600 transition-colors">
          <Copy className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  </div>
);
