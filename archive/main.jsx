import React from 'react'
import ReactDOM from 'react-dom/client'
import { ChartAreaInteractive } from './components/ChartAreaInteractive'
import { EnhancedShowcase } from './components/EnhancedShowcase'
import { Toaster } from './components/ui/sonner'
import './index.css'

// Mount the interactive chart if container exists
const chartContainer = document.getElementById('react-chart-container')
if (chartContainer) {
  ReactDOM.createRoot(chartContainer).render(
    <React.StrictMode>
      <ChartAreaInteractive />
    </React.StrictMode>
  )
}

// Mount the enhanced showcase if container exists
const showcaseContainer = document.getElementById('react-enhanced-showcase')
if (showcaseContainer) {
  ReactDOM.createRoot(showcaseContainer).render(
    <React.StrictMode>
      <EnhancedShowcase />
      <Toaster />
    </React.StrictMode>
  )
}

// Add global toast notifications for form submissions
window.addEventListener('load', () => {
  // Check if we're on the application page
  if (window.location.pathname.includes('application.html')) {
    const form = document.getElementById('applicationForm')
    if (form) {
      // Inject toaster for application form
      const toasterContainer = document.createElement('div')
      toasterContainer.id = 'toaster-container'
      document.body.appendChild(toasterContainer)
      
      ReactDOM.createRoot(toasterContainer).render(
        <React.StrictMode>
          <Toaster />
        </React.StrictMode>
      )
    }
  }
})

// Export toast for use in vanilla JS
export { toast } from 'sonner'
