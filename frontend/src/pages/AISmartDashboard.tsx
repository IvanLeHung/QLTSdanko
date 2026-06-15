import React, { useEffect, useState } from 'react';
import { Bot, Brain, RefreshCw, Search, Sparkles, Workflow } from 'lucide-react';
import api from '../lib/api';
import { toast } from 'react-toastify';

export const AISmartDashboard: React.FC = () => {
  const [query, setQuery] = useState('');
  const [assistantQuery, setAssistantQuery] = useState('');
  const [searchResult, setSearchResult] = useState<any>(null);
  const [assistantAnswer, setAssistantAnswer] = useState<any>(null);
  const [anomalies, setAnomalies] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [anomalyRes, taskRes, jobRes] = await Promise.all([
        api.get('/ai/anomalies'),
        api.get('/automation/tasks'),
        api.get('/ai/normalize/jobs')
      ]);
      setAnomalies(anomalyRes.data || []);
      setTasks(taskRes.data || []);
      setJobs(jobRes.data || []);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Không thể tải AI Insights.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const runSmartSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await api.post('/search/smart', { query });
    setSearchResult(res.data);
  };

  const askAssistant = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await api.post('/assistant/query', { query: assistantQuery });
    setAssistantAnswer(res.data);
  };

  const startNormalize = async () => {
    const res = await api.post('/ai/normalize/start', { type: 'ASSET' });
    toast.success(`Đã quét chuẩn hóa: ${res.data.totalIssues || 0} gợi ý.`);
    await load();
  };

  const findDuplicates = async () => {
    const res = await api.post('/ai/find-duplicates');
    toast.success(`Đã phát hiện ${res.data.total || 0} gợi ý trùng.`);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-slate-950">AI Insights & Smart Operation</h1>
          <p className="text-sm font-semibold text-slate-500 mt-1">Chuẩn hóa dữ liệu, tìm kiếm thông minh, phát hiện bất thường và tự động sinh việc.</p>
        </div>
        <button onClick={load} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white text-sm font-black text-slate-700"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Tải lại</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <InsightCard label="Bất thường mở" value={anomalies.length} icon={<Brain />} />
        <InsightCard label="Task automation" value={tasks.length} icon={<Workflow />} />
        <InsightCard label="Job chuẩn hóa" value={jobs.length} icon={<Sparkles />} />
        <InsightCard label="AI mode" value="Heuristic" icon={<Bot />} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
          <h2 className="text-xs font-black uppercase tracking-widest text-slate-800 flex items-center gap-2"><Search className="h-4 w-4 text-primary-600" /> Smart Search</h2>
          <form onSubmit={runSmartSearch} className="flex gap-2">
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Tìm toàn bộ màn hình Samsung tầng 5" className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-sm font-semibold" />
            <button className="px-4 py-2 rounded-xl bg-primary-600 text-white text-sm font-black">Tìm</button>
          </form>
          {searchResult && (
            <div className="text-sm">
              <p className="font-black text-slate-700">Filters: {JSON.stringify(searchResult.filters)}</p>
              <p className="font-bold text-slate-500 mt-1">Kết quả: {searchResult.results?.length || 0}</p>
            </div>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
          <h2 className="text-xs font-black uppercase tracking-widest text-slate-800 flex items-center gap-2"><Bot className="h-4 w-4 text-primary-600" /> Hỏi dữ liệu tài sản</h2>
          <form onSubmit={askAssistant} className="flex gap-2">
            <input value={assistantQuery} onChange={e => setAssistantQuery(e.target.value)} placeholder="Tháng này mất bao nhiêu CCDC?" className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-sm font-semibold" />
            <button className="px-4 py-2 rounded-xl bg-primary-600 text-white text-sm font-black">Hỏi</button>
          </form>
          {assistantAnswer && <p className="text-sm font-bold text-slate-700">{assistantAnswer.answer}</p>}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button onClick={startNormalize} className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-sm font-black text-slate-700">Scan chuẩn hóa AI</button>
        <button onClick={findDuplicates} className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-sm font-black text-slate-700">Tìm trùng lặp</button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <ListBlock title="Bất thường" rows={anomalies.map(item => `${item.severity} - ${item.message}`)} />
        <ListBlock title="Automation tasks" rows={tasks.map(item => `${item.status} - ${item.title}`)} />
      </div>
    </div>
  );
};

const InsightCard: React.FC<{ label: string; value: any; icon: React.ReactElement }> = ({ label, value, icon }) => (
  <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
    <div className="flex items-center justify-between">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
      {React.cloneElement(icon, { className: 'h-4 w-4 text-primary-600' } as any)}
    </div>
    <p className="text-2xl font-black text-slate-900 mt-2">{value}</p>
  </div>
);

const ListBlock: React.FC<{ title: string; rows: string[] }> = ({ title, rows }) => (
  <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
    <h2 className="text-xs font-black uppercase tracking-widest text-slate-800 mb-3">{title}</h2>
    <div className="space-y-2">
      {rows.map((row, index) => <div key={index} className="rounded-xl border border-slate-100 p-3 text-sm font-bold text-slate-700">{row}</div>)}
      {rows.length === 0 && <p className="text-sm font-bold text-slate-400 text-center py-8">Chưa có dữ liệu.</p>}
    </div>
  </div>
);
