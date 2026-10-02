# 04. 앱 뼈대 (Router · React Query · Redux · 레이아웃)

## 목표

실제 업무 화면을 만들기 전에 **앱의 틀**을 잡는다.

- **Redux**: 로그인 상태를 앱 전체에서 공유
- **React Query**: 서버 데이터 조회 도구를 앱 전체에 연결 + 공통 옵션
- **React Router**: 주소별 페이지 구성
- **공통 레이아웃**: 상단 메뉴 + 본문
- Vite 샘플 파일과 03장 임시 테스트 페이지 정리

## 변경 범위

| 구분 | 파일 | 역할 |
|---|---|---|
| 신규 | `src/store/authSlice.ts` | 로그인 상태(isLoggedIn, userId) + 액션(loginSuccess, logout) |
| 신규 | `src/store/index.ts` | Redux 저장소 생성, `RootState`/`AppDispatch` 타입 |
| 신규 | `src/store/hooks.ts` | 타입이 지정된 `useAppSelector` / `useAppDispatch` |
| 신규 | `src/api/queryClient.ts` | React Query 공통 옵션 (재시도 규칙 등) |
| 신규 | `src/router.tsx` | 주소 → 페이지 연결표 |
| 신규 | `src/components/Layout.tsx` | 상단 메뉴 + `<Outlet />` |
| 신규 | `src/pages/login/LoginPage.tsx` | 로그인 (빈 껍데기 → 05장) |
| 신규 | `src/pages/nonProcs/NonProcsPage.tsx` | 비공정 (빈 껍데기 → 06장) |
| 신규 | `src/pages/oprtr/OprtrPage.tsx` | 작업자 (빈 껍데기 → 07장) |
| 신규 | `src/pages/NotFoundPage.tsx` | 404 |
| 수정 | `src/main.tsx` | Provider 3개로 앱 감싸기 |
| 수정 | `src/index.css` | 샘플 스타일 → 업무용 기본 스타일 |
| 수정 | `index.html` | `lang="ko"`, 제목을 env 값으로 |
| 삭제 | `src/App.tsx`, `src/App.css`, `src/assets/*`, `public/icons.svg` | Vite 샘플 |
| 삭제 | `src/pages/ApiTestPage.tsx` | 03장 임시 테스트 페이지 |

### 현재 폴더 구조

```
src/
├─ api/
│  ├─ client.ts          (03장) axios 공통 통로
│  ├─ ApiError.ts        (03장)
│  ├─ tokenStorage.ts    (03장)
│  └─ queryClient.ts     ★ React Query 설정
├─ components/
│  └─ Layout.tsx         ★ 상단 메뉴
├─ hooks/                (06장부터 사용)
├─ pages/
│  ├─ login/LoginPage.tsx
│  ├─ nonProcs/NonProcsPage.tsx
│  ├─ oprtr/OprtrPage.tsx
│  └─ NotFoundPage.tsx
├─ store/
│  ├─ index.ts           ★ Redux 저장소
│  ├─ authSlice.ts       ★ 로그인 상태
│  └─ hooks.ts
├─ types/api.ts          (03장)
├─ router.tsx            ★ 주소 구성
├─ main.tsx              ★ 진입점
└─ index.css
```

> 💡 페이지를 **기능별 폴더**(`pages/nonProcs/`)로 나눈 이유: 06장에서 등록/수정 팝업 같은 하위 컴포넌트가 같은 폴더에 생긴다.

## 전체 구조 그림

```
main.tsx
 └─ <Provider store>                 Redux
     └─ <QueryClientProvider>        React Query
         └─ <RouterProvider>         React Router
             ├─ /login        → LoginPage
             ├─ /             → Layout (상단 메뉴)
             │   ├─ (index)   → /non-procs 로 이동
             │   ├─ non-procs → NonProcsPage   ┐ Layout의 <Outlet /> 자리에 표시
             │   └─ oprtr     → OprtrPage      ┘
             └─ *             → NotFoundPage
```

## 따라하기

### 1. Redux – 로그인 상태

**(1) `src/store/authSlice.ts`**

