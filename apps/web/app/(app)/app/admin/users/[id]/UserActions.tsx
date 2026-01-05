"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import type { BillingTier } from "@widia/shared";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  updateUserTier,
  updateUserStatus,
  deleteUser,
} from "@/lib/actions/admin";

interface UserActionsProps {
  userId: string;
  currentTier: string;
  isActive: boolean;
  isAdmin: boolean;
}

export function UserActions({
  userId,
  currentTier,
  isActive,
  isAdmin,
}: UserActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [tier, setTier] = useState<BillingTier>(
    (currentTier as BillingTier) || "starter"
  );
  const [error, setError] = useState<string | null>(null);

  const handleTierChange = (newTier: BillingTier) => {
    setTier(newTier);
    setError(null);
    startTransition(async () => {
      try {
        await updateUserTier(userId, newTier);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to update tier");
      }
    });
  };

  const handleToggleStatus = () => {
    setError(null);
    startTransition(async () => {
      try {
        await updateUserStatus(userId, !isActive);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to update status");
      }
    });
  };

  const handleDelete = () => {
    setError(null);
    startTransition(async () => {
      try {
        await deleteUser(userId);
        router.push("/app/admin/users");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to delete user");
      }
    });
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-4">
        {/* Tier Selector */}
        <div className="flex items-center gap-2">
          <label className="text-sm text-muted-foreground">Tier:</label>
          <Select
            value={tier}
            onValueChange={(v) => handleTierChange(v as BillingTier)}
            disabled={isPending}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="starter">Starter</SelectItem>
              <SelectItem value="pro">Pro</SelectItem>
              <SelectItem value="growth">Growth</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Toggle Active/Inactive */}
        <Button
          variant={isActive ? "outline" : "default"}
          size="sm"
          onClick={handleToggleStatus}
          disabled={isPending || isAdmin}
        >
          {isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : null}
          {isActive ? "Deactivate" : "Activate"}
        </Button>
        {isAdmin && (
          <span className="text-xs text-muted-foreground">
            Cannot deactivate admin
          </span>
        )}

        {/* Delete User */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="destructive"
              size="sm"
              disabled={isPending || isAdmin}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete User
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete User</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete this user and all their data,
                including workspaces, properties, prospects, and documents. This
                action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Delete Permanently
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
