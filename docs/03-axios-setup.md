# 03. axios 공통 설정

## 목표

모든 API 호출이 지나가는 **공통 통로**를 만든다. 화면 코드에서는 아래처럼 한 줄만 쓰면 된다.

```ts
const res = await post<ListResponse<NonProcs>>('/admin/nonProcs/retrieveList.do', { useYn: 'Y' })
```

그 뒤에서 공통 통로가 다음을 **자동으로** 처리한다.

| # | 공통 처리 | 이유 (01장 분석 결과) |
|---|---|---|
| 1 | 파라미터를 form 형식으로 변환 | 백엔드가 `@RequestParam`이라 JSON을 못 받음 |
| 2 | 요청마다 `Authorization: Bearer 토큰` 첨부 | `/admin/**`는 인증 필요 |
| 3 | 응답 헤더로 새 토큰이 오면 저장 | 서버가 refresh 쿠키로 access 토큰을 자동 재발급 |
| 4 | 200 + 빈 본문 → 미로그인 에러 | 토큰 없이 호출하면 서버가 200 + 빈 본문을 줌 |
| 5 | 200 + `result:false` → 업무 에러 | 백엔드는 실패도 HTTP 200으로 보냄 |
| 6 | 401 / 네트워크 오류 / 기타 HTTP 에러 처리 | |

→ 결과적으로 화면에서는 **"성공하면 데이터, 실패하면 `ApiError`"** 두 가지만 신경 쓰면 된다.

## 변경 범위

| 구분 | 파일 | 역할 |
|---|---|---|
| 신규 | `src/types/api.ts` | 백엔드 공통 응답 타입 (`ApiResult`, `ListResponse<T>`, `CountResponse`) |
| 신규 | `src/api/ApiError.ts` | 모든 실패를 하나로 통일한 에러 클래스 |
| 신규 | `src/api/tokenStorage.ts` | access 토큰 저장/조회/삭제 (localStorage) |
| 신규 | `src/api/client.ts` | ★ axios 인스턴스 + 인터셉터 + `post()` 함수 |
| 신규 | `src/pages/ApiTestPage.tsx` | 동작 확인용 **임시** 페이지 (04장에서 삭제) |
| 수정 | `src/App.tsx` | Vite 샘플 화면 → 임시 테스트 페이지 |
| 수정 | `vite.config.ts` | `strictPort: true` (02장 보충) |

```
src/
├─ api/
│  ├─ client.ts         ← 공통 통로 (이 장의 핵심)
│  ├─ ApiError.ts
│  └─ tokenStorage.ts
├─ types/
│  └─ api.ts
└─ pages/
   └─ ApiTestPage.tsx   ← 임시
```

## 흐름 그림

```
화면 코드: post('/admin/nonProcs/retrieveList.do', { useYn: 'Y' })
   │
   ▼ toFormParams()            { useYn: 'Y' } → "useYn=Y" (form 형식)
   ▼ 요청 인터셉터               Authorization: Bearer {저장된 토큰}
   ▼ axios → /api/admin/... → (vite 프록시) → 백엔드
   ▼ 응답 인터셉터
      ├─ 응답 헤더 authorization 있음?  → 토큰 교체
      ├─ 본문이 비어 있음?             → throw ApiError(NOT_LOGIN)
      ├─ result === false ?           → throw ApiError(백엔드 code, message)
      ├─ 401 ?                        → throw ApiError(UNAUTHORIZED)
      └─ 응답 없음 ?                   → throw ApiError(NETWORK)
   ▼
화면 코드: 성공이면 응답 본문 / 실패면 catch(e) 에서 ApiError
```

## 따라하기

### 1. `src/types/api.ts` – 응답 타입

```ts
export interface ApiResult {
  result: boolean   // 성공 true / 실패 false
  code: string      // 성공 "00"
  message: string
}

export interface ListResponse<T> extends ApiResult {
  data: {
    contents: T[]
    pagination: { page: number; totalCount: number }
  }
}

export interface CountResponse extends ApiResult {
  count: number
}

export type ApiParams = Record<string, string | number | boolean | null | undefined>
```

