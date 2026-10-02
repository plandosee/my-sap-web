# 07. 공통코드 + 작업자 CRUD

## 목표

작업자 화면은 **06장 4단계 패턴을 그대로 반복**한다. 이 장에서는 06장과 **다른 세 가지**에 집중한다.

| # | 새로 배우는 것 | 핵심 도구 |
|---|---|---|
| 1 | **공통코드 콤보박스**: 직위코드를 서버에서 받아 선택 목록으로 표시, 여러 곳에서 재사용 | `useQuery` 캐시, `staleTime`, `select` |
| 2 | **"더보기" 페이징**: 10건씩 이어서 불러오기 | `useInfiniteQuery`, `lastIdx` |
| 3 | **API마다 다른 백엔드 동작** 처리 | 삭제 `opdrtId` 오타, `useYn` 차이, 서버 검증 누락 |

> 💡 **혼자 해보기 추천**: 06장 체크리스트만 보고 먼저 작업자 화면을 만들어 본 뒤, 이 문서와 비교해 보자.

## 변경 범위

| 구분 | 파일 | 역할 |
|---|---|---|
| 신규 | `src/types/code.ts` | 공통코드 타입, `CODE_GROUP` 상수 |
| 신규 | `src/api/codeApi.ts` | `/admin/codeMast/selectCode.do` |
| 신규 | `src/hooks/useCommonCode.ts` | 공통코드 조회 + `getCodeName()` |
| 신규 | `src/components/CodeSelect.tsx` | 공통코드 콤보박스 (재사용 컴포넌트) |
| 신규 | `src/types/oprtr.ts` | 작업자 행/검색/폼 타입 |
| 신규 | `src/api/oprtrApi.ts` | 작업자 API (`lastIdx`, `opdrtId`) |
| 신규 | `src/hooks/useOprtr.ts` | `useInfiniteQuery` 목록, 저장/삭제 |
| 신규 | `src/pages/oprtr/OprtrFormModal.tsx` | 등록/수정 팝업 (직위 콤보, 날짜·전화번호 검증) |
| 수정 | `src/pages/oprtr/OprtrPage.tsx` | 검색 + 목록 + 더보기 + 삭제 |
| 수정 | `src/index.css` | 더보기 버튼 |
| 수정 | `docs/01-backend-api-analysis.md` | 주의사항 #7, #8 추가 |

---

## 1. 공통코드 콤보박스

### 1-1. 타입 `src/types/code.ts`

```ts
export interface CommonCode {
  codeId: string      // 서버로 보내는 값
  codeName: string    // 화면에 보이는 이름
  codeGroup: string
  codeSeq: number | null
}

// ⚠️ selectCode.do 는 목록 응답(data.contents)과 모양이 다르다
export interface CodeListResponse extends ApiResult {
  resultList: CommonCode[]
}

export const CODE_GROUP = {
  OPRTR_JBPS: 'OJBPS', // 작업자 직위
} as const

export type CodeGroup = (typeof CODE_GROUP)[keyof typeof CODE_GROUP] // 'OJBPS'
```

> 💡 **코드 그룹을 상수로 모으는 이유**: `'OJBPS'` 문자열을 여기저기 직접 쓰면 오타가 나도 모른다. `CodeGroup` 타입 덕분에 `useCommonCode('OJBP')`처럼 쓰면 빨간 줄이 생긴다.

### 1-2. API `src/api/codeApi.ts`

```ts
export const codeApi = {
  selectCode: (codeGroup: CodeGroup) =>
    post<CodeListResponse>('/admin/codeMast/selectCode.do', { codeGroup, active: 'ACTIVE' }),
}
```

### 1-3. 훅 `src/hooks/useCommonCode.ts`

```ts
export const codeKeys = {
  all: ['commonCode'] as const,
  group: (codeGroup: CodeGroup) => [...codeKeys.all, codeGroup] as const,
}

export function useCommonCode(codeGroup: CodeGroup) {
  const query = useQuery({
    queryKey: codeKeys.group(codeGroup),
    queryFn: () => codeApi.selectCode(codeGroup),
    staleTime: 10 * 60 * 1000, // 10분간 재조회하지 않음
    select: (res) => [...res.resultList].sort((a, b) => (a.codeSeq ?? 0) - (b.codeSeq ?? 0)),
  })
  const codes = query.data ?? []
  const getCodeName = (codeId?: string | null) =>
    codes.find((c) => c.codeId === codeId)?.codeName ?? codeId ?? ''
  return { ...query, codes, getCodeName }
}
```

