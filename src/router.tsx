// [4장] 라우터 설정 (주소 → 페이지 연결표)
//
// ■ createBrowserRouter 를 쓰는 이유
//   - 주소 구성을 한눈에 볼 수 있는 "설정 객체"로 관리한다.
//   - router 객체를 컴포넌트 밖(예: 03장 axios 인터셉터)에서도 쓸 수 있다.
//     → 05장 setupAuth.ts 에서 인증 만료 시 router.navigate('/login') 으로 이동시킬 때 사용
//
// ■ 주소 구성
//   /            → /non-procs 로 자동 이동
//   /login       → 로그인 (상단 메뉴 없음, 누구나 접근)
//   /non-procs   → 비공정 관리  ┐ [5장] ProtectedRoute: 로그인해야 접근
//   /oprtr       → 작업자 관리  ┘ [4장] Layout(상단 메뉴) 안에 표시
//   그 외        → 404

import { createBrowserRouter, Navigate } from 'react-router'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import LoginPage from './pages/login/LoginPage'
import NonProcsPage from './pages/nonProcs/NonProcsPage'
import NotFoundPage from './pages/NotFoundPage'
import OprtrPage from './pages/oprtr/OprtrPage'

export const router = createBrowserRouter([
  // 로그인 페이지: Layout 바깥 → 상단 메뉴 없이 단독으로 표시
  { path: '/login', element: <LoginPage /> },

  // [5장] 보호 라우트: path 없이 element만 있는 "감싸는 라우트"(레이아웃 라우트)
  //   ProtectedRoute 가 로그인 여부를 검사 → 통과하면 <Outlet /> 자리에 아래 children 을 그림
  {
    element: <ProtectedRoute />,
    children: [
      // 업무 페이지: Layout 안쪽(children) → Layout의 <Outlet /> 자리에 표시
      {
        path: '/',
        element: <Layout />,
        children: [
          // index: 부모 주소(/) 그대로 들어왔을 때 → 비공정 화면으로 보냄
          // replace: 뒤로가기 했을 때 '/'로 돌아오지 않도록 방문 기록을 덮어씀
          { index: true, element: <Navigate to="/non-procs" replace /> },
          { path: 'non-procs', element: <NonProcsPage /> },
          { path: 'oprtr', element: <OprtrPage /> },
        ],
      },
    ],
  },

  // 위에 없는 모든 주소
  { path: '*', element: <NotFoundPage /> },
])
