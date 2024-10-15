import React from 'react';
import './LoadingIcon.css';

const LoadingIcon = ({ message, subMessage }) => {
  return (
    <div className="loading-container">
      <div className="spinner"></div>
      <div className="message">{message}</div>
      <div className="sub-message">{subMessage}</div>
    </div>
  );
};

export default LoadingIcon;