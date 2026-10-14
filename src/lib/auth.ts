import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Me = {
  id: string;
  email: string;
  fullName: string;
  qualified: boolean;
  isAdmin: boolean;
  isViewer: boolean;
  isVolunteer: boolean;
  requestedRole: string;
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
        supabase.from("profiles").select("full_name, qualified, requested_role").eq("id", user.id).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", user.id),
      ]);
      const r = (roles ?? []).map((x) => x.role as string);
      return {
        id: user.id,
        email: user.email ?? "",
        fullName: profile?.full_name ?? "",
        qualified: profile?.qualified ?? false,
        isAdmin: r.includes("admin"),
        isViewer: r.includes("viewer"),
        isVolunteer: r.includes("volunteer"),
        requestedRole: profile?.requested_role ?? "volunteer",
      };
    },
  });
}

export const LEVEL_LABELS: Record<number, string> = {
  1: "Beginner",
  2: "Developing",
  3: "Confident",
};

export const ROLE_INFO = [
  { id: "volunteer", label: "Volunteer", text: "Runs reading sessions with children. Needs a personal volunteer code from SADeaf and must finish the Volunteer Guide before seeing children." },
  { id: "staff", label: "Programme Staff", text: "SADeaf staff. Sees all children, books and volunteers, creates volunteer codes and approves content. Needs approval from existing staff." },
  { id: "viewer", label: "Viewer", text: "Can browse the book library only. No access to children or sessions." },
] as const;