```ts
import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import { tokenStorage } from '../api/tokenStorage'

export interface AuthState {
  isLoggedIn: boolean
  userId: string | null
}

const initialState: AuthState = {
  isLoggedIn: tokenStorage.get() !== null, // 새로고침해도 토큰이 있으면 로그인 상태로 시작
  userId: null,
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginSuccess(state, action: PayloadAction<string>) {
      state.isLoggedIn = true
      state.userId = action.payload
    },
    logout(state) {
      state.isLoggedIn = false
      state.userId = null
    },
  },
})

export const { loginSuccess, logout } = authSlice.actions
export default authSlice.reducer
```

> 💡 **`state.isLoggedIn = true` 처럼 직접 바꿔도 되나?**
> 원래 Redux는 상태를 직접 바꾸면 안 된다. Redux Toolkit은 내부의 **Immer** 라이브러리가 "바꾼 부분만 새 객체로 복사"해 주기 때문에 직접 바꾸듯이 써도 된다. (`createSlice` 안에서만)

**(2) `src/store/index.ts`**

```ts
import { configureStore } from '@reduxjs/toolkit'
import authReducer from './authSlice'

export const store = configureStore({
  reducer: { auth: authReducer }, // state.auth
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
```

**(3) `src/store/hooks.ts`**

```ts
import { useDispatch, useSelector } from 'react-redux'
import type { AppDispatch, RootState } from './index'

export const useAppDispatch = useDispatch.withTypes<AppDispatch>()
export const useAppSelector = useSelector.withTypes<RootState>()
```

사용 예:
```ts
const isLoggedIn = useAppSelector((state) => state.auth.isLoggedIn) // 읽기
const dispatch = useAppDispatch()
dispatch(logout())                                                    // 바꾸기
```

### 2. React Query – `src/api/queryClient.ts`

```ts
import { QueryClient } from '@tanstack/react-query'
import { ApiError } from './ApiError'

function shouldRetry(failureCount: number, error: Error): boolean {
  if (error instanceof ApiError) {
    if (error.isAuthError) return false   // 로그인 필요 → 재시도 무의미
    if (error.status === 200) return false // result:false 업무 에러 → 재시도 무의미
  }
  return failureCount < 1                  // 네트워크 오류 등은 1번만 재시도
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: shouldRetry,
      refetchOnWindowFocus: false, // 탭 전환 시 자동 재조회 끔
      staleTime: 0,
    },
    mutations: {
      retry: false, // 등록/수정/삭제는 절대 재시도 X (중복 등록 방지)
    },
  },
})
```

> 💡 React Query의 기본값은 **실패 시 3번 재시도**다. 그대로 두면 "비밀번호 오류" 같은 에러도 3번 더 요청해서, 에러 메시지가 늦게 뜨고 서버 로그도 지저분해진다.

### 3. 페이지와 레이아웃

**`src/components/Layout.tsx`** (핵심만)

```tsx
import { NavLink, Outlet } from 'react-router'
import { useAppSelector } from '../store/hooks'

export default function Layout() {
  const { isLoggedIn, userId } = useAppSelector((state) => state.auth)
  return (
    <div className="layout">
      <header className="layout-header">
        <div className="layout-title">{import.meta.env.VITE_APP_TITLE}</div>
        <nav className="layout-nav">
          <NavLink to="/non-procs">비공정 관리</NavLink>
          <NavLink to="/oprtr">작업자 관리</NavLink>
        </nav>
        <div className="layout-user">{isLoggedIn ? `${userId ?? '사용자'} 님` : '미로그인'}</div>
      </header>
      <main className="layout-main">
        <Outlet />   {/* ← 자식 페이지가 그려지는 자리 */}
      </main>
    </div>
  )
}
```

| 요소 | 의미 |
|---|---|
| `<Outlet />` | router.tsx에서 `children`으로 등록한 페이지가 들어가는 자리 |
| `<NavLink>` | 새로고침 없이 이동 + 현재 주소면 `class="active"` 자동 추가 |
| `<Link>` | 새로고침 없이 이동 (active 기능 없음) |

> ⚠️ 페이지 이동에 `<a href>`를 쓰면 **페이지 전체가 새로고침**되어 Redux 상태가 초기화된다. 앱 내부 이동은 항상 `Link`/`NavLink`를 쓴다.

페이지 파일(`LoginPage`, `NonProcsPage`, `OprtrPage`, `NotFoundPage`)은 지금은 제목만 있는 빈 껍데기다.

### 4. `src/router.tsx`

