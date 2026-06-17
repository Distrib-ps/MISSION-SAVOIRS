# Accord de sous-traitance des données (RGPD art. 28)

> Modèle de contrat de sous-traitance entre l'**établissement scolaire** (responsable de traitement)
> et l'**éditeur de Mission Savoirs** (sous-traitant). À adapter et faire signer. Ne constitue pas
> un conseil juridique.

## Parties

- **Responsable de traitement** : [À COMPLÉTER — établissement, représentant légal, coordonnées]
- **Sous-traitant** : [À COMPLÉTER — éditeur de Mission Savoirs, coordonnées]

## 1. Objet

Le sous-traitant traite des données personnelles pour le compte du responsable, dans le cadre de la
mise à disposition de la plateforme Mission Savoirs (suivi pédagogique des élèves).

## 2. Description du traitement

- **Nature** : hébergement, stockage, mise à disposition d'une application web.
- **Finalité** : suivi pédagogique.
- **Données** : identité des élèves (chiffrée), résultats, dessins (temporaires), comptes du personnel.
- **Personnes** : élèves mineurs, personnel de l'établissement.
- **Durée** : durée du contrat de service.

## 3. Obligations du sous-traitant

- Traiter les données uniquement sur **instruction documentée** du responsable.
- Garantir la **confidentialité** (personnes autorisées soumises à confidentialité).
- Mettre en œuvre les **mesures de sécurité** (art. 32) : chiffrement des noms au repos, chiffrement
  en transit, contrôle d'accès, journalisation, anti-bruteforce, sauvegardes.
- Ne recourir à un **sous-traitant ultérieur** (ex. Supabase) qu'avec autorisation et garanties
  équivalentes (DPA en cascade).
- **Assister** le responsable pour l'exercice des droits, les notifications de violation, l'AIPD.
- **Notifier** toute violation de données dans les meilleurs délais (objectif : 48 h).
- Au terme du contrat : **supprimer ou restituer** les données, et supprimer les copies.

## 4. Sous-traitants ultérieurs autorisés

| Sous-traitant | Rôle | Localisation | Garanties |
|---|---|---|---|
| Supabase Inc. | Hébergement base de données | [À CONFIRMER — région UE] | DPA Supabase + SCC le cas échéant |

## 5. Sécurité et transferts

- Pas de transfert hors UE sans encadrement (région UE privilégiée ; à défaut, clauses types).
- ⚠️ La clé de chiffrement des noms (`ENCRYPTION_KEY`) est conservée de façon sécurisée ; sa perte
  rend les noms illisibles.

## 6. Droits du responsable

Audit, information, récupération des données, instructions. [À préciser.]

## Signatures

- Pour le responsable de traitement : [Nom, fonction, date, signature]
- Pour le sous-traitant : [Nom, fonction, date, signature]
