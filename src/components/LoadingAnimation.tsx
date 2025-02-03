"use client"

import type React from "react"
import styles from './LoadingAnimation.module.css'

const ObolPhoneLoader: React.FC = () => {
  return (
    <div className={styles.phoneContainer}>
      <div className={`${styles.phone} ${styles.vibrating}`}>
        <div className={styles.screen}>
          <div className={styles.logo}>
            <svg className={styles.infinitySymbol} viewBox="0 0 100 40" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M24,20 C24,15 27,11 31,11 C35,11 38,15 48,20 C60,25 70,35 77,35 C83,35 87,27 87,20 C87,6 83,2 77,2 C70,2 60,15 48,20 C38,25 35,29 31,29 C27,29 24,25 24,20"
                fill="none"
                stroke="#2FE4AB"
                strokeWidth="3.2"
                strokeLinecap="round"
                className={styles.animatedPath}
              />
            </svg>
          </div>
        </div>
      </div>
      <p className={styles.loadingText}>Roll Calling Delegates...</p>
    </div>
  )
}

export default ObolPhoneLoader

