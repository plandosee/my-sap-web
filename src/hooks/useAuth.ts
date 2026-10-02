// [5장] 로그인 / 로그아웃 커스텀 훅
//
// ■ useMutation 이란? (React Query)
//   서버의 상태를 "바꾸는" 요청(로그인, 등록, 수정, 삭제)에 사용한다.
//   (조회는 useQuery → 06장)
//
//   const login = useLogin()
//   login.mutate({ userId, password })   ← 실행
//   login.isPending                       ← 요청 중이면 true (버튼 비활성화에 사용)
//   login.error                           ← 실패 시 ApiError (03장 인터셉터가 만들어 준 것)
//
// ■ 커스텀 훅으로 분리하는 이유
//   "로그인 성공 후 토큰 저장 + Redux 갱신" 같은 로직을 화면 코드에서 떼어내면
//   화면(LoginPage)은 폼 입력과 표시만 신경 쓰면 된다.

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router'
import { authApi, type LoginParams } from '../api/authApi'
import { tokenStorage } from '../api/tokenStorage'
import { loginSuccess, logout } from '../store/authSlice'
import { useAppDispatch } from '../store/hooks'

/**
 * 로그인 훅
 * - 성공 후 "어디로 이동할지"는 화면(LoginPage)이 정한다. (원래 가려던 페이지로 보내기 위해)
 */
export function useLogin() {
  const dispatch = useAppDispatch()

  return useMutation({
    // 실제로 실행할 API 호출
    mutationFn: (params: LoginParams) => authApi.login(params),

    // 성공했을 때 실행 (res: 응답 본문, params: mutate에 넘긴 값)
    onSuccess: (res, params) => {
      // 1) 토큰 저장 → 이후 모든 요청에 03장 요청 인터셉터가 자동으로 붙임
      tokenStorage.set(res.accessToken)
      // 2) 화면 표시용 사용자 ID 저장 (응답에 사용자 ID가 없으므로 입력값 사용)
      tokenStorage.setUserId(params.userId)
      // 3) Redux 로그인 상태 갱신 → 상단 메뉴, 보호 라우트가 자동으로 다시 그려짐
      dispatch(loginSuccess(params.userId))
    },
    // 실패 시에는 별도 처리 없음 → 화면에서 login.error 로 메시지를 표시
  })
}

/**
 * 로그아웃 훅
 * - 서버 로그아웃이 실패하더라도(이미 만료 등) 프론트에서는 반드시 로그아웃 처리한다.
 */
export function useLogout() {
  const dispatch = useAppDispatch()
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  return useMutation({
    mutationFn: () => authApi.logout(),

    // onSettled: 성공이든 실패든 "끝나면" 항상 실행
    onSettled: () => {
      // 1) 토큰 삭제 (서버 호출이 끝난 "뒤에" 지워야 서버가 헤더 토큰을 보고 삭제할 수 있음)
      tokenStorage.clear()
      // 2) Redux 로그아웃
      dispatch(logout())
      // 3) React Query 캐시 비우기 → 다른 계정으로 로그인했을 때 이전 사용자의 목록이 보이지 않도록
      queryClient.clear()
      // 4) 로그인 페이지로 (replace: 뒤로가기로 업무 페이지에 돌아가지 않도록)
      navigate('/login', { replace: true })
    },
  })
}
