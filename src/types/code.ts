// [7장] 공통코드 타입
// - 백엔드: CodeMastController.selectCode (/admin/codeMast/selectCode.do) + codeMast.xml
// - 콤보박스(select)의 선택 항목으로 사용한다. 예) 작업자 직위(OJBPS)

import type { ApiResult } from './api'

/** 공통코드 한 건 */
export interface CommonCode {
  /** 코드값 (서버로 보내는 값) 예) 작업자 직위코드 6자리 */
  codeId: string
  /** 코드명 (화면에 보여주는 이름) */
  codeName: string
  /** 코드 그룹 예) 'OJBPS' */
  codeGroup: string
  /** 정렬 순서 */
  codeSeq: number | null
}

/**
 * selectCode.do 응답
 * ⚠️ 목록 응답(ListResponse)과 모양이 다르다: data.contents 가 아니라 resultList
 */
export interface CodeListResponse extends ApiResult {
  resultList: CommonCode[]
}

/** 이 프로젝트에서 쓰는 코드 그룹 (문자열 오타 방지용으로 한 곳에 모아 둔다) */
export const CODE_GROUP = {
  /** 작업자 직위 */
  OPRTR_JBPS: 'OJBPS',
} as const

/** CODE_GROUP 값 중 하나만 허용하는 타입: 'OJBPS' */
export type CodeGroup = (typeof CODE_GROUP)[keyof typeof CODE_GROUP]
