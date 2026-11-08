import { useEffect, useRef } from 'react';
import type { ViewportBarProps } from '@/modules/viewport/domain/components';
import ViewportLegend from '@/modules/viewport/components/ViewportLegend';
import '@/modules/viewport/components/ViewportBar/viewport-bar.css';

const ViewportBar = ({ step, meta, legend, onHeight, children }: ViewportBarProps) => {
    const ref = useRef<HTMLElement>(null);

    useEffect(() => {
        const bar = ref.current;

        if(!bar){
            return;
        }

        const observer = new ResizeObserver(() => onHeight(bar.offsetHeight));

        observer.observe(bar);
        onHeight(bar.offsetHeight);

        return () => {
            observer.disconnect();
            onHeight(0);
        };
    }, [onHeight]);

    return (
        <footer ref={ref} className='vp-bottom'>
            <div className='vp-bottom__info'>
                <div className='vp-info'>
                    <span className='vp-info__step'>{step}</span>
                    <span className='vp-info__meta'>{meta}</span>
                </div>
                {legend && <ViewportLegend legend={legend} />}
            </div>
            {children && <div className='timeline'>{children}</div>}
        </footer>
    );
};

export default ViewportBar;
