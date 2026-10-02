// [5장] 인증 만료 시 동작 등록
//
// ■ 03장 client.ts 에서 비워 둔 부분을 여기서 채운다.
//   client.ts는 "인증 실패를 감지 → 토큰 삭제 → 등록된 함수 호출"까지만 한다.
//   여기서 등록하는 함수가 "Redux 로그아웃 + 캐시 비우기 + 로그인 페이지 이동"을 한다.
//
// ■ 왜 client.ts에서 바로 안 하나?
//   client.ts(API 계층)가 router/store(화면 계층)를 import 하면,
//   API 파일 하나를 쓰려 해도 화면 전체가 딸려 오는 구조가 된다.
//   "아래 계층(API)은 위 계층(화면)을 모른다"는 원칙을 지키기 위해 앱 시작 시점에 연결만 해 준다.
//
// ■ 컴포넌트 밖이라 useNavigate / useDispatch 같은 훅을 쓸 수 없다.
//   → store.dispatch, router.navigate 를 직접 사용한다.

import { setUnauthorizedHandler } from './api/client'
import { queryClient } from './api/queryClient'
import { router } from './router'
import { store } from './store'
import { logout } from './store/authSlice'
import type { LoginLocationState } from './types/auth'

export function setupAuth(): void {
  setUnauthorizedHandler(() => {
    // 1) Redux 로그아웃 (토큰 삭제는 client.ts가 이미 함)
    store.dispatch(logout())
    // 2) 이전 사용자의 조회 데이터 캐시 삭제
    queryClient.clear()

    // 3) 로그인 페이지로 이동
    //    - 여러 API가 동시에 실패하면 이 함수가 여러 번 불릴 수 있다 → 이미 로그인 페이지면 무시
    const currentPath = router.state.location.pathname
    if (currentPath === '/login') return

    const state: LoginLocationState = { from: currentPath, expired: true }
    router.navigate('/login', { replace: true, state })
  })
}
