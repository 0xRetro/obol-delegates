"use client"

import { useState, useEffect } from "react"

const ObolLogo: React.FC = () => {
  const [animationStep, setAnimationStep] = useState(0)

  useEffect(() => {
    const animate = async () => {
      // Initial delay of 3 seconds before first draw
      await new Promise(r => setTimeout(r, 3000))
      
      while (true) {
        // Draw the logo (0 to 100) in 3 seconds
        for (let i = 0; i <= 100; i++) {
          setAnimationStep(i)
          await new Promise(r => setTimeout(r, 30)) // 3 second draw (30ms × 100 steps)
        }
        
        // Wait 30 seconds
        await new Promise(r => setTimeout(r, 30000))
        
        // Undraw the logo (100 to 0) in 3 seconds
        for (let i = 100; i >= 0; i--) {
          setAnimationStep(i)
          await new Promise(r => setTimeout(r, 30)) // 3 second undraw (30ms × 100 steps)
        }
        
        // Wait 3 seconds before starting again
        await new Promise(r => setTimeout(r, 3000))
      }
    }

    animate()
  }, [])

  return (
    <div className="logo-container">
      <svg className="infinity-symbol" viewBox="0 0 100 40" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M24,20 C24,15 27,11 31,11 C35,11 38,15 48,20 C60,25 70,35 77,35 C83,35 87,27 87,20 C87,6 83,2 77,2 C70,2 60,15 48,20 C38,25 35,29 31,29 C27,29 24,25 24,20"
          fill="none"
          stroke="#2FE4AB"
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeDasharray="200"
          strokeDashoffset={200 - animationStep * 2}
        />
      </svg>
      <style jsx>{`
        .logo-container {
          height: 40px;
          width: 100px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .infinity-symbol {
          width: 100%;
          height: 100%;
        }
      `}</style>
    </div>
  )
}

export default ObolLogo
