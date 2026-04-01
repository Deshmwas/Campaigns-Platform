import styles from './ConfirmModal.module.css';
import Button from './Button';
import { MdWarning } from 'react-icons/md';

export default function ConfirmModal({ 
    isOpen, 
    title, 
    message, 
    onConfirm, 
    onCancel, 
    confirmText = 'Confirm', 
    cancelText = 'Cancel',
    variant = 'danger' 
}) {
    if (!isOpen) return null;

    return (
        <div className={styles.overlay} onClick={onCancel}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                <div className={styles.header}>
                    <div className={`${styles.iconWrapper} ${styles[variant]}`}>
                        <MdWarning size={24} />
                    </div>
                    <h3 className={styles.title}>{title}</h3>
                </div>
                <p className={styles.message}>{message}</p>
                <div className={styles.actions}>
                    <Button variant="ghost" onClick={onCancel}>{cancelText}</Button>
                    <Button 
                        style={variant === 'danger' ? { backgroundColor: '#ef4444', borderColor: '#ef4444', color: 'white' } : {}} 
                        variant="primary" 
                        onClick={onConfirm}
                    >
                        {confirmText}
                    </Button>
                </div>
            </div>
        </div>
    );
}
