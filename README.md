# EduPlatform

Plateforme d'enseignement en ligne (LMS) pour établissements, enseignants et élèves.
**Stack :** Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS · Supabase (PostgreSQL, Auth, Storage, RLS) · Lucide · Recharts · Jitsi Meet.

---

## 1. Architecture

```
Navigateur ──► Next.js (Vercel)
                ├─ middleware.ts ........ rafraîchit la session, bloque /admin /teacher /student sans connexion
                ├─ layouts d'espace ..... requireRole() : bon rôle + compte actif, sinon redirection
                ├─ Server Components .... lecture des données avec la session de l'utilisateur
                └─ Server Actions ....... écritures validées par Zod
                         │
                         ▼
               Supabase (PostgreSQL)
                ├─ RLS sur toutes les tables ... barrière finale : chaque requête est filtrée par la base
                ├─ triggers de protection ...... un élève ne peut ni se noter, ni changer son rôle, ni allonger un examen
                ├─ fonctions security definer .. correction automatique des QCM, journal d'audit
                └─ Storage privé ............... accès aux fichiers déduit des droits sur la leçon / le devoir
```

**Principe de sécurité :** le frontend n'est jamais la seule barrière. Même avec la clé publique (`anon`) et un jeton valide, un utilisateur ne peut lire ou modifier que ce que les politiques RLS autorisent.

### Hiérarchie pédagogique

`Établissement → Classe → Matière → Cours → Chapitre → Leçon → (Documents, Vidéos)`

Une classe appartient à un enseignant ; les élèves y sont inscrits (`enrollments`). Un élève voit uniquement les contenus **publiés** des classes où il est inscrit.

### Règles d'accès (résumé)

| Donnée | Super admin | Enseignant | Élève |
|---|---|---|---|
| Établissements | tout | lecture | lecture |
| Profils | tout | soi + ses élèves | soi + ses enseignants |
| Classes, matières, cours, chapitres, leçons | tout | les siens uniquement | publiés, classes inscrites |
| Documents / vidéos (Storage) | tout | son dossier | via leçon publiée accessible |
| Devoirs | tout | les siens | publiés, lecture |
| Copies | tout | copies de ses devoirs, notation | les siennes ; dépôt avant échéance ; jamais la note |
| Examens / questions | tout | les siens | questions visibles seulement après démarrage d'une tentative |
| Corrigés (`question_keys`) | tout | les siens | **jamais** |
| Notes | tout | ses matières, ses élèves | les siennes si publiées |
| Messages | tout | avec ses élèves | avec ses enseignants |
| Journal d'audit | lecture | — | — |

Un compte **suspendu** ou **désactivé** perd immédiatement tout accès (vérifié en base, pas seulement à la connexion).

---

## 2. Arborescence

```
eduplatform/
├─ supabase/
│  ├─ migrations/
│  │  ├─ 0001_schema.sql ....... tables, types, index, contraintes, création auto du profil
│  │  ├─ 0002_security.sql ..... fonctions d'accès, triggers anti-triche, RLS, correction QCM
│  │  └─ 0003_storage.sql ...... buckets privés + politiques Storage
│  └─ tests/rls_scenario.sql ... scénario d'isolation (Postgres local simulant Supabase)
├─ src/
│  ├─ middleware.ts
│  ├─ app/
│  │  ├─ layout.tsx ............ lang/dir (FR/AR RTL), polices
│  │  ├─ page.tsx .............. aiguillage par rôle
│  │  ├─ login/ ................ connexion (Server Action + validation)
│  │  ├─ auth/signout/ ......... déconnexion
│  │  ├─ admin/ ................ espace super admin
│  │  ├─ teacher/ .............. espace enseignant
│  │  └─ student/ .............. espace élève
│  ├─ components/
│  │  ├─ layout/ ............... AppShell (3 variantes visuelles), navigation latérale + tiroir mobile
│  │  ├─ ui/ ................... cartes statistiques, panneaux, états vides / chargement / erreur
│  │  └─ charts/ ............... graphiques Recharts
│  ├─ config/navigation.ts ..... menus par rôle (seules les pages livrées y figurent)
│  └─ lib/
│     ├─ supabase/ ............. clients serveur, navigateur, middleware, service_role
│     ├─ i18n/ ................. dictionnaires FR/AR, sélection de langue
│     ├─ auth.ts ............... getCurrentProfile, requireRole
│     └─ types.ts
└─ .env.example
```

