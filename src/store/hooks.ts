// [4장] 타입이 지정된 Redux 훅
// - react-redux의 useSelector / useDispatch 를 그대로 쓰면 매번 타입을 붙여야 한다.
//     useSelector((state: RootState) => state.auth.isLoggedIn)
// - 아래 훅을 쓰면 state 타입이 자동으로 들어간다.
//     useAppSelector((state) => state.auth.isLoggedIn)   ← state에 자동완성됨
// - 화면에서는 항상 이 파일의 훅을 사용한다.

import { useDispatch, useSelector } from 'react-redux'
import type { AppDispatch, RootState } from './index'

export const useAppDispatch = useDispatch.withTypes<AppDispatch>()
export const useAppSelector = useSelector.withTypes<RootState>()
