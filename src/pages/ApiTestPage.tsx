// [3장] axios 공통 설정 확인용 "임시" 페이지
// - 로그인 화면이 생기기 전에, 인터셉터가 경우별로 올바른 ApiError를 만드는지 확인한다.
// - 04장에서 라우터를 만들면서 이 페이지는 삭제한다.

import { useState } from 'react'
import { ApiError } from '../api/ApiError'
import { post } from '../api/client'
import { tokenStorage } from '../api/tokenStorage'
import type { ApiResult } from '../types/api'

/** 테스트 1건의 결과 */
interface TestLog {
  title: string
  expected: string
  actual: string
  ok: boolean
}

export default function ApiTestPage() {
  const [logs, setLogs] = useState<TestLog[]>([])

  /**
   * API를 호출해서 "어떤 결과가 나왔는지"를 기록한다.
   * @param title    테스트 이름
   * @param expected 기대하는 에러코드 (성공을 기대하면 'SUCCESS')
   * @param call     실행할 API 호출
   */
  const runTest = async (title: string, expected: string, call: () => Promise<ApiResult>) => {
    let actual: string
    try {
      const res = await call()
      actual = res.result ? 'SUCCESS' : `result=false (${res.code})`
    } catch (e) {
      // client.ts 인터셉터 덕분에, 어떤 실패든 ApiError로 들어온다.
      actual = e instanceof ApiError ? `${e.code} / ${e.message}` : `알 수 없는 에러: ${String(e)}`
    }
    const ok = actual.startsWith(expected)
    setLogs((prev) => [{ title, expected, actual, ok }, ...prev])
  }

  return (
    <div style={{ padding: 24, textAlign: 'left', maxWidth: 900, margin: '0 auto' }}>
      <h1 style={{ fontSize: 24 }}>03장 axios 공통 설정 테스트</h1>
      <p>
        현재 저장된 토큰: <code>{tokenStorage.get() ?? '(없음)'}</code>
      </p>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '16px 0' }}>
        {/* 테스트 1: 토큰 없이 인증이 필요한 API 호출 → 200 + 빈 본문 → NOT_LOGIN */}
        <button
          onClick={() => {
            tokenStorage.clear()
            runTest('① 토큰 없이 비공정 목록', 'NOT_LOGIN', () =>
              post('/admin/nonProcs/retrieveList.do'),
            )
          }}
        >
          ① 토큰 없이 목록 조회
        </button>

        {/* 테스트 2: 가짜 토큰으로 호출 → 401 → UNAUTHORIZED (그리고 토큰이 삭제되어야 함) */}
        <button
          onClick={() => {
            tokenStorage.set('fake-token')
            runTest('② 가짜 토큰으로 비공정 목록', 'UNAUTHORIZED', () =>
              post('/admin/nonProcs/retrieveList.do'),
            )
          }}
        >
          ② 가짜 토큰으로 목록 조회
        </button>

        {/* 테스트 3: 로그인 API를 파라미터 없이 호출 → 200 + result:false → 백엔드 에러코드 */}
        <button
          onClick={() =>
            runTest('③ 파라미터 없이 로그인', 'InternalServerError', () => post('/loginProcess.do'))
          }
        >
          ③ 파라미터 없이 로그인
        </button>
      </div>

      <table border={1} cellPadding={6} style={{ borderCollapse: 'collapse', width: '100%' }}>
        <thead>
          <tr>
            <th>테스트</th>
            <th>기대값</th>
            <th>실제 결과</th>
            <th>판정</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log, i) => (
            <tr key={i}>
              <td>{log.title}</td>
              <td>{log.expected}</td>
              <td>{log.actual}</td>
              <td>{log.ok ? '✅' : '❌'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
