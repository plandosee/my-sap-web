// [7장] 작업자 관리 페이지
// - 구조는 06장 NonProcsPage 와 같다. 다른 점만 주석으로 표시.
//   ① 검색/표에 공통코드(직위) 사용
//   ② "더보기" 페이징 (useInfiniteQuery)

import { useState, type FormEvent } from 'react'
import CodeSelect from '../../components/CodeSelect'
import { useCommonCode } from '../../hooks/useCommonCode'
import { useDeleteOprtr, useOprtrList } from '../../hooks/useOprtr'
import { CODE_GROUP } from '../../types/code'
import type { Oprtr, OprtrSearch } from '../../types/oprtr'
import OprtrFormModal from './OprtrFormModal'

const INITIAL_SEARCH: OprtrSearch = { oprtrNm: '', oprtrJbpsCd: '', useYn: '' }

export default function OprtrPage() {
  const [searchInput, setSearchInput] = useState<OprtrSearch>(INITIAL_SEARCH)
  const [search, setSearch] = useState<OprtrSearch>(INITIAL_SEARCH)
  const [modal, setModal] = useState<{ target: Oprtr | null } | null>(null)

  // ② useInfiniteQuery 결과
  //   rows: 지금까지 불러온 모든 행 / hasNextPage: 더 있는지 / fetchNextPage: 다음 10건
  const {
    rows,
    totalCount,
    isPending,
    isError,
    error,
    isFetching,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
  } = useOprtrList(search)
  const deleteMutation = useDeleteOprtr()

  // ① 표에 직위코드 대신 직위명을 표시하기 위해 사용
  //   (CodeSelect 안에서도 같은 코드를 조회하지만, 쿼리 키가 같아서 API는 한 번만 호출됨)
  const { getCodeName } = useCommonCode(CODE_GROUP.OPRTR_JBPS)

  const handleSearch = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (JSON.stringify(searchInput) === JSON.stringify(search)) {
      refetch()
    } else {
      setSearch({ ...searchInput })
    }
  }

  const handleDelete = (row: Oprtr) => {
    if (!confirm(`[${row.oprtrNm}] 작업자를 삭제하시겠습니까?`)) return

    deleteMutation.mutate(row.oprtrId, {
      onSuccess: () => alert('삭제되었습니다.'),
      onError: (err) => alert(err.message),
    })
  }

  return (
    <section>
      <h1 className="page-title">작업자 관리</h1>

      {/* ───── 검색 영역 ───── */}
      <form className="search-bar" onSubmit={handleSearch}>
        <label className="form-field">
          <span>이름</span>
          <input
            value={searchInput.oprtrNm}
            onChange={(e) => setSearchInput((prev) => ({ ...prev, oprtrNm: e.target.value }))}
            placeholder="일부만 입력해도 검색"
          />
        </label>
        <label className="form-field">
          <span>직위</span>
          {/* ① 공통코드 콤보박스 (검색용: 빈 항목 = 전체) */}
          <CodeSelect
            codeGroup={CODE_GROUP.OPRTR_JBPS}
            value={searchInput.oprtrJbpsCd}
            onChange={(codeId) => setSearchInput((prev) => ({ ...prev, oprtrJbpsCd: codeId }))}
            emptyLabel="전체"
          />
        </label>
        <label className="form-field">
          <span>사용여부</span>
          <select
            value={searchInput.useYn}
            onChange={(e) =>
              setSearchInput((prev) => ({ ...prev, useYn: e.target.value as OprtrSearch['useYn'] }))
            }
          >
            <option value="">전체</option>
            <option value="Y">사용</option>
            <option value="N">미사용</option>
          </select>
        </label>
        <button type="submit" className="btn btn-primary" disabled={isFetching}>
          {isFetching && !isFetchingNextPage ? '조회 중...' : '조회'}
        </button>
      </form>

      {/* ───── 툴바 ───── */}
      <div className="toolbar">
        <span>
          {/* ② 불러온 건수 / 전체 건수 */}
          <strong>{rows.length}</strong> / 총 <strong>{totalCount}</strong>건
        </span>
        <button type="button" className="btn btn-primary" onClick={() => setModal({ target: null })}>
          등록
        </button>
      </div>

      {isError && <p className="message-error">{error.message}</p>}

      {/* ───── 목록 표 ───── */}
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: 100 }}>작업자코드</th>
              <th>이름</th>
              <th style={{ width: 100 }}>직위</th>
              <th style={{ width: 120 }}>생년월일</th>
              <th style={{ width: 140 }}>전화번호</th>
              <th style={{ width: 70 }}>정렬</th>
              <th style={{ width: 90 }}>사용여부</th>
              <th>비고</th>
              <th style={{ width: 130 }}>관리</th>
            </tr>
          </thead>
          <tbody>
            {isPending ? (
              <tr>
                <td colSpan={9} className="empty">
                  불러오는 중...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={9} className="empty">
                  조회된 데이터가 없습니다.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.oprtrId}>
                  <td className="center">{row.oprtrId}</td>
                  <td>{row.oprtrNm}</td>
                  {/* ① 코드 → 이름 */}
                  <td className="center">{getCodeName(row.oprtrJbpsCd)}</td>
                  <td className="center">{row.oprtrBrdt}</td>
                  <td className="center">{row.oprtrTelno}</td>
                  <td className="center">{row.sort}</td>
                  <td className="center">
                    <span className={row.useYn === 'Y' ? 'badge badge-on' : 'badge badge-off'}>
                      {row.useYn === 'Y' ? '사용' : '미사용'}
                    </span>
                  </td>
                  <td>{row.rmrk}</td>
                  <td className="center">
                    <div className="row-actions">
                      <button type="button" className="btn btn-sm" onClick={() => setModal({ target: row })}>
                        수정
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-danger"
                        onClick={() => handleDelete(row)}
                        disabled={deleteMutation.isPending}
                      >
                        삭제
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ② 더보기: 다음 페이지가 있을 때만 표시 */}
      {hasNextPage && (
        <div className="load-more">
          <button
            type="button"
            className="btn"
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
          >
            {isFetchingNextPage ? '불러오는 중...' : '더보기'}
          </button>
        </div>
      )}

      {modal && <OprtrFormModal target={modal.target} onClose={() => setModal(null)} />}
    </section>
  )
}
