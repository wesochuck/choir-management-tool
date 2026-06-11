import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './contexts/AuthContext.tsx'
import { DialogProvider } from './contexts/DialogProvider.tsx'
import { ChoirNameProvider } from './hooks/useDocumentTitle.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <ChoirNameProvider>
        <DialogProvider>
          <App />
        </DialogProvider>
      </ChoirNameProvider>
    </AuthProvider>
  </StrictMode>,
)
