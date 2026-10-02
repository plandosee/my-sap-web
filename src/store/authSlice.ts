// [4장] 로그인 상태 슬라이스 (Redux Toolkit)
//
// ■ 슬라이스(slice)란?
//   Redux 저장소를 기능별로 나눈 "한 조각". 상태(state) + 상태를 바꾸는 함수(reducers)를 한 파일에 둔다.
//   예) state.auth.isLoggedIn  ← 이 파일이 관리하는 부분
//
// ■ 왜 로그인 상태를 Redux에 두나?
//   상단 메뉴(사용자 표시), 로그인 페이지, 보호 라우트 등 "여러 화면"이 같은 값을 봐야 하기 때문.
//   서버에서 가져온 목록 데이터는 Redux가 아니라 React Query가 담당한다(06장).

import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import { tokenStorage } from '../api/tokenStorage'

/** 로그인 상태의 모양 */
export interface AuthState {
  /** 로그인 여부 */
  isLoggedIn: boolean
  /** 로그인한 사용자 ID (05장에서 로그인 시 채움) */
  userId: string | null
}

/**
 * 초기 상태
 * - 새로고침하면 Redux 상태는 초기화된다.
 * - 그래서 localStorage에 토큰이 남아 있으면 "로그인된 상태"로 시작한다.
 *   (토큰이 실제로 유효한지는 다음 API 호출 때 서버가 판단 → 만료면 03장 인터셉터가 처리)
 */
const initialState: AuthState = {
  isLoggedIn: tokenStorage.get() !== null,
  userId: tokenStorage.getUserId(), // [5장] 새로고침 후에도 사용자 ID 유지
}

const authSlice = createSlice({
  name: 'auth', // 액션 이름 앞에 붙는 접두어: 'auth/loginSuccess'
  initialState,
  reducers: {
    // ※ Redux Toolkit은 내부적으로 Immer를 사용해서
    //   state.xxx = 값  처럼 "직접 바꾸는 것처럼" 써도 불변성을 지켜준다.

    /** 로그인 성공: dispatch(loginSuccess('admin')) */
    loginSuccess(state, action: PayloadAction<string>) {
      state.isLoggedIn = true
      state.userId = action.payload
    },

    /** 로그아웃 / 인증 만료: dispatch(logout()) */
    logout(state) {
      state.isLoggedIn = false
      state.userId = null
    },
  },
})

// 화면에서 dispatch(loginSuccess(...)) 로 사용할 액션 생성 함수
export const { loginSuccess, logout } = authSlice.actions

// store/index.ts 에 등록할 리듀서
export default authSlice.reducer
