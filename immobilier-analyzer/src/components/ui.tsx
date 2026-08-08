/** Petits composants de formulaire réutilisables, pensés mobile first. */
import type { ReactNode } from 'react'

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
    </label>
  )
}

interface TextFieldProps {
  label: string
  value: string | undefined
  onChange: (value: string | undefined) => void
  placeholder?: string
  type?: string
}

export function TextField({ label, value, onChange, placeholder, type = 'text' }: TextFieldProps) {
  return (
    <Field label={label}>
      <input
        className="input"
        type={type}
        value={value ?? ''}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value || undefined)}
      />
    </Field>
  )
}

interface NumberFieldProps {
  label: string
  value: number | undefined
  onChange: (value: number | undefined) => void
  unit?: string
  placeholder?: string
}

export function NumberField({ label, value, onChange, unit, placeholder }: NumberFieldProps) {
  return (
    <Field label={unit ? `${label} (${unit})` : label}>
      <input
        className="input"
        type="number"
        inputMode="decimal"
        step="any"
        value={value ?? ''}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value === '' ? undefined : Number(e.target.value))}
      />
    </Field>
  )
}

interface SelectFieldProps {
  label: string
  value: string | undefined
  onChange: (value: string | undefined) => void
  options: { value: string; label: string }[]
  emptyLabel?: string
}

export function SelectField({ label, value, onChange, options, emptyLabel }: SelectFieldProps) {
  return (
    <Field label={label}>
      <select
        className="input"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value || undefined)}
      >
        {emptyLabel !== undefined && <option value="">{emptyLabel}</option>}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </Field>
  )
}

interface BooleanFieldProps {
  label: string
  value: boolean | undefined
  onChange: (value: boolean | undefined) => void
}

export function BooleanField({ label, value, onChange }: BooleanFieldProps) {
  const current = value === true ? 'oui' : value === false ? 'non' : ''
  return (
    <SelectField
      label={label}
      value={current || undefined}
      onChange={(v) => onChange(v === undefined ? undefined : v === 'oui')}
      options={[
        { value: 'oui', label: 'Oui' },
        { value: 'non', label: 'Non' },
      ]}
      emptyLabel="—"
    />
  )
}

interface TextAreaFieldProps {
  label: string
  value: string | undefined
  onChange: (value: string) => void
  rows?: number
  placeholder?: string
}

export function TextAreaField({ label, value, onChange, rows = 3, placeholder }: TextAreaFieldProps) {
  return (
    <Field label={label}>
      <textarea
        className="input"
        rows={rows}
        value={value ?? ''}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </Field>
  )
}

interface SegmentedProps<T extends string> {
  value: T | undefined
  onChange: (value: T) => void
  options: { value: T; label: string; tone?: 'good' | 'average' | 'bad' | 'neutral' }[]
  small?: boolean
}

const TONE_ACTIVE: Record<string, string> = {
  good: 'bg-green-600 text-white border-green-600',
  average: 'bg-amber-500 text-white border-amber-500',
  bad: 'bg-red-600 text-white border-red-600',
  neutral: 'bg-blue-700 text-white border-blue-700',
}

export function Segmented<T extends string>({ value, onChange, options, small }: SegmentedProps<T>) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => {
        const active = value === opt.value
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`rounded-full border font-medium cursor-pointer ${
              small ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-sm'
            } ${
              active
                ? TONE_ACTIVE[opt.tone ?? 'neutral']
                : 'border-gray-300 bg-white text-gray-700 hover:border-gray-500'
            }`}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

export function Stat({ label, value, accent }: { label: string; value: ReactNode; accent?: boolean }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">{label}</div>
      <div className={`text-base font-bold ${accent ? 'text-blue-700' : 'text-gray-900'}`}>{value}</div>
    </div>
  )
}

export function Banner({
  tone,
  children,
}: {
  tone: 'warning' | 'error' | 'info' | 'danger'
  children: ReactNode
}) {
  const classes = {
    warning: 'border-amber-400 bg-amber-50 text-amber-900',
    error: 'border-red-400 bg-red-50 text-red-900',
    danger: 'border-red-500 bg-red-100 text-red-900',
    info: 'border-blue-300 bg-blue-50 text-blue-900',
  }[tone]
  return <div className={`rounded-xl border px-4 py-3 text-sm ${classes}`}>{children}</div>
}
