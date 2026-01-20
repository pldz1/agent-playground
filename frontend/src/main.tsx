import { createRoot } from 'react-dom/client';
import App from './app/App';
import './styles/index.css';
import 'md-editor-rt/lib/style.css';
import { initializeStore } from './store';

const container = document.getElementById('root');
if (!container) {
  throw new Error('Root element with id "root" not found');
}

const renderApp = () => {
  createRoot(container).render(<App />);
};

initializeStore()
  .catch((error: any) => {
    console.error('Failed to initialize application store', error);
  })
  .finally(renderApp);
