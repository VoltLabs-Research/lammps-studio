import '@fontsource/geist/300.css';
import '@fontsource/geist/400.css';
import '@fontsource/geist/500.css';
import '@fontsource/geist/600.css';
import '@fontsource/geist-mono/400.css';
import '@fontsource/geist-mono/500.css';
import '@/app/styles/tokens.css';
import '@/app/styles/base.css';
import '@dev/dev.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import DevWorkspace from '@dev/DevWorkspace';
import PerfProbe from '@dev/PerfProbe';

const params = new URLSearchParams(location.search);
const theme = params.get('theme');
const root = document.getElementById('root');

if(theme){
    document.documentElement.setAttribute('data-theme', theme);
}
if(root){
    createRoot(root).render(
        <StrictMode>
            {params.has('perf') ? <PerfProbe /> : <DevWorkspace />}
        </StrictMode>
    );
}
