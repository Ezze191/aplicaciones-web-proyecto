'use client';

import React from 'react';
import { DependencyConfig } from '../types/dashboard';

interface ServiceFooterProps {
  dependency: DependencyConfig;
}

export const ServiceFooter: React.FC<ServiceFooterProps> = ({ dependency }) => {
  return (
    <footer className="w-full flex flex-col sm:flex-row items-center justify-between gap-2 pt-6 pb-8 text-[#5e7085] text-[11px] font-normal border-t border-[#dce4ed]/60 mt-4">
      <p>
        Última actualización: 11:41 · SLA de referencia {dependency.shortName}:{' '}
        {dependency.slaReferenceHours} horas
      </p>
      <p className="text-right">
        En Reparación corresponde a «En proceso» en la vista ciudadana.
      </p>
    </footer>
  );
};

