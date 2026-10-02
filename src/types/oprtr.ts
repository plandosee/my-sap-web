// [7장] 작업자 타입
// - 필드 이름은 oprtr.xml 의 select 컬럼 기준 (06장 비공정과 같은 방식)

/** 작업자 목록의 한 행 */
export interface Oprtr {
  /** 작업자코드 (PK, 'OP0001' 형식, 서버 자동 채번) */
  oprtrId: string
  /** 이름 */
  oprtrNm: string
  /** 생년월일 'yyyy-MM-dd' */
  oprtrBrdt: string | null
  /** 전화번호 */
  oprtrTelno: string | null
  /** 직위코드 (공통코드 OJBPS) */
  oprtrJbpsCd: string | null
  useYn: 'Y' | 'N'
  rmrk: string | null
  sort: number | null
  rgtr: string | null
  regDt: string | null
  chnrg: string | null
  chgDt: string | null
  /** 행 번호 → "더보기"에서 마지막 행의 rnum을 lastIdx로 보낸다 */
  rnum: number
}

/** 검색 조건 */
export interface OprtrSearch {
  oprtrNm: string
  /** '' = 전체 */
  oprtrJbpsCd: string
  useYn: '' | 'Y' | 'N'
}

/** 등록/수정 폼 (입력값은 모두 문자열) */
export interface OprtrForm {
  /** '' = 신규 */
  oprtrId: string
  oprtrNm: string
  oprtrBrdt: string
  oprtrTelno: string
  oprtrJbpsCd: string
  sort: string
  useYn: 'Y' | 'N'
  rmrk: string
}
