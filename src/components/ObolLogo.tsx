"use client"

import { useState, useEffect } from "react"

const ObolLogo: React.FC = () => {
  const [animationStep, setAnimationStep] = useState(0)
  const [isVisible, setIsVisible] = useState(true)

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
      <svg className="infinity-symbol" viewBox="0 0 120 40" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M20,20 C20,16 22,12 25,12 C28,12 30,16 45,20 C60,24 65,28 75,30 C82,30 88,28 90,20 C90,12 85,4 75,4 C65,4 60,16 45,20 C30,24 28,28 25,28 C22,28 20,24 20,20"
          fill="none"
          stroke="#2FE4AB"
          strokeWidth="3"
          strokeDasharray="200"
          strokeDashoffset={200 - animationStep * 2}
        />
      </svg>
      <style jsx>{`
        .logo-container {
          height: 40px;
          width: 120px;
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
