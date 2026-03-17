type ProgressBarProps = {
  label: string
  value: number
  total: number
  tone?: 'peach' | 'sage' | 'indigo'
}

const tones = {
  peach: 'progress progress-peach',
  sage: 'progress progress-sage',
  indigo: 'progress progress-indigo',
}

export default function ProgressBar({ label, value, total, tone = 'peach' }: ProgressBarProps) {
  const safeTotal = Math.max(total, 0)
  const safeValue = Math.min(Math.max(value, 0), safeTotal || 0)
  const percent = safeTotal > 0 ? Math.round((safeValue / safeTotal) * 100) : 0

  return (
    <div className="progress-wrap">
      <div className="progress-meta">
        <p className="progress-label">{label}</p>
        <p className="progress-value">
          {safeValue} / {safeTotal}
        </p>
      </div>
      <div className={tones[tone]}>
        <div className="progress-fill" style={{ width: `${percent}%` }} />
      </div>
    </div>
  )
}
