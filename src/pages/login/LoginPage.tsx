// [5장] 로그인 페이지
//
// ■ 화면 흐름
//   1. 아이디/비밀번호 입력 → [로그인] 클릭(또는 Enter)
//   2. 프론트 검증: 빈 값이면 서버 호출 없이 안내
//   3. useLogin().mutate() → /loginProcess.do
//      - 성공: 토큰 저장 + Redux 로그인 상태 (hooks/useAuth.ts)
//              → Redux 값이 바뀌면 이 컴포넌트가 다시 그려지고, 맨 위 isLoggedIn 검사에서 이동
//      - 실패: login.error.message 를 화면에 표시 (예: "비밀번호가 맞지 않습니다.")
//
// ■ 제어 컴포넌트(controlled component)
//   <input value={userId} onChange={...}> 처럼 입력값을 React state로 관리하는 방식.
//   입력할 때마다 state가 바뀌고, 화면은 state를 그대로 보여준다.

import { useState, type FormEvent } from 'react'
import { Navigate, useLocation } from 'react-router'
import { useLogin } from '../../hooks/useAuth'
import { useAppSelector } from '../../store/hooks'
import type { LoginLocationState } from '../../types/auth'

export default function LoginPage() {
  // ProtectedRoute / setupAuth 가 넘겨준 정보 (원래 가려던 주소, 만료 여부)
  const location = useLocation()
  const { from, expired } = (location.state ?? {}) as LoginLocationState

  const isLoggedIn = useAppSelector((state) => state.auth.isLoggedIn)
  const login = useLogin()

  // 입력값 상태
  const [userId, setUserId] = useState('')
  const [password, setPassword] = useState('')
  // 프론트 검증 메시지 (서버 에러 메시지와 구분)
  const [validationMessage, setValidationMessage] = useState('')

  // 이미 로그인 상태면(로그인 성공 직후 포함) 원래 가려던 페이지로 보낸다.
  if (isLoggedIn) {
    return <Navigate to={from ?? '/non-procs'} replace />
  }

  /** 폼 제출 (버튼 클릭 또는 입력칸에서 Enter) */
  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    // form의 기본 동작(페이지 새로고침)을 막는다. 이게 없으면 화면이 새로고침되어 버린다.
    e.preventDefault()

    // 프론트 검증: 서버에 보내기 전에 간단한 것은 미리 걸러낸다.
    if (!userId.trim()) {
      setValidationMessage('아이디를 입력해 주세요.')
      return
    }
    if (!password) {
      setValidationMessage('비밀번호를 입력해 주세요.')
      return
    }
    setValidationMessage('')

    login.mutate({ userId: userId.trim(), password })
  }

  // 화면에 보여줄 메시지 (우선순위: 프론트 검증 > 서버 에러 > 만료 안내)
  const errorMessage = validationMessage || login.error?.message
  const infoMessage = !errorMessage && expired ? '로그인이 만료되었습니다. 다시 로그인해 주세요.' : ''

  return (
    <div className="page-center">
      <form className="login-box" onSubmit={handleSubmit}>
        <h1 className="login-title">{import.meta.env.VITE_APP_TITLE}</h1>

        <label className="form-field">
          <span>아이디</span>
          <input
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            autoComplete="username"
            autoFocus
          />
        </label>

        <label className="form-field">
          <span>비밀번호</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </label>

        {errorMessage && <p className="message-error">{errorMessage}</p>}
        {infoMessage && <p className="message-info">{infoMessage}</p>}

        {/* 요청 중에는 버튼을 막아서 중복 클릭(중복 요청)을 방지 */}
        <button type="submit" className="btn btn-primary btn-block" disabled={login.isPending}>
          {login.isPending ? '로그인 중...' : '로그인'}
        </button>
      </form>
    </div>
  )
}