> 💡 **제네릭 `<T>`**: `ListResponse<NonProcs>`라고 쓰면 `data.contents`가 `NonProcs[]` 타입이 된다.
> 목록 응답 구조는 같고 행(row)만 다르므로, 행 타입을 바꿔 끼울 수 있게 만든 것.

### 2. `src/api/ApiError.ts` – 에러 통일

```ts
export const CLIENT_ERROR_CODE = {
  NOT_LOGIN: 'NOT_LOGIN',       // 200 + 빈 본문
  UNAUTHORIZED: 'UNAUTHORIZED', // 401
  NETWORK: 'NETWORK',           // 서버 연결 불가
  HTTP: 'HTTP',                 // 그 밖의 HTTP 에러
} as const

export class ApiError extends Error {
  readonly code: string
  readonly status: number

  constructor(code: string, message: string, status = 200) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = status
  }

  get isAuthError(): boolean {
    return this.code === CLIENT_ERROR_CODE.NOT_LOGIN || this.code === CLIENT_ERROR_CODE.UNAUTHORIZED
  }
}
```

> ⚠️ `constructor(public code: string)` 같은 축약 문법은 tsconfig의 `erasableSyntaxOnly` 옵션 때문에 에러가 난다. 필드를 직접 선언한다.

### 3. `src/api/tokenStorage.ts` – 토큰 저장소

```ts
const ACCESS_TOKEN_KEY = 'accessToken'

export const tokenStorage = {
  get: () => localStorage.getItem(ACCESS_TOKEN_KEY),
  set: (token: string) => localStorage.setItem(ACCESS_TOKEN_KEY, token),
  clear: () => localStorage.removeItem(ACCESS_TOKEN_KEY),
}
```

> 💡 **왜 localStorage인가?**
> - 새로고침해도 로그인이 유지된다. (Redux에만 두면 새로고침 시 사라짐)
> - 단점은 JS로 읽을 수 있다는 것(XSS 위험). 이 백엔드는 **refresh 토큰을 HttpOnly 쿠키**로 따로 두고, localStorage에는 **수명이 짧은(30분) access 토큰만** 두는 구조라 위험을 줄였다.
> - 저장 위치를 한 파일에 모아 두면, 나중에 sessionStorage 등으로 바꿀 때 이 파일만 고치면 된다.

### 4. `src/api/client.ts` – 공통 통로 (핵심)

전체 코드는 소스 파일의 주석을 참고한다. 핵심 부분만 정리하면:

**(1) 인스턴스 생성**
```ts
export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL, // "/api"
  timeout: 30_000,
})
```

**(2) 요청 인터셉터 – 토큰 첨부**
```ts
apiClient.interceptors.request.use((config) => {
  const token = tokenStorage.get()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})
```

**(3) 응답 인터셉터 – 성공(2xx)일 때**
```ts
(response) => {
  const newToken = response.headers['authorization']        // 헤더 이름은 소문자
  if (typeof newToken === 'string' && newToken) tokenStorage.set(newToken.replace(/^Bearer\s+/i, ''))

  const data = response.data
  if (data === '' || data == null) {                       // 200 + 빈 본문
    handleUnauthorized()
    throw new ApiError(CLIENT_ERROR_CODE.NOT_LOGIN, '로그인이 필요합니다.')
  }
  if (typeof data === 'object' && data.result === false) { // 200 + result:false
    throw new ApiError(data.code, data.message)
  }
  return response
}
```

> 💡 성공 함수 안에서 `throw` 하면 → 호출한 쪽의 `await`가 에러가 된다. 이렇게 "HTTP는 성공이지만 업무는 실패"인 경우를 에러로 바꿔준다.

**(4) 응답 인터셉터 – 실패(2xx 이외)일 때**
```ts
(error: AxiosError) => {
  if (!error.response) return Promise.reject(new ApiError('NETWORK', '서버에 연결할 수 없습니다.', 0))
  if (error.response.status === 401) {
    handleUnauthorized()
    return Promise.reject(new ApiError('UNAUTHORIZED', '로그인이 만료되었습니다.', 401))
  }
  return Promise.reject(new ApiError('HTTP', `요청 실패 (HTTP ${error.response.status})`, error.response.status))
}
```

