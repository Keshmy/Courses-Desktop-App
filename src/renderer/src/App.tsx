import { HashRouter } from 'react-router-dom'
import { AuthProvider } from '@/app/AuthContext'
import { AppRoutes } from '@/app/routes'

function App(): React.JSX.Element {
  return (
    <HashRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </HashRouter>
  )
}

export default App
