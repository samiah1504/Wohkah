import { UserShell } from "@/components/shell/user-shell";

export default function SignedInLayout({ children }: LayoutProps<"/">) {
  return <UserShell>{children}</UserShell>;
}
