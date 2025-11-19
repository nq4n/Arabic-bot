import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Topics from './pages/Topics';
import Topic from './pages/Topic';
import Write from './pages/Write';
import Evaluate from './pages/Evaluate';
import Teacher from './pages/Teacher';
import { ThemeProvider } from './hooks/useTheme';

function App() {
  return (
    <ThemeProvider>
      <div className="app-container">
        <Navbar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Topics />} />
            <Route path="/topic/:topicId" element={<Topic />} />
            <Route path="/write/:topicId" element={<Write />} />
            <Route path="/evaluate/:topicId/:submissionId?" element={<Evaluate />} />
            <Route path="/teacher" element={<Teacher />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </ThemeProvider>
  );
}

export default App;
