// [6장] 비공정 API
// - 백엔드: NonProcsController.java (/admin/nonProcs) + nonProcs.xml
// - 화면은 "화면 형식(NonProcsForm)"으로만 데이터를 다루고,
//   백엔드 형식으로 바꾸는 일은 이 파일에서만 한다.
//   → 01장에서 찾은 백엔드 특이점(useYn 등)을 화면 코드가 몰라도 되게 만든다.

import type { ApiParams, CountResponse, ListResponse } from '../types/api'
import type { NonProcs, NonProcsForm, NonProcsSearch } from '../types/nonProcs'
import { post } from './client'

const BASE_URL = '/admin/nonProcs'

/**
 * 등록/수정 폼 → 백엔드 파라미터 변환
 *
 * ⚠️ useYn 변환 (01장 주의사항 #1)
 *   nonProcs.xml 의 insert/update 는 "useYn 값이 비어있지 않으면 무조건 'Y'"로 저장한다.
 *   즉 'N'을 보내도 'Y'가 된다. → 미사용은 빈 문자열 '' 로 보내야 'N'으로 저장된다.
 *
 * sort: 빈 문자열이면 서버가 (max(sort)+1)로 채운다.
 */
function toSaveParams(form: NonProcsForm): ApiParams {
  return {
    nonProcsNm: form.nonProcsNm.trim(),
    sort: form.sort.trim(),
    useYn: form.useYn === 'Y' ? 'Y' : '',
    rmrk: form.rmrk,
  }
}

export const nonProcsApi = {
  /**
   * 목록 조회
   * - perPage를 보내지 않으면 전체를 조회한다. (07장에서 "더보기" 방식 사용)
   * - 빈 검색 조건('')은 서버에서 무시된다. (SQL의 <if test="... != ''">)
   */
  retrieveList(search: NonProcsSearch): Promise<ListResponse<NonProcs>> {
    return post<ListResponse<NonProcs>>(`${BASE_URL}/retrieveList.do`, {
      nonProcsNm: search.nonProcsNm.trim(),
      useYn: search.useYn,
    })
  },

  /** 등록 (nonProcsId는 서버가 'NP0001' 형식으로 자동 채번) */
  insert(form: NonProcsForm): Promise<CountResponse> {
    return post<CountResponse>(`${BASE_URL}/insert.do`, toSaveParams(form))
  },

  /** 수정 (nonProcsId 필수, 6자) */
  update(form: NonProcsForm): Promise<CountResponse> {
    return post<CountResponse>(`${BASE_URL}/update.do`, {
      nonProcsId: form.nonProcsId,
      ...toSaveParams(form),
    })
  },

  /** 삭제 (실제로는 del_yn='Y' 로 바꾸는 논리 삭제) */
  delete(nonProcsId: string): Promise<CountResponse> {
    return post<CountResponse>(`${BASE_URL}/delete.do`, { nonProcsId })
  },
}
