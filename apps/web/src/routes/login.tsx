import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { trpc } from "../utils/trpc";
import { useAuthStore } from "../stores/auth";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../components/ui/card";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { setAuthenticated } = useAuthStore();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const trpcUtils = trpc();

  const verifyPasswordMutation = useMutation(
    trpcUtils.setup.verifyPassword.mutationOptions({
      onSuccess: () => {
        setAuthenticated(true);
        toast.success("Welcome back!");
        navigate({ to: "/" });
      },
      onError: (error) => {
        setError(error.message);
        toast.error(error.message);
      },
    })
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    verifyPasswordMutation.mutate({ password });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Welcome Back</CardTitle>
          <CardDescription>Enter your master password to access the dashboard</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Master Password</Label>
              <Input id="password" type="password" placeholder="Enter your master password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            {error && <div className="text-sm text-red-500 dark:text-red-400">{error}</div>}
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={verifyPasswordMutation.isPending}>
              {verifyPasswordMutation.isPending ? "Verifying..." : "Login"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
