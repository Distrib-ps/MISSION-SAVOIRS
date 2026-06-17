# Analyse d'impact relative à la protection des données (AIPD / DPIA)

> Trame à compléter. Une AIPD est **obligatoire** ici : traitement de données de **mineurs** à
> grande échelle, avec suivi/évaluation (profilage pédagogique). Outil recommandé : le logiciel
> **PIA de la CNIL** (gratuit). Ce fichier sert de support de réflexion préalable.

## 1. Description du traitement

- **Finalité** : suivi pédagogique d'élèves du primaire.
- **Données** : identité, niveau, classe(s), résultats, réponses, indices, parcours, dessins (temporaire).
- **Personnes concernées** : mineurs de 6 à 10 ans.
- **Durées** : résultats jusqu'au départ de l'élève ; dessins purgés à la validation.
- **Acteurs** : établissement (responsable), éditeur (sous-traitant), Supabase (hébergeur).
- **Flux** : navigateur ↔ API ↔ base de données ; export manuel possible par l'établissement.

## 2. Évaluation de la proportionnalité et de la nécessité

- Base légale : mission d'intérêt public. [Justifier la nécessité de chaque catégorie de données.]
- **Minimisation** : pas d'email, pas de date de naissance, pas de géolocalisation. [À confirmer.]
- Point d'attention : l'identifiant de connexion est nominatif (prénom + initiale). [Risque/justification.]

## 3. Risques pour les personnes

| Risque | Sources de risque | Gravité | Vraisemblance | Mesures en place | Risque résiduel |
|---|---|---|---|---|---|
| Accès illégitime aux données | Vol de session, compte compromis | [À éval.] | [À éval.] | JWT secret fort, rôle relu en base, rate-limit, audit log, chiffrement des noms | [À éval.] |
| Divulgation de dessins sensibles | Conservation prolongée | [À éval.] | [À éval.] | Purge des dessins à la validation | [À éval.] |
| Profilage stigmatisant (difficultés) | Accès large aux stats | [À éval.] | [À éval.] | Accès restreint + journalisé | [À éval.] |
| Transfert hors UE | Région d'hébergement | [À éval.] | [À éval.] | Vérifier région UE Supabase + DPA/SCC | [À éval.] |
| Perte de la clé de chiffrement | Mauvaise gestion des secrets | [À éval.] | [À éval.] | Sauvegarde sécurisée de ENCRYPTION_KEY | [À éval.] |

## 4. Mesures complémentaires envisagées

- [À COMPLÉTER selon l'évaluation : ex. identifiants non nominatifs, restriction d'accès par classe, etc.]

## 5. Avis et validation

- Avis du DPO : [À COMPLÉTER]
- Position du responsable de traitement : [À COMPLÉTER]
- Consultation des personnes/représentants : [le cas échéant]
- Date de l'analyse / révision : [À COMPLÉTER]
