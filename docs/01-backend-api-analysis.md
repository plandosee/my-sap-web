# 01. 백엔드 API 분석

## 목표

프론트 코드를 짜기 전에 **백엔드가 무엇을 받고 무엇을 돌려주는지** 먼저 정리한다.
신규 프로젝트에서도 항상 이 단계부터 한다. (API 명세서가 없으면 백엔드 소스를 직접 읽는다)

## 분석 대상 소스 (`C:\mango\mes\server\mes_server\src\main`)

| 무엇을 보는가 | 파일 | 확인할 내용 |
|---|---|---|
| URL, 파라미터 검증 | `java/.../nonProcs/controller/NonProcsController.java` | 경로, 필수값, 응답 형태 |
| | `java/.../oprtr/controller/OprtrController.java` | |
| 실제 SQL | `resources/mapper/nonProcs.xml`, `oprtr.xml` | 컬럼명, 조건, 페이징 방식 |
| 응답 공통 형식 | `java/.../support/spring/BaseController.java`, `BaseConstant.java` | `result`, `code`, `message` |
| 인증 | `java/.../SecurityConfig.java`, `support/jwt/CustomUrlFilter.java`, `JwtUtil.java` | 로그인 필요 경로, 토큰 방식 |
| 로그인 | `java/.../login/LoginController.java` | 로그인/로그아웃 URL, 파라미터 |
| 공통코드 | `java/.../codeMast/controller/CodeMastController.java` | 콤보박스 데이터 |

> 💡 **분석 팁**: Controller → Service → Mapper(XML) 순서로 따라가면 된다.
> MyBatis 설정 `map-underscore-to-camel-case: true` 때문에 DB 컬럼 `non_procs_nm`은 JSON에서 `nonProcsNm`으로 나온다.

---

## 1. 공통 규칙

### 1-1. 요청 방식: POST + form 데이터

모든 Controller가 `@PostMapping` + `@RequestParam Map<String, Object> param` 형태다.

```java
@PostMapping("/retrieveList.do")
public Map<String, Object> retrieveList(@RequestParam Map<String, Object> param)
```

- `@RequestParam`은 **쿼리스트링 또는 form 데이터**(`application/x-www-form-urlencoded`)를 받는다.
- ⚠️ JSON(`application/json`)으로 보내면 **값이 비어서 도착**한다. (`@RequestBody`일 때만 JSON)
- → 03장에서 axios가 form 형식으로 보내도록 설정한다.

### 1-2. 응답 형식

**성공**
```json
{ "result": true, "code": "00", "message": "SUCCESS", ...데이터 }
```

**실패**
```json
{ "result": false, "code": "FailToRegist", "message": "실패 사유" }
```

> ⚠️ **실패해도 HTTP 상태코드는 200**이다.
> axios는 200이면 "성공"으로 보기 때문에, **`result`가 `false`인지 직접 검사**해야 한다. → 03장 인터셉터에서 공통 처리

### 1-3. 인증 상태에 따른 응답 (직접 호출해서 확인한 결과)

| 상황 | HTTP 상태 | 본문 |
|---|---|---|
| 토큰 없이 `/admin/**` 호출 | **200** | **빈 문자열** |
| 잘못된/만료된 토큰 (refresh 쿠키도 없음) | 401 | 에러 코드 문자열 |
| 정상 토큰 | 200 | JSON |

> ⚠️ "200인데 본문이 비어 있으면 로그인이 안 된 것"으로 처리해야 한다.

---

## 2. 로그인 / 토큰

`SecurityConfig.java`에서 `"/*"`(한 단계 경로: `/loginProcess.do`, `/logout.do`)는 누구나 접근 가능하고, **나머지(`/admin/**` 등)는 인증 필요**다.

### 2-1. 로그인 `POST /loginProcess.do`

| 파라미터 | 설명 |
|---|---|
| `userId` | 사용자 ID |
| `password` | 비밀번호 |

**성공 응답**
```json
{ "result": true, "code": "00", "message": "SUCCESS", "accessToken": "eyJ..." }
```
- 본문의 `accessToken`을 저장해 두었다가 요청마다 헤더에 붙인다:
  `Authorization: Bearer {accessToken}`
