import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Home from './pages/Home';
import Questions from './pages/Questions';
import Categories from './pages/Categories';
import Profile from './pages/Profile';
import Users from './pages/Users';
import Exams from './pages/Exams';
import MyAnswers from './pages/MyAnswers';
import AIAgents from './pages/AIAgents';

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        <Route path="/" element={
          <ProtectedRoute>
            <Home />
          </ProtectedRoute>
        } />
        
        <Route path="/questions" element={
          <ProtectedRoute>
            <Questions />
          </ProtectedRoute>
        } />
        
        <Route path="/categories" element={
          <ProtectedRoute>
            <Categories />
          </ProtectedRoute>
        } />
        
        <Route path="/exams" element={
          <ProtectedRoute>
            <Exams />
          </ProtectedRoute>
        } />
        
        <Route path="/my-answers" element={
          <ProtectedRoute>
            <MyAnswers />
          </ProtectedRoute>
        } />
        
        <Route path="/ai-agents" element={
          <ProtectedRoute>
            <AIAgents />
          </ProtectedRoute>
        } />
        
        <Route path="/profile" element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        } />
        
        <Route path="/users" element={
          <ProtectedRoute roles={['admin']}>
            <Users />
          </ProtectedRoute>
        } />
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;