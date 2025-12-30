import React from 'react';
import ReactDOM from 'react-dom/'; // 注意這裡要加斜線，對應你的 importmap
import App from './App.tsx';      // 瀏覽器環境下建議補上副檔名

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
