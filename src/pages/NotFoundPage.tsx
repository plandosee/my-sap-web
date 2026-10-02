// [4장] 404 페이지
// - router.tsx 에 등록되지 않은 주소로 들어오면 표시된다. (path: '*')

import { Link } from 'react-router'

export default function NotFoundPage() {
  return (
    <div className="page-center">
      <h1>404</h1>
      <p>페이지를 찾을 수 없습니다.</p>
      {/* <Link>: 새로고침 없이 페이지 이동 (NavLink와 달리 active 표시 기능은 없음) */}
      <Link to="/">처음으로</Link>
    </div>
  )
}
