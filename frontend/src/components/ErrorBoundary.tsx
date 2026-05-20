import React, { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="p-8 text-center bg-rose-50 border border-rose-100 rounded-[2rem] space-y-4">
          <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto text-rose-500 shadow-sm">
            <AlertCircle className="h-8 w-8" />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Đã xảy ra lỗi hệ thống</h3>
            <p className="text-xs font-bold text-slate-400 mt-2 uppercase tracking-widest leading-loose">
              Hệ thống không thể hiển thị nội dung này.<br/>Vui lòng thử lại hoặc liên hệ kỹ thuật.
            </p>
          </div>
          <button 
            onClick={() => this.setState({ hasError: false })}
            className="px-6 py-3 bg-white border border-rose-200 text-rose-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-rose-50 transition-all flex items-center mx-auto"
          >
            <RotateCcw className="mr-2 h-4 w-4" /> Thử lại
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export const ModalError = ({ message }: { message: string }) => (
  <div className="p-10 text-center space-y-6">
    <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-3xl flex items-center justify-center mx-auto border border-rose-100">
       <AlertCircle className="h-10 w-10" />
    </div>
    <h4 className="text-xl font-black text-slate-800 uppercase tracking-tight">{message}</h4>
    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Vui lòng kiểm tra lại dữ liệu tài sản hoặc thử lại sau.</p>
  </div>
);
