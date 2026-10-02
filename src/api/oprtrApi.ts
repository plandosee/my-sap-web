// [7장] 작업자 API
// - 백엔드: OprtrController.java (/admin/oprtr) + oprtr.xml
//
// ■ 06장 비공정과 다른 점
//   1) 목록: perPage + lastIdx 로 "더보기" 페이징
//   2) useYn: 비공정과 달리 'Y'/'N' 을 그대로 저장한다 (oprtr.xml insert: #{useYn})
//      → 같은 회사 백엔드라도 API마다 동작이 다를 수 있다. 항상 SQL을 확인할 것!
//   3) 삭제: 오타 필드 opdrtId 도 같이 보내야 한다

import type { ApiParams, CountResponse, ListResponse } from '../types/api'
import type { Oprtr, OprtrForm, OprtrSearch } from '../types/oprtr'
import { post } from './client'

const BASE_URL = '/admin/oprtr'

/** "더보기" 한 번에 가져올 건수 */
export const OPRTR_PER_PAGE = 10

/** 등록/수정 폼 → 백엔드 파라미터 */
function toSaveParams(form: OprtrForm): ApiParams {
  return {
    oprtrNm: form.oprtrNm.trim(),
    oprtrBrdt: form.oprtrBrdt, // 'yyyy-MM-dd' (input type="date" 값 형식과 같음)
    oprtrTelno: form.oprtrTelno.trim(),
    oprtrJbpsCd: form.oprtrJbpsCd,
    sort: form.sort.trim(), // '' → 서버가 max(sort)+1
    useYn: form.useYn, // ← 비공정과 달리 'N' 그대로 보낸다
    rmrk: form.rmrk,
  }
}

export const oprtrApi = {
  /**
   * 목록 조회 ("더보기" 방식)
   * @param lastRnum 이미 받은 목록의 마지막 행 번호. 0이면 처음부터.
   *
   * 백엔드 SQL (oprtr.xml):
   *   ... where rnum > #{lastIdx.rnum}   ← 마지막 행 다음부터
   *   limit #{perPage}                    ← perPage 건만
   * lastIdx 는 JSON 문자열로 보내야 한다: '{"rnum":10}'  (BaseController가 Map으로 변환)
   */
  retrieveList(search: OprtrSearch, lastRnum: number): Promise<ListResponse<Oprtr>> {
    return post<ListResponse<Oprtr>>(`${BASE_URL}/retrieveList.do`, {
      oprtrNm: search.oprtrNm.trim(),
      oprtrJbpsCd: search.oprtrJbpsCd,
      useYn: search.useYn,
      perPage: OPRTR_PER_PAGE,
      // 첫 페이지는 lastIdx를 아예 보내지 않는다 (undefined는 toFormParams가 제외)
      lastIdx: lastRnum > 0 ? JSON.stringify({ rnum: lastRnum }) : undefined,
    })
  },

  insert(form: OprtrForm): Promise<CountResponse> {
    return post<CountResponse>(`${BASE_URL}/insert.do`, toSaveParams(form))
  },

  update(form: OprtrForm): Promise<CountResponse> {
    return post<CountResponse>(`${BASE_URL}/update.do`, { oprtrId: form.oprtrId, ...toSaveParams(form) })
  },

  /**
   * 삭제 (논리 삭제)
   * ⚠️ 01장 주의사항 #2: OprtrController.delete()는 오타 필드 'opdrtId'를 필수 검사하고,
   *    SQL은 'oprtrId'를 사용한다. → 둘 다 같은 값으로 보낸다.
   */
  delete(oprtrId: string): Promise<CountResponse> {
    return post<CountResponse>(`${BASE_URL}/delete.do`, { oprtrId, opdrtId: oprtrId })
  },
}
