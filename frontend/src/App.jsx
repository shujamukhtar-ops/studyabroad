import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './containers/AuthContext.jsx';
import { Navbar } from './components/Navbar.jsx';
import { ProtectedRoute } from './components/ProtectedRoute.jsx';
import { HomePage } from './pages/HomePage.jsx';
import { LoginPage } from './pages/LoginPage.jsx';
import { RegisterPage } from './pages/RegisterPage.jsx';
import { ProfilePage } from './pages/ProfilePage.jsx';
import { DocumentsPage } from './pages/DocumentsPage.jsx';
import { MatchesPage } from './pages/MatchesPage.jsx';
import { VisaPage } from './pages/VisaPage.jsx';

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div id="app-shell">
          <Navbar />
          <main>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
              <Route path="/documents" element={<ProtectedRoute><DocumentsPage /></ProtectedRoute>} />
              <Route path="/matches" element={<ProtectedRoute><MatchesPage /></ProtectedRoute>} />
              <Route path="/visa" element={<ProtectedRoute><VisaPage /></ProtectedRoute>} />
            </Routes>
          </main>
          <footer className="site-footer">
            <span>StudyAbroad</span>
            <span>Data from College Scorecard &amp; curated sources</span>
          </footer>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}
