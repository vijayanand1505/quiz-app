import React from 'react';

const Loader = ({ title, message }) => (
  <div
    className="surface loading-card page-enter"
    role="status"
    aria-live="polite"
  >
    <h1>{title || 'Just one second'}</h1>
    <p>{message || 'We are fetching that content for you.'}</p>
    <div className="loading-track">
      <span />
    </div>
  </div>
);
export default Loader;
