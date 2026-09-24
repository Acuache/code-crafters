import { FireIcon } from "@phosphor-icons/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function isoDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function StreakCard({ current, best, activityDates, today }: { current: number; best: number; activityDates: string[]; today?: string }) {
  const end = today ? new Date(`${today}T12:00:00`) : new Date();
  const active = new Set(activityDates);
  const days = Array.from({ length: 7 }, (_, offset) => {
    const date = new Date(end);
    date.setDate(end.getDate() - (6 - offset));
    return isoDate(date);
  });
  return (
    <Card>
      <CardHeader><CardTitle><span className="flex items-center gap-2"><FireIcon weight="fill" /> Tu racha</span></CardTitle></CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold">{current} días</p>
        <p className="text-muted-foreground">Récord: {best}</p>
        <div className="grid grid-cols-7 gap-1">
          {days.map((day) => <span aria-label={active.has(day) ? `Actividad el ${day}` : undefined} className={active.has(day) ? "h-3 rounded-full bg-primary" : "h-3 rounded-full bg-muted"} data-testid="streak-day" key={day} title={day} />)}
        </div>
      </CardContent>
    </Card>
  );
}
