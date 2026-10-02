import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
//
// [2장] 프록시 + 환경변수 설정
// - defineConfig에 객체 대신 "함수"를 넘기면 실행 모드(mode)를 받을 수 있다.
//   예) npm run dev:local  →  vite --mode localhost  →  mode === 'localhost'
// - loadEnv(mode, 경로, '')는 .env.{mode} 파일을 읽어서 객체로 돌려준다.
//   (vite.config.ts는 브라우저 코드가 아니라서 import.meta.env를 쓸 수 없기 때문에 loadEnv를 사용)
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react()],
    server: {
      port: 5173, // 프론트 개발서버 포트(기본값과 동일, 명시적으로 적어둠)
      proxy: {
        // 브라우저에서 "/api"로 시작하는 요청을 백엔드로 대신 전달한다.
        // 예) 브라우저 요청: http://localhost:5173/api/admin/nonProcs/retrieveList.do
        //     실제 전달:     http://localhost:8080/admin/nonProcs/retrieveList.do
        '/api': {
          // 백엔드 주소는 .env 파일의 VITE_PROXY_TARGET 값을 사용(없으면 로컬 8080)
          target: env.VITE_PROXY_TARGET || 'http://localhost:8080',
          // 요청 헤더의 Host를 백엔드 주소로 바꿔서 보낸다(백엔드가 Host를 검사하는 경우 대비)
          changeOrigin: true,
          // ★ 핵심: 백엔드 경로에는 "/api"가 없으므로 앞의 "/api"를 제거하고 전달한다.
          //   이 설정이 없으면 백엔드에 "/api/admin/..."로 전달되어 404가 난다.
          rewrite: (path) => path.replace(/^\/api/, ''),
        },
      },
    },
  }
})
