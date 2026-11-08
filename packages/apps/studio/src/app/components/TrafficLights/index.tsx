import '@/app/components/TrafficLights/traffic-lights.css';

const TrafficLights = () => (
    <span className='traffic'>
        <button type='button' aria-label='Close window' onClick={() => window.studio?.window.close()} />
        <button type='button' aria-label='Minimize window' onClick={() => window.studio?.window.minimize()} />
        <button type='button' aria-label='Zoom window' onClick={() => window.studio?.window.toggleMaximize()} />
    </span>
);

export default TrafficLights;
