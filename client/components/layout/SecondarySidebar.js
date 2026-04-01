import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './SecondarySidebar.module.css';

export default function SecondarySidebar({ title, links }) {
    const pathname = usePathname();

    return (
        <aside className={styles.secondarySidebar}>
            <div className={styles.header}>
                <h2 className={styles.title}>{title}</h2>
            </div>
            <nav className={styles.nav}>
                {links.map((link) => {
                    const isActive = pathname === link.href;
                    return (
                        <Link
                            key={link.href}
                            href={link.href}
                            className={`${styles.link} ${isActive ? styles.active : ''}`}
                        >
                            {link.label}
                        </Link>
                    );
                })}
            </nav>
        </aside>
    );
}
