"use client";

import { useEffect, useState } from "react";
import { supabase } from "../supabase";

export function usePerfis() {
  const [mapPerfis, setMapPerfis] = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("profiles").select("username, avatar_url");
      if (!data) return;
      const m: Record<string, string> = {};
      data.forEach((p) => {
        if (p.username && p.avatar_url) m[p.username] = p.avatar_url;
      });
      setMapPerfis(m);
    })();
  }, []);

  return mapPerfis;
}
