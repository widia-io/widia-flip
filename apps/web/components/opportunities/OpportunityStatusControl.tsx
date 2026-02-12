"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { OpportunityStatus } from "@widia/shared";

import { updateOpportunityStatusAction } from "@/lib/actions/opportunities";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface OpportunityStatusControlProps {
  opportunityId: string;
  status: OpportunityStatus;
  onUpdated?: (status: OpportunityStatus) => void;
  compact?: boolean;
}

const statusOptions: Array<{ value: OpportunityStatus; label: string }> = [
  { value: "new", label: "Novo" },
  { value: "viewed", label: "Visto" },
  { value: "contacted", label: "Contatado" },
  { value: "discarded", label: "Descartado" },
];

export function OpportunityStatusControl({
  opportunityId,
  status,
  onUpdated,
  compact = false,
}: OpportunityStatusControlProps) {
  const router = useRouter();
  const [value, setValue] = useState<OpportunityStatus>(status);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setValue(status);
  }, [status]);

  const handleChange = (nextStatus: OpportunityStatus) => {
    if (nextStatus === value) return;

    const previousStatus = value;
    setValue(nextStatus);

    startTransition(async () => {
      const result = await updateOpportunityStatusAction(opportunityId, nextStatus);
      if (result.error) {
        setValue(previousStatus);
        toast.error("Falha ao atualizar status", {
          description: result.error,
        });
        return;
      }

      onUpdated?.(nextStatus);
      router.refresh();
      toast.success("Status atualizado");
    });
  };

  return (
    <div className="flex items-center gap-2">
      {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" /> : null}
      <Select
        value={value}
        onValueChange={(nextStatus) => handleChange(nextStatus as OpportunityStatus)}
        disabled={isPending}
      >
        <SelectTrigger className={compact ? "h-8 w-[132px]" : "w-[160px]"}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {statusOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
