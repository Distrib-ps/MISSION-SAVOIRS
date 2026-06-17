import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import AdminLayout from "../../components/admin/AdminLayout";

/* ---------- Petits blocs réutilisables ---------- */

function Steps({ items }: { items: ReactNode[] }) {
  return (
    <ol className="space-y-2 mt-2">
      {items.map((it, i) => (
        <li key={i} className="flex gap-3">
          <span className="shrink-0 w-6 h-6 rounded-full bg-ms-lavender text-white text-sm font-bold flex items-center justify-center">
            {i + 1}
          </span>
          <span className="text-ms-dark pt-0.5">{it}</span>
        </li>
      ))}
    </ol>
  );
}

function Tip({ tone = "tip", children }: { tone?: "tip" | "warn"; children: ReactNode }) {
  const styles =
    tone === "warn"
      ? "bg-ms-pink-light/60 border-ms-pink/30 text-ms-dark"
      : "bg-ms-blue-light/50 border-ms-blue/20 text-ms-dark";
  return (
    <div className={`mt-3 rounded-xl border px-4 py-3 text-sm ${styles}`}>
      {tone === "warn" ? "⚠️ " : "💡 "}
      {children}
    </div>
  );
}

/* ---------- Contenu du guide ---------- */

interface Section {
  id: string;
  icon: string;
  title: string;
  keywords: string;
  body: ReactNode;
}

