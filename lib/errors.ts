/**
 * Traducción de errores de Supabase a algo que un humano pueda leer (§4, §5, §7).
 * Si no reconocemos el error mostramos un texto genérico y dejamos el original
 * en consola: es preferible a pintar en pantalla un mensaje de Postgres.
 */
import { AuthError, PostgrestError } from '@supabase/supabase-js';

const GENERIC = 'Algo salió mal. Probá de nuevo.';
const OFFLINE = 'No pudimos conectar con el servidor. Revisá tu conexión.';

function isNetworkError(error: unknown): boolean {
  const message = error instanceof Error ? error.message.toLowerCase() : '';
  return message.includes('network') || message.includes('failed to fetch');
}

export function authErrorMessage(error: unknown): string {
  if (isNetworkError(error)) return OFFLINE;
  if (error instanceof AuthError) {
    switch (error.code) {
      case 'invalid_credentials':
        return 'Email o contraseña incorrectos.';
      case 'email_not_confirmed':
        return 'Todavía no confirmaste tu email. Buscá el mail de confirmación y volvé a entrar.';
      case 'user_already_exists':
      case 'email_exists':
        return 'Ya existe una cuenta con ese email.';
      case 'weak_password':
        return 'La contraseña es muy débil: usá al menos 6 caracteres.';
      case 'email_address_invalid':
        return 'Ese email no parece válido.';
      case 'over_email_send_rate_limit':
        // Tope de mails del proyecto, no del usuario: se libera recién a la hora.
        return 'Se llegó al límite de mails de confirmación por hora. Probá más tarde.';
      case 'over_request_rate_limit':
        return 'Demasiados intentos seguidos. Esperá un minuto y probá de nuevo.';
      case 'validation_failed':
        return 'Revisá los datos: falta algo o tiene un formato inválido.';
      default:
        console.warn('[auth]', error.code, error.message);
        return GENERIC;
    }
  }
  console.warn('[auth]', error);
  return GENERIC;
}

export function dbErrorMessage(error: unknown, fallback = GENERIC): string {
  if (isNetworkError(error)) return OFFLINE;
  const pg = error as PostgrestError | null;
  if (pg?.code) {
    switch (pg.code) {
      case '23505':
        return 'Ese dato ya existe: probá con otro.';
      case '42501':
        return 'No tenés permiso para hacer eso.';
      case '42P17':
        // Policy de RLS que se consulta a sí misma: se arregla en la base, no acá
        // (ver supabase/fix-rls-recursion.sql).
        return 'Las políticas de seguridad de la base están en recursión. Revisá el RLS de group_members.';
      case 'PGRST301':
        return 'Tu sesión expiró. Volvé a entrar.';
      case 'P0001':
        // `raise exception` de una RPC: el texto lo escribió la base a propósito.
        console.warn('[db]', pg.code, pg.message);
        return pg.message || fallback;
      default:
        break;
    }
  }
  console.warn('[db]', pg?.code ?? '', pg?.message ?? error);
  return fallback;
}
