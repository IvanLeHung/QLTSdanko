import React, { createContext, useContext, useState } from 'react';

export type ModalType =
  | 'ASSET_DETAIL'
  | 'ASSET_CREATE'
  | 'PRINT_LABEL'
  | 'TRANSFER_WIZARD'
  | 'INVENTORY_WIZARD'
  | 'IMPORT_EXCEL'
  | 'REPAIR_TICKET'
  | 'COMPLETE_REPAIR'
  | 'BM_FORM'
  | 'LOG_DETAIL';

export interface ConfirmPayload {
  title: string;
  message: string;
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
}

interface ModalContextType {
  activeModal: { type: ModalType; payload?: any } | null;
  confirmState: ConfirmPayload | null;
  openModal: (type: ModalType, payload?: any) => void;
  closeModal: () => void;
  openConfirm: (payload: ConfirmPayload) => void;
  closeConfirm: () => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export const ModalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeModal, setActiveModal] = useState<{ type: ModalType; payload?: any } | null>(null);
  const [confirmState, setConfirmState] = useState<ConfirmPayload | null>(null);

  const openModal = (type: ModalType, payload?: any) => {
    setActiveModal({ type, payload });
  };

  const closeModal = () => {
    setActiveModal(null);
  };

  const openConfirm = (payload: ConfirmPayload) => {
    setConfirmState(payload);
  };

  const closeConfirm = () => {
    setConfirmState(null);
  };

  return (
    <ModalContext.Provider
      value={{
        activeModal,
        confirmState,
        openModal,
        closeModal,
        openConfirm,
        closeConfirm,
      }}
    >
      {children}
    </ModalContext.Provider>
  );
};

export const useModal = () => {
  const context = useContext(ModalContext);
  if (context === undefined) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  return context;
};
