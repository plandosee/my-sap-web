# 02. 프록시 & 환경변수

## 목표

- 브라우저에서 `/api/...`로 요청하면 백엔드로 전달되게 한다.
- 실행 환경(로컬/개발/스테이징/운영)별로 설정값을 `.env` 파일로 분리한다.

## 왜 프록시가 필요한가?

React(5173 포트)에서 백엔드(8080 포트)를 직접 호출하면 **출처(origin)가 달라서** 다음 문제가 생긴다.

- CORS 에러
- refresh 토큰 **쿠키가 저장/전송되지 않음** (다른 출처의 쿠키)

프록시를 쓰면 브라우저 입장에서는 **모든 요청이 5173으로** 가므로 위 문제가 없다.

```
브라우저 → http://localhost:5173/api/admin/oprtr/retrieveList.do
              │ (vite 프록시가 /api 제거)
              ▼
         http://localhost:8080/admin/oprtr/retrieveList.do
```

## 변경 범위

| 구분 | 파일 | 내용 |
|---|---|---|
| 수정 | `vite.config.ts` | `rewrite`로 `/api` 제거, 백엔드 주소를 env에서 읽기 |
| 수정 | `package.json` | `dev:local`, `build:staging` 스크립트 추가 |
| 수정 | `.env.localhost` / `.env.development` / `.env.staging` / `.env.production` | 환경별 변수 |
| 신규 | `src/vite-env.d.ts` | 환경변수 타입 선언 |

## 따라하기

### 1. `vite.config.ts`

```ts
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  // .env.{mode} 파일을 읽는다 (vite.config.ts에서는 import.meta.env 사용 불가)
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: env.VITE_PROXY_TARGET || 'http://localhost:8080',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ''), // ★ /api 제거
        },
      },
    },
  }
})
```

| 옵션 | 의미 |
|---|---|
| `target` | 요청을 넘겨줄 실제 백엔드 주소 |
| `changeOrigin` | 요청 헤더 `Host`를 백엔드 주소로 변경 |
| `rewrite` | 전달 전에 경로를 바꾸는 함수. 정규식 `^\/api` = "맨 앞의 /api" |

### 2. `.env` 파일

| 파일 | 언제 쓰이나 | 실행 명령 |
|---|---|---|
| `.env.localhost` | 내 PC에서 백엔드도 실행 | `npm run dev:local` |
| `.env.development` | 공용 개발서버 백엔드 사용 | `npm run dev` |
| `.env.staging` | 스테이징 빌드 | `npm run build:staging` |
| `.env.production` | 운영 빌드 | `npm run build` |

`.env.localhost` 예시:
```
VITE_APP_TITLE=SAP to Web (LOCAL)
VITE_API_BASE_URL=/api
VITE_PROXY_TARGET=http://localhost:8080
```

> ⚠️ **`VITE_` 접두어**가 붙은 변수만 브라우저 코드(`import.meta.env.VITE_...`)에서 읽을 수 있다.
> ⚠️ `.env`에 비밀번호/비밀키를 넣지 말 것. 빌드하면 JS 파일에 그대로 들어간다.
> ⚠️ `.env`를 수정하면 **개발서버를 재시작**해야 반영된다.

### 3. `package.json` 스크립트

```json
"dev": "vite",
"dev:local": "vite --mode localhost",
"build": "tsc -b && vite build",
"build:staging": "tsc -b && vite build --mode staging",
```

`--mode xxx` → `.env.xxx` 파일을 읽는다. 모드를 안 주면 `vite`는 `development`, `vite build`는 `production`.

### 4. `src/vite-env.d.ts`

```ts
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_TITLE: string
  readonly VITE_API_BASE_URL: string
  readonly VITE_PROXY_TARGET: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
```

→ `import.meta.env.VITE_API_BASE_URL` 입력 시 자동완성 + 오타 검사가 된다.

## 확인하기

1. 백엔드(8080) 실행
2. `npm run dev:local`
3. 새 터미널에서 (Git Bash 기준):

```bash
# 로그인 없이 접근 가능한 /loginProcess.do 를 파라미터 없이 호출
curl -X POST http://localhost:5173/api/loginProcess.do
```

다음처럼 **백엔드의 JSON**이 오면 성공 (userId가 없어서 나는 정상적인 에러):
```json
{"result":false,"code":"InternalServerError","message":"Cannot invoke \"Object.toString()\" ..."}
```

> 브라우저 주소창으로는 테스트할 수 없다. 주소창은 GET 요청인데 API는 POST만 받는다.

## 자주 하는 실수

| 증상 | 원인 |
|---|---|
| 404 | `rewrite` 누락 → 백엔드에 `/api/...`로 도착 |
| `.env` 값이 `undefined` | `VITE_` 접두어 누락 / 개발서버 재시작 안 함 / `--mode` 이름과 파일명 불일치 |
| 빌드 후 운영에서 API 404 | 프록시는 **개발서버 전용**. 운영에서는 nginx 등 웹서버에서 `/api` 전달 설정 필요 |
