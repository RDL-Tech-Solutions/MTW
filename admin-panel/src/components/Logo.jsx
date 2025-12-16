import React from 'react';

export default function Logo({ className = "h-8 w-8", ...props }) {
  return (
    <img 
      src="/logo.svg" 
      alt="PreçoCerto Logo" 
      className={className}
      {...props}
    />
  );
}

