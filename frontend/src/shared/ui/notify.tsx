import { notifications } from "@mantine/notifications";
import { Icon } from "./Icon";

type NotifyOptions = {
  title?: string;
  id?: string;
  autoClose?: number | false;
};

export const notify = {
  success(message: string, options: NotifyOptions = {}) {
    return notifications.show({ color: "teal", autoClose: 2500, icon: <Icon name="check" size={16} />, message, ...options });
  },
  warning(message: string, options: NotifyOptions = {}) {
    return notifications.show({ color: "orange", autoClose: 4000, message, ...options });
  },
  error(message: string, options: NotifyOptions = {}) {
    return notifications.show({ color: "red", autoClose: 5000, icon: <Icon name="warning" size={16} />, message, ...options });
  },
};
