"use client"

import type React from "react"
import styles from './LoadingAnimation.module.css'

const ObolPhoneLoader: React.FC = () => {
  return (
    <div className={styles.phoneContainer}>
      <div className={`${styles.phone} ${styles.vibrating}`}>
        <div className={styles.screen}>
          <div className={styles.logo}>
            <svg className={styles.infinitySymbol} viewBox="0 0 120 40" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M20,20 C20,16 22,12 25,12 C28,12 30,16 45,20 C60,24 65,28 75,30 C82,30 88,28 90,20 C90,12 85,4 75,4 C65,4 60,16 45,20 C30,24 28,28 25,28 C22,28 20,24 20,20"
                fill="none"
                stroke="#2FE4AB"
                strokeWidth="3"
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

