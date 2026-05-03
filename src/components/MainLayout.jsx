import { useState, useCallback } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

function MainLayout() {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const toggleSidebar = useCallback(() => setSidebarOpen(prev => !prev), []);
    const closeSidebar = useCallback(() => setSidebarOpen(false), []);

    return (
        <>
            {/* Hamburger button — visible only on mobile via CSS */}
            <button
                type="button"
                className="sidebar-toggle"
                onClick={toggleSidebar}
                aria-label={sidebarOpen ? 'Закрыть меню' : 'Открыть меню'}
            >
                {sidebarOpen ? '✕' : '☰'}
            </button>
            {/* Overlay behind sidebar on mobile */}
            <div
                className={`sidebar-overlay${sidebarOpen ? ' active' : ''}`}
                onClick={closeSidebar}
            />
            <Sidebar isOpen={sidebarOpen} onNavigate={closeSidebar} />
            <Header />
            <Outlet />
        </>
    );
}

export default MainLayout;
