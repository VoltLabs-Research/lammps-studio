import '@fontsource/geist/300.css';
import '@fontsource/geist/400.css';
import '@fontsource/geist/500.css';
import '@fontsource/geist/600.css';
import '@fontsource/geist-mono/400.css';
import '@fontsource/geist-mono/500.css';
import '@/app/styles/tokens.css';
import '@/app/styles/base.css';
import '@/shared/styles/utilities.css';
import '@/shared/styles/tooltip.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from '@/app/App';
import { startLiveData } from '@/shared/services/live-data';
import { applyTheme, useThemeStore } from '@/shared/store/theme';

applyTheme(useThemeStore.getState().choice);
startLiveData();

const root = document.getElementById('root');

if(root){
    createRoot(root).render(
        <StrictMode>
            <App />
        </StrictMode>
    );
}
