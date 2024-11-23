import React from 'react';

const Spinneras = () => {
  const progressBarContainerStyle = {
    width: '100%',
    height: '10px',
    backgroundColor: '#f0f0f0', // Light gray background
    borderRadius: '5px',
    overflow: 'hidden',
    position: 'relative',
  };

  const progressBarStyle = {
    width: '50%', // Initial progress, can be controlled dynamically
    height: '100%',
    backgroundColor: 'blue',
    animation: 'progress 2s infinite', // Infinite animation
  };

  const keyframesStyle = `
    @keyframes progress {
      0% {
        transform: translateX(-100%);
      }
      50% {
        transform: translateX(0);
      }
      100% {
        transform: translateX(100%);
      }
    }
  `;

  return (
    <>
      <style>
        {keyframesStyle}
      </style>
      <div style={progressBarContainerStyle}>
        <div style={progressBarStyle}></div>
      </div>
    </>
  );
};

export default Spinneras;
