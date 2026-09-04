import React, { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { createRankingPairs, type RankingPair } from './rankingPairs'
import { ELO_DEFAULT } from '../../model/elo'
import type { ImageItem } from '../../model/types'
import { toLocalFileUrl } from '../../utils/localFileUrl'
import styles from './RankingSession.module.css'
import sessionStyles from '../../styles/fullScreenSession.module.css'

interface Props {
  isOpen: boolean
  images: ImageItem[]
  eloScores: Map<string, number>
  onClose: () => void
  onComparison: (winnerId: string, loserId: string) => void
  onSkip: (aId: string, bId: string) => void
  onApplySort: () => void
}

export default function RankingSession({
  isOpen,
  images,
  eloScores,
  onClose,
  onComparison,
  onSkip,
  onApplySort
}: Props) {
  const [currentIndex, setCurrentIndex] = useState(0)

  // Generate shuffled pair list once when session opens
  const pairs = useMemo<RankingPair[]>(() => {
    if (!isOpen || images.length < 2) return []
    return createRankingPairs(images.map((image) => image.id))
  }, [isOpen, images])

  // Reset index when a new session opens
  useEffect(() => {
    if (isOpen) setCurrentIndex(0)
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return }
      if (done) return
      const [aId, bId] = pairs[currentIndex]
      if (e.key === 'ArrowLeft') { onComparison(aId, bId); setCurrentIndex((i) => i + 1) }
      if (e.key === 'ArrowRight') { onComparison(bId, aId); setCurrentIndex((i) => i + 1) }
      if (e.key === 's' || e.key === 'S' || e.key === ' ') {
        e.preventDefault()
        onSkip(aId, bId)
        setCurrentIndex((i) => i + 1)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, currentIndex, pairs, onClose, onComparison, onSkip])

  if (!isOpen || pairs.length === 0) return null

  const done = currentIndex >= pairs.length
  const estimated = Math.ceil(images.length * 2)
  const pct = Math.min(100, Math.round((currentIndex / estimated) * 100))

  const leaderboard = [...images]
    .sort((a, b) => (eloScores.get(b.id) ?? ELO_DEFAULT) - (eloScores.get(a.id) ?? ELO_DEFAULT))
    .slice(0, 10)

  const pick = (winner: string, loser: string) => {
    onComparison(winner, loser)
    setCurrentIndex((i) => i + 1)
  }

  const skipPair = () => {
    const [aId, bId] = pairs[currentIndex]
    onSkip(aId, bId)
    setCurrentIndex((i) => i + 1)
  }

  let leftItem: ImageItem | undefined
  let rightItem: ImageItem | undefined
  if (!done) {
    const [aId, bId] = pairs[currentIndex]
    leftItem = images.find((i) => i.id === aId)
    rightItem = images.find((i) => i.id === bId)
  }

  return createPortal(
    <div className={sessionStyles.backdrop}>
      <div className={sessionStyles.session}>
        {/* Top bar */}
        <div className={sessionStyles.topBar}>
          <span className={sessionStyles.topTitle}>Ranking session</span>
          <div className={sessionStyles.progressWrap}>
            <div className={styles.progressBar} style={{ width: `${pct}%` }} />
          </div>
          <span className={sessionStyles.progressLabel}>
            {currentIndex} / ~{estimated} comparisons
          </span>
          <div className={sessionStyles.topSep} />
          <button className={styles.applyBtn} onClick={onApplySort}>
            Apply ranking sort
          </button>
          <button className={sessionStyles.exitBtn} onClick={onClose}>
            Exit
          </button>
        </div>

        {/* Main area */}
        <div className={sessionStyles.body}>
          {done ? (
            <div className={styles.doneArea}>
              <div className={styles.doneIcon}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              </div>
              <p className={styles.doneTitle}>All pairs compared</p>
              <p className={styles.doneSub}>Every unique pair has been judged.</p>
              <button className={styles.applyBtn} onClick={onApplySort}>
                Apply ranking sort
              </button>
            </div>
          ) : (
            <>
              {/* Left image */}
              <div className={styles.side} onClick={() => leftItem && rightItem && pick(leftItem.id, rightItem.id)}>
                <div className={styles.imgWrap}>
                  {leftItem && <img src={toLocalFileUrl(leftItem.path)} alt={leftItem.name} draggable={false} />}
                  <div className={styles.chooseHint}>
                    <span className={styles.keyHint}>←</span> Choose
                  </div>
                </div>
                <div className={styles.imgMeta}>
                  <span className={styles.imgName}>{leftItem?.name}</span>
                  <span className={styles.imgScore}>{eloScores.get(leftItem?.id ?? '') ?? ELO_DEFAULT}</span>
                </div>
              </div>

              {/* Right image */}
              <div className={styles.side} onClick={() => leftItem && rightItem && pick(rightItem.id, leftItem.id)}>
                <div className={styles.imgWrap}>
                  {rightItem && <img src={toLocalFileUrl(rightItem.path)} alt={rightItem.name} draggable={false} />}
                  <div className={`${styles.chooseHint} ${styles.chooseRight}`}>
                    Choose <span className={styles.keyHint}>→</span>
                  </div>
                </div>
                <div className={styles.imgMeta}>
                  <span className={styles.imgName}>{rightItem?.name}</span>
                  <span className={styles.imgScore}>{eloScores.get(rightItem?.id ?? '') ?? ELO_DEFAULT}</span>
                </div>
              </div>
            </>
          )}

          {/* Sidebar */}
          <div className={styles.sidebar}>
            <div className={styles.sideSection}>
              <div className={styles.sideTitle}>Session</div>
              <div className={styles.sideStat}><span>{images.length}</span> images</div>
              <div className={styles.sideStat}><span>{currentIndex}</span> comparisons</div>
              {currentIndex >= estimated && (
                <div className={styles.sideStatGood}><span>✓</span> Target reached</div>
              )}
            </div>

            <div className={styles.sideSection} style={{ flex: 1, overflow: 'hidden' }}>
              <div className={styles.sideTitle}>Leaderboard</div>
              {leaderboard.map((img, idx) => (
                <div key={img.id} className={styles.leaderRow}>
                  <span className={styles.leaderRank}>{idx + 1}</span>
                  <span className={styles.leaderName}>{img.name}</span>
                  <span className={styles.leaderScore}>{eloScores.get(img.id) ?? ELO_DEFAULT}</span>
                </div>
              ))}
            </div>

            {!done && (
              <button className={styles.skipBtn} onClick={skipPair} title="Mark as equal (S or Space)">
                Skip — too similar
                <span className={styles.keyHint} style={{ marginLeft: 6 }}>S</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
