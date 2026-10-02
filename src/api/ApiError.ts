// [3장] API 공통 에러 클래스
// - 백엔드 실패 응답(result:false), 미로그인, 401, 네트워크 오류 등
//   "실패"의 종류가 여러 가지인데, 화면에서는 한 가지 방식으로 처리하고 싶다.
// - 그래서 모든 실패를 ApiError 하나로 통일해서 던진다(throw).
//   화면에서는  catch (e) { if (e instanceof ApiError) alert(e.message) }  처럼 사용.

/** 프론트에서 직접 정한 에러코드 (백엔드 에러코드와 구분하기 위해 대문자 사용) */
export const CLIENT_ERROR_CODE = {
  /** 토큰 없이 호출해서 200 + 빈 본문이 온 경우 */
  NOT_LOGIN: 'NOT_LOGIN',
  /** 401: 토큰 만료 + refresh 쿠키도 만료 */
  UNAUTHORIZED: 'UNAUTHORIZED',
  /** 서버에 연결 자체가 안 됨 (백엔드 꺼짐, 타임아웃 등) */
  NETWORK: 'NETWORK',
  /** 그 밖의 HTTP 에러 (403, 404, 500 ...) */
  HTTP: 'HTTP',
} as const

export class ApiError extends Error {
  /** 에러코드: 백엔드 code("FailToRegist" 등) 또는 CLIENT_ERROR_CODE */
  readonly code: string
  /** HTTP 상태코드 (백엔드 result:false 는 200) */
  readonly status: number

  // ※ tsconfig의 erasableSyntaxOnly 옵션 때문에
  //   constructor(public code: string) 같은 축약 문법은 쓸 수 없다 → 필드를 직접 선언
  constructor(code: string, message: string, status = 200) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = status
  }

  /** 로그인이 필요한 에러인지 (화면에서 로그인 페이지로 보낼지 판단할 때 사용) */
  get isAuthError(): boolean {
    return this.code === CLIENT_ERROR_CODE.NOT_LOGIN || this.code === CLIENT_ERROR_CODE.UNAUTHORIZED
  }
}
