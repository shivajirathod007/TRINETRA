import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './styles/main.css'
import App from './App.jsx'
import { ThemeProvider } from './context/ThemeContext.jsx'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 60_000,          // 1 min — don't refetch on every focus
      gcTime: 5 * 60_000,         // 5 min cache
      refetchOnWindowFocus: false, // prevent refetch storm on tab switch
      refetchOnMount: false,       // use cached data on remount
    },
  },
})

createRoot(document.getElementById('root')).render(
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </QueryClientProvider>,
)
