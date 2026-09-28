import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopHeader } from './TopHeader';

export const AppLayout = () => {
  return (
    <div className="cinematic-shell">
      {/* Left Icon Sidebar Dock */}
      <Sidebar />

      {/* Main Content Pane */}
      <div className="cinematic-content-pane">
        <TopHeader />
        <main className="cinematic-page-body">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
