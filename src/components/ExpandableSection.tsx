import { useState, type ReactNode } from 'react';

interface ExpandableSectionProps {
    title: string;
    children: ReactNode;
    defaultOpen?: boolean;
}

export function ExpandableSection({ title, children, defaultOpen = false }: ExpandableSectionProps) {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div style={{ border: '1px solid #ccc', borderRadius: '8px', margin: '10px 0', overflow: 'hidden' }}>
            <div
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    backgroundColor: '#f0f0f0',
                    padding: '10px 15px',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontWeight: 'bold',
                    userSelect: 'none',
                    color: '#000000ff'
                }}
            >
                <span>{title}</span>
                <span>{isOpen ? '▼' : '▶'}</span>
            </div>

            <div style={{ display: isOpen ? 'block' : 'none', padding: '0 15px 15px 15px' }}>
                {children}
            </div>
        </div>
    );
}
