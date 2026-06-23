import { Badge } from 'tend-design-system'

export const Severities = () => (
  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
    <Badge tone="good">Minor</Badge>
    <Badge tone="warn">Moderate</Badge>
    <Badge tone="bad">Serious</Badge>
  </div>
)

export const Reportable = () => <Badge tone="solid">REPORTABLE</Badge>

export const Flags = () => (
  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
    <Badge tone="neutral">Fall risk</Badge>
    <Badge tone="bad">⚠ Penicillin</Badge>
  </div>
)
