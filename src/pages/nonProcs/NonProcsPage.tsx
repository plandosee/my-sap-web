// [6장] 비공정 관리 페이지 (검색 + 목록 + 등록/수정/삭제)
//
// ■ 화면 구성
//   [검색 영역] 비공정명, 사용여부, [조회]
//   [툴바]      총 N건, [등록]
//   [목록 표]   코드 | 비공정명 | 정렬 | 사용여부 | 비고 | 수정자 | 수정일시 | [수정][삭제]
//   [팝업]      NonProcsFormModal (등록/수정)
//
// ■ 검색 상태를 2개로 나누는 이유
//   - searchInput: 입력칸에 "타이핑 중인" 값 (글자 칠 때마다 바뀜)
//   - search     : [조회]를 눌렀을 때 "확정된" 값 → 쿼리 키로 사용
//   하나로 쓰면 글자 하나 칠 때마다 API가 호출된다.

import { useState, type FormEvent } from 'react'
import { useDeleteNonProcs, useNonProcsList } from '../../hooks/useNonProcs'
import type { NonProcs, NonProcsSearch } from '../../types/nonProcs'
import NonProcsFormModal from './NonProcsFormModal'

/** 검색 조건 초기값 */
const INITIAL_SEARCH: NonProcsSearch = { nonProcsNm: '', useYn: '' }

export default function NonProcsPage() {
  const [searchInput, setSearchInput] = useState<NonProcsSearch>(INITIAL_SEARCH)
  const [search, setSearch] = useState<NonProcsSearch>(INITIAL_SEARCH)

  // 팝업 상태: null = 닫힘 / { target: null } = 등록 / { target: 행 } = 수정
  const [modal, setModal] = useState<{ target: NonProcs | null } | null>(null)

  // 조회: search 가 바뀌면 자동으로 다시 조회된다.
  const { data, isPending, isError, error, isFetching, refetch } = useNonProcsList(search)
  const deleteMutation = useDeleteNonProcs()

  const rows = data?.data.contents ?? []
  const totalCount = data?.data.pagination.totalCount ?? 0

  /** [조회] 버튼 (Enter 포함) */
  const handleSearch = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    // 조건이 그대로면 쿼리 키가 같아서 자동 재조회가 안 된다 → 직접 refetch
    if (JSON.stringify(searchInput) === JSON.stringify(search)) {
      refetch()
    } else {
      setSearch({ ...searchInput })
    }
  }

  /** [삭제] 버튼 */
  const handleDelete = (row: NonProcs) => {
    if (!confirm(`[${row.nonProcsNm}] 비공정을 삭제하시겠습니까?`)) return

    deleteMutation.mutate(row.nonProcsId, {
      onSuccess: () => alert('삭제되었습니다.'),
      onError: (err) => alert(err.message), // ApiError 메시지 (03장)
    })
  }

  return (
    <section>
      <h1 className="page-title">비공정 관리</h1>

      {/* ───── 검색 영역 ───── */}
      <form className="search-bar" onSubmit={handleSearch}>
        <label className="form-field">
          <span>비공정명</span>
          <input
            value={searchInput.nonProcsNm}
            onChange={(e) => setSearchInput((prev) => ({ ...prev, nonProcsNm: e.target.value }))}
            placeholder="일부만 입력해도 검색"
          />
        </label>
        <label className="form-field">
          <span>사용여부</span>
          <select
            value={searchInput.useYn}
            onChange={(e) =>
              setSearchInput((prev) => ({ ...prev, useYn: e.target.value as NonProcsSearch['useYn'] }))
            }
          >
            <option value="">전체</option>
            <option value="Y">사용</option>
            <option value="N">미사용</option>
          </select>
        </label>
        <button type="submit" className="btn btn-primary" disabled={isFetching}>
          {isFetching ? '조회 중...' : '조회'}
        </button>
      </form>

      {/* ───── 툴바 ───── */}
      <div className="toolbar">
        <span>
          총 <strong>{totalCount}</strong>건
        </span>
        <button type="button" className="btn btn-primary" onClick={() => setModal({ target: null })}>
          등록
        </button>
      </div>

      {/* ───── 조회 실패 ───── */}
      {isError && <p className="message-error">{error.message}</p>}

      {/* ───── 목록 표 ───── */}
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: 100 }}>비공정코드</th>
              <th>비공정명</th>
              <th style={{ width: 70 }}>정렬</th>
              <th style={{ width: 90 }}>사용여부</th>
              <th>비고</th>
              <th style={{ width: 100 }}>수정자</th>
              <th style={{ width: 160 }}>수정일시</th>
              <th style={{ width: 130 }}>관리</th>
            </tr>
          </thead>
          <tbody>
            {/* 상태별 표시: 처음 로딩 / 데이터 없음 / 목록 */}
            {isPending ? (
              <tr>
                <td colSpan={8} className="empty">
                  불러오는 중...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="empty">
                  조회된 데이터가 없습니다.
                </td>
              </tr>
            ) : (
              // key: React가 행을 구분하는 값. 변하지 않는 고유값(PK)을 쓴다. (index 사용 X)
              rows.map((row) => (
                <tr key={row.nonProcsId}>
                  <td className="center">{row.nonProcsId}</td>
                  <td>{row.nonProcsNm}</td>
                  <td className="center">{row.sort}</td>
                  <td className="center">
                    <span className={row.useYn === 'Y' ? 'badge badge-on' : 'badge badge-off'}>
                      {row.useYn === 'Y' ? '사용' : '미사용'}
                    </span>
                  </td>
                  <td>{row.rmrk}</td>
                  {/* 수정 이력이 없으면 등록자/등록일시 표시 */}
                  <td className="center">{row.chnrg ?? row.rgtr}</td>
                  <td className="center">{row.chgDt ?? row.regDt}</td>
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

      {/* ───── 등록/수정 팝업 (조건부 렌더링) ───── */}
      {modal && <NonProcsFormModal target={modal.target} onClose={() => setModal(null)} />}
    </section>
  )
}
