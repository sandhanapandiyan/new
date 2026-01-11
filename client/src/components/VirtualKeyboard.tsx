import React, { useState } from 'react';
import { useKeyboard } from '../context/KeyboardContext';
import { ChevronDown, Delete, ArrowUp } from 'lucide-react';

const VirtualKeyboard: React.FC = () => {
    const { isOpen, insertText, backspace, closeKeyboard } = useKeyboard();
    const [isCaps, setIsCaps] = useState(false);
    const [isNumeric, setIsNumeric] = useState(false);

    if (!isOpen) return null;

    const handleKeyClick = (key: string) => {
        insertText(isCaps ? key.toUpperCase() : key.toLowerCase());
    };

    const qwerty = [
        ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
        ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
        ['z', 'x', 'c', 'v', 'b', 'n', 'm']
    ];

    const numeric = [
        ['1', '2', '3'],
        ['4', '5', '6'],
        ['7', '8', '9'],
        ['.', '0', ':']
    ];

    return (
        <div className="fixed bottom-0 left-0 right-0 bg-slate-900/90 backdrop-blur-xl border-t border-white/10 p-2 z-[9999] shadow-2xl animate-in slide-in-from-bottom duration-300 touch-none select-none">

            {/* Header / Actions */}
            <div className="flex justify-between items-center px-4 pb-2 mb-2 border-b border-white/5">
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                    Touch Keyboard
                </div>
                <button
                    onClick={closeKeyboard}
                    className="p-2 -mr-2 text-slate-400 hover:text-white active:scale-95 transition-all"
                >
                    <ChevronDown size={24} />
                </button>
            </div>

            <div className="max-w-5xl mx-auto flex flex-col gap-2 pb-2">
                {isNumeric ? (
                    // NUMERIC / SPECIAL LAYOUT
                    <>
                        <div className="flex gap-2 justify-center">
                            {numeric.map((row, i) => (
                                <div key={i} className="flex flex-col gap-2">
                                    {row.map(key => (
                                        <KeyButton key={key} onClick={() => insertText(key)} className="h-16 w-20 text-xl font-mono">
                                            {key}
                                        </KeyButton>
                                    ))}
                                </div>
                            ))}
                            {/* Numpad Actions Side */}
                            <div className="flex flex-col gap-2">
                                <KeyButton onClick={backspace} className="h-16 w-24 bg-red-500/20 text-red-400 border-red-500/30">
                                    <Delete size={20} />
                                </KeyButton>
                                <KeyButton onClick={() => insertText(' ')} className="h-16 w-24">
                                    Space
                                </KeyButton>
                                <KeyButton onClick={() => setIsNumeric(false)} className="h-16 w-24 bg-blue-500/20 text-blue-400 border-blue-500/30 font-bold text-xs">
                                    ABC
                                </KeyButton>
                            </div>
                        </div>
                    </>
                ) : (
                    // QWERTY LAYOUT
                    <>
                        {/* Row 1 */}
                        <div className="flex gap-1.5 justify-center">
                            {qwerty[0].map(key => (
                                <KeyButton key={key} onClick={() => handleKeyClick(key)}>
                                    {isCaps ? key.toUpperCase() : key}
                                </KeyButton>
                            ))}
                        </div>

                        {/* Row 2 */}
                        <div className="flex gap-1.5 justify-center px-4">
                            {qwerty[1].map(key => (
                                <KeyButton key={key} onClick={() => handleKeyClick(key)}>
                                    {isCaps ? key.toUpperCase() : key}
                                </KeyButton>
                            ))}
                        </div>

                        {/* Row 3 + Shifts */}
                        <div className="flex gap-1.5 justify-center">
                            <KeyButton
                                onClick={() => setIsCaps(!isCaps)}
                                className={`w-14 ${isCaps ? 'bg-blue-500 text-white border-blue-400' : 'bg-slate-700 text-slate-400'}`}
                            >
                                <ArrowUp size={20} className={isCaps ? 'fill-current' : ''} />
                            </KeyButton>

                            {qwerty[2].map(key => (
                                <KeyButton key={key} onClick={() => handleKeyClick(key)}>
                                    {isCaps ? key.toUpperCase() : key}
                                </KeyButton>
                            ))}

                            <KeyButton onClick={backspace} className="w-14 bg-red-500/10 text-red-400 border-red-500/20 active:bg-red-500/30">
                                <Delete size={20} />
                            </KeyButton>
                        </div>

                        {/* Space Bar Row */}
                        <div className="flex gap-1.5 justify-center mt-1">
                            <KeyButton
                                onClick={() => setIsNumeric(true)}
                                className="w-16 text-xs font-bold text-slate-400 bg-slate-800"
                            >
                                123
                            </KeyButton>
                            <KeyButton onClick={() => insertText('@')} className="w-10 text-slate-400 bg-slate-800">@</KeyButton>
                            <KeyButton onClick={() => insertText('.')} className="w-10 text-slate-400 bg-slate-800">.</KeyButton>
                            <KeyButton onClick={() => insertText(' ')} className="w-64">
                                Space
                            </KeyButton>
                            <KeyButton onClick={() => insertText('.com')} className="w-16 text-xs text-slate-400 bg-slate-800">.com</KeyButton>
                            <KeyButton onClick={closeKeyboard} className="w-16 bg-blue-600 text-white font-bold text-xs border-blue-500 shadow-lg shadow-blue-900/20">
                                Done
                            </KeyButton>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

const KeyButton: React.FC<{
    onClick: () => void;
    children: React.ReactNode;
    className?: string;
}> = ({ onClick, children, className = '' }) => (
    <button
        onMouseDown={(e) => e.preventDefault()} // Prevent focus loss on input
        onClick={onClick}
        className={`
            h-12 min-w-[36px] flex-1 rounded-lg flex items-center justify-center
            bg-white/10 hover:bg-white/20 active:bg-white/30 active:scale-95
            border border-white/10 shadow-sm transition-all text-lg font-medium text-white
            ${className}
        `}
    >
        {children}
    </button>
);

export default VirtualKeyboard;
