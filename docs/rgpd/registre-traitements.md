# Registre des activités de traitement (RGPD art. 30)

> Modèle à compléter par le responsable de traitement (l'établissement scolaire).
> Les champs `[À COMPLÉTER]` doivent être renseignés.

## Identification

- **Responsable de traitement** : [À COMPLÉTER — établissement scolaire, coordonnées]
- **Représentant / contact** : [À COMPLÉTER — nom, fonction, email]
- **Délégué à la protection des données (DPO)** : [À COMPLÉTER si désigné]
- **Sous-traitant** : éditeur de Mission Savoirs — [À COMPLÉTER — identité, coordonnées]
- **Sous-traitant ultérieur** : Supabase Inc. (hébergement base de données, région [À CONFIRMER])

## Traitement : « Suivi pédagogique des élèves »

| Rubrique | Contenu |
|---|---|
| **Finalité(s)** | Mise à disposition d'activités pédagogiques adaptées et suivi de la progression des élèves |
| **Base légale** | Mission d'intérêt public confiée à l'établissement (RGPD art. 6.1.e) |
| **Catégories de personnes** | Élèves de l'école primaire (mineurs, 6–10 ans) ; personnel (enseignants, administration) |
| **Catégories de données** | Identité (prénom, nom, identifiant, niveau), rattachement classe/groupe, résultats aux quiz, réponses, indices utilisés, parcours personnalisés, dessins (temporairement) |
| **Données sensibles (art. 9)** | Aucune catégorie particulière collectée intentionnellement. Vigilance sur les dessins libres (purgés après validation) |
| **Destinataires** | Personnel autorisé de l'établissement uniquement |
| **Transferts hors UE** | À éviter — vérifier la région UE de Supabase. À défaut : encadrer par clauses contractuelles types (SCC) |
| **Durées de conservation** | Résultats : tant que le compte de l'élève existe, supprimés à sa suppression (départ). Dessins : image supprimée dès validation/refus par l'enseignant (seul le statut est conservé) |
| **Mesures de sécurité** | Voir section ci-dessous |

## Mesures de sécurité (art. 32)

- Authentification par jeton (secret fort), rôle vérifié en base, expiration de session.
- Limitation des tentatives de connexion (anti-bruteforce) ; réinitialisation par l'enseignant.
- Mots de passe hachés (bcrypt, coût 12).
- **Chiffrement des noms** des élèves au repos (AES-256-GCM).
- Chiffrement au repos de la base (Supabase) et en transit (HTTPS/TLS).
- **Journal d'accès** aux données sensibles (consultations stats/dessins, exports, suppressions).
- En-têtes de sécurité HTTP (Helmet), CORS restreint à l'origine de l'application.
- Sauvegardes gérées par l'hébergeur — [préciser fréquence/rétention].

## Exercice des droits

Procédure : voir [note-information-parents.md](./note-information-parents.md). Contact : [À COMPLÉTER].

_Dernière mise à jour : [À COMPLÉTER]._
