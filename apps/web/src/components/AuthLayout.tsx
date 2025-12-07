import React from 'react';
import './AuthLayout.css';

type AuthLayoutProps = {
  children: React.ReactNode;
  title: string;
};

const AuthLayout: React.FC<AuthLayoutProps> = ({ children, title }) => {
  return (
    <div className="auth-layout">
      <div className="auth-card">
        <h2 className="auth-title">{title}</h2>
        {children}
      </div>
    </div>
  );
};

export default AuthLayout;
