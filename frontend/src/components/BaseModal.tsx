import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { clsx } from 'clsx';

interface BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  size: 'confirm' | 'form' | 'wizard' | 'detail';
  title?: React.ReactNode;
  headerActions?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  zIndex?: string;
  noScroll?: boolean;
}

export const BaseModal: React.FC<BaseModalProps> = ({
  isOpen,
  onClose,
  size,
  title,
  headerActions,
  footer,
  children,
  className,
  zIndex = 'z-[100]',
  noScroll = false
}) => {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleEsc);
    }
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeClasses = {
    confirm: 'w-full max-w-[480px] h-auto rounded-3xl shadow-2xl',
    form: 'w-full max-w-[720px] max-h-[85vh] rounded-3xl shadow-2xl',
    wizard: 'w-full max-w-[1000px] h-[85vh] max-h-[90vh] rounded-[2.5rem] shadow-2xl',
    detail: 'w-[85vw] h-[88vh] max-w-6xl rounded-[2.5rem] shadow-2xl',
  };

  return (
    <div className={clsx("fixed inset-0 flex items-center justify-center p-4", zIndex)}>
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity duration-300 animate-in fade-in" 
        onClick={onClose}
      />

      {/* Modal Container */}
      <div 
        className={clsx(
          "relative bg-white overflow-hidden flex flex-col transition-all duration-300 animate-in zoom-in-95",
          sizeClasses[size],
          className
        )}
      >
        {/* Header */}
        {title && (
          <div className="px-8 py-6 bg-white border-b border-slate-100 flex items-center justify-between shrink-0">
            <div className="flex items-center space-x-3 flex-1 min-w-0">
              {title}
            </div>
            <div className="flex items-center space-x-3 shrink-0 ml-4">
              {headerActions}
              <button 
                onClick={onClose} 
                className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}

        {/* Content */}
        {noScroll ? (
          children
        ) : (
          <div className="flex-1 overflow-y-auto p-8">
            {children}
          </div>
        )}

        {/* Footer */}
        {footer && (
          <div className="px-8 py-6 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end space-x-3 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
