// [7장] 공통코드 콤보박스
//
// 사용 예)
//   검색용: <CodeSelect codeGroup={CODE_GROUP.OPRTR_JBPS} value={v} onChange={setV} emptyLabel="전체" />
//   입력용: <CodeSelect codeGroup={CODE_GROUP.OPRTR_JBPS} value={v} onChange={setV} emptyLabel="선택" />
//
// - 내부에서 useCommonCode를 호출하므로, 쓰는 쪽은 코드 그룹만 넘기면 된다.
// - 같은 화면에 여러 개 있어도 API는 한 번만 호출된다(React Query 캐시).

import { useCommonCode } from '../hooks/useCommonCode'
import type { CodeGroup } from '../types/code'

interface CodeSelectProps {
  /** 코드 그룹 예) CODE_GROUP.OPRTR_JBPS */
  codeGroup: CodeGroup
  /** 선택된 코드값 ('' = 선택 안 함) */
  value: string
  /** 선택이 바뀌면 코드값을 전달 */
  onChange: (codeId: string) => void
  /** 맨 위 빈 항목의 이름 (예: '전체', '선택') */
  emptyLabel: string
}

export default function CodeSelect({ codeGroup, value, onChange, emptyLabel }: CodeSelectProps) {
  const { codes, isPending, isError } = useCommonCode(codeGroup)

  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} disabled={isPending}>
      <option value="">{isPending ? '불러오는 중...' : isError ? '코드 조회 실패' : emptyLabel}</option>
      {codes.map((code) => (
        <option key={code.codeId} value={code.codeId}>
          {code.codeName}
        </option>
      ))}
    </select>
  )
}
