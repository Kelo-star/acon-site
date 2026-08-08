/** Questions au vendeur : liste générique + questions personnalisées. */
import { useEffect, useState } from 'react'
import type { SectionProps } from './types'
import type { QuestionEntry } from '../../models/inspection'
import { DEFAULT_QUESTIONS } from '../../data/defaultQuestions'
import { createId } from '../../utils/id'
import { TextAreaField } from '../ui'

export default function QuestionsSection({ property, update }: SectionProps) {
  const [newQuestion, setNewQuestion] = useState('')

  /* Initialise la liste avec les questions génériques au premier affichage. */
  useEffect(() => {
    if (property.questions.length === 0) {
      update((p) =>
        p.questions.length > 0
          ? p
          : {
              ...p,
              questions: DEFAULT_QUESTIONS.map((question) => ({ id: createId(), question })),
            },
      )
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [property.id])

  function patchQuestion(id: string, changes: Partial<QuestionEntry>) {
    update((p) => ({
      ...p,
      questions: p.questions.map((q) => (q.id === id ? { ...q, ...changes } : q)),
    }))
  }

  const unanswered = property.questions.filter((q) => !q.answer?.trim()).length

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-600">{unanswered} question(s) sans réponse.</p>
      {property.questions.map((q) => (
        <details key={q.id} className="card" open={Boolean(q.answer)}>
          <summary className="flex cursor-pointer items-center justify-between gap-2 text-sm font-semibold">
            <span>{q.question}</span>
            <span className="flex shrink-0 gap-1">
              {q.answer?.trim() &&
                (q.satisfactory === true ? (
                  <span className="chip bg-green-100 text-green-800">OK</span>
                ) : q.satisfactory === false ? (
                  <span className="chip bg-red-100 text-red-800">Insatisfaisante</span>
                ) : null)}
              {q.toVerify && <span className="chip bg-amber-100 text-amber-800">À vérifier</span>}
            </span>
          </summary>
          <div className="mt-2 space-y-2">
            <TextAreaField
              label="Réponse"
              value={q.answer}
              onChange={(answer) => patchQuestion(q.id, { answer })}
              rows={2}
            />
            <div className="flex flex-wrap gap-4 text-sm">
              <label className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={q.satisfactory === true}
                  onChange={(e) => patchQuestion(q.id, { satisfactory: e.target.checked ? true : undefined })}
                />
                Réponse satisfaisante
              </label>
              <label className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={q.satisfactory === false}
                  onChange={(e) => patchQuestion(q.id, { satisfactory: e.target.checked ? false : undefined })}
                />
                Réponse insatisfaisante
              </label>
              <label className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={q.toVerify ?? false}
                  onChange={(e) => patchQuestion(q.id, { toVerify: e.target.checked })}
                />
                À vérifier
              </label>
              {q.custom && (
                <button
                  className="text-xs text-red-700"
                  onClick={() =>
                    update((p) => ({ ...p, questions: p.questions.filter((x) => x.id !== q.id) }))
                  }
                >
                  Supprimer
                </button>
              )}
            </div>
          </div>
        </details>
      ))}
      <div className="flex gap-2">
        <input
          className="input"
          placeholder="Ajouter une question personnalisée…"
          value={newQuestion}
          onChange={(e) => setNewQuestion(e.target.value)}
        />
        <button
          className="btn shrink-0"
          disabled={!newQuestion.trim()}
          onClick={() => {
            update((p) => ({
              ...p,
              questions: [...p.questions, { id: createId(), question: newQuestion.trim(), custom: true }],
            }))
            setNewQuestion('')
          }}
        >
          Ajouter
        </button>
      </div>
    </div>
  )
}
