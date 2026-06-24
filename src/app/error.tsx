"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4">
      <h2 className="text-2xl font-bold">Algo deu errado!</h2>
      <p className="text-muted-foreground">
        Ocorreu um erro inesperado. Tente novamente.
      </p>
      <button
        onClick={() => reset()}
        className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90"
      >
        Tentar novamente
      </button>
    </div>
  );
}
