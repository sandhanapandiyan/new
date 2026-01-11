import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CalendarProps {
    markedDates?: string[]; // Arrays of 'YYYY-MM-DD'
    selectedDate: string;
    onDateSelect: (date: string) => void;
}

const Calendar: React.FC<CalendarProps> = ({ markedDates = [], selectedDate, onDateSelect }) => {
    // Initialize view state based on selectedDate or current date
    const [currentDate, setCurrentDate] = useState(() => {
        const initialDate = selectedDate ? new Date(selectedDate) : new Date();
        // Reset to first day of month to avoid overflow issues (e.g. going from Mar 31 to Feb)
        initialDate.setDate(1);
        return initialDate;
    });

    const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
    const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);

    const prevMonth = () => {
        setCurrentDate(new Date(year, month - 1, 1));
    };

    const nextMonth = () => {
        setCurrentDate(new Date(year, month + 1, 1));
    };

    const handleDateClick = (day: number) => {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        onDateSelect(dateStr);
    };

    // Days array generation
    const days = [];
    // Padding for empty start days
    for (let i = 0; i < firstDay; i++) {
        days.push(<div key={`empty-${i}`} />);
    }

    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const isSelected = selectedDate === dateStr;
        const hasRecording = markedDates.includes(dateStr);
        const isToday = (() => {
            const now = new Date();
            const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
            return todayStr === dateStr;
        })();

        days.push(
            <div
                key={day}
                onClick={() => handleDateClick(day)}
                className={`
                    relative h-8 w-8 flex items-center justify-center rounded-lg cursor-pointer text-xs font-medium transition-all
                    ${isSelected ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30' : 'text-slate-400 hover:bg-white/5 hover:text-white'}
                    ${isToday && !isSelected ? 'text-blue-400 font-bold' : ''}
                `}
            >
                {day}
                {hasRecording && (
                    <div className={`absolute bottom-1 w-1 h-1 rounded-full ${isSelected ? 'bg-white' : 'bg-blue-500'}`} />
                )}
            </div>
        );
    }

    const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    return (
        <div className="bg-slate-800/50 border border-white/5 rounded-2xl p-4 select-none">
            <div className="flex items-center justify-between mb-4">
                <button onClick={prevMonth} className="p-1 hover:bg-white/5 rounded-lg text-slate-400 hover:text-white transition-colors">
                    <ChevronLeft size={16} />
                </button>
                <span className="text-sm font-bold text-slate-200">
                    {monthNames[month]} {year}
                </span>
                <button onClick={nextMonth} className="p-1 hover:bg-white/5 rounded-lg text-slate-400 hover:text-white transition-colors">
                    <ChevronRight size={16} />
                </button>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center mb-2">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                    <div key={i} className="text-[10px] font-bold text-slate-500 uppercase">
                        {d}
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
                {days}
            </div>
        </div>
    );
};

export default Calendar;
