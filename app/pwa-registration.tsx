"use client";

import { useEffect } from "react";

export default function PwaRegistration() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) {
      return;
    }

    void navigator.serviceWorker.register("/service-worker.js").catch((cause: unknown) => {
      console.error("Unable to register the Kount It service worker.", cause);
    });
  }, []);

  return null;
}
