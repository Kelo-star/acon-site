/** Documents : checklist des diagnostics et pièces à réclamer. */
import type { SectionProps } from './types'
import type { DocumentStatus } from '../../models/inspection'
import { DOCUMENT_STATUS_LABELS } from '../../models/inspection'
import { DEFAULT_DOCUMENTS } from '../../data/defaultDocuments'
import { Segmented } from '../ui'

const STATUS_OPTIONS = (Object.keys(DOCUMENT_STATUS_LABELS) as DocumentStatus[]).map((s) => ({
  value: s,
  label: DOCUMENT_STATUS_LABELS[s],
  tone: (s === 'received' ? 'good' : s === 'missing' ? 'bad' : s === 'requested' ? 'average' : 'neutral') as
    | 'good'
    | 'bad'
    | 'average'
    | 'neutral',
}))

export default function DocumentsSection({ property, update }: SectionProps) {
  const missing = Object.values(property.documents).filter((d) => d.status === 'missing').length
  const received = Object.values(property.documents).filter((d) => d.status === 'received').length

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-600">
        {received} reçu(s) · {missing} manquant(s) · {DEFAULT_DOCUMENTS.length} documents suivis
      </p>
      {DEFAULT_DOCUMENTS.map((doc) => {
        const state = property.documents[doc.id]
        return (
          <div key={doc.id} className="card">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-sm font-semibold">{doc.label}</span>
              {state?.status === 'missing' && <span className="chip bg-red-100 text-red-800">Manquant</span>}
            </div>
            <Segmented
              small
              value={state?.status}
              onChange={(status) =>
                update((p) => ({
                  ...p,
                  documents: { ...p.documents, [doc.id]: { ...p.documents[doc.id], status } },
                }))
              }
              options={STATUS_OPTIONS}
            />
            <input
              className="input mt-2"
              placeholder="Notes (date, remarques…)"
              value={state?.notes ?? ''}
              onChange={(e) =>
                update((p) => ({
                  ...p,
                  documents: {
                    ...p.documents,
                    [doc.id]: { status: p.documents[doc.id]?.status ?? 'to-check', notes: e.target.value },
                  },
                }))
              }
            />
          </div>
        )
      })}
    </div>
  )
}
