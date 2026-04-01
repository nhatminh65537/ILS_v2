type FooterProps = {
  text: string
}

export function Footer({ text }: FooterProps) {
  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto w-full max-w-7xl px-4 py-4 text-xs text-muted-foreground md:px-6">{text}</div>
    </footer>
  )
}
