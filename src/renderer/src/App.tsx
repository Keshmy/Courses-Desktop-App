import { HashRouter } from 'react-router-dom'
import { AuthProvider } from '@/app/AuthContext'
import { AppRoutes } from '@/app/routes'
import { ActivationGate } from '@/features/activation/ActivationGate'

function App(): React.JSX.Element {
  return (
    <HashRouter>
      <AuthProvider>
        <ActivationGate>
          <AppRoutes />
        </ActivationGate>
      </AuthProvider>
    </HashRouter>
  )
}

export default App
