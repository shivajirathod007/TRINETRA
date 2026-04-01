import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * ProtectedRoute wrapper component
 * Checks if user is authenticated before rendering the component
 * Redirects to login if not authenticated
 */
export function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary-indigo bg-opacity-20 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-primary-indigo border-t-transparent rounded-full animate-spin"></div>
          </div>
          <p className="text-secondary">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default ProtectedRoute;
