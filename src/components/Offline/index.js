import React, { useEffect } from 'react';
import Icon from '../Icon';

const Offline = () => {
  useEffect(() => {
    const reconnect = () => window.location.reload();
    window.addEventListener('online', reconnect);
    return () => window.removeEventListener('online', reconnect);
  }, []);
  return (
    <div className="surface loading-card">
      <span className="icon-tile">
        <Icon name="globe" size={26} />
      </span>
      <h1>You’re offline.</h1>
      <p>Check your connection. We’ll reload when you’re back online.</p>
      <button
        className="button button-primary"
        onClick={() => window.location.reload()}
      >
        Try again
        <Icon name="refresh" size={18} />
      </button>
    </div>
  );
};
export default Offline;
