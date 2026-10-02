// [3장] access 토큰 저장소
// - 토큰을 어디에 저장할지를 이 파일 한 곳에서만 관리한다.
//   (나중에 저장 위치를 sessionStorage 등으로 바꿔도 이 파일만 고치면 됨)
//
// ■ 저장 위치: localStorage
//   - 새로고침해도 유지된다. (Redux 같은 메모리 저장은 새로고침하면 사라짐)
//   - 단점: 자바스크립트로 읽을 수 있어서 XSS 공격에 취약하다.
//     → 이 백엔드는 refresh 토큰을 HttpOnly 쿠키로 따로 관리하므로
//       access 토큰(30분)만 localStorage에 두는 구조로 위험을 줄인 것.
//
// ■ refresh 토큰(wmsRefreshToken 쿠키)은 여기서 다루지 않는다.
//   HttpOnly 쿠키라 JS로 읽을 수 없고, 브라우저가 요청마다 자동으로 보낸다.

const ACCESS_TOKEN_KEY = 'accessToken'

export const tokenStorage = {
  /** 저장된 access 토큰 (없으면 null) */
  get(): string | null {
    return localStorage.getItem(ACCESS_TOKEN_KEY)
  },

  /** access 토큰 저장 (로그인 성공 시, 서버가 새 토큰을 내려줬을 때) */
  set(token: string): void {
    localStorage.setItem(ACCESS_TOKEN_KEY, token)
  },

  /** access 토큰 삭제 (로그아웃, 인증 만료 시) */
  clear(): void {
    localStorage.removeItem(ACCESS_TOKEN_KEY)
  },
}
