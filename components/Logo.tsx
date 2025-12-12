import React from 'react';

interface LogoProps {
  className?: string;
  showText?: boolean;
}

const Logo: React.FC<LogoProps> = ({ className = "h-10" }) => {
  return (
    <img 
      src="http://intermaritima.com.br/images/logo2.png" 
      alt="Intermarítima Logo" 
      className={`${className} object-contain`}
    />
  );
};

export default Logo;