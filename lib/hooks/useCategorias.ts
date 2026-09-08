"use client";

import { useEffect, useState } from "react";
import { supabase } from "../supabase";

export function useCategorias() {
  const [categorias, setCategorias] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("categorias").select("*").order("nome");
      if (data) setCategorias(data);
    })();
  }, []);

  return { categorias };
}
