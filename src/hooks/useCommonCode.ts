// [7장] 공통코드 조회 훅
//
// ■ 캐시 재사용
//   같은 코드 그룹을 화면 여러 곳(검색 콤보, 팝업 콤보, 표의 직위명 표시)에서 동시에 써도
//   쿼리 키가 같으므로 API는 "한 번만" 호출되고, 결과를 모두가 같이 쓴다.
//
// ■ staleTime
//   공통코드는 거의 바뀌지 않으므로 10분 동안은 "최신"으로 보고 다시 조회하지 않는다.
//   (목록 데이터는 staleTime 0 → 화면에 들어올 때마다 재조회)

import { useQuery } from '@tanstack/react-query'
import { codeApi } from '../api/codeApi'
import type { CodeGroup, CommonCode } from '../types/code'

export const codeKeys = {
  all: ['commonCode'] as const,
  group: (codeGroup: CodeGroup) => [...codeKeys.all, codeGroup] as const,
}

/**
 * 공통코드 목록 + 코드명 찾기 함수
 *
 * 사용:
 *   const { codes, getCodeName } = useCommonCode(CODE_GROUP.OPRTR_JBPS)
 *   codes                 → 콤보박스 항목
 *   getCodeName('JB0001') → '반장'  (표에 코드 대신 이름 표시)
 */
export function useCommonCode(codeGroup: CodeGroup) {
  const query = useQuery({
    queryKey: codeKeys.group(codeGroup),
    queryFn: () => codeApi.selectCode(codeGroup),
    staleTime: 10 * 60 * 1000, // 10분 (밀리초)
    // select: 응답 본문에서 필요한 부분만 꺼내고 가공한다. (캐시에는 원본이 저장됨)
    select: (res): CommonCode[] =>
      [...res.resultList].sort((a, b) => (a.codeSeq ?? 0) - (b.codeSeq ?? 0)),
  })

  const codes = query.data ?? []

  /** 코드값 → 코드명 (없으면 코드값 그대로) */
  const getCodeName = (codeId: string | null | undefined): string => {
    if (!codeId) return ''
    return codes.find((code) => code.codeId === codeId)?.codeName ?? codeId
  }

  return { ...query, codes, getCodeName }
}