- 동시에 **`wmsRefreshToken` 쿠키**(HttpOnly, 7일)가 발급된다. JS로 읽을 수 없고 브라우저가 자동으로 보낸다.

**실패 응답 예**: `code`가 `UserNotFound`(사용자 없음), `PasswordUnauthorized`(비밀번호 오류)

### 2-2. 토큰 자동 갱신 (서버 쪽에서 처리)

access 토큰 유효시간은 **30분**이다. 만료된 토큰으로 요청하면 `CustomUrlFilter`가:

1. `wmsRefreshToken` 쿠키가 유효하면 → 요청은 정상 처리하고, **새 access 토큰을 응답 헤더 `Authorization`에 담아 보낸다** (`Bearer ` 접두어 없이 토큰만)
2. 쿠키가 없거나 만료면 → 401

→ 프론트는 **응답 헤더에 `authorization`이 있으면 저장된 토큰을 교체**하면 된다. (03장)

### 2-3. 로그아웃 `POST /logout.do`

헤더의 토큰(Redis)과 refresh 쿠키(DB)를 삭제한다. 파라미터 없음.

---

## 3. 비공정 API (`/admin/nonProcs`)

테이블: `non_procs` / PK: `nonProcsId` (`NP0001` 형식, 등록 시 서버에서 자동 채번)

### 3-1. 목록 `POST /admin/nonProcs/retrieveList.do`

| 파라미터 | 필수 | 설명 |
|---|---|---|
| `nonProcsNm` | | 비공정명 (부분 검색, LIKE) |
| `useYn` | | 사용여부 `Y`/`N` |
| `perPage` | | 가져올 건수 (없으면 전체) |
| `lastIdx` | | 이전 목록 마지막 행 JSON 문자열 `{"rnum":10}` (더보기용) |

**응답** (값은 예시, 필드 구성은 `nonProcs.xml`의 select 컬럼 기준)
```json
{
  "result": true, "code": "00", "message": "SUCCESS",
  "data": {
    "contents": [
      { "pkIdx": "NP0001", "nonProcsId": "NP0001", "nonProcsNm": "점심시간", "sort": 1,
        "useYn": "Y", "rmrk": "", "rgtr": "admin", "regDt": "2025-01-01 09:00:00",
        "chnrg": "admin", "chgDt": "2025-01-02 10:00:00", "rnum": 1 }
    ],
    "pagination": { "page": 1, "totalCount": 25 }
  }
}
```

### 3-2. 등록 `POST /admin/nonProcs/insert.do`

| 파라미터 | 필수 | 검증 |
|---|---|---|
| `nonProcsNm` | ✅ | 최대 50자 |
| `sort` | | 정수, 0 이상 (없으면 서버가 max+1) |
| `useYn` | | ⚠️ 아래 주의사항 참고 |
| `rmrk` | | 비고 |

응답: `{ "result": true, "count": 1, ... }`

### 3-3. 수정 `POST /admin/nonProcs/update.do`

등록 파라미터 + `nonProcsId`(✅ 필수, 정확히 6자)

### 3-4. 삭제 `POST /admin/nonProcs/delete.do`

| 파라미터 | 필수 | 설명 |
|---|---|---|
| `nonProcsId` | ✅ | 6자 |

실제로 지우지 않고 `del_yn = 'Y'`로 바꾼다(논리 삭제). 목록 조회는 `del_yn != 'Y'`만 보여준다.

---

## 4. 작업자 API (`/admin/oprtr`)

테이블: `oprtr` / PK: `oprtrId` (`OP0001` 형식, 서버에서 자동 채번)

### 4-1. 목록 `POST /admin/oprtr/retrieveList.do`

| 파라미터 | 설명 |
|---|---|
| `oprtrId` | 작업자코드 (정확히 일치) |
| `oprtrNm` | 이름 (부분 검색) |
| `oprtrJbpsCd` | 직위코드 |
| `useYn` | 사용여부 |
| `perPage`, `lastIdx` | 비공정과 동일 |

