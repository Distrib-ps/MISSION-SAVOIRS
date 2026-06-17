import { Link } from "react-router-dom";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-xl font-bold text-ms-dark mb-2">{title}</h2>
      <div className="text-ms-gray space-y-2 leading-relaxed">{children}</div>
    </section>
  );
}

export default function MentionsLegalesPage() {
  return (
    <div className="min-h-screen bg-ms-cream">
      <div className="max-w-3xl mx-auto px-6 py-10">
        <Link to="/" className="text-ms-lavender font-semibold hover:underline">
          ← Retour à l'accueil
        </Link>
        <h1 className="text-3xl font-extrabold text-ms-dark mt-4 mb-8">Mentions légales</h1>

        <Section title="Éditeur">
          <p>
            Mission Savoirs est un projet éducatif développé par <strong>Théo Delhay</strong>, à
            titre personnel et non commercial (aucune structure juridique). Contact :
            delhay70@gmail.com.
          </p>
        </Section>

        <Section title="Directeur de la publication">
          <p>Théo Delhay.</p>
        </Section>

        <Section title="Hébergeur">
          <p>
            Application et base de données hébergées localement, en France (auto-hébergement).
            Aucun hébergeur tiers.
          </p>
        </Section>

        <Section title="Propriété intellectuelle">
          <p>
            Les contenus pédagogiques et le code de la plateforme sont protégés. Toute reproduction
            non autorisée est interdite.
          </p>
        </Section>

        <Section title="Données personnelles">
          <p>
            Le traitement des données personnelles est décrit dans notre{" "}
            <Link to="/confidentialite" className="text-ms-lavender font-semibold hover:underline">
              politique de confidentialité
            </Link>
            .
          </p>
        </Section>

        <p className="text-xs text-ms-gray/70 mt-10">
          Utilisé par l'École Élémentaire Grand Pré Bulcos. Dernière mise à jour : juin 2026.
        </p>
      </div>
    </div>
  );
}
