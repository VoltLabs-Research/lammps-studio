import { useEffect, useRef, useState } from 'react';

export const FLASH_MS = 900;

type Timer = ReturnType<typeof setTimeout>;

export const useFreshLines = (end: number, live: boolean): number => {
    const [settled, setSettled] = useState(end);
    const [wasLive, setWasLive] = useState(live);
    const timers = useRef(new Set<Timer>());

    if(live !== wasLive){
        setWasLive(live);
        setSettled(end);
    }

    useEffect(() => {
        if(!live) return;

        const pending = timers.current;
        const timer = setTimeout(() => {
            pending.delete(timer);
            setSettled((current) => Math.max(current, end));
        }, FLASH_MS);
        pending.add(timer);
    }, [end, live]);

    useEffect(() => {
        const pending = timers.current;

        return () => pending.forEach(clearTimeout);
    }, []);

    if(!live) return end;

    return settled;
};
