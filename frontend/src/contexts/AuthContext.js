import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { setToken, getToken, setUser, getUser, clearAuth } from '../utils/storage';
import { getCurrentUser } from '../services/userService';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUserState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const initializeAuth = useCallback(async () => {
    const token = getToken();
    const storedUser = getUser();

    if (token && storedUser) {
      try {
        const response = await getCurrentUser();
        if (response.success && response.data) {
          setUserState(response.data.user);
          setUser(response.data.user);
          setIsAuthenticated(true);
        } else {
          clearAuth();
          setIsAuthenticated(false);
        }
      } catch (error) {
        clearAuth();
        setIsAuthenticated(false);
      }
    } else {
      setIsAuthenticated(false);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  const login = async (loginData) => {
    setLoading(true);
    try {
      const response = await import('../services/userService').then(
        ({ login }) => login(loginData)
      );
      
      if (response.success && response.data) {
        const { user: userData, token } = response.data;
        setToken(token);
        setUser(userData);
        setUserState(userData);
        setIsAuthenticated(true);
        return { success: true };
      }
      return { success: false, message: response.message || '登录失败' };
    } catch (error) {
      return { success: false, message: error.message || '登录失败' };
    } finally {
      setLoading(false);
    }
  };

  const register = async (registerData) => {
    setLoading(true);
    try {
      const response = await import('../services/userService').then(
        ({ register }) => register(registerData)
      );
      
      if (response.success && response.data) {
        const { user: userData, token } = response.data;
        setToken(token);
        setUser(userData);
        setUserState(userData);
        setIsAuthenticated(true);
        return { success: true };
      }
      return { success: false, message: response.message || '注册失败' };
    } catch (error) {
      return { success: false, message: error.message || '注册失败' };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    clearAuth();
    setUserState(null);
    setIsAuthenticated(false);
  };

  const updateUserInfo = (newUser) => {
    setUserState(newUser);
    setUser(newUser);
  };

  const value = {
    user,
    loading,
    isAuthenticated,
    login,
    register,
    logout,
    updateUserInfo
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};