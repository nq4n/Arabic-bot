import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { SessionProvider } from './hooks/SessionContext';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <SessionProvider>
    <App />
  </SessionProvider>
);
