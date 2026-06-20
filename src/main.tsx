import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import './index.css';
import App from './App.tsx';
import { AuthProvider } from './contexts/AuthContext.tsx';
import { DialogProvider } from './contexts/DialogProvider.tsx';
import { ChoirNameProvider } from './hooks/useDocumentTitle.tsx';
import { queryClient } from './lib/queryClient.ts';
import { setBasePath } from '@shoelace-style/shoelace/dist/utilities/base-path.js';

setBasePath('https://cdn.jsdelivr.net/npm/@shoelace-style/shoelace@2.20.1/dist/');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ChoirNameProvider>
          <DialogProvider>
            <App />
          </DialogProvider>
        </ChoirNameProvider>
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>
);
