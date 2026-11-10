import { Button } from "@mantine/core";
import { Link } from "react-router-dom";
import { useSession } from "@/features/auth/useSession";
import { MessagePage } from "@/shared/ui/MessagePage";

export function ForbiddenPage() {
  const session = useSession();
  const home = session.data ? (session.data.role === "ADMIN" ? "/admin/teachers" : "/teacher/tests") : "/login";
  return (
    <MessagePage
      title="Нет доступа"
      action={
        <Button component={Link} to={home}>
          {session.data ? "На главную" : "Ко входу"}
        </Button>
      }
    >
      Этот раздел недоступен для вашей роли
    </MessagePage>
  );
}
