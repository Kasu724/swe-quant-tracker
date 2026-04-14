"use client";

import { signOut } from "next-auth/react";
import { Button } from "@faang-quant/ui";

export function LogoutButton() {
  return (
    <Button variant="ghost" onClick={() => signOut({ callbackUrl: "/" })}>
      Sign out
    </Button>
  );
}

