// [5장] 로그인 페이지로 이동할 때 함께 넘기는 정보 (react-router의 location.state)
//
//   navigate('/login', { state: { from: '/oprtr', expired: true } })
//   → LoginPage에서 useLocation().state 로 읽는다.
//
// - from    : 원래 가려던 주소. 로그인 성공 후 그 페이지로 돌려보낸다.
// - expired : 인증 만료로 쫓겨난 경우 true → "다시 로그인해 주세요" 안내 표시
export interface LoginLocationState {
  from?: string
  expired?: boolean
}
