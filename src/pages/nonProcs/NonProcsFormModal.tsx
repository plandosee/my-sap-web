// [6장] 비공정 등록 / 수정 팝업
//
// - target 이 null 이면 "등록", 값이 있으면 그 행을 "수정"
// - 부모(NonProcsPage)가 열 때마다 새로 만들어지므로(조건부 렌더링),
//   useState 초기값으로 target 값을 한 번 채워 넣으면 된다.

import { useState, type FormEvent } from 'react'
import Modal from '../../components/Modal'
import { useSaveNonProcs } from '../../hooks/useNonProcs'
import type { NonProcs, NonProcsForm } from '../../types/nonProcs'

interface NonProcsFormModalProps {
  /** 수정할 행 (null = 신규 등록) */
  target: NonProcs | null
  /** 팝업 닫기 */
  onClose: () => void
}

/** 목록의 행(NonProcs) → 폼 입력값(NonProcsForm) 변환 */
function toForm(target: NonProcs | null): NonProcsForm {
  if (!target) {
    // 신규 등록 기본값
    return { nonProcsId: '', nonProcsNm: '', sort: '', useYn: 'Y', rmrk: '' }
  }
  return {
    nonProcsId: target.nonProcsId,
    nonProcsNm: target.nonProcsNm ?? '',
    // ⚠️ 수정 시 sort를 비우면 서버가 맨 뒤 순번으로 바꿔 버린다(01장 주의사항 #6) → 기존 값을 채워 둔다
    sort: target.sort === null || target.sort === undefined ? '' : String(target.sort),
    useYn: target.useYn === 'N' ? 'N' : 'Y',
    rmrk: target.rmrk ?? '',
  }
}

export default function NonProcsFormModal({ target, onClose }: NonProcsFormModalProps) {
  const isEdit = target !== null
  const [form, setForm] = useState<NonProcsForm>(() => toForm(target))
  const [validationMessage, setValidationMessage] = useState('')
  const save = useSaveNonProcs()

  /**
   * 입력값 하나를 바꾸는 공통 함수
   * - key 에는 NonProcsForm 의 필드 이름만 들어갈 수 있다. (keyof)
   * - ...prev: 나머지 필드는 그대로 두고 해당 필드만 바꾼 "새 객체"를 만든다. (state는 직접 수정하지 않는다)
   */
  const setField = <K extends keyof NonProcsForm>(key: K, value: NonProcsForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  /**
   * 프론트 검증 (백엔드 검증 규칙과 맞춘다: NonProcsController.insert/update)
   * - nonProcsNm: 필수, 최대 50자
   * - sort: 선택, 0 이상의 정수
   * @returns 에러 메시지 (문제 없으면 '')
   */
  const validate = (): string => {
    if (!form.nonProcsNm.trim()) return '비공정명을 입력해 주세요.'
    if (form.nonProcsNm.trim().length > 50) return '비공정명은 50자 이하로 입력해 주세요.'
    if (form.sort.trim() && !/^\d+$/.test(form.sort.trim())) return '정렬은 0 이상의 숫자만 입력할 수 있습니다.'
    return ''
  }

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const message = validate()
    setValidationMessage(message)
    if (message) return

    // mutate(값, { onSuccess }) : 이 호출에만 적용되는 성공 처리
    // (hooks의 onSuccess = 목록 새로고침 → 그 다음 여기 onSuccess = 안내 + 닫기)
    save.mutate(form, {
      onSuccess: () => {
        alert(isEdit ? '수정되었습니다.' : '등록되었습니다.')
        onClose()
      },
    })
  }

  const errorMessage = validationMessage || save.error?.message

  return (
    <Modal
      title={isEdit ? '비공정 수정' : '비공정 등록'}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            취소
          </button>
          {/* form 속성: 이 버튼이 footer(폼 바깥)에 있어도 id="nonProcsForm" 폼을 제출하게 한다 */}
          <button type="submit" form="nonProcsForm" className="btn btn-primary" disabled={save.isPending}>
            {save.isPending ? '저장 중...' : '저장'}
          </button>
        </>
      }
    >
      <form id="nonProcsForm" className="form-grid" onSubmit={handleSubmit}>
        {/* 수정일 때만 코드 표시 (코드는 서버가 채번하므로 수정 불가) */}
        {isEdit && (
          <label className="form-field">
            <span>비공정코드</span>
            <input value={form.nonProcsId} disabled />
          </label>
        )}

        <label className="form-field">
          <span>비공정명 *</span>
          <input
            value={form.nonProcsNm}
            onChange={(e) => setField('nonProcsNm', e.target.value)}
            maxLength={50}
            autoFocus
          />
        </label>

        <label className="form-field">
          <span>정렬</span>
          <input
            value={form.sort}
            onChange={(e) => setField('sort', e.target.value)}
            inputMode="numeric"
            placeholder="비우면 맨 뒤 순번"
          />
        </label>

        <label className="form-field">
          <span>사용여부</span>
          {/* e.target.value 는 string 이므로 'Y' | 'N' 타입으로 알려준다(as) */}
          <select value={form.useYn} onChange={(e) => setField('useYn', e.target.value as 'Y' | 'N')}>
            <option value="Y">사용</option>
            <option value="N">미사용</option>
          </select>
        </label>

        <label className="form-field form-field-full">
          <span>비고</span>
          <input value={form.rmrk} onChange={(e) => setField('rmrk', e.target.value)} />
        </label>

        {errorMessage && <p className="message-error form-field-full">{errorMessage}</p>}
      </form>
    </Modal>
  )
}
