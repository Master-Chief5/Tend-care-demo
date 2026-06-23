import { Card } from 'tend-design-system'

export const Basic = () => (
  <Card style={{ width: 280 }}>
    <div className="serif" style={{ fontSize: 18, marginBottom: 2 }}>Maple Run</div>
    <div style={{ fontSize: 12.5, color: 'var(--a-ink2)' }}>27 Maple St · South branch · mgr Saira K.</div>
  </Card>
)

export const WithHouseAccent = () => (
  <Card accent="var(--house-maple)" style={{ width: 280 }}>
    <div style={{ fontSize: 13.5, fontWeight: 700 }}>Eleanor Hart</div>
    <div style={{ fontSize: 11, color: 'var(--a-ink3)', marginTop: 2 }}>Room 2 · 78 yrs · Active</div>
  </Card>
)
