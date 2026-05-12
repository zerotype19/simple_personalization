import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import ComparePage from "./pages/Compare";
import FinancePage from "./pages/Finance";
import HomePage from "./pages/Home";
import InventoryPage from "./pages/Inventory";
import TestDrivePage from "./pages/TestDrive";
import TradeInPage from "./pages/TradeIn";
import VehiclePage from "./pages/Vehicle";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="inventory" element={<InventoryPage />} />
        <Route path="vehicle/:id" element={<VehiclePage />} />
        <Route path="finance" element={<FinancePage />} />
        <Route path="compare" element={<ComparePage />} />
        <Route path="trade-in" element={<TradeInPage />} />
        <Route path="test-drive" element={<TestDrivePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
