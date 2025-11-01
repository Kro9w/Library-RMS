// apps/web/src/components/AuthLayout.tsx
import React from 'react';
// --- 1. THIS IS THE FIX ---
// Import our new, single, theme-aware CSS file
import '../pages/Auth.css'; 
// ------------------------

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