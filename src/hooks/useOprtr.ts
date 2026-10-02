// [7장] 작업자 React Query 훅
//
// ■ useInfiniteQuery ("더보기" / 무한 스크롤용)
//   useQuery  : data = 응답 1개
//   useInfiniteQuery : data.pages = [1페이지 응답, 2페이지 응답, ...]  ← fetchNextPage()로 계속 추가
//
//   흐름:
//   1) 처음: queryFn({ pageParam: initialPageParam(0) })     → lastIdx 없이 10건
//   2) getNextPageParam(마지막 응답) → 마지막 행의 rnum(10) 을 "다음 pageParam"으로 돌려줌
//   3) [더보기] → fetchNextPage() → queryFn({ pageParam: 10 }) → rnum > 10 인 10건
//   4) 더 없으면 getNextPageParam 이 undefined → hasNextPage = false → [더보기] 숨김

import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query'
import { OPRTR_PER_PAGE, oprtrApi } from '../api/oprtrApi'
import type { OprtrForm, OprtrSearch } from '../types/oprtr'

export const oprtrKeys = {
  all: ['oprtr'] as const,
  list: (search: OprtrSearch) => [...oprtrKeys.all, 'list', search] as const,
}

/** 작업자 목록 ("더보기") */
export function useOprtrList(search: OprtrSearch) {
  const query = useInfiniteQuery({
    queryKey: oprtrKeys.list(search),
    // pageParam: 이번에 가져올 페이지의 기준값 = 이전 목록의 마지막 rnum
    queryFn: ({ pageParam }) => oprtrApi.retrieveList(search, pageParam),
    // 첫 페이지의 pageParam (0 = 처음부터)
    initialPageParam: 0,
    // 다음 페이지의 pageParam을 계산. undefined를 돌려주면 "더 없음"
    getNextPageParam: (lastPage, allPages) => {
      const lastRows = lastPage.data.contents
      const loadedCount = allPages.reduce((sum, page) => sum + page.data.contents.length, 0)
      const totalCount = lastPage.data.pagination.totalCount

      // 이번에 perPage보다 적게 왔거나, 전체 건수만큼 다 받았으면 끝
      if (lastRows.length < OPRTR_PER_PAGE || loadedCount >= totalCount) return undefined
      return lastRows[lastRows.length - 1].rnum
    },
    placeholderData: keepPreviousData,
  })

  // 화면에서 쓰기 편하게 가공: 여러 페이지의 행을 한 배열로 합친다
  const rows = query.data?.pages.flatMap((page) => page.data.contents) ?? []
  // 전체 건수는 첫 페이지 응답 기준
  const totalCount = query.data?.pages[0]?.data.pagination.totalCount ?? 0

  return { ...query, rows, totalCount }
}

/**
 * 등록 / 수정 (06장 useSaveNonProcs와 같은 구조)
 * - invalidateQueries 하면 지금까지 불러온 페이지 수만큼 다시 조회된다.
 */
export function useSaveOprtr() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (form: OprtrForm) => (form.oprtrId ? oprtrApi.update(form) : oprtrApi.insert(form)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: oprtrKeys.all }),
  })
}

/** 삭제 */
export function useDeleteOprtr() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (oprtrId: string) => oprtrApi.delete(oprtrId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: oprtrKeys.all }),
  })
}