Chaque nouvelle phase ajoute ses dossiers sous `src/app/<espace>/…` et ses entrées dans `config/navigation.ts`.

---

## 3. Mise en place

### 3.1 Supabase

1. Créer un projet sur [supabase.com](https://supabase.com) (région la plus proche de vos utilisateurs).
2. **SQL Editor** → exécuter, dans l'ordre, le contenu de :
   `0001_schema.sql`, puis `0002_security.sql`, puis `0003_storage.sql`.
3. **Authentication → Providers → Email** : laisser activé. **Désactiver « Allow new users to sign up »** : les comptes sont créés par l'administration, pas en libre inscription.
4. **Authentication → URL Configuration** : *Site URL* = l'URL de production (ex. `https://eduplatform.vercel.app`).
5. **Project Settings → API** : copier `Project URL`, `anon public` et `service_role`.

### 3.2 Premier super administrateur

1. **Authentication → Users → Add user → Create new user** : saisir l'e-mail et le mot de passe, cocher *Auto Confirm User*.
2. Dans le **SQL Editor** :

```sql
update public.profiles
set role = 'super_admin', full_name = 'Votre Nom'
where email = 'votre@email.com';

-- un profil créé par défaut reçoit aussi une fiche élève : on la retire
delete from public.students where id = (select id from public.profiles where email = 'votre@email.com');
```

### 3.3 Lancer en local

```bash
cp .env.example .env.local    # puis renseigner les valeurs
npm install
npm run dev                   # http://localhost:3000
```

### 3.4 Déploiement Vercel

1. Pousser le dépôt sur GitHub.
2. [vercel.com/new](https://vercel.com/new) → importer le dépôt (framework détecté : Next.js).
3. *Environment Variables* : ajouter les variables de `.env.example` (`SUPABASE_SERVICE_ROLE_KEY` **sans** préfixe `NEXT_PUBLIC_`).
4. Déployer, puis reporter l'URL obtenue dans Supabase → *Site URL*.

---

## 4. Vérifications effectuées

- Migrations appliquées sans erreur sur PostgreSQL 16 avec une simulation de l'environnement Supabase (`auth.uid()`, rôles `authenticated` / `service_role`, Storage).
- Scénario `supabase/tests/rls_scenario.sql` : un enseignant ne voit ni ne modifie les données d'un autre ; un élève non inscrit ne voit rien ; un élève ne peut pas changer son rôle, s'attribuer une note, prolonger un examen, lire les corrigés, voir les questions avant de démarrer, ni écrire à un enseignant qui n'est pas le sien ; la correction automatique d'un QCM donne le bon score ; un compte suspendu perd l'accès.
- `tsc --noEmit` sans erreur, `next build` réussi, redirections des espaces protégés et rendu RTL arabe vérifiés.

---

## 5. Feuille de route

| Phase | Contenu | État |
|---|---|---|
| 1 | Architecture, base de données complète, RLS, Storage, authentification, 3 espaces, FR/AR RTL | ✅ livrée |
| 2 | Super admin : CRUD établissements, création de comptes enseignants/élèves (service_role), activation/suspension, classes et niveaux, paramètres, journal | à venir |
| 3 | Enseignant : classes, inscriptions d'élèves, matières, cours → chapitres → leçons, upload PDF/DOCX/PPTX/images/vidéos | à venir |
| 4 | Devoirs (dépôt, correction, notes), examens/QCM chronométrés (passage, correction auto + manuelle) | à venir |
| 5 | Élève : consultation des cours, téléchargements, vidéos, passage des évaluations, progression | à venir |
| 6 | Messagerie temps réel (Supabase Realtime), notifications et annonces | à venir |
| 7 | Visioconférence Jitsi : planification, salle intégrée, présence | à venir |
| 8 | Tests de bout en bout, finitions, déploiement | à venir |
