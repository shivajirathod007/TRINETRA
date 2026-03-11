import React, { useState, useEffect } from 'react';

const AnimatedCounters = ({ value, duration = 1000, prefix = '', suffix = '' }) => {
    const [count, setCount] = useState(0);

    useEffect(() => {
        let start = 0;
        const end = parseInt(value.toString().replace(/,/g, ''), 10) || 0;

        if (start === end) {
            setCount(end);
            return;
        }

        const incrementTime = Math.max(Math.abs(Math.floor(duration / end)), 10);
        const steps = Math.max(Math.floor(end / (duration / incrementTime)), 1);

        const timer = setInterval(() => {
            start += steps;
            if (start >= end) {
                clearInterval(timer);
                setCount(end);
            } else {
                setCount(start);
            }
        }, incrementTime);

        return () => clearInterval(timer);
    }, [value, duration]);

    // Format with commas
    const formattedCount = count.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");

    return (
        <span className="font-mono">
            {prefix}{formattedCount}{suffix}
        </span>
    );
};

export default AnimatedCounters;
