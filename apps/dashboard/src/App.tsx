import { Route, Routes } from "react-router-dom";
import AdminSignupsPage from "./pages/AdminSignupsPage";
import MainDashboard from "./pages/MainDashboard";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<MainDashboard />} />
      <Route path="/admin/signups" element={<AdminSignupsPage />} />
    </Routes>
  );
}
