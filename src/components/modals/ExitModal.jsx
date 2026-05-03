import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { signOut } from "../../api/supabase";
import { LOGIN } from "../../services/consts";

function ExitModal({ setOpen }) {
    const [isClosing, setIsClosing] = useState(false);
    const navigate = useNavigate();
    const modalRef = useRef(null);
    const triggerRef = useRef(null);

    const handleClose = useCallback(() => {
        setIsClosing(true);
        setTimeout(() => {
            setOpen(false);
            triggerRef.current?.focus();
        }, 300);
    }, [setOpen]);

    const handleExit = async () => {
        await signOut();
        navigate(LOGIN);
    };

    // Lock body scroll, save trigger element for focus restore
    useEffect(() => {
        const prev = document.body.style.overflow;
        triggerRef.current = document.activeElement;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = prev;
        };
    }, []);

    // Escape key handler
    useEffect(() => {
        const onKeyDown = (e) => {
            if (e.key === 'Escape') handleClose();
        };
        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, [handleClose]);

    // Focus trap
    useEffect(() => {
        const el = modalRef.current;
        if (!el) return;
        const handleTab = (e) => {
            if (e.key !== 'Tab') return;
            const focusable = el.querySelectorAll(
                'button:not([disabled]), [tabindex]:not([tabindex="-1"])'
            );
            if (focusable.length === 0) return;
            const first = focusable[0];
            const last  = focusable[focusable.length - 1];
            if (e.shiftKey) {
                if (document.activeElement === first) { e.preventDefault(); last?.focus(); }
            } else {
                if (document.activeElement === last)  { e.preventDefault(); first?.focus(); }
            }
        };
        document.addEventListener('keydown', handleTab);
        return () => document.removeEventListener('keydown', handleTab);
    }, []);

    return createPortal(
        <section
            ref={modalRef}
            className={`exit-modal ${isClosing ? 'closing' : ''}`}
            role="dialog"
            aria-modal="true"
            aria-label="Подтверждение выхода"
            onClick={handleClose}
        >
            <div className={`modal-back ${isClosing ? 'closing' : ''}`} onClick={e => e.stopPropagation()}>
                <div className="m-ex-title text-heading-lg">Вы точно хотите выйти?</div>
                <div className="exit-buttons">
                    <button type="button" className='exit-button text-heading-lg' onClick={handleExit}>Да</button>
                    <button type="button" className='exit-button-menu text-heading-lg' onClick={handleClose}>Нет</button>
                </div>
            </div>
        </section>,
        document.body
    );
}

export default ExitModal;
