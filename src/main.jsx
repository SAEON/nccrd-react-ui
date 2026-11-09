import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { CurrentUserProvider } from './context/CurrentUserProvider'
import { SiteProvider } from './context/SiteProvider'
import { siteAddress, siteBasename } from './utils/site'
import './index.css'

// A province site lives under its province's path, e.g. /mpumalanga/reports;
// earlier addresses (?siteprovince=mpumalanga) move there first.
const address = siteAddress(window.location)
if (address) window.history.replaceState(null, '', address)

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter basename={siteBasename(window.location.pathname)}>
      <SiteProvider>
        <CurrentUserProvider>
          <App />
        </CurrentUserProvider>
      </SiteProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
