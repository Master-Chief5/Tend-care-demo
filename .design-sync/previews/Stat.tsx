import { Stat, Card } from 'tend-design-system'

export const Row = () => (
  <Card style={{ width: 320 }}>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr' }}>
      <Stat label="Staff" value={3} sub="2 on shift" />
      <Stat label="Residents" value={5} sub="4 home" />
      <Stat label="Drives" value={2} sub="today" />
    </div>
  </Card>
)

export const Single = () => <Stat label="Residents in" value="2" sub="of 2" />
