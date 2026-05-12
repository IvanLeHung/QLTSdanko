import React from 'react';
import { BM01HandoverModal } from './BM01HandoverModal';
import { BM02HandoverModal } from './BM02HandoverModal';
import { BM03DamagedModal } from './BM03DamagedModal';
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
  switch (formCode) {
    case 'BM01/QLTS':
      return <BM01HandoverModal isOpen={isOpen} onClose={onClose} onSubmit={onSubmit} />;
    case 'BM02/QLTS':
      return <BM02HandoverModal isOpen={isOpen} onClose={onClose} onSubmit={onSubmit} initialAsset={data?.asset} />;
    case 'BM03/QLTS':
      return <BM03DamagedModal isOpen={isOpen} onClose={onClose} onSubmit={onSubmit} asset={data?.asset} />;
    case 'BM09/QLTS':
      return <BM09InspectionModal isOpen={isOpen} onClose={onClose} onSubmit={onSubmit} asset={data?.asset} businessType={data?.businessType} />;
    case 'BM10/QLTS':
      return <BM10MaintenanceModal isOpen={isOpen} onClose={onClose} onSubmit={onSubmit} ticket={data?.ticket} asset={data?.asset} />;
    case 'BM12/QLTS':
      return <BM12InventoryModal isOpen={isOpen} onClose={onClose} onSubmit={onSubmit} period={data?.period} />;
    case 'BM13/QLTS':
      return <BM13LostModal isOpen={isOpen} onClose={onClose} onSubmit={onSubmit} asset={data?.asset} />;
    default:
      return null;
  }
};
