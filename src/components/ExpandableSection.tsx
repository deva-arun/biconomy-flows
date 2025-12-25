import { useState, type ReactNode } from 'react';
import '../styles/benchmark.css';

interface ExpandableSectionProps {
    title: string;
    children: ReactNode;
    defaultOpen?: boolean;
}

export function ExpandableSection({ title, children, defaultOpen = false }: ExpandableSectionProps) {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div className="expandable-section">
            <div
                onClick={() => setIsOpen(!isOpen)}
                className="expandable-header"
            >
                <span>{title}</span>
                <span>{isOpen ? '▼' : '▶'}</span>
            </div>

            <div className={isOpen ? 'expandable-content' : 'expandable-content expandable-content-hidden'}>
                {children}
            </div>
        </div>
    );
}
