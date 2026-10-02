// [4장] 앱 진입점
// - index.html 의 <div id="root"> 에 React 앱을 그린다.
// - 앱 전체에서 쓰는 도구(Provider)들을 여기서 한 번만 감싸 준다.
//
//   <Provider store>               ← Redux: 어디서든 useAppSelector / useAppDispatch 사용 가능
//     <QueryClientProvider>        ← React Query: 어디서든 useQuery / useMutation 사용 가능
//       <RouterProvider router />  ← React Router: 주소에 맞는 페이지 표시
//
// ※ 순서: 페이지(Router 안쪽)에서 Redux와 React Query를 둘 다 쓰므로 Router가 가장 안쪽에 온다.

import { QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { RouterProvider } from 'react-router'
import { queryClient } from './api/queryClient'
import './index.css'
import { router } from './router'
import { setupAuth } from './setupAuth'
import { store } from './store'

// [5장] 인증 만료 시 동작(로그아웃 + 로그인 페이지 이동)을 axios 인터셉터에 등록
// 화면을 그리기 전에, 앱 시작 시 딱 한 번 실행한다.
setupAuth()

createRoot(document.getElementById('root')!).render(
  // StrictMode: 개발 모드에서만 잠재적인 문제를 찾기 위해 일부 동작을 2번씩 실행한다.
  // (개발 중 API가 2번 호출되는 것처럼 보여도 정상. 빌드하면 1번만 실행됨)
  <StrictMode>
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </Provider>
  </StrictMode>,
)