```tsx
import { createBrowserRouter, Navigate } from 'react-router'
// ...페이지 import

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <Navigate to="/non-procs" replace /> },
      { path: 'non-procs', element: <NonProcsPage /> },
      { path: 'oprtr', element: <OprtrPage /> },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
])
```

| 설정 | 의미 |
|---|---|
| `children` | 부모(`Layout`) 안의 `<Outlet />`에 그려질 자식 페이지 |
| `path: 'non-procs'` | 자식 경로는 `/` 없이 씀 → 부모와 합쳐져 `/non-procs` |
| `index: true` | 부모 주소(`/`) 그대로 들어왔을 때 |
| `<Navigate replace>` | 다른 주소로 자동 이동. `replace`는 방문 기록을 덮어써서 뒤로가기 시 `/`로 안 돌아옴 |
| `path: '*'` | 위에서 걸리지 않은 모든 주소 |

> 💡 `createBrowserRouter`로 만든 `router` 객체는 컴포넌트 밖에서도 `router.navigate('/login')`처럼 쓸 수 있다. → 05장에서 인증 만료 시 활용

### 5. `src/main.tsx`

```tsx
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </Provider>
  </StrictMode>,
)
```

> 💡 **Provider**는 "이 안쪽에 있는 모든 컴포넌트가 이 도구를 쓸 수 있게 해 주는 감싸개"다. 페이지는 Router 안쪽에 있으므로 Redux와 React Query를 모두 쓸 수 있다.
> 💡 **StrictMode**: 개발 모드에서만 일부 동작을 2번 실행해서 버그를 찾아 준다. 개발 중 Network 탭에서 API가 2번 호출돼도 정상이다(빌드하면 1번).

### 6. `index.html` – 탭 제목을 env 값으로

```html
<html lang="ko">
  ...
  <title>%VITE_APP_TITLE%</title>
```

`%변수명%`은 Vite가 `.env` 값으로 바꿔 준다. → `npm run dev:local`이면 `SAP to Web (LOCAL)`

### 7. 샘플 파일 삭제

```bash
rm src/App.tsx src/App.css src/pages/ApiTestPage.tsx
rm -r src/assets
rm public/icons.svg
```

> 삭제 전에 다른 파일에서 쓰고 있지 않은지 검색해서 확인한다. (`favicon.svg`는 index.html에서 쓰므로 남김)

## 확인하기

`npm run dev:local` 실행 후:

| 확인 항목 | 기대 결과 |
|---|---|
| http://localhost:5173 접속 | 자동으로 `/non-procs`로 이동, "비공정 관리" 표시 |
| 상단 메뉴 "작업자 관리" 클릭 | 주소가 `/oprtr`로 바뀌고 **새로고침 없이** 본문만 바뀜, 메뉴가 파란색으로 강조 |
| 브라우저 탭 제목 | `SAP to Web (LOCAL)` |
| 상단 오른쪽 | `미로그인` (토큰이 남아 있으면 `사용자 님`) |
| http://localhost:5173/login | 상단 메뉴 없이 "로그인" 표시 |
| http://localhost:5173/abc | 404 페이지, "처음으로" 클릭 시 비공정으로 이동 |
| 브라우저 뒤로가기 | 이전 메뉴로 돌아감 |

## 정리

| 도구 | 담당 | 이 프로젝트에서 |
|---|---|---|
| Redux | 화면끼리 공유하는 **클라이언트 상태** | 로그인 여부, 사용자 ID |
| React Query | **서버 데이터** (조회·캐시·재조회) | 비공정/작업자 목록 (06·07장) |
| React Router | **주소 ↔ 페이지** | `/login`, `/non-procs`, `/oprtr` |

## 자주 하는 실수

| 증상 | 원인 |
|---|---|
| `could not find react-redux context value` | 컴포넌트가 `<Provider>` 바깥에 있음 |
| `No QueryClient set` | `<QueryClientProvider>` 누락 |
| 메뉴 클릭 시 화면 전체가 깜빡이며 로그인 상태 초기화 | `<a href>` 사용 → `<NavLink>`/`<Link>`로 변경 |
| 자식 페이지가 안 보임 | 부모 레이아웃에 `<Outlet />` 누락 |
| 자식 경로가 안 맞음 | 자식 `path`에 `/non-procs`처럼 앞에 `/`를 붙임 → 절대경로로 인식됨 |
| 개발 중 API가 2번 호출됨 | `StrictMode` 정상 동작 (빌드 시 1번) |
