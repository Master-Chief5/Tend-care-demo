import { Avatar } from 'tend-design-system'

export const Staff = () => (
  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
    <Avatar name="Aisha Mendez" color="var(--house-willow)" />
    <Avatar name="Jay Brooks" color="var(--house-maple)" />
    <Avatar name="Priya Nair" color="var(--house-cedar)" />
  </div>
)

export const Sizes = () => (
  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
    <Avatar name="Lina R." size={24} />
    <Avatar name="Lina R." size={32} />
    <Avatar name="Lina R." size={44} />
  </div>
)