**(5) 인증 실패 시 동작은 "나중에 등록"**
```ts
let onUnauthorized: () => void = () => {}
export function setUnauthorizedHandler(handler: () => void) { onUnauthorized = handler }
```
> 💡 "로그인 페이지로 이동"하려면 라우터를 알아야 하는데, API 파일이 화면 코드를 import하면 의존 방향이 꼬인다.
> 그래서 API 쪽은 "인증 실패 시 등록된 함수를 부른다"까지만 하고, **실제 동작은 05장에서 앱이 등록**한다.

**(6) form 변환 + `post()` 함수**
```ts
export function toFormParams(params: ApiParams = {}): URLSearchParams {
  const form = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null) return // 없는 값은 보내지 않음
    form.append(key, String(value))                    // '' 는 보냄
  })
  return form
}

export async function post<T extends ApiResult>(url: string, params?: ApiParams): Promise<T> {
  const response = await apiClient.post<T>(url, toFormParams(params))
  return response.data
}
```

> 💡 `URLSearchParams`를 axios에 넘기면 `Content-Type: application/x-www-form-urlencoded`가 **자동으로** 설정된다.
> 💡 `''`를 보내는 이유: 비공정 `useYn`은 `''`이어야 `'N'`으로 저장된다(01장 주의사항 #1). `undefined`와 `''`를 구분해야 한다.

## 확인하기

1. 백엔드(8080) 실행, `npm run dev:local`
2. http://localhost:5173 접속 → "03장 axios 공통 설정 테스트" 화면
3. 버튼 3개를 눌러서 모두 ✅ 인지 확인

| 버튼 | 기대 결과 | 확인하는 것 |
|---|---|---|
| ① 토큰 없이 목록 조회 | `NOT_LOGIN` | 200 + 빈 본문 처리 |
| ② 가짜 토큰으로 목록 조회 | `UNAUTHORIZED`, 이후 "저장된 토큰: (없음)" | 401 처리 + 토큰 삭제 |
| ③ 파라미터 없이 로그인 | `InternalServerError` | `result:false` 처리 |

> 화면 상단의 "현재 저장된 토큰"은 다른 버튼을 눌러 화면이 다시 그려질 때 갱신된다.

4. **개발자도구(F12) → Network 탭**에서 요청 하나를 클릭해 확인:
   - Request URL: `http://localhost:5173/api/admin/nonProcs/retrieveList.do`
   - Request Headers: `Content-Type: application/x-www-form-urlencoded` / ②번은 `Authorization: Bearer fake-token`
   - Response: ①번은 비어 있음, ③번은 `{"result":false, ...}`

## 정리

- API 호출은 **반드시 `post()`를 통해서만** 한다. (화면에서 `axios`를 직접 import하지 않는다)
- 화면에서는 **성공 → 데이터 / 실패 → `ApiError`** 두 가지만 처리하면 된다.
- 백엔드의 특이한 동작(200 실패, 빈 본문, 헤더로 오는 토큰)은 **인터셉터 한 곳에 몰아서** 처리한다.
  → 다른 백엔드(예: SAP 연동 API)를 붙일 때도 **이 파일만 그 백엔드 규칙에 맞게** 고치면 된다.

## 자주 하는 실수

| 증상 | 원인 |
|---|---|
| 백엔드에서 파라미터가 전부 null | 객체를 그대로 보내서 JSON으로 전송됨 → `toFormParams()` 사용 |
| 로그인했는데 계속 `NOT_LOGIN` | `Bearer ` 접두어 누락 (백엔드는 `startsWith("Bearer ")` 검사) |
| 실패했는데 화면은 성공 처리 | `result:false` 검사 누락 (HTTP 200이라 axios는 성공으로 봄) |
| 응답 헤더 토큰을 못 읽음 | 헤더 이름을 `Authorization`(대문자)로 읽음 → axios는 소문자 `authorization` |
