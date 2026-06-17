import { PrismaClient } from "@prisma/client";
import { encryptField, decryptField, isEncrypted } from "./crypto";

/** Champs personnels chiffrés au repos (modèle User). */
const ENCRYPTED_FIELDS = ["firstName", "lastName"] as const;
const WRITE_OPS = new Set(["create", "update", "upsert", "createMany", "updateMany"]);

/** Chiffre les champs personnels dans un objet `data` (mutation en place). */
function encryptData(data: unknown): void {
  if (!data || typeof data !== "object") return;
  const obj = data as Record<string, unknown>;
  for (const field of ENCRYPTED_FIELDS) {
    const v = obj[field];
    if (typeof v === "string") obj[field] = encryptField(v);
  }
}

/** Applique le chiffrement sur les différentes formes d'args d'écriture User. */
function encryptWriteArgs(args: Record<string, unknown>): void {
  if (Array.isArray(args.data)) args.data.forEach(encryptData);
  else if (args.data) encryptData(args.data);
  if (args.create) encryptData(args.create);
  if (args.update) encryptData(args.update);
}

/** Déchiffre récursivement tout champ firstName/lastName chiffré dans un résultat. */
function deepDecrypt(value: unknown): void {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    for (const item of value) deepDecrypt(item);
    return;
  }
  const obj = value as Record<string, unknown>;
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === "string") {
      if (isEncrypted(v) && (k === "firstName" || k === "lastName")) {
        obj[k] = decryptField(v);
      }
    } else if (v && typeof v === "object") {
      deepDecrypt(v);
    }
  }
}

const base = new PrismaClient();

const prisma = base.$extends({
  query: {
    async $allOperations({ model, operation, args, query }) {
      if (model === "User" && WRITE_OPS.has(operation) && args && typeof args === "object") {
        encryptWriteArgs(args as Record<string, unknown>);
      }
      const result = await query(args);
      deepDecrypt(result);
      return result;
    },
  },
});

export default prisma;
