export function AppHeader({ gymName }: { gymName: string }) {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 px-4 py-3 backdrop-blur-md">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Fitway</p>
      <h1 className="text-lg font-semibold leading-tight tracking-tight">{gymName}</h1>
    </header>
  );
}
