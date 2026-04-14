import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "USER" | "ADMIN";
      emailVerified: boolean;
      name?: string | null;
      email?: string | null;
    };
  }

  interface User {
    id: string;
    role: "USER" | "ADMIN";
    emailVerified: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
    role?: "USER" | "ADMIN";
    emailVerified?: boolean;
  }
}

