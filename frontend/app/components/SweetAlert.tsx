'use client';

import { useEffect } from 'react';
import Swal, { SweetAlertIcon, SweetAlertResult } from 'sweetalert2';

export type AlertType = 'success' | 'error' | 'warning' | 'info' | 'question';

export interface ShowAlertOptions {
  type: AlertType;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  showCancelButton?: boolean;
  timer?: number;
}

const DEFAULT_TITLES: Record<AlertType, string> = {
  success: '¡Operación exitosa!',
  error: 'Ocurrió un error',
  warning: 'Atención',
  info: 'Información',
  question: 'Confirmar acción',
};

const ICON_COLORS: Record<AlertType, string> = {
  success: '#18734a',
  error: '#be313b',
  warning: '#966409',
  info: '#155ead',
  question: '#0e315a',
};

const baseSwal = Swal.mixin({
  buttonsStyling: false,
  customClass: {
    popup:
      'rounded-[20px] border border-[#dce4ed] bg-white p-6 shadow-[0px_16px_36px_rgba(14,49,90,0.16)] font-sans',
    title: 'text-[20px] font-bold text-[#0e315a]',
    htmlContainer: 'text-[14px] text-[#5e7085] leading-relaxed',
    actions: 'gap-2.5 mt-4',
    confirmButton:
      'px-5 py-2.5 rounded-[12px] bg-[#155ead] hover:bg-[#0f4a8a] text-white text-[13px] font-semibold transition-all cursor-pointer shadow-xs',
    cancelButton:
      'px-4 py-2.5 rounded-[12px] border border-[#dce4ed] bg-white hover:bg-slate-50 text-[#5e7085] text-[13px] font-semibold transition-all cursor-pointer',
  },
});

/**
 * Muestra una alerta reutilizable de SweetAlert2 con la identidad visual S.I.U.
 */
export function showAlert({
  type,
  title,
  message,
  confirmText = 'Entendido',
  cancelText = 'Cancelar',
  showCancelButton = false,
  timer,
}: ShowAlertOptions): Promise<SweetAlertResult> {
  return baseSwal.fire({
    icon: type as SweetAlertIcon,
    iconColor: ICON_COLORS[type],
    title: title || DEFAULT_TITLES[type],
    text: message,
    confirmButtonText: confirmText,
    cancelButtonText: cancelText,
    showCancelButton,
    timer,
    timerProgressBar: Boolean(timer),
  });
}

export function showSuccessAlert(
  message: string,
  title = DEFAULT_TITLES.success,
  confirmText = 'Continuar',
): Promise<SweetAlertResult> {
  return showAlert({ type: 'success', title, message, confirmText });
}

export function showErrorAlert(
  message: string,
  title = DEFAULT_TITLES.error,
  confirmText = 'Entendido',
): Promise<SweetAlertResult> {
  return showAlert({ type: 'error', title, message, confirmText });
}

export function showWarningAlert(
  message: string,
  title = DEFAULT_TITLES.warning,
  confirmText = 'Entendido',
): Promise<SweetAlertResult> {
  return showAlert({ type: 'warning', title, message, confirmText });
}

export interface SweetAlertProps {
  open: boolean;
  type: AlertType;
  title?: string;
  message: string;
  confirmText?: string;
  onClose?: () => void;
}

/**
 * Componente declarativo reutilizable para disparar alertas de SweetAlert2 desde JSX.
 */
export const SweetAlert: React.FC<SweetAlertProps> = ({
  open,
  type,
  title,
  message,
  confirmText = 'Entendido',
  onClose,
}) => {
  useEffect(() => {
    if (!open || !message) return;

    void showAlert({
      type,
      title: title ?? DEFAULT_TITLES[type],
      message,
      confirmText,
    }).then(() => {
      onClose?.();
    });
  }, [open, type, title, message, confirmText, onClose]);

  return null;
};
