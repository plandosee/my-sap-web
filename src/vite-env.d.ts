/// <reference types="vite/client" />

// [2장] 환경변수 타입 선언
// - import.meta.env.VITE_XXX 를 사용할 때 자동완성과 타입 체크가 되도록 선언한다.
// - .env 파일에 새 변수를 추가하면 여기에도 같이 추가한다.
// - 주의: 브라우저 코드에서는 "VITE_"로 시작하는 변수만 읽을 수 있다(보안상 나머지는 숨김).
interface ImportMetaEnv {
  /** 화면 제목 등 표시용 이름 */
  readonly VITE_APP_TITLE: string
  /** axios가 요청을 보낼 기본 주소. 프록시를 쓰므로 보통 "/api" */
  readonly VITE_API_BASE_URL: string
  /** vite 개발서버 프록시가 전달할 실제 백엔드 주소 (vite.config.ts에서만 사용) */
  readonly VITE_PROXY_TARGET: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
