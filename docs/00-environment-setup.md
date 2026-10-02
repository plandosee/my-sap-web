# 00. 환경설정

> 이 장은 튜토리얼을 시작하기 전에 직접 진행한 내용을 정리한 것이다.

## 사용 버전

| 항목 | 버전 |
|---|---|
| Node.js | v20.20.1 |
| Vite | 8.x |
| React | 19.x |
| TypeScript | 6.x |

## 1. Node.js 설치

https://nodejs.org 에서 LTS 버전을 설치한 뒤 확인한다.

```bash
node -v   # v20.20.1
npm -v
```

## 2. React 프로젝트 생성

```bash
npm create vite@latest my-sap-web -- --template react-ts
```

- `my-sap-web` : 프로젝트(폴더) 이름
- `--template react-ts` : React + TypeScript 템플릿

## 3. ESLint / TypeScript

생성 과정에서 ESLint를 선택하면 TypeScript, DOM 타입 등 기본 의존성이 자동으로 설치된다.

## 4. 라이브러리 설치

```bash
npm install axios react-router @tanstack/react-query @reduxjs/toolkit react-redux
```

| 라이브러리 | 용도 | 이 프로젝트에서 사용하는 곳 |
|---|---|---|
| `axios` | HTTP 요청 | 03장: 백엔드 API 호출 공통 설정 |
| `react-router` | 페이지 이동(라우팅) | 04장: 로그인 / 비공정 / 작업자 페이지 주소 |
| `@tanstack/react-query` | **서버 데이터** 조회·캐시·재조회 | 06·07장: 목록 조회, 등록/수정/삭제 후 목록 새로고침 |
| `@reduxjs/toolkit`, `react-redux` | **화면(클라이언트) 상태** 전역 관리 | 05장: 로그인 여부, 사용자 정보 |

> 💡 **React Query와 Redux 역할 구분**
> - 서버에서 가져온 데이터(목록 등) → React Query
> - 서버와 상관없이 앱이 기억해야 하는 값(로그인 여부 등) → Redux

## 5. 폴더 구조

```
src/
├─ api/          # 백엔드 API 호출 함수 (axios)
├─ components/   # 여러 화면에서 재사용하는 UI 조각
├─ hooks/        # 커스텀 훅 (React Query 훅 등)
└─ pages/        # 화면(페이지) 단위 컴포넌트
```

이후 장에서 `store/`(Redux), `types/`(타입 정의) 폴더가 추가된다.

## 6. env 파일 생성

프로젝트 루트에 4개 파일을 만든다. (내용은 02장에서 채운다)

```
.env.development
.env.localhost
.env.production
.env.staging
```

## 7. 프록시 설정 (초안)

```ts
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:8080', // 백엔드 주소
    },
  },
})
```

> ⚠️ 이 초안으로는 실제 API 호출이 실패한다. 백엔드 경로에는 `/api`가 없기 때문이다.
> → **02장**에서 `rewrite`를 추가해 수정한다.

## 8. GitHub 저장소 연결

GitHub에서 빈 저장소(README만 있어도 됨)를 만든 뒤:

```bash
git init
git remote add origin https://github.com/plandosee/my-sap-web.git
git fetch origin

# 원격에 이미 커밋(README 등)이 있으면, 원격 커밋을 기준으로 삼는다 (작업 파일은 그대로 유지됨)
git reset origin/main

git add -A
git commit -m "작업 내용"
git push -u origin main     # -u : 이후로는 git push 만 입력해도 됨
```

저장소 이름을 바꿨을 때:

```bash
git remote set-url origin https://github.com/plandosee/새이름.git
git remote -v   # 바뀐 주소 확인
```

> `LF will be replaced by CRLF` 경고는 Windows 줄바꿈 변환 안내일 뿐 문제 없다.
> `node_modules/`는 `.gitignore`로 제외되므로, 다른 PC에서 받으면 `npm install`부터 실행한다.
