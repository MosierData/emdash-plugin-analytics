/**
 * Verifies an Ed25519 signature using the Web Crypto API.
 *
 * @param payload   - Base64-encoded payload string (as returned by the API)
 * @param signature - Base64-encoded Ed25519 signature
 * @param publicKey - Base64-encoded 32-byte Ed25519 public key (hardcoded in plugin)
 */
export async function verifyEd25519Signature(
  payload: string,
  signature: string,
  publicKey: string
): Promise<boolean> {
  try {
    const keyBytes = base64ToBytes(publicKey);
    const sigBytes = base64ToBytes(signature);
    const msgBytes = new TextEncoder().encode(payload);

    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyBytes,
      { name: 'Ed25519' },
      false,
      ['verify']
    );

    return await crypto.subtle.verify('Ed25519', cryptoKey, sigBytes, msgBytes);
  } catch {
    return false;
  }
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
