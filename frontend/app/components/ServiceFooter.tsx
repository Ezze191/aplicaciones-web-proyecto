'use client';

import React from 'react';

interface ServiceFooterProps {
  slaHours?: number;
  departmentName?: string;
}

export const ServiceFooter: React.FC<ServiceFooterProps> = ({
  slaHours = 24,
  departmentName = 'S.I.U',
}) => {
  return (
    <footer className="w-full flex flex-col sm:flex-row items-center justify-between gap-2 pt-6 pb-8 text-[#5e7085] text-[11px] font-normal border-t border-[#dce4ed]/60 mt-4">
      <p>
        Sincronizado en tiempo real · SLA de referencia {departmentName}:{' '}
        {slaHours} horas
      </p>
      <p className="text-right">
        En Reparación corresponde a «En proceso» en la vista ciudadana.
      </p>
    </footer>
  );
};
