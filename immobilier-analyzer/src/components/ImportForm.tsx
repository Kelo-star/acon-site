import { useState } from 'react'

interface Props {
  error: string | null
  onAnalyzeUrl: (url: string) => void
  onAnalyzeText: (text: string, url?: string) => void
  onBack: () => void
}

export default function ImportForm({ error, onAnalyzeUrl, onAnalyzeText, onBack }: Props) {
  const [tab, setTab] = useState<'url' | 'text'>('url')
  const [url, setUrl] = useState('')
  const [text, setText] = useState('')
  const [textUrl, setTextUrl] = useState('')

  return (
    <section>
      <div className="section-header">
        <h1>Importer une annonce</h1>
        <button className="btn btn-ghost" onClick={onBack}>
          Retour
        </button>
      </div>

      <div className="tabs">
        <button className={`tab ${tab === 'url' ? 'tab-active' : ''}`} onClick={() => setTab('url')}>
          Depuis un lien
        </button>
        <button className={`tab ${tab === 'text' ? 'tab-active' : ''}`} onClick={() => setTab('text')}>
          Coller le texte de l'annonce
        </button>
      </div>

      {error && <div className="banner banner-error">{error}</div>}

      {tab === 'url' && (
        <form
          className="form"
          onSubmit={(event) => {
            event.preventDefault()
            if (url.trim()) onAnalyzeUrl(url.trim())
          }}
        >
          <label className="field">
            <span>Collez le lien de l'annonce</span>
            <input
              type="url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://www.seloger.com/annonces/..."
              required
            />
          </label>
          <p className="hint">
            Plateformes reconnues : Leboncoin, SeLoger, Bien'ici, PAP, sites d'agences… Depuis le
            navigateur, seules les informations contenues dans le lien sont exploitables : pour un
            import complet, utilisez « Coller le texte de l'annonce ».
          </p>
          <button className="btn btn-primary" type="submit">
            Analyser l'annonce
          </button>
        </form>
      )}

      {tab === 'text' && (
        <form
          className="form"
          onSubmit={(event) => {
            event.preventDefault()
            if (text.trim()) onAnalyzeText(text, textUrl.trim() || undefined)
          }}
        >
          <label className="field">
            <span>Collez tout le texte de l'annonce</span>
            <textarea
              value={text}
              onChange={(event) => setText(event.target.value)}
              rows={14}
              placeholder={'Maison 3 pièces 56 m²\nLens (62300)\nPrix : 67 000 €\nDPE : D\n...'}
              required
            />
          </label>
          <label className="field">
            <span>Lien de l'annonce (facultatif, pour conserver la provenance)</span>
            <input
              type="url"
              value={textUrl}
              onChange={(event) => setTextUrl(event.target.value)}
              placeholder="https://..."
            />
          </label>
          <button className="btn btn-primary" type="submit">
            Analyser l'annonce
          </button>
        </form>
      )}
    </section>
  )
}
