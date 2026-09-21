import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { signOut } from "@/lib/supabase/actions";
import { requireUser } from "@/lib/supabase/guards";

export default async function DashboardPage() {
  const user = await requireUser();
  const displayName = user.username ?? user.email ?? "Sin nombre";
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 px-6 py-24">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <div className="flex items-center gap-4">
            <Avatar size="lg">
              {user.avatarUrl ? <AvatarImage src={user.avatarUrl} alt="" /> : null}
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col gap-1">
              <p className="font-medium">{displayName}</p>
              {user.email ? (
                <p className="text-sm text-muted-foreground">{user.email}</p>
              ) : null}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Badge variant="secondary">{user.role}</Badge>
          <form action={signOut}>
            <Button type="submit" variant="outline" className="w-full">
              Cerrar sesión
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
