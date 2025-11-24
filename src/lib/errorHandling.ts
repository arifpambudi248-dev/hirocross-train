import { toast } from "sonner";

/**
 * Handle errors with user-friendly messages
 * Only logs detailed errors in development mode
 */
export function handleError(error: unknown, userMessage: string) {
  // Show generic message to user
  toast.error(userMessage);
  
  // Log details only in development
  if (import.meta.env.DEV) {
    console.error('Error details:', error);
  }
}

/**
 * Map database error codes to friendly Indonesian messages
 */
export function getFriendlyErrorMessage(error: any): string {
  if (error?.code === '23505') return 'Data sudah ada';
  if (error?.code === '23503') return 'Data terkait tidak ditemukan';
  if (error?.code === '23502') return 'Field wajib tidak boleh kosong';
  if (error?.code === '22P02') return 'Format data tidak valid';
  if (error?.message?.includes('JWT')) return 'Sesi Anda telah berakhir. Silakan login kembali';
  return 'Terjadi kesalahan. Silakan coba lagi.';
}
