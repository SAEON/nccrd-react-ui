import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import RequireAuth from './components/RequireAuth'
// Home is loaded eagerly — it's the landing route almost every visit hits
// first, so splitting it into its own chunk would only add a network
// round-trip (fetch the app shell, then fetch Home) for the common case.
// Everything else is a secondary route, lazy-loaded so a first-time visitor
// isn't charged for SubmissionForm's large vocab-driven field set,
// AdminCreateUser, etc. until they actually navigate there.
import Home from './pages/Home'
const SubmissionDetails = lazy(() => import('./pages/SubmissionDetails'))
const SubmissionForm = lazy(() => import('./pages/SubmissionForm'))
const Login = lazy(() => import('./pages/Login'))
const ChangePassword = lazy(() => import('./pages/ChangePassword'))
const AdminCreateUser = lazy(() => import('./pages/AdminCreateUser'))
const NotFound = lazy(() => import('./pages/NotFound'))

function App() {
  return (
    <Suspense fallback={null}>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="login" element={<Login />} />
          <Route path="change-password" element={<ChangePassword />} />
          <Route path="admin/users/new" element={<RequireAuth><AdminCreateUser /></RequireAuth>} />
          <Route path="submission/:id" element={<SubmissionDetails />} />
          <Route path="submission/new" element={<RequireAuth><SubmissionForm /></RequireAuth>} />
          <Route path="submission/edit/:id" element={<RequireAuth><SubmissionForm /></RequireAuth>} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </Suspense>
  )
}

export default App
