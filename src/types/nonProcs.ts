// [6장] 비공정 타입
// - 필드 이름은 백엔드 SQL(nonProcs.xml)의 select 컬럼을 camelCase로 바꾼 것
//   (MyBatis EgovMap이 non_procs_nm → nonProcsNm 으로 바꿔서 응답한다)

/** 비공정 목록의 한 행 (retrieveList.do 응답의 data.contents[]) */
export interface NonProcs {
  /** 비공정코드 (PK, 'NP0001' 형식, 등록 시 서버가 자동 채번) */
  nonProcsId: string
  /** 비공정명 */
  nonProcsNm: string
  /** 정렬 순서 */
  sort: number | null
  /** 사용여부 */
  useYn: 'Y' | 'N'
  /** 비고 */
  rmrk: string | null
  /** 등록자 / 등록일시 */
  rgtr: string | null
  regDt: string | null
  /** 수정자 / 수정일시 */
  chnrg: string | null
  chgDt: string | null
  /** 행 번호 (정렬 기준 순번, 07장 "더보기"에서 사용) */
  rnum: number
}

/** 검색 조건 */
export interface NonProcsSearch {
  /** 비공정명 (부분 검색) */
  nonProcsNm: string
  /** 사용여부: '' = 전체 */
  useYn: '' | 'Y' | 'N'
}

/**
 * 등록/수정 폼 입력값
 * - 화면 입력값은 모두 "문자열"로 다룬다. (input의 value는 항상 문자열)
 * - 서버로 보낼 때 api/nonProcsApi.ts 에서 백엔드 형식으로 변환한다.
 */
export interface NonProcsForm {
  /** 비공정코드: '' 이면 신규 등록, 값이 있으면 수정 */
  nonProcsId: string
  nonProcsNm: string
  /** 정렬 (입력칸이라 문자열. 비우면 서버가 맨 뒤 순번으로 채움) */
  sort: string
  useYn: 'Y' | 'N'
  rmrk: string
}
