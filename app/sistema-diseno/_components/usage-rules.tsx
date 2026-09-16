type UsageRule = {
  title: string
  wrong: string
  right: string
}

const USAGE_RULES: UsageRule[] = [
  {
    title: "Colores semánticos, no crudos",
    wrong: 'className="bg-violet-600 text-white"',
    right: 'className="bg-primary text-primary-foreground"',
  },
  {
    title: "gap, no space-y / space-x",
    wrong: 'className="flex flex-col space-y-4"',
    right: 'className="flex flex-col gap-4"',
  },
  {
    title: "size-*, no w-* h-* iguales",
    wrong: 'className="w-10 h-10"',
    right: 'className="size-10"',
  },
  {
    title: "Sin dark: manual",
    wrong: 'className="bg-white dark:bg-black"',
    right: 'className="bg-background"',
  },
  {
    title: "Variantes antes que className",
    wrong: '<Button className="border bg-transparent hover:bg-accent">',
    right: '<Button variant="outline">',
  },
  {
    title: "cn() para clases condicionales",
    wrong: "className={`flex ${isActive ? 'bg-primary' : 'bg-muted'}`}",
    right: 'className={cn("flex", isActive ? "bg-primary" : "bg-muted")}',
  },
]

function UsageRules() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {USAGE_RULES.map((rule) => (
        <div key={rule.title} className="border-border flex flex-col gap-2 rounded-lg border p-4">
          <p className="font-heading text-sm font-medium">{rule.title}</p>
          <code className="bg-level-required/10 text-level-required rounded px-2 py-1 text-xs">
            ✗ {rule.wrong}
          </code>
          <code className="bg-level-recommended/10 text-level-recommended rounded px-2 py-1 text-xs">
            ✓ {rule.right}
          </code>
        </div>
      ))}
    </div>
  )
}

export { UsageRules }
