import { HashRouter } from 'react-router-dom'
import { Toaster } from 'sonner'
import { AuthProvider } from '@/app/AuthContext'
import { AppRoutes } from '@/app/routes'
import { UpdateToasts } from '@/components/UpdateToasts'
import { ActivationGate } from '@/features/activation/ActivationGate'

function App(): React.JSX.Element {
  return (
    <>
      <HashRouter>
        <AuthProvider>
          <ActivationGate>
            <AppRoutes />
          </ActivationGate>
        </AuthProvider>
      </HashRouter>
      <UpdateToasts />
      <Toaster richColors closeButton position="bottom-right" />
    </>
  )
}

export default App
