"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MobileStickyBarProps {
  isLoggedIn: boolean;
}

export function MobileStickyBar({ isLoggedIn }: MobileStickyBarProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Show after scrolling past hero (approx 500px)
      const shouldShow = window.scrollY > 500;
      setIsVisible(shouldShow && !isDismissed);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isDismissed]);

  if (!isVisible) return null;

  return (
    <div
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50 sm:hidden",
        "border-t border-border bg-background/95 backdrop-blur-lg",
        "px-4 py-3 shadow-[0_-4px_20px_-4px_rgba(0,0,0,0.15)]",
        "animate-in slide-in-from-bottom duration-300"
      )}
    >
      <div className="flex items-center gap-3">
        <Button asChild className="flex-1 shadow-lg shadow-primary/25">
          <Link href={isLoggedIn ? "/app" : "/login?tab=signup"}>
            Testar grátis
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
        <button
          onClick={() => setIsDismissed(true)}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          aria-label="Fechar"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      <p className="mt-2 text-center text-xs text-muted-foreground">
        Sem cartão de crédito
      </p>
    </div>
  );
}
