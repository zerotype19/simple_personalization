import { Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { DemoPage } from "./pages/DemoPage";
import { HomePage } from "./pages/HomePage";
import { InstallPage } from "./pages/InstallPage";
import { IntegrationsPage } from "./pages/IntegrationsPage";
import { LoginPage } from "./pages/LoginPage";
import { PrivacyPage } from "./pages/PrivacyPage";
import { SignupPage } from "./pages/SignupPage";
import { ThankYouPage } from "./pages/ThankYouPage";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/demo" element={<DemoPage />} />
        <Route path="/install" element={<InstallPage />} />
        <Route path="/integrations" element={<IntegrationsPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/thank-you" element={<ThankYouPage />} />
      </Route>
    </Routes>
  );
}
