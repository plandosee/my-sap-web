// [3장] 백엔드 공통 응답 타입
// - 01장에서 분석한 응답 형식을 TypeScript 타입으로 옮긴 것이다.
// - 화면 코드에서 응답 필드를 잘못 쓰면(오타 등) 실행 전에 빨간 줄로 알려준다.

/**
 * 모든 응답에 공통으로 들어있는 필드
 * (BaseController.getSuccessResult / getErrorResult 참고)
 */
export interface ApiResult {
  /** 성공 true / 실패 false  (※ 실패해도 HTTP 상태는 200) */
  result: boolean
  /** 성공 "00", 실패 시 에러코드(예: "FailToRegist", "UserNotFound") */
  code: string
  /** 성공 "SUCCESS", 실패 시 사유 메시지 */
  message: string
}

/** 페이징 정보 (retrieveList.do 응답의 data.pagination) */
export interface Pagination {
  page: number
  totalCount: number
}

/**
 * 목록 조회 응답 (retrieveList.do)
 * 예) ListResponse<NonProcs>  →  data.contents 가 NonProcs[] 타입이 된다.
 *     <T> 는 "제네릭": 사용하는 쪽에서 행(row)의 타입을 정해서 넣는다.
 */
export interface ListResponse<T> extends ApiResult {
  data: {
    contents: T[]
    pagination: Pagination
  }
}

/** 등록/수정/삭제 응답 (insert.do / update.do / delete.do) */
export interface CountResponse extends ApiResult {
  /** 처리된 행 수 */
  count: number
}

/**
 * 요청 파라미터 타입
 * - 백엔드는 form 데이터(문자열)만 받으므로 값은 문자열/숫자 정도만 허용한다.
 * - undefined / null 인 값은 전송하지 않는다. (client.ts의 toFormParams 참고)
 * - 빈 문자열 '' 은 전송한다. (비공정 useYn 처럼 ''가 의미가 있는 경우가 있음)
 */
export type ApiParams = Record<string, string | number | boolean | null | undefined>
