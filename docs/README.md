# SAP to Web 프로젝트 – React + 백엔드 API 연동 튜토리얼

> 목표: **SAP – 백엔드 API – React** 구조의 웹을 신규 구축하는 연습.
> 연습용으로 기존 MES 백엔드(`C:\mango\mes\server`)의 API 일부를 사용한다.
> 이 문서만 보고 AI 도움 없이 처음부터 다시 만들 수 있도록 작성한다.

## 전체 구조

```
[브라우저: React (localhost:5173)]
        │  /api/...  (axios)
        ▼
[vite 개발서버 프록시]  ── /api 제거 ──▶  [Spring Boot 백엔드 (localhost:8080)]
                                                  │
                                                  ▼
                                    [DB (PostgreSQL) / Redis]   ← 실무에서는 여기에 SAP(RFC/OData) 연동
```

## 목차

| 장 | 제목 | 핵심 내용 | 상태 |
|---|---|---|---|
| 00 | [환경설정](./00-environment-setup.md) | Node, Vite 프로젝트 생성, 라이브러리 설치, 폴더 구조 | ✅ |
| 01 | [백엔드 API 분석](./01-backend-api-analysis.md) | 요청/응답 형식, 로그인·토큰 방식, 백엔드 주의사항 | ✅ |
| 02 | [프록시 & 환경변수](./02-proxy-and-env.md) | vite 프록시 `/api` 제거, `.env` 모드별 설정 | ✅ |
| 03 | [axios 공통 설정](./03-axios-setup.md) | 공통 인스턴스, form 전송, 토큰 자동 첨부, 공통 에러 처리 | ✅ |
| 04 | [앱 뼈대](./04-app-skeleton.md) | React Router, React Query, Redux(로그인 상태), 공통 레이아웃 | ✅ |
| 05 | [로그인 / 로그아웃](./05-login-logout.md) | 로그인 페이지, 보호 라우트, 인증 만료 자동 처리 | ✅ |
| 06 | [비공정 CRUD](./06-non-procs-crud.md) | 목록/검색/등록/수정/삭제, 공통 팝업, CRUD 4단계 패턴 | ✅ |
| 07 | [공통코드 + 작업자 CRUD](./07-oprtr-crud.md) | 공통코드 콤보박스, `useInfiniteQuery` "더보기", API별 특이점 | ✅ |
| 08 | [정리 & 실무 적용](./08-summary-and-practice.md) | 전체 구조, 새 화면 체크리스트, SAP 적용 포인트, 운영 배포 | ✅ |

## 각 장 문서 읽는 법

모든 장은 같은 순서로 구성한다.

1. **목표** – 이 장에서 무엇을 만드는지
2. **변경 범위** – 새로 만든 파일 / 수정한 파일 목록
3. **따라하기** – 순서대로 코드 작성
4. **확인하기** – 제대로 됐는지 확인하는 방법
5. **정리 / 자주 하는 실수**

## 실행 방법 요약

```bash
# 백엔드(C:\mango\mes\server)를 먼저 8080 포트로 실행한 뒤
npm run dev:local     # 로컬 백엔드(localhost:8080)에 연결해서 실행
# 브라우저: http://localhost:5173
```
