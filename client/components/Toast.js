import { useEffect, useState } from 'react';
import { MdCheckCircle, MdError, MdInfo, MdClose } from 'react-icons/md';
import styles from './Toast.module.css';

export default function Toast({ message, type, onClose }) {
    const [isLeaving, setIsLeaving] = useState(false);

    useEffect(() => {
        // Automatically start leave animation slightly before it's removed from DOM
        const timer = setTimeout(() => {
            setIsLeaving(true);
        }, 2700); // 3000ms total lifetime - 300ms animation
        
        return () => clearTimeout(timer);
    }, []);

    const iconMap = {
        success: <MdCheckCircle className={styles.icon} />,
        error: <MdError className={styles.icon} />,
        info: <MdInfo className={styles.icon} />,
    };

    return (
        <div className={`${styles.toast} ${styles[type]} ${isLeaving ? styles.leaving : ''}`}>
            <div className={styles.iconWrapper}>{iconMap[type]}</div>
            <p className={styles.message}>{message}</p>
            <button onClick={onClose} className={styles.closeBtn}>
                <MdClose />
            </button>
        </div>
    );
}
