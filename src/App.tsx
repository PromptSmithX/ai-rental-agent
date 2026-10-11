import React, { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { TopNav } from '@/shared/ui/TopNav';
import { AppRoutes } from '@/app/routes';
import { useSearchStore } from '@/app/store/searchStore';

export const App: React.FC = () => {
  const { initData } = useSearchStore();

  useEffect(() => {
    initData();
  }, [initData]);

  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col bg-canvas">
        <TopNav />
        <div className="flex-1">
          <AppRoutes />
        </div>
      </div>
    </BrowserRouter>
  );
};

export default App;
