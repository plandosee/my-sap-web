// [5장] 로그인 / 로그아웃 API
//
// ■ API 함수 파일을 따로 두는 이유
//   - 화면 코드에 URL('/loginProcess.do')과 파라미터 이름(userId, password)을 직접 쓰지 않는다.
//   - 백엔드 URL이나 파라미터 이름이 바뀌면 이 파일만 고치면 된다.
//   - 06장(nonProcsApi.ts), 07장(oprtrApi.ts)도 같은 방식으로 만든다.
//
// ■ 백엔드: LoginController.java
//   - /loginProcess.do, /logout.do 는 SecurityConfig에서 permitAll("/*") → 토큰 없이 호출 가능

import type { ApiResult } from '../types/api'
import { post } from './client'

/** 로그인 요청 파라미터 */
export interface LoginParams {
  userId: string
  password: string
}

/** 로그인 성공 응답: 공통 필드 + accessToken */
export interface LoginResponse extends ApiResult {
  accessToken: string
}

export const authApi = {
  /**
   * 로그인
   * - 성공: 응답 본문에 accessToken, 동시에 wmsRefreshToken 쿠키(HttpOnly) 발급
   * - 실패: result:false → ApiError (code: UserNotFound / PasswordUnauthorized 등)
   */
  login(params: LoginParams): Promise<LoginResponse> {
    // LoginParams는 ApiParams와 모양이 같으므로 그대로 넘길 수 있도록 펼쳐서 전달
    return post<LoginResponse>('/loginProcess.do', { ...params })
  },

  /**
   * 로그아웃
   * - 서버에서 Redis의 access 토큰, DB의 refresh 토큰을 삭제하고 쿠키를 만료시킨다.
   * - 요청 헤더의 Authorization 토큰을 보고 삭제하므로, 로컬 토큰은 "호출한 뒤에" 지워야 한다.
   */
  logout(): Promise<ApiResult> {
    return post<ApiResult>('/logout.do')
  },
}
