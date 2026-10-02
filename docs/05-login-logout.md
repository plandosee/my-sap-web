# 05. 로그인 / 로그아웃

## 목표

- 로그인 화면 → `/loginProcess.do` → 토큰 저장 → 원래 가려던 페이지로 이동
- **보호 라우트**: 로그인하지 않으면 업무 페이지에 들어갈 수 없음
- **인증 만료 자동 처리**: API가 401/빈 응답을 받으면 자동으로 로그인 페이지로 이동
- 상단 **로그아웃** 버튼

## 전체 흐름

```
① 로그인
  LoginPage ─ login.mutate() ─▶ useLogin ─▶ authApi.login ─▶ POST /loginProcess.do
                                   │
                                   ├ 성공: tokenStorage.set(토큰), setUserId(ID), dispatch(loginSuccess)
                                   │        └▶ Redux 변경 → LoginPage 다시 그림 → isLoggedIn이면 <Navigate to={from}>
                                   └ 실패: login.error.message 화면 표시

② 보호 라우트
  /oprtr 접속 ─▶ ProtectedRoute ─ 로그인? ─ 예 ─▶ Layout ─▶ OprtrPage
                                        └ 아니오 ─▶ /login (state.from = '/oprtr')

③ 인증 만료 (아무 화면에서나)
  API 호출 ─▶ 401 또는 200+빈 본문 ─▶ client.ts 인터셉터: 토큰 삭제 + onUnauthorized()
                                             └▶ setupAuth.ts: dispatch(logout) + 캐시 삭제 + /login (expired: true)

④ 로그아웃
  [로그아웃] ─▶ useLogout ─▶ POST /logout.do ─▶ (성공/실패 무관) 토큰 삭제 + dispatch(logout) + 캐시 삭제 + /login
```

## 변경 범위

| 구분 | 파일 | 역할 |
|---|---|---|
| 신규 | `src/api/authApi.ts` | 로그인/로그아웃 API 함수 |
| 신규 | `src/hooks/useAuth.ts` | `useLogin`, `useLogout` (React Query `useMutation`) |
| 신규 | `src/components/ProtectedRoute.tsx` | 로그인 안 했으면 `/login`으로 보내는 문지기 |
| 신규 | `src/setupAuth.ts` | 인증 만료 시 동작을 axios 인터셉터에 등록 |
| 신규 | `src/types/auth.ts` | 로그인 페이지로 넘기는 정보 타입 (`from`, `expired`) |
| 수정 | `src/api/tokenStorage.ts` | 사용자 ID 저장 추가 (`getUserId`, `setUserId`) |
| 수정 | `src/store/authSlice.ts` | 초기 userId를 저장소에서 읽기 |
| 수정 | `src/router.tsx` | 업무 페이지를 `ProtectedRoute`로 감싸기 |
| 수정 | `src/main.tsx` | `setupAuth()` 호출 |
| 수정 | `src/pages/login/LoginPage.tsx` | 로그인 폼 구현 |
| 수정 | `src/components/Layout.tsx` | 사용자 표시 + 로그아웃 버튼 |
| 수정 | `src/index.css` | 버튼, 입력 폼, 메시지, 로그인 화면 스타일 |

## 따라하기

### 1. `tokenStorage.ts` – 사용자 ID 저장 추가

로그인 응답에는 `accessToken`만 있고 사용자 ID가 없다. 새로고침해도 "OOO 님"을 표시하려고 입력한 ID를 저장한다.

```ts
const USER_ID_KEY = 'loginUserId'

export const tokenStorage = {
  // ...get, set 기존과 동일
  getUserId: () => localStorage.getItem(USER_ID_KEY),
  setUserId: (userId: string) => localStorage.setItem(USER_ID_KEY, userId),
  clear() {
    localStorage.removeItem(ACCESS_TOKEN_KEY)
    localStorage.removeItem(USER_ID_KEY)
  },
}
```

`authSlice.ts`의 초기값도 바꾼다:
```ts
userId: tokenStorage.getUserId(),
```

> ⚠️ 이 ID는 **화면 표시용**이다. 사용자가 localStorage 값을 바꿀 수 있으므로 권한 판단에 쓰면 안 된다. 권한은 서버가 토큰으로 판단한다.

### 2. `src/api/authApi.ts` – API 함수

```ts
import type { ApiResult } from '../types/api'
import { post } from './client'

export interface LoginParams { userId: string; password: string }
export interface LoginResponse extends ApiResult { accessToken: string }

export const authApi = {
  login(params: LoginParams): Promise<LoginResponse> {
    return post<LoginResponse>('/loginProcess.do', { ...params })
  },
  logout(): Promise<ApiResult> {
    return post<ApiResult>('/logout.do')
  },
}
```

> 💡 **API 함수는 기능별 파일로 모은다.** 화면에는 URL과 파라미터 이름이 나오지 않게 한다. → 백엔드가 바뀌면 이 파일만 수정

