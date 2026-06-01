import React from 'react';
import { useModal } from '../context/ModalContext';
import { BaseModal } from './BaseModal';
import { AlertTriangle } from 'lucide-react';

// Modals
import { AssetDetailPopup } from './AssetDetailPopup';
import { CreateAssetModal } from './CreateAssetModal';
import { TransferWizard } from './TransferWizard';
import { AssetLabelPrintModal } from './AssetLabelPrintModal';
import { InventoryWizardModal } from './InventoryWizardModal';
import { LogDetailModal } from './LogDetailModal';
import { BMFormDispatcher } from './forms/BMFormDispatcher';
import { RepairProcessingPopup } from './RepairProcessingPopup';

export const ModalManager: React.FC = () => {
  const { activeModal, closeModal, confirmState, closeConfirm } = useModal();

  if (!activeModal && !confirmState) return null;

  return (
    <>
      {/* Dynamic Modal Switcher */}
      {activeModal && (
        <>
          {activeModal.type === 'ASSET_DETAIL' && (
            <AssetDetailPopup
              isOpen={true}
              assetId={activeModal.payload?.assetId}
              initialTab={activeModal.payload?.initialTab || 'info'}
              onClose={closeModal}
              onAction={(action, id) => {
                if (activeModal.payload?.onAction) {
                  activeModal.payload.onAction(action, id);
                }
              }}
            />
          )}

          {activeModal.type === 'ASSET_CREATE' && (
            <CreateAssetModal
              isOpen={true}
              onClose={closeModal}
              onComplete={activeModal.payload?.onComplete}
            />
          )}

          {activeModal.type === 'TRANSFER_WIZARD' && (
            <TransferWizard
              isOpen={true}
              onClose={closeModal}
              onComplete={() => {
                if (activeModal.payload?.onComplete) activeModal.payload.onComplete();
                closeModal();
              }}
              initialAssetIds={activeModal.payload?.initialAssetIds || []}
              defaultType={activeModal.payload?.defaultType}
              source={activeModal.payload?.source || 'ASSET_DETAIL'}
              editingDocId={activeModal.payload?.editingDocId}
            />
          )}

          {activeModal.type === 'PRINT_LABEL' && (
            <AssetLabelPrintModal
              isOpen={true}
              onClose={closeModal}
              assets={activeModal.payload?.assets || []}
            />
          )}

          {activeModal.type === 'INVENTORY_WIZARD' && (
            <InventoryWizardModal
              isOpen={true}
              onClose={closeModal}
              onComplete={() => {
                if (activeModal.payload?.onComplete) activeModal.payload.onComplete();
                closeModal();
              }}
              initialAssetIds={activeModal.payload?.initialAssetIds || []}
            />
          )}

          {activeModal.type === 'BM_FORM' && (
            <BMFormDispatcher
              isOpen={true}
              formCode={activeModal.payload?.code || ''}
              data={activeModal.payload?.data}
              onClose={closeModal}
              onSubmit={(data) => {
                if (activeModal.payload?.onSubmit) {
                  activeModal.payload.onSubmit(data);
                }
                closeModal();
              }}
            />
          )}

          {activeModal.type === 'LOG_DETAIL' && (
            <LogDetailModal
              isOpen={true}
              onClose={closeModal}
              log={activeModal.payload?.log}
            />
          )}

          {activeModal.type === 'REPAIR_PROCESSING' && (
            <RepairProcessingPopup
              isOpen={true}
              ticketId={activeModal.payload?.ticketId}
              onClose={closeModal}
              onSuccess={() => {
                if (activeModal.payload?.onSuccess) activeModal.payload.onSuccess();
                closeModal();
              }}
            />
          )}
        </>
      )}

      {/* Confirmation Dialog */}
      {confirmState && (
        <BaseModal
          isOpen={true}
          onClose={closeConfirm}
          size="confirm"
          title={
            <div className="flex items-center space-x-3 text-rose-600">
              <AlertTriangle className="h-5 w-5 animate-bounce" />
              <span className="text-sm font-black uppercase tracking-wider">{confirmState.title}</span>
            </div>
          }
          footer={
            <>
              <button
                onClick={() => {
                  if (confirmState.onCancel) confirmState.onCancel();
                  closeConfirm();
                }}
                className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-50 transition-colors uppercase tracking-wider"
              >
                {confirmState.cancelText || 'Hủy'}
              </button>
              <button
                onClick={async () => {
                  await confirmState.onConfirm();
                  closeConfirm();
                }}
                className={`px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest shadow-md transition-all ${
                  confirmState.danger
                    ? 'bg-rose-605 text-white hover:bg-rose-700 shadow-rose-100'
                    : 'bg-primary-600 text-white hover:bg-primary-700 shadow-primary-100'
                }`}
              >
                {confirmState.confirmText || 'Xác nhận'}
              </button>
            </>
          }
        >
          <p className="text-xs font-bold text-slate-600 leading-relaxed py-2">
            {confirmState.message}
          </p>
        </BaseModal>
      )}
    </>
  );
};
