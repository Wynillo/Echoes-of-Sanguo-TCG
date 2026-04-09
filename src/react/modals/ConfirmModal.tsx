import { useTranslation } from 'react-i18next';
import { useModal } from '../contexts/ModalContext.js';
import type { ModalState } from '../contexts/ModalContext.js';

interface Props { modal: Extract<ModalState, { type: 'confirm' }>; }

export function ConfirmModal({ modal }: Props) {
  const { closeModal } = useModal();
  const { t } = useTranslation();

  function confirm() { closeModal(); modal.onConfirm(); }
  function cancel() { closeModal(); }

  return (
    <div className="modal" role="alertdialog" aria-modal="true">
      <p style={{ marginBottom: '1.25rem', lineHeight: 1.5 }}>{modal.message}</p>
      <div className="prompt-buttons">
        <button className="btn-primary" onClick={confirm}>{t('common.ok')}</button>
        <button className="btn-cancel" onClick={cancel}>{t('common.cancel')}</button>
      </div>
    </div>
  );
}
