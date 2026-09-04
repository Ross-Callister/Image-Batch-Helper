import type { AppOperationsApi } from '../shared/appApi'

export interface ImageBatchApi extends AppOperationsApi {
  getPathForFile: (file: File) => string
}
