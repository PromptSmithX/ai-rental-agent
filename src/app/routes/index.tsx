import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { HomePage } from '@/features/home/HomePage';
import { WorkspacePage } from '@/features/search/components/WorkspacePage';
import { RoomInsightPage } from '@/features/rooms/components/RoomInsightPage';

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/workspace" element={<WorkspacePage />} />
      <Route path="/rooms/:id" element={<RoomInsightPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};
