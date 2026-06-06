import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { 
  ChevronLeft, 
  FileText, 
  Calendar, 
  User, 
  Coins, 
  Loader2, 
  Package,
  ExternalLink
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'react-toastify';

export const ToolInvoiceDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchDetail = async () => {
    try {
      const res = await api.get(`/tools/invoices/${id}`);
      setInvoice(res.data);
    } catch (err) {
      console.error(err);
      toast.error("Không thể tải thông tin chứng từ hóa đơn");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center p-20">
        <Loader2 className="h-10 w-10 text-primary-650 animate-spin" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="text-center p-20 space-y-4">
        <FileText className="h-16 w-16 text-slate-300 mx-auto" />
        <h3 className="text-lg font-bold text-slate-700">Hóa đơn không tồn tại hoặc đã bị xóa.</h3>
        <button onClick={() => navigate('/tools')} className="bg-slate-800 text-white px-5 py-2.5 rounded-xl text-xs font-bold">
          Quay lại danh sách CCDC
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20">
      {/* HEADER */}
      <div className="flex items-center space-x-4">
        <button 
          onClick={() => navigate(-1)}
          className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all border-0 cursor-pointer"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-[900] text-[#0F172A] tracking-tight leading-none">
            Hồ sơ chứng từ mua hàng CCDC
          </h1>
          <p className="text-slate-500 text-xs mt-2 font-semibold flex items-center gap-4">
            <span>Phiếu nhập: <strong>PN-CCDC-2026-{invoice.id.toString().padStart(6, '0')}</strong></span>
            <span>Số hóa đơn: <strong className="font-mono text-orange-600">{invoice.invoiceNo}</strong></span>
          </p>
        </div>
      </div>

      {/* METADATA CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-primary-50 rounded-xl flex items-center justify-center text-primary-650 shrink-0">
            <User className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nhà cung cấp</p>
            <p className="text-sm font-[850] text-slate-850 mt-1">{invoice.supplierName}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 shrink-0">
            <Calendar className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ngày hóa đơn</p>
            <p className="text-sm font-[850] text-slate-850 mt-1">
              {invoice.invoiceDate && format(new Date(invoice.invoiceDate), 'dd/MM/yyyy')}
            </p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center text-orange-650 shrink-0">
            <Coins className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tổng giá trị</p>
            <p className="text-sm font-[850] text-slate-850 mt-1">
              {invoice.totalAmount?.toLocaleString('vi-VN')} VNĐ
            </p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center text-slate-500 shrink-0">
            <FileText className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">File chứng từ</p>
            {invoice.fileUrl ? (
              <a 
                href={invoice.fileUrl} 
                target="_blank" 
                rel="noreferrer"
                className="text-xs font-bold text-primary-600 hover:text-primary-700 flex items-center gap-1 mt-1"
              >
                Tải / Xem file <ExternalLink className="h-3.5 w-3.5" />
              </a>
            ) : (
              <p className="text-xs font-semibold text-slate-400 mt-1">Không đính kèm file</p>
            )}
          </div>
        </div>
      </div>

      {/* ASSOCIATED CCDC ITEMS */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 bg-slate-50/50 border-b border-slate-200">
          <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Danh sách CCDC thuộc hóa đơn</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/20 border-b border-slate-200">
                <th className="p-4 text-xs font-black text-slate-400 uppercase tracking-widest">Mã CCDC</th>
                <th className="p-4 text-xs font-black text-slate-400 uppercase tracking-widest">Tên CCDC</th>
                <th className="p-4 text-xs font-black text-slate-400 uppercase tracking-widest">Nhóm</th>
                <th className="p-4 text-xs font-black text-slate-400 uppercase tracking-widest text-center">SL nhập</th>
                <th className="p-4 text-xs font-black text-slate-400 uppercase tracking-widest text-right">Đơn giá</th>
                <th className="p-4 text-xs font-black text-slate-400 uppercase tracking-widest text-right">Thành tiền</th>
                <th className="p-4 text-xs font-black text-slate-400 uppercase tracking-widest text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invoice.tools?.map((tool: any) => (
                <tr key={tool.id} className="hover:bg-slate-50/30 transition-colors">
                  <td className="p-4">
                    <span className="text-xs font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded uppercase">
                      {tool.toolCode}
                    </span>
                  </td>
                  <td className="p-4 font-bold text-slate-800 text-sm">{tool.toolName}</td>
                  <td className="p-4 text-xs text-slate-500 font-semibold">{tool.category}</td>
                  <td className="p-4 text-center font-bold text-slate-700">{tool.quantity}</td>
                  <td className="p-4 text-right font-semibold text-slate-700">
                    {(tool.purchasePrice || 0).toLocaleString('vi-VN')} đ
                  </td>
                  <td className="p-4 text-right font-black text-slate-800">
                    {((tool.purchasePrice || 0) * (tool.quantity || 1)).toLocaleString('vi-VN')} đ
                  </td>
                  <td className="p-4 text-right">
                    <button 
                      onClick={() => navigate(`/tools/${tool.id}`)}
                      className="px-3 py-1.5 bg-primary-50 text-primary-650 hover:bg-primary-100 rounded-lg text-xs font-bold border-0 cursor-pointer"
                    >
                      Hồ sơ chi tiết
                    </button>
                  </td>
                </tr>
              ))}
              {(!invoice.tools || invoice.tools.length === 0) && (
                <tr>
                  <td colSpan={7} className="p-20 text-center">
                    <Package className="h-10 w-10 text-slate-200 mx-auto mb-2" />
                    <p className="text-slate-400 font-bold text-sm">Chưa có CCDC nào được sinh từ hóa đơn này.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
