# 06. 비공정 CRUD

## 목표

첫 번째 업무 화면. **검색 + 목록 + 등록/수정 팝업 + 삭제**.
여기서 만든 **4단계 패턴**은 이후 모든 CRUD 화면(07장 작업자, 실무 화면)에 그대로 반복된다.

```
① types/    데이터 모양 정의       ← 백엔드 SQL 컬럼 기준
② api/      URL + 파라미터 변환    ← 백엔드 특이점은 여기서 흡수
③ hooks/    React Query 훅         ← 조회 useQuery / 변경 useMutation
④ pages/    화면                   ← 입력·표시만 담당
```

## 변경 범위

| 구분 | 파일 | 역할 |
|---|---|---|
| 신규 | `src/types/nonProcs.ts` | `NonProcs`(행), `NonProcsSearch`(검색), `NonProcsForm`(입력폼) |
| 신규 | `src/api/nonProcsApi.ts` | 목록/등록/수정/삭제 API + `useYn` 변환 |
| 신규 | `src/hooks/useNonProcs.ts` | 쿼리 키, `useNonProcsList`, `useSaveNonProcs`, `useDeleteNonProcs` |
| 신규 | `src/components/Modal.tsx` | 공통 팝업 (07장에서도 사용) |
| 신규 | `src/pages/nonProcs/NonProcsFormModal.tsx` | 등록/수정 팝업 |
| 수정 | `src/pages/nonProcs/NonProcsPage.tsx` | 검색 + 목록 + 삭제 |
| 수정 | `src/index.css` | 검색 영역, 표, 배지, 팝업, 2열 폼 스타일 |

## 데이터 흐름

```
[조회]
 NonProcsPage ─ search 상태 ─▶ useNonProcsList(search)
                                  └ queryKey ['nonProcs','list',search]  ← search가 바뀌면 자동 재조회
                                  └ queryFn  nonProcsApi.retrieveList ─▶ POST /admin/nonProcs/retrieveList.do

[등록/수정]
 NonProcsFormModal ─ save.mutate(form) ─▶ useSaveNonProcs
                                             ├ nonProcsId 없음 → insert.do / 있음 → update.do
                                             └ onSuccess: invalidateQueries(['nonProcs'])  ─▶ 목록 자동 재조회
                   ─ mutate의 onSuccess: alert + 팝업 닫기

[삭제]
 NonProcsPage ─ confirm ─▶ deleteMutation.mutate(id) ─▶ delete.do ─▶ invalidateQueries ─▶ 목록 자동 재조회
```

## 따라하기

### ① `src/types/nonProcs.ts`

```ts
/** 목록의 한 행 (nonProcs.xml select 컬럼 기준) */
export interface NonProcs {
  nonProcsId: string
  nonProcsNm: string
  sort: number | null
  useYn: 'Y' | 'N'
  rmrk: string | null
  rgtr: string | null
  regDt: string | null
  chnrg: string | null
  chgDt: string | null
  rnum: number
}

export interface NonProcsSearch {
  nonProcsNm: string
  useYn: '' | 'Y' | 'N' // '' = 전체
}

/** 입력폼: input 값은 항상 문자열이므로 sort도 string */
export interface NonProcsForm {
  nonProcsId: string // '' = 신규
  nonProcsNm: string
  sort: string
  useYn: 'Y' | 'N'
  rmrk: string
}
```

> 💡 **행 타입과 폼 타입을 나누는 이유**: 서버 데이터(`sort: number | null`)와 입력칸 값(`sort: string`)은 모양이 다르다. 변환은 팝업의 `toForm()`과 API의 `toSaveParams()`가 담당한다.

### ② `src/api/nonProcsApi.ts`

