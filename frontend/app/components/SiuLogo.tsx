import React from 'react';
import Image from 'next/image';

interface SiuLogoProps {
  variant?: 'light' | 'dark';
  size?: 'sm' | 'md';
}

export const SiuLogo: React.FC<SiuLogoProps> = ({
  variant = 'light',
  size = 'md',
}) => {
  const containerClasses =
    size === 'sm' ? 'size-9 rounded-[10px]' : 'size-10 rounded-[11px]';
  const borderClasses =
    variant === 'dark'
      ? 'border border-white/25 shadow-sm'
      : 'border border-[#dce4ed] shadow-xs';

  return (
    <div
      className={`relative ${containerClasses} ${borderClasses} overflow-hidden shrink-0 bg-[#0e315a]`}
    >
      <Image
        src="/images/siu-logo.png"
        alt="Logo S.I.U Plataforma Municipal"
        fill
        sizes="40px"
        className="object-cover"
        priority
      />
    </div>
  );
};