### 3. `src/hooks/useAuth.ts` – `useMutation`

```ts
export function useLogin() {
  const dispatch = useAppDispatch()
  return useMutation({
    mutationFn: (params: LoginParams) => authApi.login(params),
    onSuccess: (res, params) => {
      tokenStorage.set(res.accessToken)
      tokenStorage.setUserId(params.userId)
      dispatch(loginSuccess(params.userId))
    },
  })
}

export function useLogout() {
  const dispatch = useAppDispatch()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  return useMutation({
    mutationFn: () => authApi.logout(),
    onSettled: () => {            // 성공이든 실패든 항상
      tokenStorage.clear()        // ※ 서버 호출 "후에" 삭제 (서버가 헤더 토큰으로 Redis 삭제)
      dispatch(logout())
      queryClient.clear()         // 이전 사용자의 목록 캐시 삭제
      navigate('/login', { replace: true })
    },
  })
}
```

| `useMutation` 결과 | 의미 |
|---|---|
| `mutate(값)` | 실행 |
| `isPending` | 요청 중이면 `true` → 버튼 비활성화 |
| `error` | 실패 시 `ApiError` (03장 인터셉터가 만들어 줌) |
| `onSuccess` / `onError` / `onSettled` | 성공 시 / 실패 시 / 끝나면 항상 |

> 💡 **조회 = `useQuery`(06장), 변경(로그인·등록·수정·삭제) = `useMutation`**

### 4. `src/components/ProtectedRoute.tsx` – 보호 라우트

```tsx
export default function ProtectedRoute() {
  const isLoggedIn = useAppSelector((state) => state.auth.isLoggedIn)
  const location = useLocation()

  if (!isLoggedIn) {
    const state: LoginLocationState = { from: location.pathname }
    return <Navigate to="/login" replace state={state} />
  }
  return <Outlet />
}
```

`src/types/auth.ts`:
```ts
export interface LoginLocationState {
  from?: string     // 원래 가려던 주소
  expired?: boolean // 만료로 쫓겨났는지
}
```

> ⚠️ 보호 라우트는 **화면을 숨길 뿐 보안 장치가 아니다.** 실제 보안은 백엔드가 토큰으로 막는다.

### 5. `src/router.tsx` – 보호 라우트로 감싸기

```tsx
export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    element: <ProtectedRoute />,   // path 없음 = 감싸기만 하는 라우트
    children: [
      {
        path: '/',
        element: <Layout />,
        children: [
          { index: true, element: <Navigate to="/non-procs" replace /> },
          { path: 'non-procs', element: <NonProcsPage /> },
          { path: 'oprtr', element: <OprtrPage /> },
        ],
      },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
])
```

```
ProtectedRoute (검사)
 └─ <Outlet/> → Layout (상단 메뉴)
                 └─ <Outlet/> → NonProcsPage / OprtrPage
```

> 💡 **`path` 없는 라우트(레이아웃 라우트)**: 주소에는 영향 없이 자식들을 감싸기만 한다. 보호할 페이지를 추가할 때는 이 `children` 안에 넣기만 하면 된다.

### 6. `src/setupAuth.ts` – 인증 만료 처리 연결

03장 `client.ts`의 `setUnauthorizedHandler`에 실제 동작을 등록한다.

```ts
export function setupAuth(): void {
  setUnauthorizedHandler(() => {
    store.dispatch(logout())
    queryClient.clear()

    const currentPath = router.state.location.pathname
    if (currentPath === '/login') return  // 동시에 여러 API가 실패해도 한 번만 이동

    const state: LoginLocationState = { from: currentPath, expired: true }
    router.navigate('/login', { replace: true, state })
  })
}
```

`main.tsx`에서 화면을 그리기 전에 호출:
```ts
setupAuth()
```

> 💡 **컴포넌트 밖에서는 훅(`useNavigate`, `useDispatch`)을 쓸 수 없다.** 그래서 `router.navigate`, `store.dispatch`를 직접 쓴다. 04장에서 `createBrowserRouter`를 선택한 이유가 이것이다.
> 💡 **왜 `client.ts`에서 바로 이동하지 않나?** API 계층이 화면 계층(router, store)을 import하면 의존 방향이 거꾸로 된다. "아래 계층은 위 계층을 모른다"는 원칙을 지키려고 **앱 시작 시점에 연결**한다.

### 7. `LoginPage.tsx` – 로그인 화면 (핵심만)

```tsx
export default function LoginPage() {
  const location = useLocation()
  const { from, expired } = (location.state ?? {}) as LoginLocationState
  const isLoggedIn = useAppSelector((state) => state.auth.isLoggedIn)
  const login = useLogin()
  const [userId, setUserId] = useState('')
  const [password, setPassword] = useState('')
  const [validationMessage, setValidationMessage] = useState('')

  // 로그인 성공 → Redux 변경 → 다시 그려짐 → 여기서 이동
  if (isLoggedIn) return <Navigate to={from ?? '/non-procs'} replace />

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()                // ★ 폼 제출 시 페이지 새로고침 방지
    if (!userId.trim()) return setValidationMessage('아이디를 입력해 주세요.')
    if (!password) return setValidationMessage('비밀번호를 입력해 주세요.')
    setValidationMessage('')
    login.mutate({ userId: userId.trim(), password })
  }

  const errorMessage = validationMessage || login.error?.message
  // ... <form onSubmit={handleSubmit}> 입력칸 2개 + 메시지 + 버튼
  //     <button disabled={login.isPending}>
}
```

