import type { SessionProfile } from "@si/shared";
import { getState, subscribe } from "@si/sdk";
import { useEffect, useState } from "react";

export function useDemoProfile(): SessionProfile | null {
  const [profile, setProfile] = useState<SessionProfile | null>(() => getState());

  useEffect(() => {
    setProfile(getState());
    return subscribe((p) => setProfile({ ...p }));
  }, []);

  return profile;
}
