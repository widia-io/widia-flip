"use client";

import { useEffect, useState } from "react";
import { X, Clock } from "lucide-react";
import type { ActiveBanner } from "@widia/shared";

interface PromoBannerProps {
  banner: ActiveBanner;
}

function formatTimeLeft(targetDate: Date): string {
  const now = new Date();
  const diff = targetDate.getTime() - now.getTime();

  if (diff <= 0) return "0d:0h:0m:0s";

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  return `${days}d:${hours.toString().padStart(2, "0")}h:${minutes.toString().padStart(2, "0")}m:${seconds.toString().padStart(2, "0")}s`;
}

function PromoBannerContent({ banner }: PromoBannerProps) {
  const [timeLeft, setTimeLeft] = useState("");
  const [dismissed, setDismissed] = useState(false);
  const [expired, setExpired] = useState(false);

  const storageKey = `promo_banner_dismissed_${banner.id}`;

  useEffect(() => {
    // Check if dismissed in localStorage
    if (typeof window !== "undefined") {
      const isDismissed = localStorage.getItem(storageKey) === "true";
      setDismissed(isDismissed);
    }
  }, [storageKey]);

  useEffect(() => {
    const targetDate = new Date(banner.endsAt);

    const updateTimer = () => {
      const now = new Date();
      if (now >= targetDate) {
        setExpired(true);
        return;
      }
      setTimeLeft(formatTimeLeft(targetDate));
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [banner.endsAt]);

  const handleDismiss = () => {
    setDismissed(true);
    if (typeof window !== "undefined") {
      localStorage.setItem(storageKey, "true");
    }
  };

  if (dismissed || expired) {
    return null;
  }

  return (
    <div className="bg-emerald-500 text-white px-4 py-2.5 relative z-50">
      <div className="container mx-auto flex items-center justify-center gap-4">
        <div className="flex items-center gap-2 text-sm font-medium">
          <span className="text-base">{banner.bannerEmoji}</span>
          <span>{banner.bannerText}</span>
        </div>

        <div className="flex items-center gap-1.5 bg-white/20 rounded-full px-3 py-1 text-sm font-mono">
          <Clock className="h-3.5 w-3.5" />
          <span>{timeLeft}</span>
        </div>

        <button
          onClick={handleDismiss}
          className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-white/20 rounded transition-colors"
          aria-label="Fechar banner"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export function PromoBanner() {
  const [banner, setBanner] = useState<ActiveBanner | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchBanner() {
      try {
        const res = await fetch("/api/promotions/active-banner");
        if (res.ok) {
          const data = await res.json();
          setBanner(data.banner);
        }
      } catch (error) {
        console.error("Failed to fetch promo banner:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchBanner();
  }, []);

  if (loading || !banner) {
    return null;
  }

  return <PromoBannerContent banner={banner} />;
}
