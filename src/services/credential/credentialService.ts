import { ParkingSpot } from '../../types/parking';
import { DigitalCredential } from '../../types/user';

/**
 * Serviço de validação de credencial (mock).
 * Em produção: chamada autenticada ao backend, que consulta a base do
 * órgão emissor (DETRAN / secretaria municipal) e devolve um token assinado
 * (JWT) vinculando credencial + placa + vaga + horário.
 */

export const CREDENTIAL_PATTERN = /^[A-Z]{2}-(PCD|IDO)-\d{6}$/;
export const PLATE_PATTERN = /^[A-Z]{3}-?\d[A-Z0-9]\d{2}$/; // antigo (ABC-1234) e Mercosul (ABC1D23)

export type VerificationFailure =
  | 'invalid-format'
  | 'expired'
  | 'category-mismatch'
  | 'plate-mismatch'
  | 'not-found';

export interface VerificationResult {
  approved: boolean;
  failure?: VerificationFailure;
  message: string;
  token?: string;
  checkedAt: number;
}

const FAILURE_MESSAGES: Record<VerificationFailure, string> = {
  'invalid-format': 'Número de credencial em formato inválido. Use o padrão UF-PCD-000000 ou UF-IDO-000000.',
  expired: 'Credencial vencida. Renove junto ao órgão emissor para usar vagas prioritárias.',
  'category-mismatch': 'Sua credencial não corresponde à categoria desta vaga.',
  'plate-mismatch': 'A placa detectada na vaga não corresponde à placa vinculada à credencial.',
  'not-found': 'Credencial não encontrada na base do órgão emissor.',
};

export const normalizePlate = (p: string) => p.toUpperCase().replace(/[^A-Z0-9]/g, '');

/** Hash FNV-1a — apenas para gerar um comprovante determinístico no mock. */
function fnv1a(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).toUpperCase().padStart(8, '0');
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function verifyCredential(
  credential: Pick<DigitalCredential, 'number' | 'plate' | 'category' | 'expiresAt'>,
  spot?: ParkingSpot,
  detectedPlate?: string,
  now = Date.now(),
): Promise<VerificationResult> {
  await delay(1200); // latência simulada da API
  const fail = (failure: VerificationFailure): VerificationResult => ({
    approved: false,
    failure,
    message: FAILURE_MESSAGES[failure],
    checkedAt: now,
  });

  const number = credential.number.trim().toUpperCase();
  if (!CREDENTIAL_PATTERN.test(number) || !PLATE_PATTERN.test(credential.plate.toUpperCase())) {
    return fail('invalid-format');
  }
  if (number.endsWith('000000')) return fail('not-found');
  if (new Date(credential.expiresAt).getTime() < now) return fail('expired');
  const kind = number.includes('-PCD-') ? 'pcd' : 'idoso';
  if (kind !== credential.category) return fail('category-mismatch');
  if (spot && spot.category !== 'regular' && spot.category !== kind) return fail('category-mismatch');
  if (detectedPlate && normalizePlate(detectedPlate) !== normalizePlate(credential.plate)) {
    return fail('plate-mismatch');
  }

  const token = `SF-${fnv1a(`${number}|${normalizePlate(credential.plate)}|${spot?.id ?? ''}|${now}`)}`;
  return { approved: true, message: 'Credencial válida. Uso da vaga autorizado.', token, checkedAt: now };
}