```ts
const BASE_URL = '/admin/nonProcs'

function toSaveParams(form: NonProcsForm): ApiParams {
  return {
    nonProcsNm: form.nonProcsNm.trim(),
    sort: form.sort.trim(),                  // '' → 서버가 max(sort)+1
    useYn: form.useYn === 'Y' ? 'Y' : '',    // ⚠️ 'N' 대신 '' (01장 주의사항 #1)
    rmrk: form.rmrk,
  }
}

export const nonProcsApi = {
  retrieveList: (search: NonProcsSearch) =>
    post<ListResponse<NonProcs>>(`${BASE_URL}/retrieveList.do`, {
      nonProcsNm: search.nonProcsNm.trim(),
      useYn: search.useYn,
    }),
  insert: (form: NonProcsForm) => post<CountResponse>(`${BASE_URL}/insert.do`, toSaveParams(form)),
  update: (form: NonProcsForm) =>
    post<CountResponse>(`${BASE_URL}/update.do`, { nonProcsId: form.nonProcsId, ...toSaveParams(form) }),
  delete: (nonProcsId: string) => post<CountResponse>(`${BASE_URL}/delete.do`, { nonProcsId }),
}
```

> 💡 **백엔드 특이점은 API 파일에서 흡수한다.** 화면 코드는 `useYn: 'N'`을 그대로 다루고, `''`로 바꾸는 사실은 몰라도 된다. 나중에 백엔드가 고쳐지면 이 한 줄만 바꾸면 된다.

### ③ `src/hooks/useNonProcs.ts`

```ts
export const nonProcsKeys = {
  all: ['nonProcs'] as const,
  list: (search: NonProcsSearch) => [...nonProcsKeys.all, 'list', search] as const,
}

export function useNonProcsList(search: NonProcsSearch) {
  return useQuery({
    queryKey: nonProcsKeys.list(search),
    queryFn: () => nonProcsApi.retrieveList(search),
    placeholderData: keepPreviousData, // 재조회 중에도 이전 목록 유지(깜빡임 방지)
  })
}

export function useSaveNonProcs() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (form: NonProcsForm) =>
      form.nonProcsId ? nonProcsApi.update(form) : nonProcsApi.insert(form),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: nonProcsKeys.all }),
  })
}

export function useDeleteNonProcs() { /* 같은 방식: mutationFn = nonProcsApi.delete */ }
```

| 개념 | 설명 |
|---|---|
| **queryKey** | 캐시 이름표. 값이 바뀌면 자동 재조회, 같으면 캐시 재사용 |
| **쿼리 키 모음**(`nonProcsKeys`) | 키를 한 곳에서 만들어 오타 방지. `all`로 무효화하면 하위 키 전부 대상 |
| **invalidateQueries** | "이 캐시는 오래됨" 표시 → 화면에 보이는 목록이 자동 재조회 |
| **keepPreviousData** | 조건을 바꿔 재조회하는 동안 이전 데이터를 계속 보여줌 |

`useQuery` 결과:

| 값 | 의미 |
|---|---|
| `data` | 응답 본문 (`ListResponse<NonProcs>`) |
| `isPending` | 처음 조회 중 (데이터가 아직 한 번도 없음) |
| `isFetching` | 조회 중 (재조회 포함) → 버튼 "조회 중..." |
| `isError` / `error` | 실패 여부 / `ApiError` |
| `refetch()` | 강제로 다시 조회 |

### ④-1 `src/components/Modal.tsx` – 공통 팝업

```tsx
export default function Modal({ title, onClose, children, footer }: ModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown) // 정리
  }, [onClose])

  return (
    <div className="modal-backdrop">
      <div className="modal" role="dialog" aria-modal="true">
        <div className="modal-header"><h2>{title}</h2><button onClick={onClose}>×</button></div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  )
}
```

> 💡 **`children`**: `<Modal>여기 내용</Modal>`처럼 태그 사이에 넣은 것.
> 💡 **`useEffect`의 return**: 컴포넌트가 사라질 때 실행된다. 이벤트를 등록했으면 반드시 해제한다.
> 💡 열기/닫기는 부모가 `{modal && <Modal />}`로 결정한다. 닫으면 컴포넌트가 사라지므로 **다시 열 때 입력값이 자동 초기화**된다.

### ④-2 `NonProcsFormModal.tsx` – 등록/수정 팝업 (핵심만)

