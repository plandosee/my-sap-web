// [3장] axios 공통 인스턴스 + 인터셉터
//
// 모든 API 호출은 이 파일의 post() 함수를 통해서만 한다.
// 그래야 아래 "공통 처리"를 화면마다 반복해서 작성하지 않아도 된다.
//
//  ┌─ 요청 인터셉터 ─────────────────────────────────────────┐
//  │ 1) 저장된 access 토큰을 Authorization 헤더에 자동으로 붙임 │
//  └─────────────────────────────────────────────────────────┘
//  ┌─ 응답 인터셉터 ─────────────────────────────────────────┐
//  │ 2) 응답 헤더로 새 토큰이 오면 저장 (서버의 자동 갱신)       │
//  │ 3) 200 + 빈 본문  → 미로그인 → ApiError(NOT_LOGIN)        │
//  │ 4) 200 + result:false → 업무 에러 → ApiError(백엔드 code)  │
//  │ 5) 401 / 네트워크 / 기타 HTTP 에러 → ApiError              │
//  └─────────────────────────────────────────────────────────┘

import axios, { AxiosError } from 'axios'
import type { ApiParams, ApiResult } from '../types/api'
import { ApiError, CLIENT_ERROR_CODE } from './ApiError'
import { tokenStorage } from './tokenStorage'

// ─────────────────────────────────────────────────────────────
// axios 인스턴스 생성
// - axios를 그대로 쓰지 않고 create()로 "우리 프로젝트 전용" 인스턴스를 만든다.
//   (다른 외부 API를 호출할 때 이 설정이 섞이지 않도록)
// ─────────────────────────────────────────────────────────────
export const apiClient = axios.create({
  // .env 파일의 VITE_API_BASE_URL ("/api")
  // → apiClient.post('/admin/oprtr/retrieveList.do') 는 실제로 '/api/admin/oprtr/retrieveList.do' 로 요청됨
  baseURL: import.meta.env.VITE_API_BASE_URL,
  // 30초 동안 응답이 없으면 실패 처리
  timeout: 30_000,
})

// ─────────────────────────────────────────────────────────────
// 인증 실패 시 실행할 동작 (로그인 페이지 이동 등)
// - "로그인 페이지로 이동"은 라우터/Redux를 알아야 하는데,
//   이 파일이 화면 코드를 직접 import하면 구조가 꼬인다.
// - 그래서 기본값은 "토큰 삭제"만 하고, 05장에서 앱이 시작될 때
//   setUnauthorizedHandler()로 실제 동작(로그아웃 + 로그인 페이지 이동)을 등록한다.
// ─────────────────────────────────────────────────────────────
let onUnauthorized: () => void = () => {}

export function setUnauthorizedHandler(handler: () => void): void {
  onUnauthorized = handler
}

function handleUnauthorized(): void {
  tokenStorage.clear()
  onUnauthorized()
}

// ─────────────────────────────────────────────────────────────
// 1) 요청 인터셉터: 요청이 서버로 나가기 "직전"에 실행된다.
// ─────────────────────────────────────────────────────────────
apiClient.interceptors.request.use((config) => {
  const token = tokenStorage.get()
  if (token) {
    // 백엔드 CustomUrlFilter가 "Bearer " 로 시작하는 헤더만 인식한다.
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// ─────────────────────────────────────────────────────────────
// 응답 인터셉터: 응답이 화면 코드에 전달되기 "직전"에 실행된다.
//   use(성공 시 함수, 실패 시 함수)
//   - 성공 시 함수: HTTP 2xx
//   - 실패 시 함수: HTTP 2xx 이외 또는 네트워크 오류
// ─────────────────────────────────────────────────────────────
apiClient.interceptors.response.use(
  (response) => {
    // 2) 새 토큰 저장
    //    access 토큰이 만료됐지만 refresh 쿠키가 유효하면, 서버가 요청을 정상 처리하면서
    //    새 access 토큰을 응답 헤더 Authorization에 넣어 보낸다. (CustomUrlFilter.AccessTokenIssuance)
    //    axios는 응답 헤더 이름을 소문자로 바꿔준다.
    const newToken = response.headers['authorization']
    if (typeof newToken === 'string' && newToken) {
      // 서버는 "Bearer " 없이 토큰만 보내지만, 혹시 붙어 와도 동작하도록 제거
      tokenStorage.set(newToken.replace(/^Bearer\s+/i, ''))
    }

    const data = response.data as ApiResult | '' | null | undefined

    // 3) 200 + 빈 본문 = 미로그인 (토큰 없이 /admin/** 호출)
    //    SecurityConfig의 authenticationEntryPoint가 상태 200일 때 아무것도 안 쓰기 때문
    if (data === '' || data === null || data === undefined) {
      handleUnauthorized()
      // 성공 함수 안에서 throw하면 → 호출한 쪽(await)에서 에러로 받는다.
      throw new ApiError(CLIENT_ERROR_CODE.NOT_LOGIN, '로그인이 필요합니다.')
    }

    // 4) 200 + result:false = 백엔드가 알려준 업무 에러 (검증 실패, 등록 실패 등)
    if (typeof data === 'object' && data.result === false) {
      throw new ApiError(data.code, data.message || '요청을 처리하지 못했습니다.')
    }

    return response
  },
  (error: AxiosError) => {
    // 5-1) 응답 자체가 없음: 백엔드가 꺼져 있거나, 타임아웃, 프록시 연결 실패
    if (!error.response) {
      return Promise.reject(
        new ApiError(CLIENT_ERROR_CODE.NETWORK, '서버에 연결할 수 없습니다. 백엔드 실행 여부를 확인하세요.', 0),
      )
    }

    const { status, data } = error.response

    // 5-2) 401: access 토큰 만료 + refresh 쿠키도 없음/만료
    if (status === 401) {
      handleUnauthorized()
      return Promise.reject(
        new ApiError(CLIENT_ERROR_CODE.UNAUTHORIZED, '로그인이 만료되었습니다. 다시 로그인해 주세요.', 401),
      )
    }

    // 5-3) 그 밖의 HTTP 에러 (403, 404, 500 ...)
    //      백엔드는 에러 사유를 문자열(text/html)로 보내는 경우가 있다.
    const message = typeof data === 'string' && data ? data : `요청 실패 (HTTP ${status})`
    return Promise.reject(new ApiError(CLIENT_ERROR_CODE.HTTP, message, status))
  },
)

// ─────────────────────────────────────────────────────────────
// form 파라미터 변환
// - 백엔드가 @RequestParam 이라 JSON이 아닌 form 형식(a=1&b=2)으로 보내야 한다.
// - URLSearchParams를 axios에 넘기면 Content-Type이
//   application/x-www-form-urlencoded 로 자동 설정된다.
// - undefined / null 은 제외, 빈 문자열 '' 은 그대로 보낸다.
// ─────────────────────────────────────────────────────────────
export function toFormParams(params: ApiParams = {}): URLSearchParams {
  const form = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null) return
    form.append(key, String(value))
  })
  return form
}

// ─────────────────────────────────────────────────────────────
// 화면/API 함수에서 실제로 사용하는 함수
//   const res = await post<ListResponse<NonProcs>>('/admin/nonProcs/retrieveList.do', { useYn: 'Y' })
//   → 성공하면 응답 본문(res)을 바로 돌려준다.
//   → 실패하면 ApiError를 던진다. (try/catch 또는 React Query의 error로 받음)
// ─────────────────────────────────────────────────────────────
export async function post<T extends ApiResult>(url: string, params?: ApiParams): Promise<T> {
  const response = await apiClient.post<T>(url, toFormParams(params))
  return response.data
}
