import { UserRole } from "@/components/pos/cash-session/types";

export interface AppUser {
  username: string;
  displayName: string;
  role: UserRole;
}

export const DEMO_USERS: { username: string; password: string; user: AppUser }[] = [
  {
    username: "owner",
    password: "owner123",
    user: { username: "owner", displayName: "Nimal Fernando", role: "admin" },
  },
  {
    username: "manager",
    password: "manager123",
    user: { username: "manager", displayName: "Sunil Jayawardena", role: "manager" },
  },
  {
    username: "cashier",
    password: "cashier123",
    user: { username: "cashier", displayName: "Kamal Perera", role: "cashier" },
  },
];
