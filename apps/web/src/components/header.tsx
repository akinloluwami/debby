import { ModeToggle } from "./mode-toggle";
import { Button } from "./ui/button";
import { LogOut } from "lucide-react";
import { useAuthStore } from "../stores/auth";
import { trpc } from "../utils/trpc";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

export default function Header() {
  const { logout, setAuthenticated } = useAuthStore();
  const navigate = useNavigate();
  const trpcUtils = trpc();

  const logoutMutation = useMutation(
    trpcUtils.setup.logout.mutationOptions({
      onSuccess: () => {
        logout();
        setAuthenticated(false);
        toast.success("Logged out successfully");
        navigate({ to: "/login" });
      },
      onError: (error) => {
        toast.error(error.message);
      },
    }),
  );

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  return (
    <div>
      <div className="flex flex-row items-center justify-between px-2 py-1">
        <h2>Debby</h2>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            disabled={logoutMutation.isPending}
            title="Logout"
          >
            <LogOut className="h-[1.2rem] w-[1.2rem]" />
          </Button>
          <ModeToggle />
        </div>
      </div>
      <hr />
    </div>
  );
}
