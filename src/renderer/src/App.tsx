import React, { useCallback } from 'react'
import { useImageStore } from './store'
import DropZone from './components/DropZone'
import ImageGrid from './components/ImageGrid'
import ImageModal from './components/ImageModal'
import Toolbar from './components/Toolbar'
import styles from './App.module.css'

export default function App() {
  const store = useImageStore()

  const modalImage = store.modalImageId ? store.images.find((i) => i.id === store.modalImageId) ?? null : null
  const modalIdx = store.modalImageId ? store.images.findIndex((i) => i.id === store.modalImageId) : -1

  const handleDrop = useCallback(
    (paths: string[]) => {
      store.loadImages(paths)
    },
    [store.loadImages]
  )

  return (
    <div className={styles.root}>
      <DropZone hasImages={store.images.length > 0} onDrop={handleDrop} />

      {store.images.length > 0 && (
        <div className={styles.layout}>
          <main className={styles.main}>
            <ImageGrid
              images={store.images}
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
            totalCount={store.images.length}
            selectedCount={store.selectedIds.size}
            culledCount={store.culledIds.size}
            sortField={store.sortField}
            sortDir={store.sortDir}
            isWorking={store.isWorking}
            error={store.error}
            onSort={store.setSort}
            onCull={store.cullSelected}
            onUncull={store.uncullSelected}
            onConfirmDelete={store.confirmDelete}
            onTouch={store.touchAll}
            onSelectAll={store.selectAll}
            onSelectNone={store.selectNone}
            onClearView={store.clearView}
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
    </div>
  )
}
