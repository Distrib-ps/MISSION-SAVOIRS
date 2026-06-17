import { Link } from "react-router-dom";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-xl font-bold text-ms-dark mb-2">{title}</h2>
      <div className="text-ms-gray space-y-2 leading-relaxed">{children}</div>
    </section>
  );
}

export default function ConfidentialitePage() {
  return (
    <div className="min-h-screen bg-ms-cream">
      <div className="max-w-3xl mx-auto px-6 py-10">
        <Link to="/" className="text-ms-lavender font-semibold hover:underline">
          ← Retour à l'accueil
        </Link>
        <h1 className="text-3xl font-extrabold text-ms-dark mt-4 mb-2">
          Politique de confidentialité
        </h1>
        <p className="text-ms-gray mb-8">
          Mission Savoirs est une plateforme pédagogique destinée à des élèves de l'école primaire
          (mineurs). La protection de leurs données est une priorité. Cette page explique quelles
          données sont traitées, pourquoi, et quels sont vos droits.
        </p>

        <Section title="Responsable de traitement">
          <p>
            Dans le cadre scolaire, le responsable de traitement est l'établissement qui utilise la
            plateforme : <strong>École Élémentaire Grand Pré Bulcos</strong>, représentée par
            Sabrina Letellier. Mission Savoirs a été développée par Théo Delhay (projet éducatif, à
            titre personnel et non commercial), qui agit en tant que sous-traitant technique
            (article 28 du RGPD). Contact technique : delhay70@gmail.com.
          </p>
        </Section>

        <Section title="Données traitées">
          <ul className="list-disc pl-5 space-y-1">
            <li>Identité de l'élève : prénom, nom, identifiant de connexion, niveau scolaire.</li>
            <li>Rattachement à une ou plusieurs classes / groupes.</li>
            <li>
              Données pédagogiques : résultats aux quiz, réponses données, indices utilisés, nombre
              d'essais, parcours personnalisés.
            </li>
            <li>
              Dessins réalisés par l'élève dans certaines activités (conservés uniquement jusqu'à
              leur validation par l'enseignant).
            </li>
          </ul>
          <p>
            Les noms et prénoms sont chiffrés dans la base de données. Aucune donnée publicitaire,
            aucune géolocalisation, aucune adresse email d'élève n'est collectée.
          </p>
        </Section>

        <Section title="Finalités et base légale">
          <p>
            Les données servent exclusivement au suivi pédagogique des élèves (proposer des
            activités adaptées, suivre la progression). La base légale est l'exécution d'une mission
            d'intérêt public confiée à l'établissement scolaire (article 6.1.e du RGPD).
          </p>
        </Section>

        <Section title="Durées de conservation">
          <ul className="list-disc pl-5 space-y-1">
            <li>
              Les résultats pédagogiques sont conservés tant que le compte de l'élève existe, puis
              supprimés à la suppression du compte (par ex. au départ de l'élève).
            </li>
            <li>
              Les images des dessins sont supprimées dès leur validation ou refus par l'enseignant ;
              seul le statut (validé / à revoir) est conservé.
            </li>
          </ul>
        </Section>

        <Section title="Destinataires">
          <p>
            Les données ne sont accessibles qu'au personnel autorisé de l'établissement
            (enseignants, administration). Les accès sensibles sont journalisés. Aucune donnée n'est
            transmise à des tiers à des fins commerciales.
          </p>
        </Section>

        <Section title="Hébergement">
          <p>
            Les données sont hébergées localement, en France (auto-hébergement), avec chiffrement.
            Aucun hébergeur tiers ni transfert hors de l'Union européenne.
          </p>
        </Section>

        <Section title="Sécurité">
          <p>
            Mots de passe hachés (bcrypt), connexions protégées contre les tentatives répétées,
            en-têtes de sécurité, chiffrement des noms en base, journal d'accès aux données
            sensibles. En cas de violation de données présentant un risque, l'établissement et, le
            cas échéant, les familles sont informés conformément aux articles 33 et 34 du RGPD.
          </p>
        </Section>

        <Section title="Vos droits">
          <p>
            Conformément au RGPD, vous disposez d'un droit d'accès, de rectification, d'effacement,
            de limitation et de portabilité des données de l'enfant. Ces droits s'exercent auprès de
            l'établissement scolaire (responsable de traitement), qui peut solliciter l'éditeur.
            Une copie des données d'un élève peut être exportée à tout moment par l'établissement.
          </p>
          <p>
            Contact pour l'exercice des droits : Sabrina Letellier — École Élémentaire Grand Pré
            Bulcos, 7 bis Av. du Vercors, 38240 Meylan — delhay70@gmail.com.
          </p>
        </Section>

        <p className="text-xs text-ms-gray/70 mt-10">
          Dernière mise à jour : juin 2026. Projet éducatif à titre personnel et non commercial.
        </p>
      </div>
    </div>
  );
}
