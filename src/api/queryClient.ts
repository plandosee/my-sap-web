// [4장] React Query 공통 설정
//
// ■ React Query가 하는 일 (06장에서 본격 사용)
//   - 서버 데이터 조회 결과를 캐시(임시 저장)해 두고, 같은 데이터를 다시 요청하지 않게 한다.
//   - 로딩 중 / 에러 / 성공 상태를 자동으로 관리해 준다. (isPending, isError, data)
//   - 등록/수정/삭제 후 "목록 다시 조회"를 한 줄로 처리할 수 있다. (invalidateQueries)
//
// ■ QueryClient: 캐시와 옵션을 가진 객체. 앱 전체에서 하나만 만든다.

import { QueryClient } from '@tanstack/react-query'
import { ApiError } from './ApiError'

/**
 * 실패한 조회를 다시 시도할지 결정한다.
 * - React Query는 기본적으로 실패 시 3번 재시도한다.
 * - 하지만 "로그인 필요", "검증 실패" 같은 에러는 다시 해도 똑같이 실패하므로 재시도하지 않는다.
 * - 네트워크 오류처럼 일시적일 수 있는 에러만 1번 재시도한다.
 */
function shouldRetry(failureCount: number, error: Error): boolean {
  if (error instanceof ApiError) {
    // 인증 에러 → 재시도 X (03장 인터셉터가 이미 로그아웃 처리)
    if (error.isAuthError) return false
    // HTTP 200인데 실패 = 백엔드 업무 에러(result:false) → 재시도 X
    if (error.status === 200) return false
  }
  return failureCount < 1
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: shouldRetry,
      // 브라우저 탭을 다시 클릭할 때마다 자동 재조회하는 기능. 연습 중에는 헷갈리므로 끈다.
      refetchOnWindowFocus: false,
      // 조회한 데이터를 "최신"으로 보는 시간. 0이면 화면에 다시 들어올 때마다 재조회.
      staleTime: 0,
    },
    mutations: {
      // 등록/수정/삭제는 재시도하면 중복 등록될 수 있으므로 절대 재시도하지 않는다.
      retry: false,
    },
  },
})
