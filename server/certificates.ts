import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { generate } from "selfsigned";

export interface Certificate {
  key: string;
  cert: string;
  /** True when we made our own, which means phones will show a warning once. */
  selfSigned: boolean;
}

const CERT_DIR = join(process.cwd(), "certs");
const KEY_FILE = join(CERT_DIR, "key.pem");
const CERT_FILE = join(CERT_DIR, "cert.pem");
const MARKER_FILE = join(CERT_DIR, ".generated-for");

/**
 * Uses certs/key.pem and certs/cert.pem if you made them yourself (with
 * mkcert, for example, which phones can be taught to trust). Otherwise it
 * generates a self-signed one for the current LAN address and keeps it, so
 * phones only have to accept the warning once per address.
 */
export async function loadCertificate(lanAddress: string | null): Promise<Certificate> {
  const hostLabel = lanAddress ?? "localhost";
  const marker = existsSync(MARKER_FILE) ? (await readFile(MARKER_FILE, "utf8")).trim() : null;
  const userProvided = existsSync(KEY_FILE) && existsSync(CERT_FILE) && marker === null;

  if (userProvided || (marker === hostLabel && existsSync(KEY_FILE) && existsSync(CERT_FILE))) {
    const [key, cert] = await Promise.all([readFile(KEY_FILE, "utf8"), readFile(CERT_FILE, "utf8")]);
    return { key, cert, selfSigned: !userProvided };
  }

  const altNames = [
    { type: 2 as const, value: "localhost" },
    { type: 7 as const, ip: "127.0.0.1" },
    ...(lanAddress ? [{ type: 7 as const, ip: lanAddress }] : []),
  ];
  const pems = await generate([{ name: "commonName", value: hostLabel }], {
    keySize: 2048,
    algorithm: "sha256",
    extensions: [
      { name: "basicConstraints", cA: false },
      { name: "keyUsage", digitalSignature: true, keyEncipherment: true },
      { name: "subjectAltName", altNames },
    ],
  });
  await mkdir(CERT_DIR, { recursive: true });
  await Promise.all([
    writeFile(KEY_FILE, pems.private, { mode: 0o600 }),
    writeFile(CERT_FILE, pems.cert),
    writeFile(MARKER_FILE, hostLabel),
  ]);
  return { key: pems.private, cert: pems.cert, selfSigned: true };
}
