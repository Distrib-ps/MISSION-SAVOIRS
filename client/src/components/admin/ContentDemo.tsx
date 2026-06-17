import { useState } from "react";
import DemoStage, { Spot, type DemoScene } from "./DemoStage";

/* ---------- Briques de maquette (données en dur) ---------- */

function FakeBtn({ children, primary = true }: { children: React.ReactNode; primary?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold ${
        primary ? "bg-ms-lavender text-white" : "bg-white border border-ms-light-gray text-ms-dark"
      }`}
    >
      {children}
    </span>
  );
}

function FakeRow({ emoji, title, sub }: { emoji?: string; title: string; sub: string }) {
  return (
    <div className="flex items-center gap-3 bg-white border border-ms-light-gray rounded-xl px-4 py-3">
      {emoji && <span className="text-xl">{emoji}</span>}
      <div className="flex-1">
        <div className="font-bold text-ms-dark text-sm">{title}</div>
        <div className="text-xs text-ms-gray">{sub}</div>
      </div>
      <span className="text-ms-gray">›</span>
    </div>
  );
}

function Header({ title, action }: { title: string; action: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-base font-extrabold text-ms-dark">{title}</h3>
      {action}
    </div>
  );
}

function Field({ label, value, spot = false }: { label: string; value: string; spot?: boolean }) {
  const input = (
    <div>
      <div className="text-xs font-bold uppercase text-ms-gray mb-1">{label}</div>
      <div className="px-3 py-2 border border-ms-light-gray rounded-lg text-sm text-ms-dark bg-white">
        {value}
      </div>
    </div>
  );
  return spot ? <Spot>{input}</Spot> : input;
}

const SCENES: DemoScene[] = [
  {
    caption: (
      <>
        On commence toujours par créer un <strong>thème</strong> (une grande matière). Cliquez sur{" "}
        <strong>Ajouter un thème</strong>.
      </>
    ),
    screen: (
      <>
        <Header title="Gestion des contenus" action={<Spot><FakeBtn>＋ Ajouter un thème</FakeBtn></Spot>} />
        <div className="space-y-2">
          <FakeRow emoji="🏛️" title="Histoire" sub="2 sous-thèmes" />
          <FakeRow emoji="🔢" title="Mathématiques" sub="3 sous-thèmes" />
        </div>
      </>
    ),
  },
  {
    caption: (
      <>
        Donnez un <strong>nom</strong> au thème (et un emoji si vous voulez), puis enregistrez.
      </>
    ),
    screen: (
      <div className="max-w-md mx-auto">
        <h3 className="text-base font-extrabold text-ms-dark mb-4">Nouveau thème</h3>
        <div className="space-y-3">
          <div>
            <div className="text-xs font-bold uppercase text-ms-gray mb-1">Icône</div>
            <div className="flex gap-2">{["🏛️", "🔢", "🌍", "🎨"].map((e) => <span key={e} className="w-9 h-9 rounded-lg bg-ms-cream border border-ms-light-gray flex items-center justify-center">{e}</span>)}</div>
          </div>
          <Field label="Nom du thème" value="Histoire" spot />
          <FakeBtn>Enregistrer</FakeBtn>
        </div>
      </div>
    ),
  },
  {
    caption: (
      <>
        Vous êtes maintenant <strong>dans le thème</strong>. Créez un <strong>sous-thème</strong>{" "}
        (un chapitre).
      </>
    ),
    screen: (
      <>
        <Header title="Histoire › sous-thèmes" action={<Spot><FakeBtn>＋ Ajouter un sous-thème</FakeBtn></Spot>} />
        <div className="space-y-2">
          <FakeRow title="La Préhistoire" sub="2 quiz" />
          <FakeRow title="L'Antiquité" sub="1 quiz" />
        </div>
      </>
    ),
  },
  {
    caption: (
      <>
        Dans le sous-thème, créez un <strong>quiz</strong>.
      </>
    ),
    screen: (
      <>
        <Header title="La Préhistoire › quiz" action={<Spot><FakeBtn>＋ Ajouter un quiz</FakeBtn></Spot>} />
        <div className="space-y-2">
          <FakeRow title="Les premiers hommes" sub="5 questions" />
        </div>
      </>
    ),
  },
  {
    caption: (
      <>
        Choisissez la <strong>visibilité</strong> du quiz : <strong>Public</strong> (tous les élèves)
        ou <strong>Privé</strong> (seulement vos classes).
      </>
    ),
    screen: (
      <div className="max-w-md mx-auto">
        <h3 className="text-base font-extrabold text-ms-dark mb-4">Nouveau quiz</h3>
        <div className="space-y-3">
          <Field label="Titre" value="Les premiers hommes" />
          <div>
            <div className="text-xs font-bold uppercase text-ms-gray mb-1">Visibilité</div>
            <Spot>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl bg-ms-lavender text-white px-3 py-2 text-sm font-semibold text-center">Public</div>
                <div className="rounded-xl bg-white border border-ms-light-gray px-3 py-2 text-sm font-semibold text-center text-ms-dark">🔒 Privé</div>
              </div>
            </Spot>
          </div>
          <FakeBtn>Enregistrer</FakeBtn>
        </div>
      </div>
    ),
  },
  {
    caption: (
      <>
        Ouvrez le quiz, puis ajoutez vos <strong>questions</strong>.
      </>
    ),
    screen: (
      <>
        <Header title="Les premiers hommes › questions" action={<Spot><FakeBtn>＋ Ajouter une question</FakeBtn></Spot>} />
        <div className="space-y-2">
          <FakeRow title="Quel outil utilisaient les premiers hommes ?" sub="QCM" />
          <FakeRow title="Dessine une grotte" sub="Dessin" />
        </div>
      </>
    ),
  },
  {
    caption: (
      <>
        Choisissez le <strong>type</strong> de question. Renseignez ensuite l'énoncé, les réponses,
        et (au choix) un indice et une solution.
      </>
    ),
    screen: (
      <div className="max-w-lg mx-auto">
        <h3 className="text-base font-extrabold text-ms-dark mb-4">Nouvelle question</h3>
        <div className="text-xs font-bold uppercase text-ms-gray mb-1">Type de question</div>
        <Spot>
          <div className="grid grid-cols-3 gap-2">
            {["QCM", "Texte", "Glisser-déposer", "Association", "Classement", "Dessin"].map((t, n) => (
              <div
                key={t}
                className={`px-3 py-2 rounded-xl text-xs font-semibold text-center border ${
                  n === 0 ? "bg-ms-lavender text-white border-ms-lavender" : "bg-white text-ms-dark border-ms-light-gray"
                }`}
              >
                {t}
              </div>
            ))}
          </div>
        </Spot>
      </div>
    ),
  },
  {
    caption: (
      <>
        🎉 <strong>C'est tout !</strong> Côté élève, les quiz se débloquent au fur et à mesure
        (≈ 70 % de réussite). L'icône 🔗 sur un quiz permet aussi de le partager à un collègue.
      </>
    ),
    screen: (
      <div className="text-center py-8">
        <div className="text-5xl mb-3">🎓</div>
        <p className="font-bold text-ms-dark">Vous savez créer tout votre contenu !</p>
        <p className="text-sm text-ms-gray mt-1">Thème → Sous-thème → Quiz → Questions</p>
      </div>
    ),
  },
];

export default function ContentDemo() {
  const [active, setActive] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setActive(true)}
        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-ms-lavender border border-ms-lavender/40 rounded-xl hover:bg-ms-lavender-light/50 transition shrink-0"
        title="Voir comment créer du contenu"
      >
        ▶ Démo
      </button>
      <DemoStage title="Créer du contenu — pas à pas" scenes={SCENES} active={active} onClose={() => setActive(false)} />
    </>
  );
}
