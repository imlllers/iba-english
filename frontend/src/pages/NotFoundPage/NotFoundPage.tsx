import { Button } from "@mantine/core";
import { Link } from "react-router-dom";
import { MessagePage } from "@/shared/ui/MessagePage";

export function NotFoundPage() {
  return (
    <MessagePage
      title="Страница не найдена"
      action={<Button component={Link} to="/login">На главную</Button>}
    >
      Проверьте адрес. Если вы переходили по ссылке на тест, попросите преподавателя прислать её ещё раз
    </MessagePage>
  );
}