| 옵션 | 의미 |
|---|---|
| `staleTime` | 이 시간 동안은 "최신"으로 보고 다시 조회하지 않음. 목록(0)과 달리 **잘 안 바뀌는 데이터는 길게** |
| `select` | 응답에서 필요한 부분만 꺼내고 가공. `data`가 가공된 값이 된다 (캐시에는 원본 저장) |

> 💡 **캐시 재사용**: 작업자 화면에는 직위 코드가 **3곳**(검색 콤보, 팝업 콤보, 표의 직위명)에 쓰인다. 쿼리 키가 같으므로 **API는 한 번만 호출**된다. F12 Network 탭에서 `selectCode.do`가 1번만 호출되는지 확인해 보자.

### 1-4. 컴포넌트 `src/components/CodeSelect.tsx`

```tsx
export default function CodeSelect({ codeGroup, value, onChange, emptyLabel }: CodeSelectProps) {
  const { codes, isPending, isError } = useCommonCode(codeGroup)
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} disabled={isPending}>
      <option value="">{isPending ? '불러오는 중...' : isError ? '코드 조회 실패' : emptyLabel}</option>
      {codes.map((c) => <option key={c.codeId} value={c.codeId}>{c.codeName}</option>)}
    </select>
  )
}
```

사용:
```tsx
<CodeSelect codeGroup={CODE_GROUP.OPRTR_JBPS} value={v} onChange={setV} emptyLabel="전체" /> // 검색
<CodeSelect codeGroup={CODE_GROUP.OPRTR_JBPS} value={v} onChange={setV} emptyLabel="선택" /> // 입력
```

> 💡 실무에서 공통코드 콤보박스는 거의 모든 화면에 나온다. **코드 그룹만 넘기면 되는 컴포넌트**로 만들어 두면 새 화면에서 한 줄로 쓸 수 있다.

---

## 2. 작업자 API – 06장과 다른 부분

`src/api/oprtrApi.ts`

```ts
export const OPRTR_PER_PAGE = 10

function toSaveParams(form: OprtrForm): ApiParams {
  return {
    oprtrNm: form.oprtrNm.trim(),
    oprtrBrdt: form.oprtrBrdt,
    oprtrTelno: form.oprtrTelno.trim(),
    oprtrJbpsCd: form.oprtrJbpsCd,
    sort: form.sort.trim(),
    useYn: form.useYn,          // ← 비공정과 달리 'N' 그대로! (주의사항 #8)
    rmrk: form.rmrk,
  }
}

export const oprtrApi = {
  retrieveList: (search: OprtrSearch, lastRnum: number) =>
    post<ListResponse<Oprtr>>(`${BASE_URL}/retrieveList.do`, {
      ...검색조건,
      perPage: OPRTR_PER_PAGE,
      lastIdx: lastRnum > 0 ? JSON.stringify({ rnum: lastRnum }) : undefined, // 첫 페이지는 안 보냄
    }),

  delete: (oprtrId: string) =>
    post<CountResponse>(`${BASE_URL}/delete.do`, { oprtrId, opdrtId: oprtrId }), // ⚠️ 오타 필드도 같이
  // insert, update 는 06장과 같은 구조
}
```

