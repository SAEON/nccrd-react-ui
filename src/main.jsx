import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { CurrentUserProvider } from './context/CurrentUserProvider'
import { SiteProvider } from './context/SiteProvider'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <SiteProvider>
        <CurrentUserProvider>
          <App />
        </CurrentUserProvider>
      </SiteProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
