import { TextField } from 'tend-design-system'

export const Input = () => (
  <div style={{ width: 280 }}>
    <TextField label="Who was notified" placeholder="e.g. Nurse, on-call mgr, guardian" />
  </div>
)

export const Multiline = () => (
  <div style={{ width: 280 }}>
    <TextField label="What happened" placeholder="Describe the incident…" multiline rows={3} />
  </div>
)
