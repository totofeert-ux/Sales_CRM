import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { ContactsProvider } from '@/hooks/use-contacts'
import { DealsProvider } from '@/hooks/use-deals'
import { BrowserRouter } from 'react-router-dom'


createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <DealsProvider>
      <ContactsProvider>
        <App />
      </ContactsProvider>
    </DealsProvider>
  </BrowserRouter>
);