| 항목 | 비공정 (06장) | 작업자 (07장) | 이유 |
|---|---|---|---|
| 미사용 `useYn` | `''` | `'N'` | SQL이 다름 (주의사항 #1, #8) |
| 페이징 | 전체 조회 | `perPage` + `lastIdx` | 이 장에서 "더보기" 학습 |
| 삭제 파라미터 | `nonProcsId` | `oprtrId` + `opdrtId` | 컨트롤러 오타 (주의사항 #2) |

### `lastIdx`는 어떻게 동작하나? (oprtr.xml)

```sql
select T.* from (
  select ..., row_number() over(ORDER BY A.sort, A.oprtr_id) as rnum   -- 정렬 순서대로 1, 2, 3...
  from oprtr A where ...
) T
where rnum > #{lastIdx.rnum}   -- 이미 받은 마지막 번호 다음부터
limit #{perPage}                -- 10건만
```

```
1회: lastIdx 없음          → rnum 1~10
2회: lastIdx={"rnum":10}   → rnum 11~20
3회: lastIdx={"rnum":20}   → rnum 21~25 (5건 → 10건보다 적으므로 끝)
```

> 💡 `lastIdx`는 **JSON 문자열**로 보낸다. 백엔드 `BaseController.getBasePaginationInfoByGrid()`가 문자열을 Map으로 바꿔서 SQL의 `#{lastIdx.rnum}`에 넣는다.
> 💡 이런 방식을 **커서(cursor) 페이징**이라고 한다. 페이지 번호(offset) 방식보다 데이터가 많을 때 빠르다. 대신 "5페이지로 바로 이동"은 안 된다.

---

## 3. `useInfiniteQuery` – "더보기"

`src/hooks/useOprtr.ts`

```ts
export function useOprtrList(search: OprtrSearch) {
  const query = useInfiniteQuery({
    queryKey: oprtrKeys.list(search),
    queryFn: ({ pageParam }) => oprtrApi.retrieveList(search, pageParam),
    initialPageParam: 0,                         // 첫 페이지 기준값
    getNextPageParam: (lastPage, allPages) => {  // 다음 페이지 기준값 계산
      const lastRows = lastPage.data.contents
      const loaded = allPages.reduce((sum, p) => sum + p.data.contents.length, 0)
      if (lastRows.length < OPRTR_PER_PAGE || loaded >= lastPage.data.pagination.totalCount) {
        return undefined                         // 더 없음 → hasNextPage = false
      }
      return lastRows[lastRows.length - 1].rnum  // 마지막 행 번호
    },
    placeholderData: keepPreviousData,
  })

  const rows = query.data?.pages.flatMap((p) => p.data.contents) ?? [] // 페이지들을 한 배열로
  const totalCount = query.data?.pages[0]?.data.pagination.totalCount ?? 0
  return { ...query, rows, totalCount }
}
```

| `useQuery` (06장) | `useInfiniteQuery` (07장) |
|---|---|
| `data` = 응답 1개 | `data.pages` = 응답 배열 `[1페이지, 2페이지, ...]` |
| `queryFn: () => ...` | `queryFn: ({ pageParam }) => ...` |
| – | `initialPageParam`, `getNextPageParam` 필수 |
| `refetch()` | `fetchNextPage()` 다음 페이지 / `hasNextPage` / `isFetchingNextPage` |

> 💡 등록/수정/삭제 후 `invalidateQueries`를 하면 **지금까지 불러온 페이지 수만큼** 처음부터 다시 조회된다. 30건까지 더보기 한 상태였다면 10건씩 3번 호출된다.

화면 (`OprtrPage.tsx`):
```tsx
const { rows, totalCount, hasNextPage, fetchNextPage, isFetchingNextPage, ... } = useOprtrList(search)

<span><strong>{rows.length}</strong> / 총 <strong>{totalCount}</strong>건</span>
...
{hasNextPage && (
  <button onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
    {isFetchingNextPage ? '불러오는 중...' : '더보기'}
  </button>
)}
```

---

## 4. 등록/수정 팝업 – 서버가 못 하는 검증

`ValidationModel.java`를 보면 형식 검사 분기에 **`throw`가 빠져 있다** (주의사항 #7):

```java
}else if(type == VALIDATION_TYPE.STRING_DATE) {
    if(!SimpleDateUtil.isValidDateFormat(value)) ValidateException.getCodeException(...);  // throw 없음!
```

→ 형식이 틀린 생년월일·전화번호도 그대로 저장된다. **프론트에서 반드시 검증**한다.

```ts
if (form.oprtrBrdt && !/^\d{4}-\d{2}-\d{2}$/.test(form.oprtrBrdt))
  return '생년월일 형식이 올바르지 않습니다. (YYYY-MM-DD)'
if (form.oprtrTelno && !/^\d{2,3}-\d{3,4}-\d{4}$/.test(form.oprtrTelno))
  return '전화번호 형식이 올바르지 않습니다. (예: 010-1234-5678)'
```

입력 단계에서 형식을 맞춰 주는 장치도 둔다.

| 항목 | 방법 |
|---|---|
| 생년월일 | `<input type="date">` → 브라우저 달력, 값은 항상 `yyyy-MM-dd` (백엔드 형식과 같음) |
| 전화번호 | `formatTelno()`: 숫자만 남기고 자동 하이픈 (`01012345678` → `010-1234-5678`) |
| 직위 | `<CodeSelect emptyLabel="선택">` + 필수 검사 |

> 💡 **교훈**: 백엔드에 검증 코드가 "있어 보여도" 실제로 동작하는지는 소스를 끝까지 봐야 안다. 프론트 검증은 사용자 편의, 서버 검증은 보안이지만, 서버가 못 하는 부분은 프론트가 막아야 데이터가 깨지지 않는다.

---

## 확인하기

`npm run dev:local` → 로그인 → 작업자 관리

| # | 해볼 것 | 기대 결과 |
|---|---|---|
| 1 | 화면 진입 | 최대 10건 표시, "10 / 총 N건", N > 10이면 [더보기] |
| 2 | F12 Network에서 `selectCode.do` 호출 횟수 | **1번** (콤보 2개 + 표 직위명이 캐시 공유) |
| 3 | 표의 "직위" 칸 | 코드가 아닌 **직위명** 표시 |
| 4 | [더보기] | 다음 10건이 **아래에 이어서** 추가, Payload에 `lastIdx: {"rnum":10}` |
| 5 | 끝까지 더보기 | [더보기] 버튼 사라짐, "N / 총 N건" |
| 6 | 직위 콤보로 검색 | 해당 직위만 표시, 다시 첫 10건부터 |
| 7 | [등록] → 직위 선택 안 하고 저장 | "직위를 선택해 주세요." |
| 8 | 전화번호에 `01012345678` 입력 | 자동으로 `010-1234-5678` |
| 9 | 등록 (미사용) | 목록에 **미사용**으로 표시 (작업자는 'N' 그대로 전송) |
| 10 | [수정] | 기존 값(직위·생년월일 등)이 채워져 있음, 저장 후 정렬 순서 유지 |
| 11 | [삭제] | 목록에서 사라짐. Payload에 `oprtrId`, `opdrtId` 둘 다 있음 |
| 12 | 다른 메뉴 갔다가 10분 안에 다시 작업자 화면 | `selectCode.do` 다시 호출되지 않음 (staleTime) |

## 정리

| 상황 | 쓰는 도구 |
|---|---|
| 목록 한 번에 조회 | `useQuery` (06장) |
| 더보기 / 무한 스크롤 | `useInfiniteQuery` (07장) |
| 잘 안 바뀌는 기준 데이터 (공통코드) | `useQuery` + 긴 `staleTime` |
| 응답 가공 (정렬, 일부만 꺼내기) | `select` |
| 여러 화면에서 쓰는 콤보박스 | 재사용 컴포넌트 (`CodeSelect`) |
| API마다 다른 백엔드 동작 | 각 `xxxApi.ts`에서 흡수 |

## 자주 하는 실수

| 증상 | 원인 |
|---|---|
| 더보기 하면 같은 10건이 반복됨 | `lastIdx` 누락, 또는 JSON 문자열이 아닌 숫자로 보냄 |
| 더보기 버튼이 안 사라짐 | `getNextPageParam`이 `undefined`를 안 돌려줌 |
| 검색 조건을 바꿨는데 이전 페이지들이 붙어 있음 | 검색 조건이 쿼리 키에 없음 |
| 콤보박스 때문에 같은 API가 여러 번 호출됨 | 컴포넌트마다 쿼리 키를 다르게 만듦 → `codeKeys`로 통일 |
| 표에 직위가 코드로 나옴 | `getCodeName()` 미사용 |
| 작업자 삭제 시 "작업자아이디" 필수 에러 | `opdrtId` 누락 (주의사항 #2) |
| 작업자 미사용 저장했는데 빈 값으로 저장됨 | 비공정 방식(`''`)을 그대로 복사함 |
