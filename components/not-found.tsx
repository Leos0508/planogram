import { Empty, EmptyDescription, EmptyTitle } from "./ui/empty";

export default function NotFound() {
  return (
    <Empty>
      <EmptyTitle>Not Found</EmptyTitle>
      <EmptyDescription>
        The page you are looking for does not exist.
      </EmptyDescription>
    </Empty>
  );
}
