import React, { useEffect, useState } from 'react';
import './AcknowledgementState.css';

/**
 * AcknowledgementState Component
 * 
 * Purpose: Immediate visual feedback when user presses Enter
 * 
 * Design Philosophy:
 * - Not loading yet — this is acknowledgement
 * - Landing page stays visible but frozen
 * - Query text displayed prominently
 * - Brief display before transitioning to loading
 */

export default function AcknowledgementState({ query, onTransitionComplete }) {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Fade in immediately
        requestAnimationFrame(() => {
            setIsVisible(true);
        });

        // Transition to loading after brief acknowledgement
        const timer = setTimeout(() => {
            onTransitionComplete?.();
        }, 800);

        return () => clearTimeout(timer);
    }, [onTransitionComplete]);

    return (
        <div className={`acknowledgement-state ${isVisible ? 'visible' : ''}`}>
            <div className="acknowledgement-overlay" />

            <div className="acknowledgement-content">
                <span className="acknowledgement-label">YOUR QUESTION</span>
                <p className="acknowledgement-query">"{query}"</p>
            </div>
        </div>
    );
}
