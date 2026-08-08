interface Props {
  onImport: () => void
  onManual: () => void
  onCancel: () => void
}

export default function NewPropertyChoice({ onImport, onManual, onCancel }: Props) {
  return (
    <section>
      <div className="section-header">
        <h1>Nouveau bien</h1>
        <button className="btn btn-ghost" onClick={onCancel}>
          Annuler
        </button>
      </div>
      <p>Comment souhaitez-vous créer ce bien ?</p>
      <div className="choice-grid">
        <button className="choice-card" onClick={onImport}>
          <span className="choice-icon">📥</span>
          <strong>Importer une annonce</strong>
          <span className="choice-desc">
            Depuis un lien (Leboncoin, SeLoger, Bien'ici, PAP, site d'agence…) ou en collant le texte
            de l'annonce.
          </span>
        </button>
        <button className="choice-card" onClick={onManual}>
          <span className="choice-icon">✏️</span>
          <strong>Saisie manuelle</strong>
          <span className="choice-desc">Renseignez vous-même les informations du bien.</span>
        </button>
      </div>
    </section>
  )
}
