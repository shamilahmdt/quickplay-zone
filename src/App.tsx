import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import Navbar from './components/layout/Navbar';
import Sidebar from './components/layout/Sidebar';
import Footer from './components/layout/Footer';
import Splashscreen from './components/ui/Splashscreen';

function LayoutContent() {
  const { dark } = useTheme();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();
  const isHomePage = location.pathname === '/';

  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 1600);
    return () => clearTimeout(timer);
  }, []);

  if (showSplash) {
    return <Splashscreen />;
  }

  if (isHomePage) {
    return (
      <div className={`flex flex-col min-h-screen transition-colors duration-300 ${
        dark ? 'bg-[#121214] text-slate-100' : 'bg-[#FDFDFD] text-slate-900'
      } selection:bg-white selection:text-black`}>
        <main className="flex-1 flex flex-col min-w-0">
          <Outlet />
        </main>
      </div>
    );
  }

  return (
    <div className={`flex flex-col min-h-screen transition-colors duration-300 ${
      dark ? 'bg-[#121214] text-slate-100' : 'bg-[#FDFDFD] text-slate-900'
    } selection:bg-white selection:text-black`}>
      {/* Top Navigation */}
      <Navbar onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)} />

      {/* Main Workspace */}
      <div className="flex-1 flex relative">
        {/* Collapsible Sidebar */}
        <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

        {/* Dynamic Page Content */}
        <main className="flex-1 flex flex-col min-w-0">
          <Outlet />
        </main>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <LayoutContent />
    </ThemeProvider>
  );
}

export default App;
