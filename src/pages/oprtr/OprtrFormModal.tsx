// [7장] 작업자 등록 / 수정 팝업
// - 구조는 06장 NonProcsFormModal 과 같다. 다른 점만 주석으로 표시.
//   ① 직위: 공통코드 콤보박스(CodeSelect)
//   ② 생년월일 / 전화번호: 프론트 검증 필수
//      (백엔드 ValidationModel이 형식 오류를 만들기만 하고 throw하지 않아서 서버 검증이 동작하지 않음)

import { useState, type FormEvent } from 'react'
import CodeSelect from '../../components/CodeSelect'
import Modal from '../../components/Modal'
import { useSaveOprtr } from '../../hooks/useOprtr'
import { CODE_GROUP } from '../../types/code'
import type { Oprtr, OprtrForm } from '../../types/oprtr'

interface OprtrFormModalProps {
  /** 수정할 행 (null = 신규 등록) */
  target: Oprtr | null
  onClose: () => void
}

function toForm(target: Oprtr | null): OprtrForm {
  if (!target) {
    return {
      oprtrId: '',
      oprtrNm: '',
      oprtrBrdt: '',
      oprtrTelno: '',
      oprtrJbpsCd: '',
      sort: '',
      useYn: 'Y',
      rmrk: '',
    }
  }
  return {
    oprtrId: target.oprtrId,
    oprtrNm: target.oprtrNm ?? '',
    oprtrBrdt: target.oprtrBrdt ?? '',
    oprtrTelno: target.oprtrTelno ?? '',
    oprtrJbpsCd: target.oprtrJbpsCd ?? '',
    sort: target.sort === null || target.sort === undefined ? '' : String(target.sort), // 기존 순서 유지
    useYn: target.useYn === 'N' ? 'N' : 'Y',
    rmrk: target.rmrk ?? '',
  }
}

/**
 * ② 전화번호 자동 하이픈 (기존 MES 클라이언트와 같은 규칙)
 *   '01012345678' → '010-1234-5678',  '0212345678' → '02-1234-5678'
 */
function formatTelno(value: string): string {
  const digits = value.replace(/[^0-9]/g, '').slice(0, 11)
  if (digits.length === 11) return digits.replace(/^(\d{3})(\d{4})(\d{4})$/, '$1-$2-$3')
  if (digits.length === 10) {
    // 02로 시작하면 2-4-4, 그 외 3-3-4
    return digits.startsWith('02')
      ? digits.replace(/^(\d{2})(\d{4})(\d{4})$/, '$1-$2-$3')
      : digits.replace(/^(\d{3})(\d{3})(\d{4})$/, '$1-$2-$3')
  }
  return digits
}

export default function OprtrFormModal({ target, onClose }: OprtrFormModalProps) {
  const isEdit = target !== null
  const [form, setForm] = useState<OprtrForm>(() => toForm(target))
  const [validationMessage, setValidationMessage] = useState('')
  const save = useSaveOprtr()

  const setField = <K extends keyof OprtrForm>(key: K, value: OprtrForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  /**
   * 프론트 검증 (OprtrController.insert/update 규칙 + 서버가 못 하는 형식 검증)
   */
  const validate = (): string => {
    const name = form.oprtrNm.trim()
    if (!name) return '이름을 입력해 주세요.'
    if (name.length > 20) return '이름은 20자 이하로 입력해 주세요.'
    if (!form.oprtrJbpsCd) return '직위를 선택해 주세요.'
    // ② 서버가 검증하지 못하는 항목
    if (form.oprtrBrdt && !/^\d{4}-\d{2}-\d{2}$/.test(form.oprtrBrdt))
      return '생년월일 형식이 올바르지 않습니다. (YYYY-MM-DD)'
    if (form.oprtrTelno && !/^\d{2,3}-\d{3,4}-\d{4}$/.test(form.oprtrTelno))
      return '전화번호 형식이 올바르지 않습니다. (예: 010-1234-5678)'
    if (form.sort.trim() && !/^\d+$/.test(form.sort.trim())) return '정렬은 0 이상의 숫자만 입력할 수 있습니다.'
    return ''
  }

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const message = validate()
    setValidationMessage(message)
    if (message) return

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
      title={isEdit ? '작업자 수정' : '작업자 등록'}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            취소
          </button>
          <button type="submit" form="oprtrForm" className="btn btn-primary" disabled={save.isPending}>
            {save.isPending ? '저장 중...' : '저장'}
          </button>
        </>
      }
    >
      <form id="oprtrForm" className="form-grid" onSubmit={handleSubmit}>
        {isEdit && (
          <label className="form-field form-field-full">
            <span>작업자코드</span>
            <input value={form.oprtrId} disabled />
          </label>
        )}

        <label className="form-field">
          <span>이름 *</span>
          <input
            value={form.oprtrNm}
            onChange={(e) => setField('oprtrNm', e.target.value)}
            maxLength={20}
            autoFocus
          />
        </label>

        {/* ① 공통코드 콤보박스: label 안에 있으므로 "직위" 글자를 눌러도 선택창에 포커스 */}
        <label className="form-field">
          <span>직위 *</span>
          <CodeSelect
            codeGroup={CODE_GROUP.OPRTR_JBPS}
            value={form.oprtrJbpsCd}
            onChange={(codeId) => setField('oprtrJbpsCd', codeId)}
            emptyLabel="선택"
          />
        </label>

        <label className="form-field">
          <span>생년월일</span>
          {/* type="date": 브라우저 달력 제공, value 형식은 항상 'yyyy-MM-dd' → 백엔드 형식과 같음 */}
          <input
            type="date"
            value={form.oprtrBrdt}
            onChange={(e) => setField('oprtrBrdt', e.target.value)}
          />
        </label>

        <label className="form-field">
          <span>전화번호</span>
          <input
            value={form.oprtrTelno}
            onChange={(e) => setField('oprtrTelno', formatTelno(e.target.value))}
            inputMode="tel"
            placeholder="숫자만 입력"
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
