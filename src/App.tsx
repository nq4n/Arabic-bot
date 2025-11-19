import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Topics from './pages/Topics';
import Topic from './pages/Topic';
import Write from './pages/Write';
import Evaluate from './pages/Evaluate';
import Teacher from './pages/Teacher';

function App() {
  return (
    <Router>
      <Navbar />
      <main>
        <Routes>
          <Route path="/" element={<Topics />} />
          <Route path="/topic/:topicId" element={<Topic />} />
          <Route path="/write/:topicId" element={<Write />} />
          <Route path="/evaluate/:topicId/:submissionId?" element={<Evaluate />} />
          <Route path="/teacher" element={<Teacher />} />
        </Routes>
      </main>
      <Footer />
    </Router>
  );
}

export default App;
