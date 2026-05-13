import React from 'react';
import { BM01HandoverModal } from './BM01HandoverModal';
import { BM02HandoverModal } from './BM02HandoverModal';
import { BM03DamagedModal } from './BM03DamagedModal';
import { BM04LiquidationModal } from './BM04LiquidationModal';
import { BM05DisposalModal } from './BM05DisposalModal';
import { BM06TransferModal } from './BM06TransferModal';
import { BM13LostModal } from './BM13LostModal';
import { BM09InspectionModal, BM10MaintenanceModal, BM12InventoryModal } from './OtherBMModals';

interface BMFormDispatcherProps {
  formCode: string;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  data?: any; // Context data like asset, ticket, etc.
}

export const BMFormDispatcher: React.FC<BMFormDispatcherProps> = ({
  formCode,
  isOpen,
  onClose,
  onSubmit,
  data
}) => {
  const baseCode = formCode.split('/')[0];
  switch (baseCode) {
    case 'BM01':
      return <BM01HandoverModal isOpen={isOpen} onClose={onClose} onSubmit={onSubmit} />;
    case 'BM02':
      return <BM02HandoverModal isOpen={isOpen} onClose={onClose} onSubmit={onSubmit} initialAsset={data?.asset} initialAssets={data?.assets} initialType={data?.type} />;
    case 'BM03':
      return <BM03DamagedModal isOpen={isOpen} onClose={onClose} onSubmit={onSubmit} asset={data?.asset} />;
    case 'BM04':
      return <BM04LiquidationModal isOpen={isOpen} onClose={onClose} onSubmit={onSubmit} asset={data?.asset} />;
    case 'BM05':
      return <BM05DisposalModal isOpen={isOpen} onClose={onClose} onSubmit={onSubmit} asset={data?.asset} />;
    case 'BM06':
      return <BM06TransferModal isOpen={isOpen} onClose={onClose} onSubmit={onSubmit} asset={data?.asset} />;
    case 'BM09':
      return <BM09InspectionModal isOpen={isOpen} onClose={onClose} onSubmit={onSubmit} asset={data?.asset} businessType={data?.businessType} />;
    case 'BM10':
      return <BM10MaintenanceModal isOpen={isOpen} onClose={onClose} onSubmit={onSubmit} ticket={data?.ticket} asset={data?.asset} />;
    case 'BM12':
      return <BM12InventoryModal isOpen={isOpen} onClose={onClose} onSubmit={onSubmit} period={data?.period} />;
    case 'BM13':
      return <BM13LostModal isOpen={isOpen} onClose={onClose} onSubmit={onSubmit} asset={data?.asset} />;
    default:
      return null;
  }
};
