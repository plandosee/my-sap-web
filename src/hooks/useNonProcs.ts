// [6장] 비공정 React Query 훅
//
// ■ 쿼리 키(queryKey)란?
//   React Query가 캐시를 저장하는 "이름표". 배열로 만든다.
//     ['nonProcs', 'list', { nonProcsNm: '', useYn: 'Y' }]
//   - 키가 바뀌면(검색 조건 변경) → 자동으로 새로 조회한다.
//   - 키가 같으면 → 캐시된 데이터를 재사용한다.
//
// ■ 등록/수정/삭제 후 목록 새로고침: invalidateQueries
//   "이 이름표로 시작하는 캐시는 오래됐다"고 표시 → 화면에 보이는 목록이 자동으로 재조회된다.
//   ['nonProcs'] 로 무효화하면 ['nonProcs', 'list', ...] 전부가 대상이 된다.

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { nonProcsApi } from '../api/nonProcsApi'
import type { NonProcsForm, NonProcsSearch } from '../types/nonProcs'

/**
 * 쿼리 키 모음 (키를 문자열로 여기저기 직접 쓰면 오타가 나기 쉬워서 한 곳에 모아 둔다)
 * - as const: 배열을 "고정된 값"으로 취급 → 타입이 더 정확해진다.
 */
export const nonProcsKeys = {
  all: ['nonProcs'] as const,
  list: (search: NonProcsSearch) => [...nonProcsKeys.all, 'list', search] as const,
}

/**
 * 목록 조회
 * @param search 검색 조건. 값이 바뀌면 자동으로 재조회된다.
 *
 * 사용: const { data, isPending, isError, error, isFetching, refetch } = useNonProcsList(search)
 *   - isPending : 처음 조회 중 (아직 데이터가 한 번도 없음)
 *   - isFetching: 조회 중 (재조회 포함)
 *   - data      : 응답 본문 (ListResponse<NonProcs>)
 */
export function useNonProcsList(search: NonProcsSearch) {
  return useQuery({
    queryKey: nonProcsKeys.list(search),
    queryFn: () => nonProcsApi.retrieveList(search),
    // 검색 조건을 바꿔 재조회하는 동안, 빈 화면 대신 이전 목록을 계속 보여준다(깜빡임 방지)
    placeholderData: keepPreviousData,
  })
}

/**
 * 등록 / 수정
 * - form.nonProcsId 가 비어 있으면 등록, 있으면 수정
 * - 성공하면 비공정 목록 캐시를 무효화 → 목록 자동 새로고침
 */
export function useSaveNonProcs() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (form: NonProcsForm) =>
      form.nonProcsId ? nonProcsApi.update(form) : nonProcsApi.insert(form),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: nonProcsKeys.all }),
  })
}

/** 삭제 */
export function useDeleteNonProcs() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (nonProcsId: string) => nonProcsApi.delete(nonProcsId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: nonProcsKeys.all }),
  })
}
