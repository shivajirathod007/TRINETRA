import React, { useState, useEffect, useRef } from 'react';

const AnimatedCounters = ({ value, duration = 800, prefix = '', suffix = '' }) => {
    const [count, setCount] = useState(0);
    const timerRef = useRef(null);

    useEffect(() => {
        const end = parseInt(String(value).replace(/,/g, ''), 10) || 0;

        // Clear any existing timer
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }

        if (end === 0) {
            setCount(0);
            return;
        }

        const totalSteps = 30; // fixed number of animation steps
        const stepTime = Math.max(Math.floor(duration / totalSteps), 16); // min 16ms (60fps)
        const increment = Math.ceil(end / totalSteps);
        let current = 0;

        timerRef.current = setInterval(() => {
            current += increment;
            if (current >= end) {
                clearInterval(timerRef.current);
                timerRef.current = null;
                setCount(end);
            } else {
                setCount(current);
            }
        }, stepTime);

        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        };
    }, [value, duration]);

    const formatted = count.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return <span className="font-mono">{prefix}{formatted}{suffix}</span>;
};

export default AnimatedCounters;
