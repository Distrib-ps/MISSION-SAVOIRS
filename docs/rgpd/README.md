# Conformité RGPD — Mission Savoirs

Application pédagogique traitant des données de **mineurs (6–10 ans)** en milieu scolaire.
Ce dossier regroupe la documentation de conformité, renseignée pour ce déploiement.

## Documents

Contexte : projet éducatif développé par **Théo Delhay** (à titre personnel, non commercial) pour
l'**École Élémentaire Grand Pré Bulcos – B2** (responsable de traitement, représentée par Sabrina
Letellier).

| Document | Objet | Statut |
|---|---|---|
| [registre-traitements.md](./registre-traitements.md) | Registre des activités de traitement (art. 30) | Renseigné |
| [note-information-parents.md](./note-information-parents.md) | Information des familles (art. 12-14) | Renseigné (à diffuser) |
| [aipd-trame.md](./aipd-trame.md) | Trame d'analyse d'impact (AIPD/DPIA) | Pré-rempli (à valider) |
| [dpa-ecole-editeur.md](./dpa-ecole-editeur.md) | Accord de sous-traitance (art. 28) école ↔ éditeur | Renseigné (à signer) |

La **politique de confidentialité** et les **mentions légales** sont publiées dans l'application
(pages `/confidentialite` et `/mentions-legales`).

## Mesures techniques déjà en place (référencées dans les documents)

- Authentification JWT (secret fort obligatoire), rôles relus en base, expiration de session.
- Anti-bruteforce sur la connexion ; déblocage par l'enseignant.
- Mots de passe hachés (bcrypt, coût 12).
- **Chiffrement des noms** des élèves au repos (AES-256-GCM).
- **Purge des dessins** dès leur validation par l'enseignant.
- **Journal d'accès** aux données sensibles (consultations, exports, suppressions).
- **Export** des données d'un élève (droit d'accès / portabilité).
- En-têtes de sécurité (Helmet), CORS restreint, dépendances assainies.
- Police hébergée localement (pas d'appel à Google Fonts).

## Points restant à traiter hors application

- Définir `JWT_SECRET` et `ENCRYPTION_KEY` forts en production (et **sauvegarder la clé de chiffrement**).
- Vérifier la **région UE** du projet Supabase, activer le RLS, signer le **DPA Supabase**.
- Compléter et faire valider les documents de ce dossier.
- Réaliser l'**AIPD** avant mise en production réelle.
