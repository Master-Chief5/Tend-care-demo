import { useState, useRef, useEffect, useCallback } from 'react'

export function useToast() {
  const [toast, setToast] = useState(null)
  const timerRef = useRef(null)

  const clear = () => { if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null } }

  const showToast = useCallback((msg) => {
    clear()                     // a new toast cancels the previous one's timer
    setToast(msg)
    timerRef.current = setTimeout(() => { setToast(null); timerRef.current = null }, 2200)
  }, [])

  // Don't fire setState after the consumer unmounts.
  useEffect(() => clear, [])

  return [toast, showToast]
}
