export function SignalVsSelfRatedHint({ id }: { id?: string }) {
  const sid = id ?? 'signal-self-hint'
  return (
    <details className="ux-hint-details">
      <summary className="ux-hint-summary" id={sid}>
        What's the difference between signal and my ratings?
      </summary>
      <div className="ux-hint-body">
        <p>
          <strong>Signal %</strong> is computed from your{' '}
          <strong>Sections</strong> data: the share of components in that
          category marked Implemented, External, Can do, or In progress. It
          reflects registered coverage, not how you feel about the area.
        </p>
        <p>
          <strong>Proficiency</strong> and <strong>your % complete</strong> on
          the <strong>Mastery</strong> tab are self-ratings (0–100) stored only
          in this browser. Use them for intent and momentum; they do not change
          signal.
        </p>
      </div>
    </details>
  )
}