const SECTIONS: Section[] = [
  {
    id: "connexion",
    icon: "🔑",
    title: "Se connecter",
    keywords: "connexion login mot de passe identifiant bloqué",
    body: (
      <>
        <Steps
          items={[
            "Ouvrez l'application et cliquez sur « Se connecter ».",
            "Entrez votre identifiant et votre mot de passe (fournis par l'administrateur).",
            "Vous arrivez sur votre espace enseignant.",
          ]}
        />
        <Tip>
          Après plusieurs essais ratés, la connexion se bloque quelques minutes (sécurité).
          Patientez, ou demandez à Sabrina Letellier de réinitialiser votre accès.
        </Tip>
      </>
    ),
  },
  {
    id: "classes",
    icon: "🏫",
    title: "Classes & groupes",
    keywords: "classe groupe niveau regrouper élèves multi",
    body: (
      <>
        <p>
          Une « classe ou groupe » regroupe des élèves et permet de cibler du contenu. Un élève
          peut appartenir à <strong>plusieurs</strong> groupes (ex. sa classe <code>CE2-2</code> et
          un <code>Groupe lecture</code>).
        </p>
        <Steps
          items={[
            "Menu « Classes & groupes » → « + Créer une classe / un groupe ».",
            "Donnez un nom (ex. CE2-2, Groupe 1) et choisissez le niveau.",
            "Enregistrer.",
          ]}
        />
      </>
    ),
  },
  {
    id: "eleves",
    icon: "👧",
    title: "Gérer les élèves (créer / importer)",
    keywords: "élève compte importer excel csv identifiant mot de passe modifier supprimer",
    body: (
      <>
        <p className="font-semibold text-ms-dark">Créer un élève</p>
        <Steps
          items={[
            "Menu « Élèves » → « + Créer ».",
            "Renseignez prénom, nom, niveau et un mot de passe court.",
            "Cochez sa (ses) classe(s)/groupe(s), puis Enregistrer.",
            "L'identifiant est généré automatiquement (prénom + 1re lettre du nom).",
          ]}
        />
        <p className="font-semibold text-ms-dark mt-4">Importer toute une classe (Excel/CSV)</p>
        <Steps
          items={[
            "Menu « Élèves » → « Importer ».",
            "Téléchargez le modèle (.xlsx) et remplissez une ligne par élève.",
            <>
              Colonnes : <strong>PRENOM, NOM, NIVEAU</strong> (obligatoires) et{" "}
              <strong>CLASSE</strong> (facultative — plusieurs groupes séparés par{" "}
              <code>;</code>, ex. <code>CE2-2 ; Groupe lecture</code>).
            </>,
            "Glissez le fichier : un aperçu indique les lignes valides ✅ et en erreur ✗.",
            "Importez, puis téléchargez la liste des identifiants pour la distribuer.",
          ]}
        />
        <Tip tone="warn">
          Conservez le fichier d'identifiants : les mots de passe ne sont plus ré-affichés ensuite.
        </Tip>
        <Tip>
          Un élève change de classe ? Modifiez-le (✏️) et cochez/décochez ses groupes — pas besoin
          de recréer un compte, même s'il a été créé par un autre enseignant.
        </Tip>
      </>
    ),
  },
  {
    id: "contenus",
    icon: "📚",
    title: "Créer du contenu (thèmes, quiz, questions)",
    keywords: "thème sous-thème quiz question qcm texte dessin association classement glisser",
    body: (
      <>
        <p>Le contenu est organisé en arborescence :</p>
        <pre className="bg-ms-cream rounded-xl p-3 text-xs text-ms-dark mt-2 overflow-x-auto">
{`📚 Thème (ex. Histoire)
  └ 📂 Sous-thème (ex. La Préhistoire)
      └ 📝 Quiz (ex. Les premiers hommes)
          └ ❓ Questions`}
        </pre>
        <Steps
          items={[
            "Menu « Contenus » → créez un Thème, puis un Sous-thème, puis un Quiz.",
            "Dans le quiz, ajoutez des questions et choisissez leur type.",
            "Pour chaque question : énoncé, réponses, et (option) un indice et une solution.",
          ]}
        />
        <div className="mt-3 grid sm:grid-cols-2 gap-2 text-sm">
          {[
            ["QCM", "une ou plusieurs bonnes réponses"],
            ["Texte", "réponse libre (corrigée auto)"],
            ["Glisser-déposer", "ranger des étiquettes"],
            ["Association", "relier deux à deux"],
            ["Classement", "remettre dans l'ordre"],
            ["Dessin", "l'élève dessine → vous validez"],
          ].map(([t, d]) => (
            <div key={t} className="bg-ms-cream/60 rounded-lg px-3 py-2">
              <span className="font-semibold text-ms-dark">{t}</span>
              <span className="text-ms-gray"> — {d}</span>
            </div>
          ))}
        </div>
        <Tip>
          Les quiz se débloquent progressivement : l'élève doit en réussir un (≈ 70 %) pour ouvrir
          le suivant. Les questions ratées peuvent revenir plus tard automatiquement.
        </Tip>
      </>
    ),
  },
  {
    id: "visibilite",
    icon: "👁️",
    title: "Diffuser un quiz : public ou privé",
    keywords: "public privé visibilité ciblage diffusion",
    body: (
      <>
        <div className="grid sm:grid-cols-2 gap-3 mt-1">
          <div className="rounded-xl border border-ms-light-gray p-3">
            <p className="font-bold text-ms-dark">● Public</p>
            <p className="text-sm text-ms-gray">Tous les élèves de la plateforme (par défaut).</p>
          </div>
          <div className="rounded-xl border border-ms-light-gray p-3">
            <p className="font-bold text-ms-dark">🔒 Privé</p>
            <p className="text-sm text-ms-gray">Seulement vos élèves (vos classes/groupes).</p>
          </div>
        </div>
        <p className="mt-3 text-sm text-ms-gray">
          Le choix se fait à la création/modification du quiz. Un badge 🔒 Privé apparaît dans la
          liste.
        </p>
      </>
    ),
  },
  {
    id: "dessins",
    icon: "🎨",
    title: "Valider les dessins",
    keywords: "dessin valider refuser correction attente",
    body: (
      <>
        <p>
          Quand un élève rend un dessin, il passe « en attente ». Le menu{" "}
          <strong>« Dessins à valider »</strong> affiche un compteur rouge.
        </p>
        <Steps
          items={[
            "Ouvrez « Dessins à valider ».",
            "Regardez l'image, puis ✅ Valider (compté juste) ou ❌ Refuser (l'élève retentera).",
          ]}
        />
        <Tip tone="warn">
          Dès la validation/refus, l'image est <strong>supprimée</strong> (vie privée de l'enfant) :
          on ne garde que le résultat. Corrigez donc assez vite. Vous ne voyez que les dessins liés
          à vos questions.
        </Tip>
      </>
    ),
  },
  {
    id: "parcours",
    icon: "📋",
    title: "Parcours personnalisés",
    keywords: "parcours personnalisé remédiation difficulté sur mesure",
    body: (
      <Steps
        items={[
          "Menu « Élèves » → icône Parcours (📋) sur la ligne de l'élève.",
          "« + Nouveau parcours », nommez-le (ex. Renfort multiplications).",
          "Choisissez les quiz à inclure, puis Enregistrer.",
          "L'élève verra ce parcours dédié dans son espace.",
        ]}
      />
    ),
  },
  {
    id: "revisions",
    icon: "🔁",
    title: "Révisions par niveau",
    keywords: "révision niveau mélange questions date fin évaluation",
    body: (
      <Steps
        items={[
          "Menu « Révisions » → « + Créer une révision ».",
          "Nom + niveau ciblé + (option) une date de fin.",
          "Sélectionnez les questions, puis Enregistrer.",
          "Tous les élèves du niveau verront la révision.",
        ]}
      />
    ),
  },
  {
    id: "stats",
    icon: "📊",
    title: "Suivre les résultats",
    keywords: "statistiques résultats progression points faibles export",
    body: (
      <>
        <p>
          Menu <strong>« Statistiques »</strong> : vue globale (taux de réussite, quiz les plus
          ratés…) et vue <strong>par élève</strong> (progression, points faibles, détail question
          par question).
        </p>
        <Tip>Le bouton « Exporter » télécharge les stats en CSV — pratique pour un bilan.</Tip>
      </>
    ),
  },
  {
    id: "partage",
    icon: "🤝",
    title: "Partager un quiz avec un collègue",
    keywords: "partage partager collègue co-accès lecture",
    body: (
      <>
        <Steps
          items={[
            "Menu « Contenus » → icône Partager (🔗) sur la ligne du quiz.",
            "Choisissez le ou les professeurs.",
            "Chez eux, le quiz apparaît dans « Partagés avec moi » (lecture seule).",
          ]}
        />
        <Tip>
          Chacun ne modifie que ses propres contenus. Un quiz « partagé avec moi » est consultable
          mais non modifiable.
        </Tip>
      </>
    ),
  },
  {
    id: "faq",
    icon: "❓",
    title: "Questions fréquentes",
    keywords: "faq dépannage problème oublié bloqué disparu admin export journal",
    body: (
      <div className="space-y-3 text-sm">
        {[
          ["Un élève a oublié son mot de passe ?", "Élèves → ✏️ Modifier → saisissez-en un nouveau."],
          [
            "Je ne vois pas mon quiz chez un élève.",
            "Vérifiez la visibilité (Privé = vos élèves), la classe ciblée, et que le quiz a au moins une question.",
          ],
          [
            "Le dessin d'un élève a disparu.",
            "Normal après validation/refus : l'image est supprimée, seul le résultat est gardé.",
          ],
          [
            "Je ne peux pas modifier le quiz d'un collègue.",
            "On ne modifie que ses propres contenus ; un quiz partagé est en lecture seule.",
          ],
          [
            "Je ne vois pas « Journal d'accès » / « Exporter les données ».",
            "Ces fonctions sont réservées à l'administrateur. C'est normal.",
          ],
        ].map(([q, a]) => (
          <div key={q as string} className="rounded-xl bg-ms-cream/60 px-4 py-3">
            <p className="font-semibold text-ms-dark">{q}</p>
            <p className="text-ms-gray mt-0.5">{a}</p>
          </div>
        ))}
      </div>
    ),
  },
];

