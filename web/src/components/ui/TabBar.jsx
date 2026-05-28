import { IconHome, IconCal, IconChat, IconCar, IconPeople } from '../icons'

export function TabBar({ active, onTabChange }) {
  const tabs = [
    { id: 'houses', label: 'Houses',   Icon: IconHome },
    { id: 'sched',  label: 'Schedule', Icon: IconCal },
    { id: 'team',   label: 'Team',     Icon: IconChat },
    { id: 'drive',  label: 'Driving',  Icon: IconCar },
    { id: 'me',     label: 'Me',       Icon: IconPeople },
  ]
  return (
    <div className="tab-bar">
      {tabs.map(t => (
        <button
          key={t.id}
          className={active === t.id ? 'active' : ''}
          onClick={() => onTabChange?.(t.id)}
        >
          <t.Icon size={22} sw={1.7} />
          <span>{t.label}</span>
        </button>
      ))}
    </div>
  )
}
