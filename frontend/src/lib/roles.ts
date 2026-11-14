import type { UserRead } from "@/lib/api/types";

export function isFlightSurgeon(user: UserRead | null | undefined): boolean {
  return user?.role === "flight_surgeon";
}

export function homePathForRole(user: UserRead | null | undefined): string {
  return isFlightSurgeon(user) ? "/surgeon" : "/";
}
