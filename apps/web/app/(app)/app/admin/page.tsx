import Link from "next/link";
import {
  Users,
  Building2,
  Home,
  Search,
  Camera,
  HardDrive,
  ChevronRight,
  Megaphone,
  BarChart3,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAdminStats } from "@/lib/actions/admin";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export default async function AdminDashboardPage() {
  const stats = await getAdminStats();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">System overview and metrics</p>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/app/admin/metrics"
            className="flex items-center gap-1 text-sm text-primary hover:underline"
          >
            <BarChart3 className="h-4 w-4" />
            SaaS Metrics
          </Link>
          <Link
            href="/app/admin/promotions"
            className="flex items-center gap-1 text-sm text-primary hover:underline"
          >
            <Megaphone className="h-4 w-4" />
            Promotions
          </Link>
          <Link
            href="/app/admin/users"
            className="flex items-center gap-1 text-sm text-primary hover:underline"
          >
            Manage Users
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Users Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.users.total}</div>
            <div className="mt-2 space-y-1 text-xs text-muted-foreground">
              {Object.entries(stats.users.byTier).map(([tier, count]) => (
                <div key={tier} className="flex justify-between">
                  <span className="capitalize">{tier}</span>
                  <span className="font-medium">{count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Workspaces Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Workspaces</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.workspaces.total}</div>
            <p className="mt-1 text-xs text-muted-foreground">
              Total workspaces created
            </p>
          </CardContent>
        </Card>

        {/* Properties Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Properties</CardTitle>
            <Home className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.properties.total}</div>
            <div className="mt-2 space-y-1 text-xs text-muted-foreground">
              {Object.entries(stats.properties.byStatus).map(
                ([status, count]) => (
                  <div key={status} className="flex justify-between">
                    <span className="capitalize">
                      {status.replace(/_/g, " ")}
                    </span>
                    <span className="font-medium">{count}</span>
                  </div>
                )
              )}
            </div>
          </CardContent>
        </Card>

        {/* Prospects Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Prospects</CardTitle>
            <Search className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.prospects.total}</div>
            <div className="mt-2 space-y-1 text-xs text-muted-foreground">
              {Object.entries(stats.prospects.byStatus).map(
                ([status, count]) => (
                  <div key={status} className="flex justify-between">
                    <span className="capitalize">{status}</span>
                    <span className="font-medium">{count}</span>
                  </div>
                )
              )}
            </div>
          </CardContent>
        </Card>

        {/* Snapshots Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Snapshots</CardTitle>
            <Camera className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.snapshots.cash + stats.snapshots.financing}
            </div>
            <div className="mt-2 space-y-1 text-xs text-muted-foreground">
              <div className="flex justify-between">
                <span>Cash</span>
                <span className="font-medium">{stats.snapshots.cash}</span>
              </div>
              <div className="flex justify-between">
                <span>Financing</span>
                <span className="font-medium">{stats.snapshots.financing}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Storage Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Storage</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatBytes(stats.storage.totalBytes)}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {stats.storage.totalFiles} files stored
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
