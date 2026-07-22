import React, { useCallback } from 'react'
import { useImageStore } from './store'
import DropZone from './components/DropZone'
import ImageGrid from './components/ImageGrid'
import ImageModal from './components/ImageModal'
import KeepTossSession from './components/KeepTossSession'
import RankingSession from './components/RankingSession'
import TagPanel from './components/TagPanel'
import Toolbar from './components/Toolbar'
import styles from './App.module.css'

export default function App() {
  const store = useImageStore()

  const modalImage = store.modalImageId ? store.filteredImages.find((i) => i.id === store.modalImageId) ?? null : null
  const modalIdx = store.modalImageId ? store.filteredImages.findIndex((i) => i.id === store.modalImageId) : -1

  const handleDrop = useCallback(
    (paths: string[]) => {
      store.loadImages(paths)
    },
    [store.loadImages]
  )

  const handleApplySort = useCallback(() => {
    store.applyEloSort()
    store.stopRanking()
  }, [store.applyEloSort, store.stopRanking])

  return (
    <div className={styles.root}>
      <DropZone hasImages={store.images.length > 0} onDrop={handleDrop} />

      {store.images.length > 0 && (
        <div className={styles.layout}>
          <TagPanel
            images={store.images}
            selectedIds={store.selectedIds}
            draftTags={store.draftTags}
            hasPendingTags={store.hasPendingTags}
            isWorking={store.isWorking}
            tagFilters={store.tagFilters}
            onAddTag={store.addTagToSelected}
            onRemoveTag={store.removeTagFromSelected}
            onSaveTags={store.saveTags}
            onCycleFilter={store.cycleTagFilter}
            onClearFilters={store.clearTagFilters}
          />
          <main className={styles.main}>
            <ImageGrid
              images={store.filteredImages}
              selectedIds={store.selectedIds}
              culledIds={store.culledIds}
              sortField={store.sortField}
              onImageClick={store.handleImageClick}
              onImageDoubleClick={store.openModal}
              onReorder={store.reorderImages}
              onCullSelected={store.cullSelected}
              onSelectNone={store.selectNone}
            />
          </main>
          <Toolbar
            totalCount={store.filteredImages.length}
            selectedCount={store.selectedIds.size}
            culledCount={store.culledIds.size}
            sortField={store.sortField}
            sortDir={store.sortDir}
            isWorking={store.isWorking}
            error={store.error}
            eloCount={store.eloScores.size}
            onSort={store.setSort}
            onCull={store.cullSelected}
            onUncull={store.uncullSelected}
            onConfirmDelete={store.confirmDelete}
            onTouch={store.touchAll}
            onSelectAll={store.selectAll}
            onSelectNone={store.selectNone}
            onClearView={store.clearView}
            onStartRanking={store.startRanking}
            onStartKeepToss={store.startKeepToss}
            onRenameAll={store.renameAll}
            onDismissError={store.dismissError}
          />
        </div>
      )}

      <ImageModal
        image={modalImage}
        hasPrev={modalIdx > 0}
        hasNext={modalIdx >= 0 && modalIdx < store.images.length - 1}
        onClose={store.closeModal}
        onNavigate={store.navigateModal}
      />

      <RankingSession
        isOpen={store.isRanking}
        images={store.filteredImages}
        eloScores={store.eloScores}
        onClose={store.stopRanking}
        onComparison={store.recordComparison}
        onSkip={store.recordSkip}
        onApplySort={handleApplySort}
      />

      <KeepTossSession
        isOpen={store.isKeepToss}
        images={store.filteredImages}
        decisions={store.keepTossDecisions}
        isWorking={store.isWorking}
        onDecide={store.decideKeepToss}
        onUndo={store.undoKeepToss}
        onClose={store.stopKeepToss}
        onDeleteTossed={store.deleteTossed}
        onMoveKept={store.moveKept}
        onReset={store.resetKeepToss}
      />
    </div>
  )
}
