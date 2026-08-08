import { PropertiesProvider, useProperty } from './hooks/PropertiesContext'
import { navigate, useHashRoute } from './hooks/useHashRoute'
import DashboardPage from './pages/DashboardPage'
import NewPropertyPage from './pages/NewPropertyPage'
import PropertyPage from './pages/PropertyPage'
import ComparePage from './pages/ComparePage'
import ReportPage from './pages/ReportPage'

function Router() {
  const route = useHashRoute()
  const [first, id, sub] = route.path
  const property = useProperty(first === 'property' ? id : undefined)

  if (first === 'new') return <NewPropertyPage />
  if (first === 'compare') {
    return <ComparePage ids={(route.params.get('ids') ?? '').split(',').filter(Boolean)} />
  }
  if (first === 'property' && id) {
    if (!property) {
      return (
        <div className="px-4 pt-8 text-center text-gray-500">
          <p>Bien introuvable.</p>
          <button className="btn mt-3" onClick={() => navigate('/')}>
            ← Tableau de bord
          </button>
        </div>
      )
    }
    if (sub === 'report') return <ReportPage property={property} />
    return <PropertyPage property={property} tab={route.params.get('tab') ?? undefined} />
  }
  return <DashboardPage />
}

export default function App() {
  return (
    <PropertiesProvider>
      <header className="no-print sticky top-0 z-30 bg-blue-800 px-4 py-2.5 text-white shadow">
        <button className="font-bold" onClick={() => navigate('/')}>
          🏠 Immobilier Analyzer
        </button>
        <span className="float-right text-xs opacity-75">Données stockées localement</span>
      </header>
      <Router />
    </PropertiesProvider>
  )
}