/* ---------- Assistant local (sans IA externe) ---------- */

const STOPWORDS = new Set(
  "je tu il elle on nous vous le la les un une des du de des au aux et ou est sont a as ai avec dans pour par sur que qui quoi quel quelle comment faire mon ma mes ton ta tes son sa ses ce cette cet plus moins comme quand donc car".split(
    " "
  )
);

function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 3 && !STOPWORDS.has(t));
}

/** Classe les sections par pertinence vis-à-vis de la question (titre + mots-clés). */
function rankSections(question: string): Section[] {
  const toks = tokenize(question);
  if (toks.length === 0) return [];
  return SECTIONS.map((s) => {
    const title = s.title.toLowerCase();
    const kw = s.keywords.toLowerCase();
    let score = 0;
    for (const t of toks) {
      if (title.includes(t)) score += 3;
      if (kw.includes(t)) score += 2;
    }
    return { s, score };
  })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.s);
}

/* ---------- Page ---------- */

export default function AidePage() {
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(SECTIONS[0].id);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<Section[] | null>(null);

  function ask(e: React.FormEvent) {
    e.preventDefault();
    setAnswer(rankSections(question));
  }

  function goToSection(id: string) {
    setQuery("");
    setOpenId(id);
    setTimeout(
      () => document.getElementById(`sec-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" }),
      0
    );
  }

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return SECTIONS;
    return SECTIONS.filter(
      (s) => s.title.toLowerCase().includes(q) || s.keywords.toLowerCase().includes(q)
    );
  }, [query]);

  return (
    <AdminLayout>
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-extrabold text-ms-dark">Guide de l'enseignant</h1>
          <p className="text-ms-gray">Tout ce qu'il faut pour prendre l'application en main.</p>
        </div>
        <button
          onClick={() => window.dispatchEvent(new Event("tour:start"))}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold bg-ms-lavender text-white rounded-xl hover:opacity-90 transition shrink-0"
        >
          ▶ Revoir la visite guidée
        </button>
      </div>

      {/* Assistant local : répond à partir du guide (aucune donnée envoyée à l'extérieur) */}
      <div className="mb-5 bg-white border border-ms-lavender/30 rounded-2xl p-4">
        <p className="font-bold text-ms-dark mb-1">🤖 Pose ta question</p>
        <p className="text-xs text-ms-gray mb-3">
          L'assistant cherche la réponse dans ce guide. Tout reste local — aucune donnée n'est envoyée à l'extérieur.
        </p>
        <form onSubmit={ask} className="flex gap-2">
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ex. : comment importer ma classe ? comment partager un quiz ?"
            className="flex-1 px-4 py-2.5 text-sm border border-ms-light-gray rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-ms-lavender/40"
          />
          <button
            type="submit"
            className="px-5 py-2.5 text-sm font-semibold bg-ms-lavender text-white rounded-xl hover:opacity-90 transition shrink-0"
          >
            Demander
          </button>
        </form>

        {answer !== null && (
          answer.length === 0 ? (
            <p className="mt-3 text-sm text-ms-gray">
              Je n'ai pas trouvé de réponse précise. Reformule, ou parcours les sections ci-dessous.
            </p>
          ) : (
            <div className="mt-4">
              <div className="rounded-xl border border-ms-lavender/30 bg-ms-lavender-light/30 p-4">
                <p className="font-bold text-ms-dark flex items-center gap-2 mb-2">
                  <span className="text-xl">{answer[0].icon}</span>
                  {answer[0].title}
                </p>
                <div className="text-sm text-ms-dark leading-relaxed">{answer[0].body}</div>
              </div>
              {answer.length > 1 && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="text-xs text-ms-gray">Sujets liés :</span>
                  {answer.slice(1, 4).map((s) => (
                    <button
                      key={s.id}
                      onClick={() => goToSection(s.id)}
                      className="text-xs font-semibold text-ms-lavender border border-ms-lavender/40 rounded-full px-3 py-1 hover:bg-ms-lavender-light/50 transition"
                    >
                      {s.icon} {s.title}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )
        )}
      </div>

      <div className="mb-5">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ou parcourir : rechercher dans l'aide (import, dessin, mot de passe…)"
          className="w-full px-4 py-2.5 text-sm border border-ms-light-gray rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-ms-lavender/40"
        />
      </div>

      <div className="grid lg:grid-cols-[220px_1fr] gap-6">
        {/* Sommaire */}
        <nav className="hidden lg:block sticky top-6 self-start space-y-1">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              onClick={() => {
                setQuery("");
                setOpenId(s.id);
                document.getElementById(`sec-${s.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
              className="w-full text-left px-3 py-2 rounded-lg text-sm text-ms-gray hover:bg-ms-lavender-light hover:text-ms-dark transition"
            >
              <span className="mr-2">{s.icon}</span>
              {s.title}
            </button>
          ))}
        </nav>

        {/* Sections */}
        <div className="space-y-3">
          {filtered.length === 0 && (
            <p className="text-ms-gray">Aucun résultat pour « {query} ».</p>
          )}
          {filtered.map((s) => {
            const open = openId === s.id || query.trim() !== "";
            return (
              <div
                id={`sec-${s.id}`}
                key={s.id}
                className="bg-white border border-ms-light-gray rounded-2xl overflow-hidden scroll-mt-6"
              >
                <button
                  onClick={() => setOpenId(open && !query ? null : s.id)}
                  className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-ms-cream/40 transition"
                >
                  <span className="text-2xl">{s.icon}</span>
                  <span className="flex-1 font-bold text-ms-dark">{s.title}</span>
                  <span className={`text-ms-gray transition-transform ${open ? "rotate-180" : ""}`}>
                    ▾
                  </span>
                </button>
                {open && <div className="px-5 pb-5 text-ms-dark leading-relaxed">{s.body}</div>}
              </div>
            );
          })}
        </div>
      </div>
    </AdminLayout>
  );
}
