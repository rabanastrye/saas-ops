import type { Metadata } from "next";

import { Dashboard } from "./dashboard";

export const metadata: Metadata = { title: "Dashboard · saas-ops" };

export default function DashboardPage() {
  return <Dashboard />;
}
