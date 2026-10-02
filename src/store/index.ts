// [4장] Redux 저장소(store) 생성
// - 앱 전체에서 단 하나만 존재하는 전역 상태 저장소.
// - 기능이 늘어나면 reducer 안에 슬라이스를 추가한다. 예) menu: menuReducer

import { configureStore } from '@reduxjs/toolkit'
import authReducer from './authSlice'

export const store = configureStore({
  reducer: {
    auth: authReducer, // → state.auth 로 접근
  },
})

// 저장소 전체 상태의 타입: { auth: AuthState }
// (store를 보고 자동으로 계산되므로 슬라이스를 추가해도 고칠 필요 없음)
export type RootState = ReturnType<typeof store.getState>

// dispatch 함수의 타입
export type AppDispatch = typeof store.dispatch
