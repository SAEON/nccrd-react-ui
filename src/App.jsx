import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import RequireAuth from './components/RequireAuth'
import Home from './pages/Home'
import SubmissionDetails from './pages/SubmissionDetails'
import SubmissionForm from './pages/SubmissionForm'
import Login from './pages/Login'
import ChangePassword from './pages/ChangePassword'
import AdminCreateUser from './pages/AdminCreateUser'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="login" element={<Login />} />
        <Route path="change-password" element={<ChangePassword />} />
        <Route path="admin/users/new" element={<RequireAuth><AdminCreateUser /></RequireAuth>} />
        <Route path="submission/:id" element={<SubmissionDetails />} />
        <Route path="submission/new" element={<RequireAuth><SubmissionForm /></RequireAuth>} />
        <Route path="submission/edit/:id" element={<RequireAuth><SubmissionForm /></RequireAuth>} />
      </Route>
    </Routes>
  )
}

export default App
