import { useState, useEffect } from 'react'

export function useNowMinute() {
  const [now, setNow] = useState(() => {
    const d = new Date()
    return d.getHours() + d.getMinutes() / 60
  })
  useEffect(() => {
    const id = setInterval(() => {
      const d = new Date()
      setNow(d.getHours() + d.getMinutes() / 60)
    }, 60000)
    return () => clearInterval(id)
  }, [])
  return now
}
