# Analyse d'impact relative à la protection des données (AIPD / DPIA)

> Évaluation initiale renseignée, **à valider**. Une AIPD est recommandée ici (données de
> **mineurs** + suivi/évaluation pédagogique). Pour une analyse formelle, utiliser le logiciel
> **PIA de la CNIL** (gratuit) en reprenant les éléments ci-dessous.

## 1. Description du traitement

- **Finalité** : suivi pédagogique d'élèves du primaire.
- **Données** : identité, niveau, classe(s), résultats, réponses, indices, parcours, dessins (temporaire).
- **Personnes concernées** : mineurs de 6 à 10 ans.
- **Durées** : résultats jusqu'au départ de l'élève ; dessins purgés à la validation.
- **Acteurs** : établissement (responsable), développeur (sous-traitant). Hébergement local, en France.
- **Flux** : navigateur ↔ API ↔ base de données ; export manuel possible par l'établissement.

## 2. Évaluation de la proportionnalité et de la nécessité

- Base légale : mission d'intérêt public de l'école. Chaque catégorie sert le suivi pédagogique
  (identité pour identifier l'élève ; résultats/réponses pour adapter et suivre ; dessins pour
  certaines activités, supprimés après correction).
- **Minimisation** : pas d'email, pas de date de naissance, pas de géolocalisation, pas de donnée
  de santé. Confirmé.
- Point d'attention : l'identifiant de connexion reste nominatif (prénom + initiale) pour rester
  mémorisable par de jeunes enfants — choix assumé ; les noms eux-mêmes sont chiffrés en base.

## 3. Risques pour les personnes

> Échelle : Négligeable / Limitée / Importante / Maximale. Évaluation initiale à valider.

| Risque | Sources de risque | Gravité | Vraisemblance | Mesures en place | Risque résiduel |
|---|---|---|---|---|---|
| Accès illégitime aux données | Vol de session, compte compromis | Importante | Limitée | JWT secret fort, rôle relu en base, rate-limit, audit log, chiffrement des noms | Limité |
| Divulgation de dessins sensibles | Conservation prolongée | Importante | Négligeable | Purge des dessins à la validation | Négligeable |
| Profilage stigmatisant (difficultés) | Accès large aux stats | Limitée | Limitée | Accès restreint + journalisé | Limité |
| Transfert hors UE | Région d'hébergement | Limitée | Négligeable | Hébergement local, en France (aucun transfert) | Négligeable |
| Perte de la clé de chiffrement | Mauvaise gestion des secrets | Limitée | Limitée | Sauvegarde sécurisée de ENCRYPTION_KEY | Limité |

## 4. Mesures complémentaires envisagées

- Sécuriser le serveur local (accès physique, mises à jour, sauvegardes chiffrées).
- Envisager, si besoin, des identifiants non nominatifs (le username révèle aujourd'hui le prénom).
- Sauvegarder ENCRYPTION_KEY de façon sécurisée et documenter la procédure.

## 5. Avis et validation

- Avis du DPO : sans objet (aucun DPO désigné — petit projet scolaire)
- Position du responsable de traitement : École Élémentaire Grand Pré Bulcos (Sabrina Letellier) — à formaliser
- Consultation des personnes/représentants : information des familles via la note dédiée
- Date de l'analyse / révision : juin 2026