응답 `data.contents[]` 필드: `oprtrId`, `oprtrNm`, `oprtrBrdt`(생년월일), `oprtrTelno`(전화번호), `oprtrJbpsCd`(직위코드), `useYn`, `rmrk`, `sort`, `rgtr`, `regDt`, `chnrg`, `chgDt`, `rnum`

### 4-2. 등록 `POST /admin/oprtr/insert.do`

| 파라미터 | 필수 | 검증 |
|---|---|---|
| `oprtrNm` | ✅ | 최대 20자 |
| `oprtrJbpsCd` | ✅ | 정확히 6자 (공통코드 `OJBPS`) |
| `oprtrBrdt` | | 날짜 |
| `oprtrTelno` | | 전화번호 |
| `sort` | | 정수 |
| `useYn` | (사실상 필수) | `Y`/`N` 그대로 저장 |
| `rmrk` | | 비고 |

### 4-3. 수정 `POST /admin/oprtr/update.do`

등록 파라미터 + `oprtrId`(✅ 필수, 6자)

### 4-4. 삭제 `POST /admin/oprtr/delete.do`

⚠️ `oprtrId`와 `opdrtId`를 **둘 다** 보내야 한다. (아래 주의사항)

---

## 5. 공통코드 API (작업자 직위 콤보박스용)

`POST /admin/codeMast/selectCode.do`

| 파라미터 | 값 |
|---|---|
| `codeGroup` | `OJBPS` (작업자 직위) |
| `active` | `ACTIVE` |

응답: `{ "result": true, "resultList": [ { "codeId": "...", "codeName": "...", "codeSeq": 1, ... } ] }`

---

## 6. ⚠️ 백엔드 주의사항 (소스를 읽어야만 알 수 있는 것들)

실무에서도 이런 "문서에 없는 동작"이 자주 있다. 그래서 백엔드 소스/SQL을 직접 확인하는 습관이 중요하다.

| # | 내용 | 원인 (소스 위치) | 프론트 대응 |
|---|---|---|---|
| 1 | 비공정 `useYn`에 `'N'`을 보내도 `'Y'`로 저장됨 | `nonProcs.xml` insert/update: 값이 **비어있지 않으면** 무조건 `'Y'` | 미사용은 **빈 문자열 `''`** 로 보낸다 |
| 2 | 작업자 삭제 시 `oprtrId`만 보내면 실패 | `OprtrController.delete()`가 오타 필드 `opdrtId`를 필수 검사, SQL은 `oprtrId` 사용 | 두 값을 **모두** 보낸다 |
| 3 | `page=2`를 보내도 항상 처음부터 조회됨 | SQL에 offset이 없고 `lastIdx.rnum` 이후 + `limit perPage` 방식 | "더보기" 방식으로 `lastIdx` 사용 |
| 4 | 토큰 없으면 200 + 빈 본문 | `SecurityConfig` 인증 실패 핸들러가 상태 200일 때 아무것도 안 씀 | 빈 본문이면 로그인 페이지로 |
| 5 | 실패도 HTTP 200 | `BaseController.getErrorResult()` | `result === false` 검사 |
| 6 | 수정 시 `sort`를 비우면 맨 뒤로 이동 | `update`: sort 없으면 `max(sort)+1` | 수정 폼에 기존 sort 값을 채워서 보낸다 |
| 7 | 생년월일·전화번호 형식이 틀려도 저장됨 (07장에서 발견) | `ValidationModel.validateCheck()`의 `STRING_DATE`/`STRING_TEL`/`YN`/`STRING_FORMAT` 분기가 `ValidateException.getCodeException(...)`을 **만들기만 하고 `throw`하지 않음** | 프론트에서 형식 검증 필수 (생년월일 `yyyy-MM-dd`, 전화번호 `숫자-숫자`) |
| 8 | 같은 백엔드라도 API마다 `useYn` 처리가 다름 | 비공정은 "값 있으면 Y", 작업자는 `#{useYn}` 그대로 저장 | API별로 SQL 확인. 변환은 각 `xxxApi.ts`에서 |
