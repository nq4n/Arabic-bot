
import ReactDOM from 'react-dom/client';
import Root from './App';
import './index.css';
import { ThemeProvider } from './hooks/ThemeContext';

ReactDOM.createRoot(document.getElementById('root')!).render(
    <ThemeProvider>
      <Root />
    </ThemeProvider>
);
