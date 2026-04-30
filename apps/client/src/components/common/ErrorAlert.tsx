import { Alert } from "@mantine/core";

type ErrorAlertProps = {
  title: string;
  message: string;
};

export function ErrorAlert({ title, message }: ErrorAlertProps) {
  return (
    <Alert color="red" title={title}>
      {message}
    </Alert>
  );
}
