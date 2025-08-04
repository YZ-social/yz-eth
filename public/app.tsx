import { CssBaseline } from '@mui/material'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './components/App'
import YZProvider from '../src/components/YZProvider'

const theme = createTheme({
  palette: {
    primary: {
      main: '#B05823',
    },
    secondary: {
      main: '#8B4513',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <YZProvider>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <App />
      </ThemeProvider>
    </YZProvider>
  </React.StrictMode>,
)
