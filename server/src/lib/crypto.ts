import crypto from "crypto";

/**
 * Chiffrement applicatif des données personnelles (noms des élèves) au repos.
 * AES-256-GCM, clé dans ENCRYPTION_KEY (32 octets en base64).
 *
 * Format stocké : `enc:v1:<base64(iv | authTag | ciphertext)>`.
 * Le marqueur permet : (1) de ne déchiffrer que les valeurs chiffrées,
 * (2) une migration progressive (les valeurs en clair sont laissées telles quelles),
 * (3) l'idempotence (on ne re-chiffre jamais une valeur déjà chiffrée).
 *
 * ⚠️ Perdre ENCRYPTION_KEY rend les noms illisibles : à sauvegarder précieusement.
 */

const MARKER = "enc:v1:";
const FORBIDDEN_KEYS = new Set(["", "change-me", "dev"]);

let cachedKey: Buffer | null = null;

function getKey(): Buffer {
  if (cachedKey) return cachedKey;
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw || FORBIDDEN_KEYS.has(raw)) {
    throw new Error("ENCRYPTION_KEY manquant ou invalide");
  }
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error("ENCRYPTION_KEY doit faire 32 octets (base64). Générer : openssl rand -base64 32");
  }
  cachedKey = key;
  return key;
}

/** True si la clé est correctement configurée (pour le garde-fou au démarrage). */
export function encryptionKeyIsValid(): boolean {
  try {
    getKey();
    return true;
  } catch {
    return false;
  }
}

export function isEncrypted(value: unknown): value is string {
  return typeof value === "string" && value.startsWith(MARKER);
}

/** Chiffre une valeur (idempotent : ne re-chiffre pas une valeur déjà chiffrée). */
export function encryptField(value: string): string {
  if (isEncrypted(value)) return value;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return MARKER + Buffer.concat([iv, tag, ciphertext]).toString("base64");
}

/** Déchiffre une valeur marquée ; renvoie telle quelle toute valeur non chiffrée (legacy). */
export function decryptField(value: string): string {
  if (!isEncrypted(value)) return value;
  try {
    const data = Buffer.from(value.slice(MARKER.length), "base64");
    const iv = data.subarray(0, 12);
    const tag = data.subarray(12, 28);
    const ciphertext = data.subarray(28);
    const decipher = crypto.createDecipheriv("aes-256-gcm", getKey(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
  } catch {
    // Clé erronée / donnée corrompue : on ne fait pas fuiter le ciphertext.
    return "";
  }
}