```tsx
function toForm(target: NonProcs | null): NonProcsForm {
  if (!target) return { nonProcsId: '', nonProcsNm: '', sort: '', useYn: 'Y', rmrk: '' }
  return {
    nonProcsId: target.nonProcsId,
    nonProcsNm: target.nonProcsNm ?? '',
    sort: target.sort == null ? '' : String(target.sort), // ⚠️ 기존 sort 유지 (주의사항 #6)
    useYn: target.useYn === 'N' ? 'N' : 'Y',
    rmrk: target.rmrk ?? '',
  }
}

export default function NonProcsFormModal({ target, onClose }) {
  const [form, setForm] = useState<NonProcsForm>(() => toForm(target))
  const save = useSaveNonProcs()

  // 필드 하나만 바꾸는 공통 함수
  const setField = <K extends keyof NonProcsForm>(key: K, value: NonProcsForm[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    // validate(): 백엔드 검증 규칙과 동일하게 (비공정명 필수·50자, 정렬 0 이상 정수)
    save.mutate(form, {
      onSuccess: () => { alert('등록되었습니다.'); onClose() },
    })
  }

  return (
    <Modal title="비공정 등록" onClose={onClose}
      footer={<button type="submit" form="nonProcsForm" disabled={save.isPending}>저장</button>}>
      <form id="nonProcsForm" onSubmit={handleSubmit}>...</form>
    </Modal>
  )
}
```

| 포인트 | 설명 |
|---|---|
| `useState(() => toForm(target))` | 초기값을 **함수로** 넘기면 처음 한 번만 계산된다 |
| `setField` + `keyof` | 필드 이름 오타를 타입으로 막는다. `{ ...prev, [key]: value }`로 **새 객체**를 만든다 |
| `<button form="nonProcsForm">` | 버튼이 `<form>` 바깥(footer)에 있어도 그 폼을 제출 |
| `mutate(값, { onSuccess })` | 훅의 `onSuccess`(목록 새로고침) **다음에** 실행되는, 이 호출 전용 처리 |
| 프론트 검증 | 백엔드 검증과 **같은 규칙**으로. 서버 왕복 없이 바로 안내하기 위함 (최종 검증은 서버) |

### ④-3 `NonProcsPage.tsx` – 목록 페이지 (핵심만)

```tsx
const [searchInput, setSearchInput] = useState(INITIAL_SEARCH) // 타이핑 중인 값
const [search, setSearch] = useState(INITIAL_SEARCH)           // [조회]로 확정된 값 → 쿼리 키
const [modal, setModal] = useState<{ target: NonProcs | null } | null>(null)

const { data, isPending, isError, error, isFetching, refetch } = useNonProcsList(search)

const handleSearch = (e) => {
  e.preventDefault()
  if (JSON.stringify(searchInput) === JSON.stringify(search)) refetch() // 조건 같으면 강제 재조회
  else setSearch({ ...searchInput })                                   // 조건 바뀌면 자동 재조회
}

const handleDelete = (row: NonProcs) => {
  if (!confirm(`[${row.nonProcsNm}] 비공정을 삭제하시겠습니까?`)) return
  deleteMutation.mutate(row.nonProcsId, {
    onSuccess: () => alert('삭제되었습니다.'),
    onError: (err) => alert(err.message),
  })
}
```

| 포인트 | 설명 |
|---|---|
| 검색 상태 2개 | 하나로 쓰면 **글자 하나 칠 때마다 API 호출**됨 |
| 팝업 상태 1개로 3가지 표현 | `null`=닫힘 / `{target:null}`=등록 / `{target:행}`=수정 |
| `key={row.nonProcsId}` | 행 구분용 고유값. **배열 index를 쓰지 않는다** (삭제 시 엉뚱한 행이 갱신될 수 있음) |
| 표 상태 3가지 | 로딩 중 / 데이터 없음 / 목록 → 사용자가 "멈춘 건지" 헷갈리지 않게 |

## 확인하기

