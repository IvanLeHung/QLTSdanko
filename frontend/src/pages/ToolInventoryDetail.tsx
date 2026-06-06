import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { 
  ChevronLeft, 
  Search, 
  Filter, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Package, 
  MapPin, 
  ClipboardList, 
  Save, 
  Lock, 
  Upload, 
  Check, 
  Trash2,
  X,
  Image as ImageIcon
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'react-toastify';

export const ToolInventoryDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('ALL'); // ALL, PENDING, CHECKED
  
  // Selected item modal state
  const [selectedItemForCheck, setSelectedItemForCheck] = useState<any>(null);
  const [checkForm, setCheckForm] = useState<any>({
    checkCondition: 'FOUND', // FOUND, MISSING, DAMAGED, WRONG_LOCATION
    actualLocation: '',
    actualStatus: 'IN_STOCK',
    quality: 'GOOD',
    note: '',
    actualGoodQty: 0,
    actualRepairQty: 0,
    actualBrokenQty: 0,
    actualLostQty: 0,
    photos: [] as string[]
  });
  
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const fetchDetail = async () => {
    try {
      const res = await api.get(`/tools/inventory/${id}`);
      setSession(res.data);
    } catch (err) {
      console.error(err);
      toast.error("Không thể tải thông tin đợt kiểm kê CCDC");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [id]);

  const uploadToCloudinary = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', 'ccdcdanko');
    const res = await fetch('https://api.cloudinary.com/v1_1/drjajjthw/image/upload', {
      method: 'POST',
      body: formData
    });
    if (!res.ok) throw new Error('Failed to upload image');
    const data = await res.json();
    return data.secure_url;
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setUploadingPhoto(true);
    try {
      const urls: string[] = [];
      for (let i = 0; i < e.target.files.length; i++) {
        const url = await uploadToCloudinary(e.target.files[i]);
        urls.push(url);
      }
      setCheckForm((prev: any) => ({
        ...prev,
        photos: [...prev.photos, ...urls]
      }));
      toast.success("Tải ảnh kiểm kê thành công");
    } catch (err) {
      console.error(err);
      toast.error("Lỗi khi tải ảnh lên Cloudinary");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const removePhoto = (index: number) => {
    setCheckForm((prev: any) => ({
      ...prev,
      photos: prev.photos.filter((_: any, i: number) => i !== index)
    }));
  };

  const openCheckModal = (item: any) => {
    setSelectedItemForCheck(item);
    setCheckForm({
      checkCondition: item.checkCondition || 'FOUND',
      actualLocation: item.actualLocation || item.expectedLocation || item.tool.locationName || '',
      actualStatus: item.actualStatus || item.expectedStatus || 'IN_STOCK',
      quality: item.quality || 'GOOD',
      note: item.note || '',
      actualGoodQty: item.actualGoodQty !== undefined ? item.actualGoodQty : item.expectedQuantity,
      actualRepairQty: item.actualRepairQty || 0,
      actualBrokenQty: item.actualBrokenQty || 0,
      actualLostQty: item.actualLostQty || 0,
      photos: item.photos || []
    });
  };

  const handleCheckItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemForCheck) return;
    setSubmitting(true);
    try {
      const isQtyMode = selectedItemForCheck.tool.managementType === 'QUANTITY';
      let payload: any = {
        toolId: selectedItemForCheck.toolId,
        checkCondition: checkForm.checkCondition,
        note: checkForm.note,
        photos: checkForm.photos,
        actualLocation: checkForm.actualLocation,
        actualStatus: checkForm.actualStatus,
        quality: checkForm.quality
      };

      if (isQtyMode) {
        payload.actualGoodQty = Number(checkForm.actualGoodQty);
        payload.actualRepairQty = Number(checkForm.actualRepairQty);
        payload.actualBrokenQty = Number(checkForm.actualBrokenQty);
        payload.actualLostQty = Number(checkForm.actualLostQty);
      }

      await api.post(`/tools/inventory/${id}/check`, payload);
      toast.success("Đã lưu kết quả kiểm kê thành công");
      setSelectedItemForCheck(null);
      fetchDetail();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || "Lỗi khi lưu kết quả kiểm kê");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCompleteSession = async () => {
    if (!window.confirm("Bạn có chắc chắn muốn hoàn tất đợt kiểm kê? Dữ liệu thực tế sẽ được cập nhật vào kho CCDC.")) return;
    setSubmitting(true);
    try {
      await api.post(`/tools/inventory/${id}/complete`);
      toast.success("Đã hoàn tất đợt kiểm kê CCDC thành công!");
      fetchDetail();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || "Lỗi khi hoàn tất đợt kiểm kê");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredItems = session?.items.filter((item: any) => {
    const toolName = item.tool.toolName.toLowerCase();
    const toolCode = item.tool.toolCode.toLowerCase();
    const matchesSearch = toolName.includes(search.toLowerCase()) || toolCode.includes(search.toLowerCase());
    
    if (filter === 'PENDING') {
      return matchesSearch && item.checkStatus === 'PENDING';
    }
    if (filter === 'CHECKED') {
      return matchesSearch && item.checkStatus === 'CHECKED';
    }
    return matchesSearch;
  }) || [];

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center space-x-4">
          <button 
            onClick={() => navigate('/tools/inventory')}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all border-0 cursor-pointer"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-[900] text-[#0F172A] tracking-tight leading-none">
                {session?.inventoryName}
              </h1>
              <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider border ${
                session?.status === 'OPEN' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-purple-50 text-purple-650 border-purple-100'
              }`}>
                {session?.status === 'OPEN' ? 'Đang mở' : 'Đã hoàn tất'}
              </span>
            </div>
            <p className="text-slate-500 text-xs mt-2 font-semibold flex items-center gap-4">
              <span>Mã đợt: <strong className="font-mono">{session?.inventoryCode}</strong></span>
              <span>Ngày tạo: <strong>{session?.inventoryDate && format(new Date(session.inventoryDate), 'dd/MM/yyyy')}</strong></span>
              <span>Phạm vi: <strong>{session?.scopeType === 'ALL' ? 'Toàn công ty' : session?.scopeType === 'DEPARTMENT' ? 'Bộ phận' : 'Vị trí'} {session?.scopeValue ? `(${session.scopeValue})` : ''}</strong></span>
            </p>
          </div>
        </div>

        {session?.status === 'OPEN' && (
          <button 
            onClick={handleCompleteSession}
            disabled={submitting}
            className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-3.5 rounded-xl font-bold text-sm transition-all flex items-center shadow-lg disabled:opacity-50"
          >
            <Lock className="mr-2 h-4 w-4 text-orange-500" /> Hoàn tất đợt kiểm kê
          </button>
        )}
      </div>

      {/* SEARCH AND FILTERS */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-lg">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Tìm theo mã CCDC, tên CCDC..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 font-semibold"
          />
        </div>

        <div className="flex items-center space-x-2">
          <button 
            onClick={() => setFilter('ALL')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
              filter === 'ALL' ? 'bg-orange-600 border-orange-600 text-white shadow-md' : 'bg-white border-slate-200 text-slate-650 hover:bg-slate-50'
            }`}
          >
            Tất cả ({session?.items?.length || 0})
          </button>
          <button 
            onClick={() => setFilter('PENDING')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
              filter === 'PENDING' ? 'bg-orange-600 border-orange-600 text-white shadow-md' : 'bg-white border-slate-200 text-slate-650 hover:bg-slate-50'
            }`}
          >
            Chờ kiểm ({session?.items?.filter((i: any) => i.checkStatus === 'PENDING').length || 0})
          </button>
          <button 
            onClick={() => setFilter('CHECKED')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
              filter === 'CHECKED' ? 'bg-orange-600 border-orange-600 text-white shadow-md' : 'bg-white border-slate-200 text-slate-650 hover:bg-slate-50'
            }`}
          >
            Đã kiểm ({session?.items?.filter((i: any) => i.checkStatus === 'CHECKED').length || 0})
          </button>
        </div>
      </div>

      {/* ITEMS LIST */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-200">
                <th className="p-4 text-xs font-black text-slate-400 uppercase tracking-widest">CCDC</th>
                <th className="p-4 text-xs font-black text-slate-400 uppercase tracking-widest">Phương thức quản lý</th>
                <th className="p-4 text-xs font-black text-slate-400 uppercase tracking-widest text-center">Sổ sách</th>
                <th className="p-4 text-xs font-black text-slate-400 uppercase tracking-widest text-center">Thực tế (Tốt / Sửa / Hủy / Mất)</th>
                <th className="p-4 text-xs font-black text-slate-400 uppercase tracking-widest text-center">Chênh lệch</th>
                <th className="p-4 text-xs font-black text-slate-400 uppercase tracking-widest">Kết quả</th>
                <th className="p-4 text-xs font-black text-slate-400 uppercase tracking-widest">Hình ảnh</th>
                <th className="p-4 text-xs font-black text-slate-400 uppercase tracking-widest text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-20 text-center">
                    <Loader2 className="h-10 w-10 text-orange-600 animate-spin mx-auto" />
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-20 text-center">
                    <Package className="h-10 w-10 text-slate-200 mx-auto mb-2" />
                    <p className="text-slate-400 font-bold text-sm">Không tìm thấy công cụ dụng cụ nào</p>
                  </td>
                </tr>
              ) : filteredItems.map((item: any) => {
                const totalActual = (item.actualGoodQty || 0) + (item.actualRepairQty || 0) + (item.actualBrokenQty || 0) + (item.actualLostQty || 0);
                const isQty = item.tool.managementType === 'QUANTITY';

                return (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4">
                      <div>
                        <span className="text-xs font-mono font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded uppercase">{item.tool.toolCode}</span>
                        <h4 className="text-sm font-[800] text-slate-800 mt-1">{item.tool.toolName}</h4>
                        <div className="flex gap-4 text-xs text-slate-400 mt-1">
                          <span>Phân loại: <strong>{item.tool.category}</strong></span>
                          <span>ĐVT: <strong>{item.tool.unit}</strong></span>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded text-[10px] font-bold ${
                        isQty ? 'bg-blue-50 text-blue-600 border border-blue-100' : 'bg-amber-50 text-amber-600 border border-amber-100'
                      }`}>
                        {isQty ? 'Theo Số Lượng' : 'Theo Cá Thể'}
                      </span>
                    </td>
                    <td className="p-4 text-center font-bold text-slate-700">{item.expectedQuantity}</td>
                    <td className="p-4 text-center font-semibold text-slate-700">
                      {item.checkStatus === 'PENDING' ? (
                        <span className="text-slate-400 text-xs italic">Chưa kiểm kê</span>
                      ) : (
                        <span>
                          {item.actualGoodQty} / {item.actualRepairQty} / {item.actualBrokenQty} / {item.actualLostQty}
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-center font-bold">
                      {item.checkStatus === 'PENDING' ? (
                        '-'
                      ) : item.mismatchQty === 0 ? (
                        <span className="text-emerald-600">0</span>
                      ) : item.mismatchQty > 0 ? (
                        <span className="text-blue-600">+{item.mismatchQty}</span>
                      ) : (
                        <span className="text-rose-600">{item.mismatchQty}</span>
                      )}
                    </td>
                    <td className="p-4">
                      {item.checkStatus === 'PENDING' ? (
                        <span className="px-2 py-1 rounded bg-slate-100 text-slate-400 text-[10px] font-bold">CHỜ KIỂM</span>
                      ) : (
                        <span className={`px-2 py-1 rounded text-[10px] font-bold ${
                          item.result === 'MATCHED' ? 'bg-emerald-55 text-emerald-650' : 'bg-rose-55 text-rose-650'
                        }`}>
                          {item.result === 'MATCHED' ? 'KHỚP SỔ' : item.result || 'SAI LỆCH'}
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      {item.photos && item.photos.length > 0 ? (
                        <div className="flex -space-x-2">
                          {item.photos.slice(0, 3).map((photo: string, idx: number) => (
                            <img 
                              key={idx} 
                              src={photo} 
                              alt="CCDC Proof" 
                              className="w-8 h-8 rounded-full border-2 border-white object-cover shadow-sm bg-slate-100" 
                            />
                          ))}
                          {item.photos.length > 3 && (
                            <div className="w-8 h-8 rounded-full border-2 border-white bg-slate-200 text-slate-650 text-[10px] font-bold flex items-center justify-center">
                              +{item.photos.length - 3}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-350 text-xs italic">Không có ảnh</span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      {session?.status === 'OPEN' ? (
                        <button 
                          onClick={() => openCheckModal(item)}
                          className="px-3 py-1.5 bg-orange-50 hover:bg-orange-100 text-orange-650 rounded-lg text-xs font-bold transition-all border-0 cursor-pointer"
                        >
                          Kiểm kê
                        </button>
                      ) : (
                        <span className="text-slate-400 text-xs">Không thể sửa</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* CHECK ITEM MODAL */}
      {selectedItemForCheck && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-orange-600 rounded-lg flex items-center justify-center text-white">
                  <ClipboardList className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-[900] text-slate-800 tracking-tight">
                    {selectedItemForCheck.tool.toolName}
                  </h3>
                  <span className="text-xs font-mono font-bold text-slate-400">
                    Mã CCDC: {selectedItemForCheck.tool.toolCode}
                  </span>
                </div>
              </div>
              <button 
                onClick={() => setSelectedItemForCheck(null)} 
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-200 text-slate-400 transition-colors border-0 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCheckItem} className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Sổ sách gốc</label>
                  <div className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700">
                    {selectedItemForCheck.expectedQuantity} {selectedItemForCheck.tool.unit}
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Vị trí dự kiến</label>
                  <div className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 text-xs font-semibold text-slate-650 flex items-center">
                    <MapPin className="h-4 w-4 mr-1.5 text-slate-450" />
                    {selectedItemForCheck.expectedLocation || 'Chưa định vị'}
                  </div>
                </div>
              </div>

              {selectedItemForCheck.tool.managementType === 'QUANTITY' ? (
                <div className="space-y-4 bg-slate-50 p-4 rounded-2xl border border-slate-150">
                  <h4 className="text-xs font-bold text-slate-650 uppercase tracking-wider">Khai báo số lượng thực tế kiểm kê</h4>
                  <div className="grid grid-cols-4 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider ml-1">🟢 Sử dụng tốt</label>
                      <input 
                        type="number"
                        min="0"
                        className="w-full bg-white border border-slate-250 rounded-xl px-3 py-2 text-sm font-bold text-slate-800"
                        value={checkForm.actualGoodQty}
                        onChange={(e) => setCheckForm({ ...checkForm, actualGoodQty: Number(e.target.value) || 0 })}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-amber-600 uppercase tracking-wider ml-1">🟡 Cần sửa chữa</label>
                      <input 
                        type="number"
                        min="0"
                        className="w-full bg-white border border-slate-250 rounded-xl px-3 py-2 text-sm font-bold text-slate-800"
                        value={checkForm.actualRepairQty}
                        onChange={(e) => setCheckForm({ ...checkForm, actualRepairQty: Number(e.target.value) || 0 })}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-rose-600 uppercase tracking-wider ml-1">🔴 Hỏng chờ thanh lý</label>
                      <input 
                        type="number"
                        min="0"
                        className="w-full bg-white border border-slate-250 rounded-xl px-3 py-2 text-sm font-bold text-slate-800"
                        value={checkForm.actualBrokenQty}
                        onChange={(e) => setCheckForm({ ...checkForm, actualBrokenQty: Number(e.target.value) || 0 })}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">⚫ Đã mất</label>
                      <input 
                        type="number"
                        min="0"
                        className="w-full bg-white border border-slate-250 rounded-xl px-3 py-2 text-sm font-bold text-slate-800"
                        value={checkForm.actualLostQty}
                        onChange={(e) => setCheckForm({ ...checkForm, actualLostQty: Number(e.target.value) || 0 })}
                      />
                    </div>
                  </div>

                  <div className="flex justify-between items-center border-t border-slate-200 pt-3 text-xs font-bold">
                    <span className="text-slate-500">Tổng thực tế khai báo:</span>
                    <span className="text-slate-800">
                      {Number(checkForm.actualGoodQty) + Number(checkForm.actualRepairQty) + Number(checkForm.actualBrokenQty) + Number(checkForm.actualLostQty)} {selectedItemForCheck.tool.unit}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-xs font-bold">
                    <span className="text-slate-500">Chênh lệch so với sổ sách:</span>
                    {((Number(checkForm.actualGoodQty) + Number(checkForm.actualRepairQty) + Number(checkForm.actualBrokenQty) + Number(checkForm.actualLostQty)) - selectedItemForCheck.expectedQuantity) === 0 ? (
                      <span className="text-emerald-600">Khớp sổ (0)</span>
                    ) : (
                      <span className="text-rose-600">
                        {((Number(checkForm.actualGoodQty) + Number(checkForm.actualRepairQty) + Number(checkForm.actualBrokenQty) + Number(checkForm.actualLostQty)) - selectedItemForCheck.expectedQuantity) > 0 ? '+' : ''}
                        {(Number(checkForm.actualGoodQty) + Number(checkForm.actualRepairQty) + Number(checkForm.actualBrokenQty) + Number(checkForm.actualLostQty)) - selectedItemForCheck.expectedQuantity}
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Đánh giá tình trạng</label>
                    <select 
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-semibold focus:ring-2 focus:ring-orange-500 text-slate-800"
                      value={checkForm.checkCondition}
                      onChange={(e) => setCheckForm({ ...checkForm, checkCondition: e.target.value })}
                    >
                      <option value="FOUND">Tìm thấy (Tốt/Khớp)</option>
                      <option value="DAMAGED">Hỏng hóc / Cần sửa</option>
                      <option value="MISSING">Mất tích / Thất lạc</option>
                      <option value="WRONG_LOCATION">Sai vị trí thực tế</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Vị trí thực tế</label>
                    <input 
                      type="text"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-semibold focus:ring-2 focus:ring-orange-500 text-slate-800"
                      placeholder="Nhập vị trí thực tế..."
                      value={checkForm.actualLocation}
                      onChange={(e) => setCheckForm({ ...checkForm, actualLocation: e.target.value })}
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Ghi chú kiểm kê</label>
                <textarea 
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs font-semibold focus:ring-2 focus:ring-orange-500 h-16 resize-none text-slate-800"
                  placeholder="Thêm mô tả hoặc ghi nhận cụ thể..."
                  value={checkForm.note}
                  onChange={(e) => setCheckForm({ ...checkForm, note: e.target.value })}
                />
              </div>

              {/* CLOUDINARY PHOTO UPLOAD */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex justify-between">
                  <span>Ảnh chụp bằng chứng kiểm kê</span>
                  {uploadingPhoto && <span className="text-orange-600 font-bold animate-pulse">Đang tải lên...</span>}
                </label>
                
                <div className="grid grid-cols-4 gap-3">
                  {checkForm.photos.map((photo: string, index: number) => (
                    <div key={index} className="relative aspect-video rounded-xl overflow-hidden border border-slate-200 group">
                      <img src={photo} alt="CCDC Evidence" className="w-full h-full object-cover" />
                      <button 
                        type="button"
                        onClick={() => removePhoto(index)}
                        className="absolute top-1 right-1 w-6 h-6 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center transition-colors border-0 cursor-pointer"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  
                  <label className="border-2 border-dashed border-slate-200 hover:border-orange-500 rounded-xl aspect-video flex flex-col items-center justify-center cursor-pointer transition-all hover:bg-orange-50/20">
                    <Upload className="h-5 w-5 text-slate-400" />
                    <span className="text-[10px] font-bold text-slate-500 mt-1">Tải ảnh lên</span>
                    <input 
                      type="file" 
                      multiple
                      accept="image/*"
                      className="hidden" 
                      onChange={handleFileChange} 
                    />
                  </label>
                </div>
              </div>

              <div className="flex space-x-3 pt-4 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => setSelectedItemForCheck(null)}
                  className="flex-1 bg-white border border-slate-200 text-slate-700 py-3 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-slate-50 transition-all cursor-pointer"
                >
                  Đóng
                </button>
                <button 
                  type="submit" 
                  disabled={submitting}
                  className="flex-1 bg-slate-900 text-white py-3 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-slate-800 transition-all shadow-md disabled:opacity-50 cursor-pointer flex items-center justify-center"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Lưu kết quả"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
