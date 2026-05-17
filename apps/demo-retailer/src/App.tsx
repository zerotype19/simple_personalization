import { Navigate, Route, Routes } from "react-router-dom";
import DemoLayout from "./components/DemoLayout";
import ComparePage from "./pages/Compare";
import FinancePage from "./pages/Finance";
import InventoryPage from "./pages/Inventory";
import LiveDemoHub from "./pages/LiveDemoHub";
import TestDrivePage from "./pages/TestDrive";

export default function App() {
  return (
    <Routes>
      <Route element={<DemoLayout />}>
        <Route index element={<LiveDemoHub />} />
        <Route path="compare" element={<ComparePage />} />
        <Route path="finance" element={<FinancePage />} />
        <Route path="inventory" element={<InventoryPage />} />
        <Route path="test-drive" element={<TestDrivePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
