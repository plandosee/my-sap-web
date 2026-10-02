// [4장] 공통 레이아웃 (상단 메뉴 + 본문 영역)
//
// ■ <Outlet /> 이란?
//   router.tsx 에서 이 Layout의 children 으로 등록한 페이지가 그려지는 "자리".
//   주소가 /non-procs 이면 NonProcsPage, /oprtr 이면 OprtrPage 가 <Outlet /> 위치에 들어간다.
//   → 상단 메뉴는 페이지가 바뀌어도 다시 그려지지 않고 그대로 유지된다.
//
// ■ <NavLink> 란?
//   <a> 태그처럼 페이지를 이동하지만 "새로고침 없이" 이동한다(SPA).
//   현재 주소와 같은 메뉴에는 자동으로 class="active" 가 붙는다 → CSS로 강조 표시.

import { NavLink, Outlet } from 'react-router'
import { useAppSelector } from '../store/hooks'

export default function Layout() {
  // Redux 저장소에서 로그인 상태를 읽는다. (값이 바뀌면 이 컴포넌트가 자동으로 다시 그려짐)
  const { isLoggedIn, userId } = useAppSelector((state) => state.auth)

  return (
    <div className="layout">
      <header className="layout-header">
        {/* .env 의 VITE_APP_TITLE (모드마다 다르게 표시됨: LOCAL / DEV ...) */}
        <div className="layout-title">{import.meta.env.VITE_APP_TITLE}</div>

        <nav className="layout-nav">
          <NavLink to="/non-procs">비공정 관리</NavLink>
          <NavLink to="/oprtr">작업자 관리</NavLink>
        </nav>

        {/* 로그인 상태 표시 (05장에서 로그아웃 버튼 추가) */}
        <div className="layout-user">
          {isLoggedIn ? `${userId ?? '사용자'} 님` : '미로그인'}
        </div>
      </header>

      <main className="layout-main">
        <Outlet />
      </main>
    </div>
  )
}
