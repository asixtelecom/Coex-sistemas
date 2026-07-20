"use client";

import { MessageSquare } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <div className="flex h-screen flex-col items-center justify-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <MessageSquare className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-semibold">
            Ops! Estamos dando uma ajeitada aqui
          </h2>
          <p className="text-sm text-muted-foreground">
            Já voltamos, só um minutinho...
          </p>
          <button
            onClick={() => reset()}
            className="mt-2 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90"
          >
            Tentar novamente
          </button>
        </div>
      </body>
    </html>
  );
}
