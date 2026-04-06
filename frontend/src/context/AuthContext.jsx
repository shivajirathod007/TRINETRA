import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  // Initialize auth state from localStorage
  useEffect(() => {
    const storedToken = localStorage.getItem('trinetra_token');
    const storedUser  = localStorage.getItem('trinetra_user');
    const storedRole  = localStorage.getItem('trinetra_role');

    if (storedToken && storedUser) {
      setIsAuthenticated(true);
      setToken(storedToken);
      setUser(storedUser);
      setRole(storedRole || 'Analyst');
    }
    setIsLoading(false);
  }, []);

  const login = (accessToken, userEmail, userRole = 'Analyst') => {
    localStorage.setItem('trinetra_token', accessToken);
    localStorage.setItem('trinetra_user', userEmail);
    localStorage.setItem('trinetra_role', userRole);
    setToken(accessToken);
    setUser(userEmail);
    setRole(userRole);
    setIsAuthenticated(true);
  };

  const logout = () => {
    localStorage.removeItem('trinetra_token');
    localStorage.removeItem('trinetra_user');
    localStorage.removeItem('trinetra_role');
    localStorage.removeItem('trinetra_auth');
    setToken(null);
    setUser(null);
    setRole(null);
    setIsAuthenticated(false);
    navigate('/login');
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, role, token, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
