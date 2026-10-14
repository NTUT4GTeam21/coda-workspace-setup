import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Me = {
  id: string;
  email: string;
  fullName: string;
  qualified: boolean;
  isAdmin: boolean;
};

/** Current signed-in user's profile and role. Access is enforced by the database; this is for UI only. */
export function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: async (): Promise<Me | null> => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) return null;
      const [{ data: profile }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("full_name, qualified").eq("id", user.id).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", user.id),
      ]);
      return {
        id: user.id,
        email: user.email ?? "",
        fullName: profile?.full_name ?? "",
        qualified: profile?.qualified ?? false,
        isAdmin: (roles ?? []).some((r) => r.role === "admin"),
      };
    },
  });
}

export const LEVEL_LABELS: Record<number, string> = {
  1: "Beginner",
  2: "Developing",
  3: "Confident",
};
