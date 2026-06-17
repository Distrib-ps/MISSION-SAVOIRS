# 📘 Mission Savoirs — Guide de l'enseignant

> Ce guide vous accompagne pas à pas pour prendre en main **toute** l'application.
> Aucune compétence technique n'est nécessaire. Gardez-le sous la main les premières fois !

## Sommaire

1. [Se connecter](#1-se-connecter)
2. [L'écran d'accueil et le menu](#2-lécran-daccueil-et-le-menu)
3. [Gérer les classes et les groupes](#3-gérer-les-classes-et-les-groupes)
4. [Gérer les élèves (créer, importer)](#4-gérer-les-élèves)
5. [Créer du contenu : thèmes, quiz, questions](#5-créer-du-contenu)
6. [Diffuser un quiz : public ou privé](#6-diffuser-un-quiz--public-ou-privé)
7. [Valider les dessins des élèves](#7-valider-les-dessins)
8. [Parcours personnalisés (un élève en difficulté)](#8-parcours-personnalisés)
9. [Révisions par niveau](#9-révisions-par-niveau)
10. [Suivre les résultats (statistiques)](#10-suivre-les-résultats)
11. [Partager un quiz avec un collègue](#11-partager-un-quiz)
12. [Scénarios « Je veux… »](#12-scénarios--je-veux-)
13. [Questions fréquentes / dépannage](#13-questions-fréquentes--dépannage)

---

## 1. Se connecter

1. Ouvrez l'application dans votre navigateur.
2. Cliquez sur **Se connecter**.
3. Entrez votre **identifiant** et votre **mot de passe** (fournis par l'administrateur).

```
┌───────────────────────────────┐
│        Mission Savoirs        │
│                               │
│  Identifiant : [ sletellier ] │
│  Mot de passe: [ •••••      ] │
│                               │
│        [  Se connecter  ]     │
└───────────────────────────────┘
```

➡️ Une fois connecté, vous arrivez sur **l'espace enseignant**.

> 🔒 **Sécurité** : après plusieurs essais de mot de passe ratés, la connexion se bloque
> quelques minutes. Si ça vous arrive, attendez ou demandez à l'administrateur.

---

## 2. L'écran d'accueil et le menu

À gauche, le **menu** permet d'accéder à toutes les rubriques :

```
┌──────────────────────┐
│  M  Mission Savoirs  │
├──────────────────────┤
│ 🏠 Tableau de bord   │
│ 👧 Élèves            │
│ 🏫 Classes & groupes │
│ 📚 Contenus          │
│ 🔁 Révisions         │
│ 📊 Statistiques      │
│ 🤝 Partagés avec moi │
│ 🎨 Dessins à valider │ ← un chiffre rouge = dessins en attente
├──────────────────────┤
│ Sabrina Letellier    │
│ ⚙️ Paramètres  🚪 Déco│
└──────────────────────┘
```

| Rubrique | À quoi ça sert |
|---|---|
| **Tableau de bord** | Vue d'ensemble rapide |
| **Élèves** | Créer / importer / modifier les comptes élèves |
| **Classes & groupes** | Organiser les élèves (classe, groupe de besoin…) |
| **Contenus** | Créer vos thèmes, quiz et questions |
| **Révisions** | Préparer une révision mélangeant des questions, par niveau |
| **Statistiques** | Voir les résultats, par élève et par quiz |
| **Partagés avec moi** | Les quiz qu'un collègue vous a partagés |
| **Dessins à valider** | Corriger les dessins rendus par les élèves |

> 💡 **Bon à savoir** : vous voyez **tous les élèves** de l'établissement (pour éviter les
> doublons de comptes), mais vous ne gérez que **vos propres contenus** (vos quiz, vos révisions).

---

## 3. Gérer les classes et les groupes

Une « classe ou groupe » sert à **regrouper des élèves** et à **cibler du contenu**.
Un élève peut appartenir à **plusieurs** classes/groupes (ex. sa classe `CE2-2` **et** un
`Groupe lecture`).

### Créer une classe / un groupe
1. Menu **Classes & groupes** → bouton **+ Créer une classe / un groupe**.
2. Donnez un **nom** (ex. `CE2-2`, `Groupe 1`) et choisissez le **niveau**.
3. **Enregistrer**.

```
Classes & groupes
┌─────────────────────────────────────────────┐
│ [CE2] CE2-2   · 22 élèves · Propriétaire: Vous │ [Modifier] [Suppr.]
│ [CM1] Groupe lecture · 6 élèves · Vous         │ [Modifier] [Suppr.]
└─────────────────────────────────────────────┘
```

> Le **propriétaire** affiché est l'enseignant qui a créé le groupe.

---

## 4. Gérer les élèves

Menu **Élèves**. Vous pouvez créer les comptes un par un ou les importer en masse.

### A. Créer un élève manuellement
1. Bouton **+ Créer**.
2. Renseignez **prénom**, **nom**, **niveau**, et un **mot de passe** (court, facile à retenir).
3. Cochez la (ou les) **classe(s)/groupe(s)** auxquels il appartient.
4. **Enregistrer**. L'identifiant de connexion est **généré automatiquement** (prénom + 1re lettre du nom).

```
Nouvel élève
┌───────────────────────────────────────┐
│ Prénom [ Lucas ]   Nom [ Bernard ]     │
│ Niveau [ CM1 ▼ ]                       │
│ Mot de passe [ ab3k9 ] 🔄              │
│ Classes & groupes :                    │
│   ☑ CE2-2 (CE2) — Sabrina Letellier    │
│   ☑ Groupe lecture (CM1) — Vous        │
│              [ Enregistrer ]           │
└───────────────────────────────────────┘
→ Identifiant créé : lucasb
```

### B. Importer plusieurs élèves (fichier Excel/CSV)
1. Bouton **Importer**.
2. Cliquez sur **Télécharger un modèle (.xlsx)** : un fichier prêt à remplir s'ouvre.
3. Remplissez **une ligne par élève** :

| PRENOM | NOM | NIVEAU | CLASSE |
|---|---|---|---|
| Lina | Dupont | CE1 | *(vide)* |
| Adam | Martin | CM2 | CE2-2 |
| Lucas | Bernard | CM1 | CE2-2 ; Groupe lecture |

- **PRENOM, NOM, NIVEAU** : obligatoires (niveau = CP, CE1, CE2, CM1 ou CM2).
- **CLASSE** : facultative. Pour mettre l'élève dans **plusieurs** groupes, séparez par un
  **point-virgule** : `CE2-2 ; Groupe lecture`.
4. Glissez le fichier dans la fenêtre. Un **aperçu** indique les lignes ✅ valides et ✗ en erreur.
5. **Importer**. Les **identifiants et mots de passe** générés s'affichent :
   cliquez sur **Télécharger la liste des identifiants** pour les distribuer aux élèves.

> ⚠️ Conservez ce fichier d'identifiants en lieu sûr : les mots de passe ne sont plus
> ré-affichés ensuite.

### C. Modifier / retrouver un élève
- **Recherche** par nom ou identifiant en haut de la liste.
- Icône ✏️ pour **modifier** (changer de classe, réinitialiser le mot de passe…).
- Icône 🗑️ pour **supprimer** (efface aussi tous ses résultats).

```
Élèves                              [🔎 rechercher...] [+ Créer] [Importer]
┌──────────────────────────────────────────────────────────────┐
│ ☐  Lucas   Bernard   [CM1] CE2-2  Groupe lecture   lucasb  ✏️ 🗑️ │
│ ☐  Lina    Dupont    [CE1]                         linad   ✏️ 🗑️ │
└──────────────────────────────────────────────────────────────┘
```

> 💡 Un élève change de classe ? Modifiez-le et cochez/décochez ses groupes — **pas besoin de
> recréer un compte**, même s'il a été créé par un autre enseignant.

---

## 5. Créer du contenu

Le contenu est organisé en **arborescence** :

```
📚 Thème (ex. « Histoire »)
   └── 📂 Sous-thème (ex. « La Préhistoire »)
          └── 📝 Quiz (ex. « Les premiers hommes »)
                 └── ❓ Questions
```

Menu **Contenus**. La colonne de gauche affiche l'arborescence ; cliquez pour naviguer/déplier.

### Créer pas à pas
1. **+ Thème** → nom + emoji.
2. Dans le thème, **+ Sous-thème** → nom.
3. Dans le sous-thème, **+ Quiz** → titre, (durée limite facultative), **visibilité** (voir §6).
4. Dans le quiz, **+ Question** → choisissez le **type** :

| Type | Ce que fait l'élève |
|---|---|
| **QCM** | Choisit une ou plusieurs bonnes réponses |
| **Texte** | Tape une réponse libre (corrigée automatiquement, tolérante aux accents) |
| **Glisser-déposer** | Range des étiquettes dans des zones |
| **Association** | Relie des éléments deux à deux |
| **Classement** | Remet des éléments dans le bon ordre |
| **Dessin** | Dessine sa réponse → **vous la validez** ensuite (voir §7) |

5. Pour chaque question : saisissez l'énoncé, les réponses, et (facultatif) un **indice** et une
   **solution** (affichés à l'élève après une erreur).

```
Nouvelle question
┌──────────────────────────────────────────┐
│ Type : ( QCM ▼ )                           │
│ Énoncé : [ Quelle est la capitale ... ]    │
│ Réponses :                                 │
│   ☑ Paris        (bonne réponse)           │
│   ☐ Lyon                                   │
│   ☐ Marseille                              │
│ Indice (option) : [ C'est sur la Seine ]   │
│              [ Enregistrer ]               │
└──────────────────────────────────────────┘
```

> 💡 **Ordre & déblocage** : les quiz se débloquent progressivement pour l'élève. Il doit
> réussir un quiz (≈ 70 % de bonnes réponses) pour ouvrir le suivant. Les questions ratées
> peuvent revenir plus tard automatiquement (réinjection).

---

## 6. Diffuser un quiz : public ou privé

À la création/modification d'un quiz, choisissez sa **visibilité** :

```
Visibilité
┌─────────────────────────┬─────────────────────────┐
│  ● Public               │  ○ Privé                 │
│  Tous les élèves        │  Seulement mes élèves    │
└─────────────────────────┴─────────────────────────┘
```

- **Public** *(par défaut)* : visible par **tous les élèves** de la plateforme.
- **Privé** : visible **uniquement par vos élèves** (ceux des classes/groupes dont vous êtes
  propriétaire).

Un badge **🔒 Privé** apparaît dans la liste pour repérer vos quiz restreints.

---

## 7. Valider les dessins

Quand un élève rend un **dessin**, il part **en attente de validation** (l'élève voit « en attente »).

1. Menu **Dessins à valider** (le chiffre rouge = nombre en attente).
2. Pour chaque dessin : regardez l'image, puis **✅ Valider** (réponse comptée juste) ou
   **❌ Refuser** (l'élève devra retenter).

```
Dessins à valider
┌────────────────────────────────────────┐
│ Lucas Bernard — « Dessine un triangle » │
│   ┌────────────┐                         │
│   │   /\       │   [ ✅ Valider ]         │
│   │  /  \      │   [ ❌ Refuser ]         │
│   └────────────┘                         │
└────────────────────────────────────────┘
```

> 🔐 **Important (vie privée)** : dès que vous validez ou refusez, l'**image est supprimée**
> (on ne garde que le résultat). Pensez donc à corriger les dessins **assez vite**.
> Vous ne voyez que les dessins liés à **vos** questions.

---

## 8. Parcours personnalisés

Pour accompagner un élève en difficulté, créez-lui une **liste de quiz sur mesure**.

1. Menu **Élèves** → sur la ligne de l'élève, icône **Parcours** (📋).
2. **+ Nouveau parcours** → nommez-le (ex. « Renfort multiplications »).
3. Choisissez les **quiz** à inclure (parmi les vôtres) → **Enregistrer**.

L'élève verra ce parcours dédié dans son espace.

---

## 9. Révisions par niveau

Une **révision** mélange des questions de plusieurs quiz, ciblée sur un **niveau**.

1. Menu **Révisions** → **+ Créer une révision**.
2. Donnez un **nom**, choisissez le **niveau** ciblé.
3. (Facultatif) une **date de fin** : après cette date, la révision disparaît pour les élèves.
4. Sélectionnez les **questions** (parmi les vôtres) → **Enregistrer**.

Tous les élèves de ce niveau verront la révision dans leur espace.

---

## 10. Suivre les résultats

Menu **Statistiques**.

### Vue globale
Indicateurs clés (élèves actifs, taux de réussite, quiz les plus ratés…), avec graphiques.

### Vue par élève
1. Onglet **Par élève** → choisissez un élève.
2. Vous voyez : sa progression, ses points faibles, le détail par quiz.
3. Cliquez sur un quiz pour voir **question par question** ce qui est juste/faux.

```
📊 Élève : Lucas Bernard (CM1)
 Réussite moyenne : 78 %     Quiz terminés : 5/7
 ┌─────────────────────────────────────────┐
 │ Préhistoire        ███████████░░  82 %  ▸ │ ← cliquez pour le détail
 │ Multiplications    █████░░░░░░░░  41 %  ▸ │
 └─────────────────────────────────────────┘
 Points faibles : table de 7, accord du verbe…
```

> 📥 Bouton **Exporter** pour télécharger les stats en fichier (CSV), utile pour un bilan.

---

## 11. Partager un quiz

Vous pouvez donner **accès en lecture** à un de vos quiz à un collègue (il pourra l'utiliser et
en voir les stats, sans le modifier).

1. Menu **Contenus** → sur la ligne du quiz, icône **Partager** (🔗).
2. Choisissez le ou les **professeurs**.
3. De leur côté, le quiz apparaît dans **Partagés avec moi**.

---

## 12. Scénarios « Je veux… »

| Je veux… | Où aller |
|---|---|
| Inscrire toute ma classe d'un coup | **Élèves → Importer** (modèle Excel) |
| Mettre un élève dans un 2ᵉ groupe | **Élèves → ✏️ Modifier** → cocher le groupe |
| Réinitialiser le mot de passe d'un élève | **Élèves → ✏️ Modifier** → nouveau mot de passe |
| Créer un quiz visible par tous | **Contenus → + Quiz** → Visibilité **Public** |
| Créer un quiz réservé à ma classe | **Contenus → + Quiz** → Visibilité **Privé** |
| Corriger les dessins | **Dessins à valider** |
| Aider un élève en retard | **Élèves → 📋 Parcours personnalisé** |
| Préparer une révision avant une évaluation | **Révisions → + Créer** |
| Voir qui décroche | **Statistiques → Par élève** |
| Utiliser le quiz d'un collègue | **Partagés avec moi** |

---

## 13. Questions fréquentes / dépannage

**Un élève a oublié son mot de passe ?**
→ **Élèves → ✏️ Modifier** → saisissez un nouveau mot de passe et communiquez-le-lui.

**Un élève n'arrive pas à se connecter après plusieurs essais ?**
→ La connexion se bloque quelques minutes par sécurité. Faites-le patienter, ou réinitialisez
son mot de passe.

**Je ne vois pas mon quiz dans la liste d'un élève.**
→ Vérifiez sa **visibilité** (Privé = seulement vos élèves) et que l'élève est bien dans la
**bonne classe/groupe** s'il est ciblé. Vérifiez aussi que le quiz contient **au moins une question**.

**Le dessin d'un élève a disparu.**
→ C'est normal après validation/refus : l'image est supprimée pour protéger la vie privée de
l'enfant ; seul le résultat (validé / à revoir) est conservé.

**Je ne peux pas modifier le quiz d'un collègue.**
→ Chacun ne modifie que **ses propres** contenus. Un quiz « partagé avec moi » est en
**lecture seule**.

**Je ne vois pas « Journal d'accès » ni le bouton « Exporter les données ».**
→ Ces fonctions sont réservées à l'**administrateur** (responsable des données). C'est normal.

**J'ai supprimé un élève par erreur.**
→ La suppression efface aussi ses résultats et n'est pas annulable. Recréez le compte ou
contactez l'administrateur (sauvegardes).

---

*Besoin d'aide ? Contactez l'administrateur de la plateforme.*
*Bon usage de Mission Savoirs ! 🎓*
