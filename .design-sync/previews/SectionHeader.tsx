import { SectionHeader, Card } from 'tend-design-system'

export const WithAction = () => (
  <div style={{ width: 300 }}>
    <SectionHeader label="Residents" action="+ Add resident" actionColor="var(--house-maple)" />
    <Card padding="10px 14px">
      <div style={{ fontSize: 13, fontWeight: 500 }}>Eleanor Hart</div>
      <div style={{ fontSize: 10.5, color: 'var(--a-ink3)' }}>Room 2 · Active</div>
    </Card>
  </div>
)

export const Plain = () => (
  <div style={{ width: 300 }}>
    <SectionHeader label="This shift's documentation" />
  </div>
)
