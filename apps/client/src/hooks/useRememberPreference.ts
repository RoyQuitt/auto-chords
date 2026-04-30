import { useEffect, useState } from "react";

const REMEMBER_KEY = "spotify_chords_remember_me";

export function useRememberPreference() {
  const [rememberMe, setRememberMe] = useState<boolean>(() => {
    return window.localStorage.getItem(REMEMBER_KEY) === "1";
  });

  useEffect(() => {
    window.localStorage.setItem(REMEMBER_KEY, rememberMe ? "1" : "0");
  }, [rememberMe]);

  return { rememberMe, setRememberMe };
}
