import { ProgressBar } from 'tend-design-system'

export const Levels = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 14, width: 280 }}>
    <ProgressBar pct={20} color="var(--house-maple)" />
    <ProgressBar pct={60} color="var(--house-willow)" />
    <ProgressBar pct={100} color="var(--a-sage)" />
  </div>
)

export const Labeled = () => (
  <div style={{ width: 280 }}>
    <ProgressBar pct={40} color="var(--house-oak)" />
    <div style={{ fontSize: 12, color: 'var(--a-ink3)', marginTop: 7, fontFamily: 'Geist, sans-serif' }}>
      <span style={{ fontWeight: 700, color: 'var(--a-ink)' }}>4</span> of 10 done · 0/2 residents complete
    </div>
  </div>
)
