import React from 'react';
import { Toaster } from 'react-hot-toast';

export const ToastProvider: React.FC = () => {
  return (
    <Toaster
      position="top-center"
      reverseOrder={false}
      gutter={8}
      containerClassName=""
      containerStyle={{}}
      toastOptions={{
        // Default options for all toasts
        duration: 4000,
        style: {
          background: '#1f2937',
          color: '#f3f4f6',
          borderRadius: '0.5rem',
          padding: '1rem',
          fontSize: '0.875rem',
          maxWidth: '500px',
        },
        // Success toast style
        success: {
          duration: 3000,
          style: {
            background: '#10b981',
            color: '#ffffff',
          },
          iconTheme: {
            primary: '#ffffff',
            secondary: '#10b981',
          },
        },
        // Error toast style
        error: {
          duration: 5000,
          style: {
            background: '#ef4444',
            color: '#ffffff',
          },
          iconTheme: {
            primary: '#ffffff',
            secondary: '#ef4444',
          },
        },
        // Loading toast style
        loading: {
          style: {
            background: '#3b82f6',
            color: '#ffffff',
          },
        },
      }}
    />
  );
};

export default ToastProvider;
