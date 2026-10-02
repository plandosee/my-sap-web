# my-sap-web

**SAP – 백엔드 API – React** 구조의 웹 신규 구축을 연습하는 프로젝트입니다.
연습용으로 기존 MES 백엔드(Spring Boot)의 API 일부를 사용합니다.

## 기능

| 화면 | 주소 | 사용 API |
|---|---|---|
| 로그인 | `/login` | `/loginProcess.do`, `/logout.do` |
| 비공정 관리 | `/non-procs` | `/admin/nonProcs/{retrieveList, insert, update, delete}.do` |
| 작업자 관리 | `/oprtr` | `/admin/oprtr/{retrieveList, insert, update, delete}.do`, `/admin/codeMast/selectCode.do` |

## 기술 스택

React 19 · TypeScript · Vite · axios · React Router · TanStack Query · Redux Toolkit · 순수 CSS

## 실행

```bash
npm install
# 백엔드를 localhost:8080 으로 먼저 실행한 뒤
npm run dev:local        # http://localhost:5173
```

| 명령 | 환경 파일 |
|---|---|
| `npm run dev:local` | `.env.localhost` |
| `npm run dev` | `.env.development` |
| `npm run build:staging` | `.env.staging` |
| `npm run build` | `.env.production` |

## 튜토리얼 문서

처음부터 따라 만들 수 있는 단계별 문서는 [docs/](./docs/README.md)에 있습니다.

| 장 | 내용 |
|---|---|
| [00](./docs/00-environment-setup.md) | 환경설정 |
| [01](./docs/01-backend-api-analysis.md) | 백엔드 API 분석 |
| [02](./docs/02-proxy-and-env.md) | 프록시 & 환경변수 |
| [03](./docs/03-axios-setup.md) | axios 공통 설정 |
| [04](./docs/04-app-skeleton.md) | 앱 뼈대 |
| [05](./docs/05-login-logout.md) | 로그인 / 로그아웃 |
| [06](./docs/06-non-procs-crud.md) | 비공정 CRUD |
| [07](./docs/07-oprtr-crud.md) | 공통코드 + 작업자 CRUD |
| [08](./docs/08-summary-and-practice.md) | 정리 & 실무 적용 |
