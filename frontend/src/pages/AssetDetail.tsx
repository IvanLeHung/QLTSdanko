import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { 
  ArrowLeft, 
  Copy, 
  Save, 
  History as HistoryIcon, 
  UserPlus, 
  ClipboardCheck,
  FileText,
  DollarSign,
  Calendar,
  Building,
  Lock,
  Search,
  Filter,
  FileDown,
  Eye,
  EyeOff,
  Activity,
  FileSpreadsheet
} from 'lucide-react';
import { toast } from 'react-toastify';
import { format } from 'date-fns';
import { useAuth } from '../context/AuthContext';

const isPublicCompany = (name?: string) => {
  if (!name) return true;
  const n = name.toLowerCase();
  return n.includes('danko group') || n.includes('không có thông tin') || n.includes('khong co thong tin');
};

export const AssetDetail: React.FC = () => {
  const { hasPermission } = useAuth();
  const { id } = useParams();
  const [asset, setAsset] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('general');
  const [isEditing, setIsEditing] = useState(false);
  const [isCompanyRevealed, setIsCompanyRevealed] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [logFilter, setLogFilter] = useState<'ALL' | 'ASSIGN' | 'RECALL' | 'IMPORT' | 'EDIT'>('ALL');
  const [logSearch, setLogSearch] = useState('');
  const [selectedRawEvent, setSelectedRawEvent] = useState<any>(null);
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
                <span>
                  {(!asset.companyName || isPublicCompany(asset.companyName) || isCompanyRevealed) 
                    ? asset.companyName 
                    : '*****'}
                </span>
                {asset.companyName && !isPublicCompany(asset.companyName) && (
                  <button 
                    onClick={() => setIsCompanyRevealed(!isCompanyRevealed)} 
                    className="ml-2 p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600 transition-colors"
                    title={isCompanyRevealed ? "Ẩn tên công ty" : "Xem tên công ty"}
                  >
                    {isCompanyRevealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                )}
                <span className="ml-1">({asset.companyCode})</span>
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
                  {hasPermission('ASSET_VIEW_PRICE') ? (
                    <DetailRow label="Purchase Price (Ex VAT)" value={`${asset.purchasePriceExVat?.toLocaleString()} ₫`} />
                  ) : (
                    <div className="flex flex-col py-3 border-b border-slate-50 last:border-0">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Purchase Price (Ex VAT)</span>
                      <span className="inline-flex items-center gap-1 text-slate-450 text-xs font-semibold"><Lock className="w-3.5 h-3.5" /> Không có quyền xem</span>
                    </div>
                  )}
                  {hasPermission('ASSET_VIEW_PRICE') ? (
                    <DetailRow label="Supplier" value={asset.supplierName} />
                  ) : (
                    <div className="flex flex-col py-3 border-b border-slate-50 last:border-0">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Supplier</span>
                      <span className="inline-flex items-center gap-1 text-slate-450 text-xs font-semibold"><Lock className="w-3.5 h-3.5" /> Không có quyền xem</span>
                    </div>
                  )}
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

          {activeTab === 'logs' && (() => {
            // Unify system audit logs
            const systemEvents = (asset.auditLogs || []).map((log: any) => {
              let fields: Record<string, { old: any; new: any }> = {};
              let note = '';
              try {
                const parsed = JSON.parse(log.details);
                if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                  if (parsed.message) note = parsed.message;
                  if (parsed.updates) {
                    Object.entries(parsed.updates).forEach(([k, v]) => {
                      fields[k] = { old: asset[k], new: v };
                    });
                  } else {
                    Object.entries(parsed).forEach(([k, v]) => {
                      if (k !== 'message' && k !== 'reason') {
                        const val = v as any;
                        fields[k] = { old: val?.old, new: val?.new };
                      }
                    });
                  }
                }
              } catch (e) {
                note = log.details;
              }

              let title = 'Sửa thông tin tài sản';
              if (log.action === 'CREATE') title = 'Nhập mới tài sản';
              else if (fields.status) {
                const nextStatus = fields.status.new;
                if (nextStatus === 'ASSIGNED') title = 'Bàn giao tài sản';
                else if (nextStatus === 'IN_STOCK') title = 'Thu hồi tài sản';
                else title = 'Cập nhật trạng thái';
              }

              return {
                id: `sys-${log.id}`,
                time: new Date(log.createdAt),
                title,
                source: 'Hệ thống' as const,
                actionType: log.action,
                performedBy: log.performedBy || 'system',
                details: fields,
                note
              };
            });

            // Unify imported histories
            const importedEvents = (asset.histories || []).map((h: any) => {
              const fields: Record<string, { old: any; new: any }> = {};
              if (h.oldStatus !== h.newStatus) fields['Trạng thái'] = { old: h.oldStatus, new: h.newStatus };
              if (h.oldUserName !== h.newUserName) fields['Người dùng'] = { old: h.oldUserName, new: h.newUserName };
              if (h.oldDepartmentName !== h.newDepartmentName) fields['Phòng ban'] = { old: h.oldDepartmentName, new: h.newDepartmentName };
              if (h.oldLocationName !== h.newLocationName) fields['Vị trí'] = { old: h.oldLocationName, new: h.newLocationName };
              if (h.oldProjectName !== h.newProjectName) fields['Dự án'] = { old: h.oldProjectName, new: h.newProjectName };
              if (h.oldCityName !== h.newCityName) fields['Thành phố'] = { old: h.oldCityName, new: h.newCityName };
              if (h.oldNote !== h.newNote) fields['Ghi chú'] = { old: h.oldNote, new: h.newNote };

              let title = 'Import lịch sử';
              if (h.newStatus === 'ASSIGNED') title = 'Điều chuyển tài sản';
              else if (h.newStatus === 'LOST') title = 'Báo mất tài sản';
              else if (h.newStatus === 'BROKEN') title = 'Báo hỏng tài sản';
              else if (h.newStatus === 'IN_STOCK' && h.oldStatus === 'ASSIGNED') title = 'Thu hồi tài sản';

              return {
                id: `imp-${h.id}`,
                time: new Date(h.eventTime),
                title,
                source: 'Import Excel' as const,
                actionType: h.actionType,
                performedBy: h.importedById ? `User #${h.importedById}` : 'Excel Importer',
                details: fields,
                note: h.newNote || h.oldNote || '',
                rawJson: h.rawImportJson
              };
            });

            // Merge & Filter
            const allEvents = [...systemEvents, ...importedEvents].sort(
              (a, b) => b.time.getTime() - a.time.getTime()
            );

            const filteredEvents = allEvents.filter(ev => {
              if (logFilter === 'ASSIGN' && !ev.title.includes('Bàn giao') && !ev.title.includes('Điều chuyển')) return false;
              if (logFilter === 'RECALL' && !ev.title.includes('Thu hồi')) return false;
              if (logFilter === 'IMPORT' && ev.source !== 'Import Excel') return false;
              if (logFilter === 'EDIT' && (ev.title.includes('Bàn giao') || ev.title.includes('Điều chuyển') || ev.title.includes('Thu hồi'))) return false;

              if (logSearch.trim()) {
                const searchLower = logSearch.toLowerCase();
                const noteMatch = ev.note?.toLowerCase().includes(searchLower);
                const titleMatch = ev.title.toLowerCase().includes(searchLower);
                const userMatch = ev.performedBy.toLowerCase().includes(searchLower);
                if (!noteMatch && !titleMatch && !userMatch) return false;
              }
              return true;
            });

            const handleExportHistory = () => {
              try {
                const csvHeaders = ['Thời gian', 'Loại sự kiện', 'Nguồn', 'Người thực hiện', 'Thay đổi', 'Ghi chú'];
                const csvRows = allEvents.map(ev => {
                  const changesStr = Object.entries(ev.details)
                    .map(([k, v]) => {
                      const val = v as any;
                      return `${k}: ${val.old || '-'} -> ${val.new || '-'}`;
                    })
                    .join('; ');
                  return [
                    format(ev.time, 'dd/MM/yyyy HH:mm:ss'),
                    ev.title,
                    ev.source,
                    ev.performedBy,
                    changesStr,
                    ev.note || '-'
                  ].map(val => `"${val.replace(/"/g, '""')}"`).join(',');
                });

                const BOM = '\uFEFF';
                const csvContent = BOM + [csvHeaders.join(','), ...csvRows].join('\n');
                const blob = new Blob([csvContent], { type: 'text/csv; charset=utf-8' });
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.setAttribute('download', `lich_su_${asset.assetCode}.csv`);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              } catch (e) {
                toast.error("Lỗi khi xuất lịch sử");
              }
            };

            return (
              <div className="space-y-6 max-w-4xl">
                {/* Search & Filters bar */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex flex-1 items-center space-x-2 bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl">
                    <Search className="h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Tìm theo ghi chú, sự kiện, người dùng..."
                      value={logSearch}
                      onChange={(e) => setLogSearch(e.target.value)}
                      className="bg-transparent border-0 text-sm focus:ring-0 w-full font-medium text-slate-800"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={logFilter}
                      onChange={(e: any) => setLogFilter(e.target.value)}
                      className="text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-xl px-3 py-2 focus:ring-0 shadow-sm"
                    >
                      <option value="ALL">Tất cả sự kiện</option>
                      <option value="ASSIGN">Bàn giao & Điều chuyển</option>
                      <option value="RECALL">Thu hồi tài sản</option>
                      <option value="IMPORT">Import từ Excel</option>
                      <option value="EDIT">Thay đổi thông tin</option>
                    </select>

                    <button
                      onClick={handleExportHistory}
                      className="flex items-center px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold shadow-md hover:bg-slate-800 transition-all"
                    >
                      <FileDown className="mr-1.5 h-3.5 w-3.5" /> Xuất lịch sử tài sản
                    </button>
                  </div>
                </div>

                {filteredEvents.length === 0 ? (
                  <p className="text-slate-400 italic text-center py-6">Chưa có lịch sử thay đổi phù hợp bộ lọc.</p>
                ) : (
                  <div className="relative border-l-2 border-slate-200 pl-6 ml-4 space-y-8">
                    {filteredEvents.map((ev) => (
                      <div key={ev.id} className="relative group">
                        {/* Dot Indicator */}
                        <div className="absolute -left-[33px] top-1.5 w-4 h-4 rounded-full border-2 border-white bg-primary-600 shadow-md group-hover:scale-125 transition-transform" />

                        {/* Card Box */}
                        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md hover:border-primary-300 transition-all duration-200">
                          <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <span className="text-sm font-black text-slate-800 flex items-center">
                                <Activity className="mr-1.5 h-4 w-4 text-primary-500" />
                                {ev.title}
                              </span>
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${
                                ev.source === 'Import Excel' ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' : 'bg-slate-100 text-slate-700'
                              }`}>
                                {ev.source}
                              </span>
                            </div>
                            <span className="text-[11px] font-bold text-slate-400">
                              {format(ev.time, 'dd/MM/yyyy HH:mm:ss')}
                            </span>
                          </div>

                          <div className="p-4 space-y-4">
                            {/* Comparison table */}
                            {Object.keys(ev.details).length > 0 && (
                              <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                  <tr className="text-slate-400 font-mono text-[9px] uppercase tracking-wider">
                                    <th className="pb-2 border-b border-slate-50 font-black w-24">Trường</th>
                                    <th className="pb-2 border-b border-slate-50 font-black">Trước</th>
                                    <th className="pb-2 border-b border-slate-50 font-black">Sau</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 font-medium">
                                  {Object.entries(ev.details).map(([field, values]: [string, any]) => (
                                    <tr key={field} className="hover:bg-slate-50/50">
                                      <td className="py-2 text-slate-500 font-bold uppercase text-[10px] tracking-tight">{field}</td>
                                      <td className="py-2 text-slate-400 line-through truncate max-w-[150px]">{values.old || '-'}</td>
                                      <td className="py-2 text-emerald-600 font-bold truncate max-w-[150px]">{values.new || '-'}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            )}

                            {/* Perform by & Note */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-slate-50 pt-3 text-xs">
                              <div className="flex items-center space-x-1 text-slate-500">
                                <span className="font-medium">Người thực hiện:</span>
                                <span className="font-bold text-slate-800">{ev.performedBy}</span>
                              </div>
                              {ev.note && (
                                <div className="flex items-center space-x-1 text-slate-500 italic">
                                  <span className="font-medium">Ghi chú:</span>
                                  <span className="text-slate-700">{ev.note}</span>
                                </div>
                              )}
                              {ev.rawJson && (
                                <button
                                  onClick={() => setSelectedRawEvent(ev)}
                                  className="text-[10px] font-bold text-primary-600 hover:text-primary-800 transition-colors flex items-center"
                                >
                                  <Eye className="w-3.5 h-3.5 mr-1" /> Chi tiết raw JSON
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Raw JSON detail modal */}
                {selectedRawEvent && (
                  <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl w-full max-w-lg p-6 shadow-2xl space-y-4">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                        <h3 className="text-lg font-black text-slate-900 flex items-center">
                          <FileSpreadsheet className="w-5 h-5 mr-2 text-primary-500" />
                          Chi tiết raw Excel Record
                        </h3>
                        <button 
                          onClick={() => setSelectedRawEvent(null)}
                          className="text-slate-400 hover:text-slate-700 font-black text-lg p-1"
                        >
                          ✕
                        </button>
                      </div>
                      <div className="max-h-[350px] overflow-y-auto bg-slate-950 p-4 rounded-2xl text-[11px] font-mono text-emerald-400">
                        <pre>{JSON.stringify(JSON.parse(selectedRawEvent.rawJson || '{}'), null, 2)}</pre>
                      </div>
                      <div className="flex justify-end pt-2">
                        <button
                          onClick={() => setSelectedRawEvent(null)}
                          className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold shadow-md hover:bg-slate-800"
                        >
                          Đóng lại
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
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
