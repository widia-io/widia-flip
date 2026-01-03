"use client";

import { FeatureTour } from "@/components/FeatureTour";

interface FeatureTourWrapperProps {
  autoStart?: boolean;
}

export function FeatureTourWrapper({ autoStart = false }: FeatureTourWrapperProps) {
  return <FeatureTour autoStart={autoStart} />;
}
