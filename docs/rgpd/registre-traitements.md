# Registre des activités de traitement (RGPD art. 30)

> Renseigné pour l'École Élémentaire Grand Pré Bulcos.

## Identification

- **Responsable de traitement** : École Élémentaire Grand Pré Bulcos — 7 bis Av. du Vercors, 38240 Meylan
- **Représentant / contact** : Sabrina Letellier (enseignante) — delhay70@gmail.com
- **Délégué à la protection des données (DPO)** : aucun désigné
- **Sous-traitant** : Théo Delhay, développeur (projet éducatif personnel, non commercial) — delhay70@gmail.com
- **Sous-traitant ultérieur** : aucun — application et données hébergées localement, en France (auto-hébergement).

## Traitement : « Suivi pédagogique des élèves »

| Rubrique | Contenu |
|---|---|
| **Finalité(s)** | Mise à disposition d'activités pédagogiques adaptées et suivi de la progression des élèves |
| **Base légale** | Mission d'intérêt public confiée à l'établissement (RGPD art. 6.1.e) |
| **Catégories de personnes** | Élèves de l'école primaire (mineurs, 6–10 ans) ; personnel (enseignants, administration) |
| **Catégories de données** | Identité (prénom, nom, identifiant, niveau), rattachement classe/groupe, résultats aux quiz, réponses, indices utilisés, parcours personnalisés, dessins (temporairement) |
| **Données sensibles (art. 9)** | Aucune catégorie particulière collectée intentionnellement. Vigilance sur les dessins libres (purgés après validation) |
| **Destinataires** | Personnel autorisé de l'établissement uniquement |
| **Transferts hors UE** | Aucun — hébergement local, en France |
| **Durées de conservation** | Résultats : tant que le compte de l'élève existe, supprimés à sa suppression (départ). Dessins : image supprimée dès validation/refus par l'enseignant (seul le statut est conservé) |
| **Mesures de sécurité** | Voir section ci-dessous |

## Mesures de sécurité (art. 32)

- Authentification par jeton (secret fort), rôle vérifié en base, expiration de session.
- Limitation des tentatives de connexion (anti-bruteforce) ; réinitialisation par l'enseignant.
- Mots de passe hachés (bcrypt, coût 12).
- **Chiffrement des noms** des élèves au repos (AES-256-GCM).
- Chiffrement des données en transit (HTTPS/TLS) et des noms au repos.
- **Journal d'accès** aux données sensibles (consultations stats/dessins, exports, suppressions).
- En-têtes de sécurité HTTP (Helmet), CORS restreint à l'origine de l'application.
- Sauvegardes locales régulières et chiffrées (fréquence/rétention à définir).

## Exercice des droits

Procédure : voir [note-information-parents.md](./note-information-parents.md). Contact : Sabrina Letellier (établissement) ; contact technique delhay70@gmail.com.

_Dernière mise à jour : juin 2026._
