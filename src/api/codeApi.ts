// [7장] 공통코드 API
// - active: 'ACTIVE' → 사용 중인 코드만 조회 (기존 MES 클라이언트와 동일한 조건)

import type { CodeGroup, CodeListResponse } from '../types/code'
import { post } from './client'

export const codeApi = {
  /** 코드 그룹별 코드 목록 */
  selectCode(codeGroup: CodeGroup): Promise<CodeListResponse> {
    return post<CodeListResponse>('/admin/codeMast/selectCode.do', { codeGroup, active: 'ACTIVE' })
  },
}
