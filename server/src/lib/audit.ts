import { Request } from "express";
import prisma from "./prisma";

/**
 * Journalise une opération sensible (RGPD art. 30/32). Best-effort : n'échoue
 * jamais la requête métier si l'écriture du journal échoue.
 */
export function logAudit(
  req: Request,
  action: string,
  opts: { targetType?: string; targetId?: number; detail?: string } = {}
): void {
  const actorId = req.user?.userId ?? null;
  prisma.auditLog
    .create({
      data: {
        actorId,
        action,
        targetType: opts.targetType ?? null,
        targetId: opts.targetId ?? null,
        detail: opts.detail ?? null,
      },
    })
    .catch((e) => console.error("Audit log échoué:", action, e));
}
