"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { setHapticsState } from "@/lib/haptic";

interface HapticsContextType {
  isHapticsEnabled: boolean;
  setIsHapticsEnabled: (enabled: boolean) => void;
}

const HapticsContext = createContext<HapticsContextType | undefined>(undefined);

export function HapticProvider({ children }: { children: React.ReactNode }) {
  const [isHapticsEnabled, setIsHapticsEnabledState] = useState(true);

  useEffect(() => {
    // Read from localStorage on mount
    const stored = localStorage.getItem("envault_haptics_enabled");
    if (stored !== null) {
      const parsed = stored === "true";
      setIsHapticsEnabledState(parsed);
      setHapticsState(parsed);
    } else {
      // Default is true
      setHapticsState(true);
    }
  }, []);

  const setIsHapticsEnabled = (enabled: boolean) => {
    setIsHapticsEnabledState(enabled);
    setHapticsState(enabled);
    localStorage.setItem("envault_haptics_enabled", String(enabled));
  };

  return (
    <HapticsContext.Provider value={{ isHapticsEnabled, setIsHapticsEnabled }}>
      {children}
    </HapticsContext.Provider>
  );
}

export function useHaptics() {
  const context = useContext(HapticsContext);
  if (context === undefined) {
    throw new Error("useHaptics must be used within a HapticProvider");
  }
  return context;
}
