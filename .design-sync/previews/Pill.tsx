import { Pill } from 'tend-design-system'

export const Filters = () => (
  <div style={{ display: 'flex', gap: 6 }}>
    <Pill active>All</Pill>
    <Pill>North</Pill>
    <Pill>South</Pill>
  </div>
)

export const SectionTabs = () => (
  <div style={{ display: 'flex', gap: 6 }}>
    <Pill active>Overview</Pill>
    <Pill>Shift documentation</Pill>
    <Pill>Meds</Pill>
  </div>
)
