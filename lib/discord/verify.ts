const encoder = new TextEncoder();

function hexToArrayBuffer(value: string): ArrayBuffer | null {
  if (!/^[0-9a-f]+$/i.test(value) || value.length % 2 !== 0) return null;
  const buffer = new ArrayBuffer(value.length / 2);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.length; i += 1) {
    bytes[i] = Number.parseInt(value.slice(i * 2, i * 2 + 2), 16);
  }
  return buffer;
}

export async function verifyDiscordRequest(
  body: string,
  signatureHex: string | null,
  timestamp: string | null,
  publicKeyHex: string,
): Promise<boolean> {
  if (!signatureHex || !timestamp) return false;

  const signature = hexToArrayBuffer(signatureHex);
  const publicKey = hexToArrayBuffer(publicKeyHex);
  if (!signature || !publicKey || publicKey.byteLength !== 32) return false;

  try {
    const key = await crypto.subtle.importKey("raw", publicKey, { name: "Ed25519" }, false, ["verify"]);
    return await crypto.subtle.verify(
      { name: "Ed25519" },
      key,
      signature,
      encoder.encode(`${timestamp}${body}`),
    );
  } catch (error) {
    const name = error instanceof Error ? error.name : "NonError";
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Discord signature verification failed ${name}: ${message}`);
    return false;
  }
}
