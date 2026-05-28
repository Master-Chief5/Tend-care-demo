import { useState } from 'react'

export function useToast() {
  const [toast, setToast] = useState(null)
  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2200)
  }
  return [toast, showToast]
}
