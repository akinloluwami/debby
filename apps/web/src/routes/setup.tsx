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

export const Route = createFileRoute("/setup")({
  component: SetupPage,
});

function SetupPage() {
  const navigate = useNavigate();
  const { setConfigured, setAuthenticated } = useAuthStore();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const trpcUtils = trpc();

  const setPasswordMutation = useMutation(
    trpcUtils.setup.setPassword.mutationOptions({
      onSuccess: () => {
        setConfigured(true);
        setAuthenticated(true);
        toast.success("Master password set successfully!");
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

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setPasswordMutation.mutate({ password });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Welcome to Debby</CardTitle>
          <CardDescription>Set up your master password to get started. This password will be used to access the dashboard and manage your databases.</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Master Password</Label>
              <Input id="password" type="password" placeholder="Enter your master password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input id="confirmPassword" type="password" placeholder="Confirm your master password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
            </div>
            {error && <div className="text-sm text-red-500 dark:text-red-400">{error}</div>}
            <div className="text-sm text-muted-foreground">Password must be at least 8 characters long. Keep it safe and secure!</div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={setPasswordMutation.isPending}>
              {setPasswordMutation.isPending ? "Setting up..." : "Set Master Password"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
