import { Routes, Route, Link } from "react-router-dom";
import Home from "./pages/Home";
import Admin from "./pages/Admin";
import TagPage from "./pages/TagPage";

export default function App() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <Link to="/" className="text-xl font-bold tracking-tight">
          Board Game Classifier
        </Link>
        <Link to="/admin" className="text-sm text-slate-500 hover:text-slate-800">
          Admin
        </Link>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-10">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/tag/:tagType/:tagName" element={<TagPage />} />
        </Routes>
      </main>
    </div>
  );
}
