import { Calculator } from "lucide-react";
import { loginAction } from "@/server/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardContent className="flex flex-col gap-4 p-6">
          <div className="text-center">
            <div className="mx-auto mb-3 flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Calculator className="size-5" />
            </div>
            <h1 className="text-lg font-semibold">Калькулятор услуг</h1>
            <p className="text-sm text-muted-foreground">Введите пароль для входа</p>
          </div>
          <form action={loginAction} className="flex flex-col gap-3">
            <input type="hidden" name="next" value={next && next.startsWith("/") ? next : "/"} />
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">Пароль</Label>
              <Input id="password" name="password" type="password" required autoFocus />
            </div>
            {error && <p className="text-sm text-destructive">Неверный пароль. Попробуйте ещё раз.</p>}
            <Button type="submit" className="w-full">
              Войти
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
