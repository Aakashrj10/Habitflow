'use client'
import { useCallback } from 'react'

export function useConfetti() {
  const fire = useCallback(async () => {
    const confetti = (await import('canvas-confetti')).default
    confetti({
      particleCount: 120,
      spread: 80,
      origin: { y: 0.6 },
      colors: ['#534AB7', '#7F77DD', '#AFA9EC', '#1D9E75', '#378ADD'],
    })
    setTimeout(() => confetti({
      particleCount: 60,
      angle: 60,
      spread: 55,
      origin: { x: 0, y: 0.6 },
      colors: ['#534AB7', '#7F77DD', '#1D9E75'],
    }), 200)
    setTimeout(() => confetti({
      particleCount: 60,
      angle: 120,
      spread: 55,
      origin: { x: 1, y: 0.6 },
      colors: ['#534AB7', '#AFA9EC', '#378ADD'],
    }), 400)
  }, [])

  return { fire }
}
