"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Power,
  PowerOff,
  Clock,
} from "lucide-react";
import type { Promotion } from "@widia/shared";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  createPromotion,
  updatePromotion,
  deletePromotion,
  togglePromotionActive,
} from "@/lib/actions/promotions";

interface PromotionsManagerProps {
  initialPromotions: Promotion[];
}

interface FormData {
  name: string;
  bannerText: string;
  bannerEmoji: string;
  stripeCouponId: string;
  endsAt: string;
  isActive: boolean;
}

const defaultFormData: FormData = {
  name: "",
  bannerText: "",
  bannerEmoji: "🎉",
  stripeCouponId: "",
  endsAt: "",
  isActive: false,
};

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function isExpired(endsAt: string): boolean {
  return new Date(endsAt) < new Date();
}

export function PromotionsManager({ initialPromotions }: PromotionsManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [promotions, setPromotions] = useState(initialPromotions);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(null);
  const [promotionToDelete, setPromotionToDelete] = useState<Promotion | null>(null);
  const [formData, setFormData] = useState<FormData>(defaultFormData);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = () => {
    setEditingPromotion(null);
    setFormData({
      ...defaultFormData,
      endsAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
    });
    setError(null);
    setDialogOpen(true);
  };

  const handleEdit = (promotion: Promotion) => {
    setEditingPromotion(promotion);
    setFormData({
      name: promotion.name,
      bannerText: promotion.bannerText,
      bannerEmoji: promotion.bannerEmoji,
      stripeCouponId: promotion.stripeCouponId || "",
      endsAt: promotion.endsAt.slice(0, 16),
      isActive: promotion.isActive,
    });
    setError(null);
    setDialogOpen(true);
  };

  const handleDelete = (promotion: Promotion) => {
    setPromotionToDelete(promotion);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (!promotionToDelete) return;

    startTransition(async () => {
      try {
        await deletePromotion(promotionToDelete.id);
        setPromotions(promotions.filter((p) => p.id !== promotionToDelete.id));
        setDeleteDialogOpen(false);
        setPromotionToDelete(null);
        router.refresh();
      } catch (err) {
        console.error("Failed to delete promotion:", err);
      }
    });
  };

  const handleToggleActive = (promotion: Promotion) => {
    startTransition(async () => {
      try {
        const updated = await togglePromotionActive(promotion.id, !promotion.isActive);
        setPromotions(
          promotions.map((p) =>
            p.id === promotion.id ? updated : { ...p, isActive: updated.isActive ? false : p.isActive }
          )
        );
        router.refresh();
      } catch (err) {
        console.error("Failed to toggle promotion:", err);
      }
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.name.trim()) {
      setError("Name is required");
      return;
    }
    if (!formData.bannerText.trim()) {
      setError("Banner text is required");
      return;
    }
    if (!formData.endsAt) {
      setError("End date is required");
      return;
    }

    startTransition(async () => {
      try {
        const payload = {
          name: formData.name.trim(),
          bannerText: formData.bannerText.trim(),
          bannerEmoji: formData.bannerEmoji || "🎉",
          stripeCouponId: formData.stripeCouponId.trim() || null,
          endsAt: new Date(formData.endsAt).toISOString(),
          isActive: formData.isActive,
        };

        if (editingPromotion) {
          const updated = await updatePromotion(editingPromotion.id, payload);
          setPromotions(
            promotions.map((p) =>
              p.id === editingPromotion.id
                ? updated
                : payload.isActive
                  ? { ...p, isActive: false }
                  : p
            )
          );
        } else {
          const created = await createPromotion(payload);
          if (payload.isActive) {
            setPromotions([created, ...promotions.map((p) => ({ ...p, isActive: false }))]);
          } else {
            setPromotions([created, ...promotions]);
          }
        }

        setDialogOpen(false);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save promotion");
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" />
          New Promotion
        </Button>
      </div>

      {promotions.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No promotions created yet. Click &quot;New Promotion&quot; to create one.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {promotions.map((promotion) => {
            const expired = isExpired(promotion.endsAt);
            return (
              <Card key={promotion.id} className={expired ? "opacity-60" : ""}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base">{promotion.name}</CardTitle>
                      {promotion.isActive && !expired && (
                        <Badge variant="default" className="bg-emerald-500">
                          Active
                        </Badge>
                      )}
                      {expired && <Badge variant="secondary">Expired</Badge>}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleToggleActive(promotion)}
                        disabled={isPending || expired}
                        title={promotion.isActive ? "Deactivate" : "Activate"}
                      >
                        {promotion.isActive ? (
                          <PowerOff className="h-4 w-4" />
                        ) : (
                          <Power className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(promotion)}
                        disabled={isPending}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(promotion)}
                        disabled={isPending}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 p-2 bg-emerald-500 text-white rounded">
                      <span>{promotion.bannerEmoji}</span>
                      <span>{promotion.bannerText}</span>
                    </div>
                    <div className="flex items-center gap-4 text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        Ends: {formatDate(promotion.endsAt)}
                      </div>
                      {promotion.stripeCouponId && (
                        <div>
                          Coupon: <code className="bg-muted px-1 rounded">{promotion.stripeCouponId}</code>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingPromotion ? "Edit Promotion" : "New Promotion"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="text-sm text-destructive bg-destructive/10 p-2 rounded">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">Name (internal)</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Black Friday 2024"
              />
            </div>

            <div className="grid grid-cols-[60px_1fr] gap-2">
              <div className="space-y-2">
                <Label htmlFor="emoji">Emoji</Label>
                <Input
                  id="emoji"
                  value={formData.bannerEmoji}
                  onChange={(e) => setFormData({ ...formData, bannerEmoji: e.target.value })}
                  className="text-center text-lg"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bannerText">Banner Text</Label>
                <Input
                  id="bannerText"
                  value={formData.bannerText}
                  onChange={(e) => setFormData({ ...formData, bannerText: e.target.value })}
                  placeholder="Oferta especial! 50% de desconto so hoje!"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="stripeCouponId">Stripe Coupon ID (optional)</Label>
              <Input
                id="stripeCouponId"
                value={formData.stripeCouponId}
                onChange={(e) => setFormData({ ...formData, stripeCouponId: e.target.value })}
                placeholder="BLACKFRIDAY50"
              />
              <p className="text-xs text-muted-foreground">
                Create the coupon in Stripe Dashboard first. This ID will be auto-applied at checkout.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="endsAt">Ends At</Label>
              <Input
                id="endsAt"
                type="datetime-local"
                value={formData.endsAt}
                onChange={(e) => setFormData({ ...formData, endsAt: e.target.value })}
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="rounded"
              />
              <Label htmlFor="isActive" className="font-normal cursor-pointer">
                Activate immediately (deactivates other active promotions)
              </Label>
            </div>

            <div className="p-3 bg-muted rounded">
              <p className="text-xs text-muted-foreground mb-2">Preview:</p>
              <div className="flex items-center gap-2 p-2 bg-emerald-500 text-white rounded text-sm">
                <span>{formData.bannerEmoji || "🎉"}</span>
                <span>{formData.bannerText || "Banner text..."}</span>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingPromotion ? "Save" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Promotion</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{promotionToDelete?.name}&quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
