import { Banner } from 'tend-design-system'

export const Warning = () => (
  <div style={{ width: 320 }}>
    <Banner tone="bad" icon="🚨">1 reportable incident needs agency notification.</Banner>
  </div>
)

export const Success = () => (
  <div style={{ width: 320 }}>
    <Banner tone="good" icon="✓">All residents fully documented for this shift.</Banner>
  </div>
)

export const Info = () => (
  <div style={{ width: 320 }}>
    <Banner tone="warn" icon="🔥">Fire drill due — last logged 92 days ago.</Banner>
  </div>
)
