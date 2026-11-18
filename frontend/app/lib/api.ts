/**
 * Construye la URL base del backend NestJS usando las variables
 * NEXT_PUBLIC_BACKEND_IP y NEXT_PUBLIC_BACKEND_PORT definidas en .env.
 */
export function getBackendUrl(): string {
  const ip = process.env.NEXT_PUBLIC_BACKEND_IP?.trim() || 'localhost';
  const port = process.env.NEXT_PUBLIC_BACKEND_PORT?.trim() || '3000';
  return `http://${ip}:${port}`;
}
