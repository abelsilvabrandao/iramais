
import React from 'react';
import { useAuth } from '../contexts/AuthContext';

interface LogoProps {
  className?: string;
}

const Logo: React.FC<LogoProps> = ({ className = "h-10" }) => {
  const { globalSettings } = useAuth();
  
  // URL Padrão caso não haja logo configurada
  const defaultLogo = "http://intermaritima.com.br/images/logo2.png";
  const logoUrl = globalSettings?.companyLogo || defaultLogo;

  return (
    <img 
      src={logoUrl} 
      alt="Empresa Logo" 
      className={`${className} object-contain transition-all duration-300`}
      onError={(e) => {
        // Fallback caso a imagem customizada falhe no carregamento
        (e.target as HTMLImageElement).src = defaultLogo;
      }}
    />
  );
};

export default Logo;
