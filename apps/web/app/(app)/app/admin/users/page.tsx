import Link from "next/link";
import { ArrowLeft, Eye, UserX, UserCheck } from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { listAdminUsers } from "@/lib/actions/admin";

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function TierBadge({ tier }: { tier: string | null }) {
  if (!tier || tier === "none") {
    return <Badge variant="secondary">No tier</Badge>;
  }

  const variants: Record<string, "default" | "secondary" | "outline"> = {
    starter: "outline",
    pro: "default",
    growth: "secondary",
  };

  return (
    <Badge variant={variants[tier] ?? "outline"} className="capitalize">
      {tier}
    </Badge>
  );
}

function StatusBadge({ isActive }: { isActive: boolean }) {
  return isActive ? (
    <Badge variant="default" className="bg-green-600 hover:bg-green-700">
      <UserCheck className="mr-1 h-3 w-3" />
      Active
    </Badge>
  ) : (
    <Badge variant="destructive">
      <UserX className="mr-1 h-3 w-3" />
      Inactive
    </Badge>
  );
}

export default async function AdminUsersPage() {
  const { items: users, total } = await listAdminUsers({ limit: 50 });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/app/admin"
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Users</h1>
          <p className="text-sm text-muted-foreground">{total} users total</p>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Tier</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-center">Workspaces</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">
                  {user.name}
                  {user.isAdmin && (
                    <Badge variant="outline" className="ml-2 text-xs">
                      Admin
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {user.email}
                </TableCell>
                <TableCell>
                  <TierBadge tier={user.tier} />
                </TableCell>
                <TableCell>
                  <StatusBadge isActive={user.isActive} />
                </TableCell>
                <TableCell className="text-center">
                  {user.workspaceCount}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDate(user.createdAt)}
                </TableCell>
                <TableCell className="text-right">
                  <Link
                    href={`/app/admin/users/${user.id}`}
                    className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                  >
                    <Eye className="h-4 w-4" />
                    View
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
