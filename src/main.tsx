// src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';

// 1. Bootstrap CSS
import 'bootstrap/dist/css/bootstrap.min.css';

// 2. Font Awesome CSS
import 'font-awesome/css/font-awesome.min.css'; // Or your specific FA version path

// 3. KaTeX CSS
import 'katex/dist/katex.min.css';

// 4. PrismJS Theme CSS (Okaidia theme from your prototype)
// You can choose other themes from 'prismjs/themes/'
import 'prismjs/themes/prism-okaidia.css';
// PrismJS Line Numbers plugin CSS
import 'prismjs/plugins/line-numbers/prism-line-numbers.css';


// 5. React Toastify CSS
import 'react-toastify/dist/ReactToastify.css';

// 6. Your custom global styles (should be imported last to allow overrides)
import './styles/global.css';


ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);