> 💡 **성공 후 이동을 `onSuccess`에서 `navigate()` 하지 않은 이유**: Redux 상태가 바뀌면 화면이 다시 그려지고, 맨 위의 `if (isLoggedIn)`이 이동을 처리한다. "이미 로그인한 사람이 `/login`에 들어온 경우"도 같은 코드로 처리된다.
> 💡 `<form onSubmit>` + `<button type="submit">`을 쓰면 **Enter 키로도 로그인**된다.

### 8. `Layout.tsx` – 로그아웃 버튼

```tsx
const userId = useAppSelector((state) => state.auth.userId)
const logout = useLogout()
// ...
<div className="layout-user">
  <span>{userId ?? '사용자'} 님</span>
  <button type="button" className="btn" onClick={() => logout.mutate()} disabled={logout.isPending}>
    로그아웃
  </button>
</div>
```

### 9. `index.css` – 공통 스타일 추가

`.btn`, `.btn-primary`, `.btn-danger`, `.btn-block`, `.form-field`, `input/select/textarea`, `.message-error`, `.message-info`, `.login-box` (소스 참고). 버튼과 입력 스타일은 06장 이후에도 계속 쓴다.

## 확인하기

`npm run dev:local` 실행 후:

| # | 해볼 것 | 기대 결과 |
|---|---|---|
| 1 | http://localhost:5173/oprtr 접속 (로그아웃 상태) | `/login`으로 이동 |
| 2 | 빈 값으로 [로그인] | "아이디를 입력해 주세요." (Network 탭에 요청 없음) |
| 3 | 없는 아이디로 로그인 | "사용자를 찾을 수 없습니다." |
| 4 | 틀린 비밀번호로 로그인 | "비밀번호가 맞지 않습니다. 다시 확인해 주세요." |
| 5 | 올바른 계정으로 로그인 | **1번에서 가려던 `/oprtr`로 이동**, 상단에 "ID 님" |
| 6 | F12 → Application → Local Storage | `accessToken`, `loginUserId` 저장됨 |
| 7 | F12 → Application → Cookies | `wmsRefreshToken` (HttpOnly ✔) |
| 8 | 새로고침 | 로그인 유지, "ID 님" 유지 |
| 9 | 로그인 상태에서 `/login` 접속 | `/non-procs`로 이동 |
| 10 | [로그아웃] | `/login`으로 이동, Local Storage와 쿠키 삭제됨 |
| 11 | 로그아웃 후 브라우저 뒤로가기 | 업무 페이지가 보이지 않고 `/login` 유지 |

> **인증 만료 자동 이동**은 API를 호출하는 화면이 있어야 확인할 수 있다 → 06장 "확인하기"에서 테스트한다.
> (Local Storage의 `accessToken`을 `aaa`로 바꾼 뒤 목록을 조회하면 로그인 페이지로 이동해야 함)

## 정리

| 파일 | 한 줄 요약 |
|---|---|
| `authApi.ts` | URL과 파라미터를 아는 유일한 곳 |
| `useAuth.ts` | 성공 후 처리(토큰 저장, Redux 갱신, 캐시 삭제) |
| `ProtectedRoute.tsx` | 로그인 안 했으면 화면 진입 차단 |
| `setupAuth.ts` | API 계층의 인증 실패 → 화면 계층의 로그아웃/이동 연결 |
| `LoginPage.tsx` | 입력·검증·표시만 담당 |

## 자주 하는 실수

| 증상 | 원인 |
|---|---|
| 로그인 버튼을 누르면 화면이 새로고침됨 | `e.preventDefault()` 누락 |
| 로그인 성공했는데 화면이 그대로 | Redux `loginSuccess` dispatch 누락 → `isLoggedIn`이 그대로 |
| 다른 계정으로 로그인했는데 이전 사용자 목록이 보임 | 로그아웃 시 `queryClient.clear()` 누락 |
| 서버 로그아웃이 안 됨(Redis에 토큰 남음) | 로그아웃 API 호출 **전에** 토큰을 지움 → 헤더에 토큰이 없어서 서버가 삭제 못 함 |
| 인증 만료 시 로그인 페이지로 여러 번 이동/깜빡임 | 동시에 실패한 여러 요청이 각각 이동 → 이미 `/login`이면 무시 |
| `useNavigate() may be used only in the context of a <Router>` | 컴포넌트 밖에서 훅 사용 → `router.navigate` 사용 |
