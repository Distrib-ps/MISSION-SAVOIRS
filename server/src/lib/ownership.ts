import { Request } from "express";

/**
 * Helpers de cloisonnement par professeur (#22).
 * - ADMIN (Owner) : accès total, aucun filtre.
 * - TEACHER : ne voit/édite que le contenu qu'il a créé (createdById = lui).
 */

export function isOwner(req: Request): boolean {
  return req.user?.role === "ADMIN";
}

export function currentUserId(req: Request): number {
  return req.user!.userId;
}

/** Filtre Prisma sur la propriété du contenu (vide pour l'Owner). */
export function contentOwnerWhere(req: Request): { createdById?: number } {
  return isOwner(req) ? {} : { createdById: currentUserId(req) };
}

/** Filtre Prisma sur le prof gestionnaire d'une classe (vide pour l'Owner). */
export function classManagerWhere(req: Request): { teacherId?: number } {
  return isOwner(req) ? {} : { teacherId: currentUserId(req) };
}
