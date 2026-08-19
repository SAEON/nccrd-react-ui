import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import SubmissionDetails from './pages/SubmissionDetails'
import SubmissionForm from './pages/SubmissionForm'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="submission/:id" element={<SubmissionDetails />} />
        <Route path="submission/new" element={<SubmissionForm />} />
        <Route path="submission/edit/:id" element={<SubmissionForm />} />
      </Route>
    </Routes>
  )
}

export default App
