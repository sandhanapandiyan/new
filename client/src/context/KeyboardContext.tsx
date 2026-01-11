import React, { createContext, useContext, useEffect, useState, useRef } from 'react';

type KeyboardContextType = {
    isOpen: boolean;
    activeInput: HTMLInputElement | HTMLTextAreaElement | null;
    insertText: (text: string) => void;
    backspace: () => void;
    closeKeyboard: () => void;
};

const KeyboardContext = createContext<KeyboardContextType | undefined>(undefined);

export const useKeyboard = () => {
    const context = useContext(KeyboardContext);
    if (!context) {
        throw new Error('useKeyboard must be used within a KeyboardProvider');
    }
    return context;
};

export const KeyboardProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [activeInput, setActiveInput] = useState<HTMLInputElement | HTMLTextAreaElement | null>(null);
    // Track if we are interacting with the keyboard itself to prevent blur
    const isInteractingWithKeyboard = useRef(false);

    useEffect(() => {
        const handleFocus = (e: FocusEvent) => {
            const target = e.target as HTMLElement;
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
                // Ignore non-text inputs like checkbox, radio, range, file
                const input = target as HTMLInputElement;
                if (['checkbox', 'radio', 'range', 'file', 'submit', 'button'].includes(input.type)) {
                    return;
                }

                setActiveInput(target as HTMLInputElement | HTMLTextAreaElement);
                setIsOpen(true);
            }
        };

        const handleBlur = () => {
            // Delay closing to allow for keyboard interaction checks
            setTimeout(() => {
                if (!isInteractingWithKeyboard.current) {
                    // Only close if we didn't just touch a keyboard button
                    // Logic handled by the keyboard component mostly, but good to have safety
                }
            }, 100);
        };

        // Capture phase to ensure we always get the event
        window.addEventListener('focus', handleFocus, true);
        window.addEventListener('blur', handleBlur, true);

        return () => {
            window.removeEventListener('focus', handleFocus, true);
            window.removeEventListener('blur', handleBlur, true);
        };
    }, []);

    const setNativeValue = (element: HTMLInputElement | HTMLTextAreaElement, value: string) => {
        const valueSetter = Object.getOwnPropertyDescriptor(element, 'value')?.set;
        const prototype = Object.getPrototypeOf(element);
        const prototypeValueSetter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;

        if (valueSetter && valueSetter !== prototypeValueSetter) {
            prototypeValueSetter?.call(element, value);
        } else {
            valueSetter?.call(element, value);
        }

        element.dispatchEvent(new Event('input', { bubbles: true }));
    };

    const insertText = (text: string) => {
        if (!activeInput) return;

        const start = activeInput.selectionStart || 0;
        const end = activeInput.selectionEnd || 0;
        const currentValue = activeInput.value;

        const newValue = currentValue.substring(0, start) + text + currentValue.substring(end);

        setNativeValue(activeInput, newValue);

        // Update cursor position
        const newCursorPos = start + text.length;
        activeInput.setSelectionRange(newCursorPos, newCursorPos);
    };

    const backspace = () => {
        if (!activeInput) return;

        const start = activeInput.selectionStart || 0;
        const end = activeInput.selectionEnd || 0;
        const currentValue = activeInput.value;

        if (start === end && start === 0) return; // Nothing to delete

        let newValue;
        let newCursorPos;

        if (start !== end) {
            // Delete selection
            newValue = currentValue.substring(0, start) + currentValue.substring(end);
            newCursorPos = start;
        } else {
            // Delete character before cursor
            newValue = currentValue.substring(0, start - 1) + currentValue.substring(end);
            newCursorPos = start - 1;
        }

        setNativeValue(activeInput, newValue);
        activeInput.setSelectionRange(newCursorPos, newCursorPos);
    };

    const closeKeyboard = () => {
        setIsOpen(false);
        if (activeInput) {
            activeInput.blur();
            setActiveInput(null);
        }
    };

    return (
        <KeyboardContext.Provider value={{ isOpen, activeInput, insertText, backspace, closeKeyboard }}>
            <div
                onMouseDown={() => { isInteractingWithKeyboard.current = true; }}
                onMouseUp={() => { setTimeout(() => isInteractingWithKeyboard.current = false, 200); }}
                onTouchStart={() => { isInteractingWithKeyboard.current = true; }}
                onTouchEnd={() => { setTimeout(() => isInteractingWithKeyboard.current = false, 200); }}
            >
                {children}
            </div>
        </KeyboardContext.Provider>
    );
};