`npm run dev:local` → 로그인 → 비공정 관리

| # | 해볼 것 | 기대 결과 |
|---|---|---|
| 1 | 화면 진입 | 목록 표시, "총 N건" |
| 2 | 비공정명 일부 입력 후 Enter | 해당 이름이 포함된 행만 표시 |
| 3 | 사용여부 "미사용" 조회 | 미사용 행만 표시 |
| 4 | [등록] → 이름 비우고 [저장] | "비공정명을 입력해 주세요." (Network에 요청 없음) |
| 5 | [등록] → 이름 입력, 사용여부 **미사용**, 저장 | "등록되었습니다." → 팝업 닫힘 → **목록에 자동 반영, 미사용으로 표시** |
| 6 | 5번 행 [수정] → 이름 변경, 저장 | 목록에 자동 반영, **정렬 순서 그대로** |
| 7 | 5번 행 [삭제] → 확인 | "삭제되었습니다." → 목록에서 사라짐 |
| 8 | 팝업에서 ESC | 팝업 닫힘 |
| 9 | F12 → Network → insert.do 클릭 → Payload | 미사용일 때 `useYn:` (빈 값) |
| 10 | **인증 만료 테스트**: F12 → Application → Local Storage의 `accessToken` 값을 `aaa`로 수정 → [조회] | 로그인 페이지로 이동 + "로그인이 만료되었습니다" 안내 → 다시 로그인하면 **비공정 화면으로 복귀** (05장 확인) |

> 10번에서 `wmsRefreshToken` 쿠키가 살아 있으면 서버가 refresh로 처리할 수도 있다. 이 백엔드는 **잘못된 access 토큰 + 유효한 refresh 쿠키**면 새 토큰을 응답 헤더로 내려준다(01장 2-2). 이 경우 로그인 페이지로 가지 않고 정상 조회되며, Local Storage의 `accessToken`이 새 값으로 바뀐다. **이것도 정상 동작**이다(03장 인터셉터의 토큰 교체 확인). 로그인 페이지 이동을 보려면 쿠키도 같이 삭제한다.

## 정리 – 새 CRUD 화면을 만들 때 체크리스트

1. 백엔드 Controller/SQL에서 **URL, 파라미터, 검증 규칙, 응답 컬럼, 특이 동작** 확인 (01장)
2. `types/xxx.ts` – 행 / 검색 / 폼 타입
3. `api/xxxApi.ts` – URL과 파라미터 변환 (특이점 흡수)
4. `hooks/useXxx.ts` – 쿼리 키, 목록 `useQuery`, 저장·삭제 `useMutation` + `invalidateQueries`
5. `pages/xxx/XxxFormModal.tsx` – 등록/수정 팝업 (프론트 검증 = 백엔드 규칙)
6. `pages/xxx/XxxPage.tsx` – 검색(2개 상태) + 표(3가지 상태) + 삭제 확인
7. `router.tsx` 와 `Layout.tsx` 메뉴에 추가

## 자주 하는 실수

| 증상 | 원인 |
|---|---|
| 등록/수정 후 목록이 안 바뀜 | `invalidateQueries` 누락, 또는 쿼리 키 앞부분 불일치 |
| 글자 칠 때마다 API 호출 | 입력값 상태를 바로 쿼리 키로 사용 |
| 같은 조건으로 [조회]해도 재조회 안 됨 | 쿼리 키가 같아서 → `refetch()` |
| 미사용으로 저장했는데 사용으로 나옴 | `useYn: 'N'` 그대로 전송 (01장 주의사항 #1) |
| 수정했더니 순서가 맨 뒤로 감 | 수정 폼에 기존 sort를 안 채움 (주의사항 #6) |
| 팝업을 다시 열면 이전 입력값이 남아 있음 | 팝업을 CSS로만 숨김 → 조건부 렌더링 사용 |
| 저장 버튼 두 번 클릭 시 2건 등록 | `disabled={save.isPending}` 누락 |
| `Each child in a list should have a unique "key"` 경고 | `map`의 `key` 누락 |
