// [5장] 보호 라우트 (로그인해야 들어갈 수 있는 페이지를 감싸는 문지기)
//
// ■ 동작
//   - 로그인 상태(Redux)면  → <Outlet /> : 자식 라우트(Layout → 업무 페이지)를 그대로 보여줌
//   - 로그인 안 했으면      → /login 으로 이동. 이때 "원래 가려던 주소"를 state.from 에 담아 보냄
//
// ■ 주의: 이건 "화면을 숨기는" 것일 뿐 보안 장치가 아니다.
//   진짜 보안은 백엔드가 토큰으로 막는다(SecurityConfig). 토큰이 만료됐는데 Redux는 로그인 상태라면,
//   화면은 열리지만 첫 API 호출에서 401/빈 응답 → 03장 인터셉터 → 로그인 페이지로 이동한다.

import { Navigate, Outlet, useLocation } from 'react-router'
import { useAppSelector } from '../store/hooks'
import type { LoginLocationState } from '../types/auth'

export default function ProtectedRoute() {
  const isLoggedIn = useAppSelector((state) => state.auth.isLoggedIn)
  const location = useLocation()

  if (!isLoggedIn) {
    const state: LoginLocationState = { from: location.pathname }
    return <Navigate to="/login" replace state={state} />
  }

  return <Outlet />
}
