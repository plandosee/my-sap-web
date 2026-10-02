// [6장] 공통 팝업(모달) 컴포넌트
//
// 사용 예)
//   {isOpen && (
//     <Modal title="비공정 등록" onClose={() => setIsOpen(false)} footer={<button>저장</button>}>
//       ...입력 폼...
//     </Modal>
//   )}
//
// - 열기/닫기는 부모가 "조건부 렌더링"으로 결정한다. (isOpen && <Modal />)
//   → 닫으면 컴포넌트가 사라지므로, 다시 열 때 입력값이 깨끗하게 초기화된다.
// - 바깥(회색 배경)을 클릭해도 닫히지 않게 했다. 입력 중 실수로 닫혀서 내용이 날아가는 것을 막기 위함.
//   (ESC 키 / X 버튼 / 취소 버튼으로 닫기)

import { useEffect, type ReactNode } from 'react'

interface ModalProps {
  /** 팝업 제목 */
  title: string
  /** 닫기 요청 시 실행 (X 버튼, ESC 키) */
  onClose: () => void
  /** 본문 내용 (태그 사이에 넣은 것) */
  children: ReactNode
  /** 하단 버튼 영역 (선택) */
  footer?: ReactNode
}

export default function Modal({ title, onClose, children, footer }: ModalProps) {
  // ESC 키로 닫기
  // useEffect: 화면에 나타난 "뒤에" 실행할 작업(이벤트 등록 등). return 한 함수는 사라질 때 실행(정리).
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown) // 정리 안 하면 이벤트가 계속 쌓인다
  }, [onClose])

  return (
    <div className="modal-backdrop">
      {/* role/aria: 화면 낭독기 등 접근성을 위한 표시 */}
      <div className="modal" role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="닫기">
            ×
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  )
}
