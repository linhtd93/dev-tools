import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HelmetProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/json-formatter" element={<App />} />
          <Route path="/json-parser" element={<App />} />
          <Route path="/xml-formatter" element={<App />} />
          <Route path="/js-beautifier" element={<App />} />
          <Route path="/code-formatter" element={<App />} />
          <Route path="/base64-image" element={<App />} />
          <Route path="/uuid-generator" element={<App />} />
          <Route path="/jwt-tool" element={<App />} />
          <Route path="/timestamp-converter" element={<App />} />
          <Route path="/text-diff" element={<App />} />
          <Route path="/hash-generator" element={<App />} />
          <Route path="/encoding-tool" element={<App />} />
          <Route path="/case-converter" element={<App />} />
          <Route path="/rsa-encryption" element={<App />} />
        </Routes>
      </BrowserRouter>
    </HelmetProvider>
  </React.StrictMode>,
)
