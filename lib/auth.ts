import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import type { User } from "@supabase/supabase-js";

type AdminUser = {
  id: string;
  email: string;
};

function getPublicSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  return { url, anonKey };
}

function getServiceRoleEnv() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const { url } = getPublicSupabaseEnv();

  if (!serviceRoleKey) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
  }

  return { url, serviceRoleKey };
}

export function createSupabaseServerClient() {
  const cookieStore = cookies();
  const { url, anonKey } = getPublicSupabaseEnv();

  return createServerClient(url, anonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: Record<string, unknown>) {
        try {
          const writableStore = cookieStore as unknown as {
            set?: (cookie: { name: string; value: string } & Record<string, unknown>) => void;
          };
          writableStore.set?.({ name, value, ...options });
        } catch {
          // Server Components cannot write cookies; safe to ignore here.
        }
      },
      remove(name: string, options: Record<string, unknown>) {
        try {
          const writableStore = cookieStore as unknown as {
            set?: (cookie: { name: string; value: string } & Record<string, unknown>) => void;
          };
          writableStore.set?.({
            name,
            value: "",
            ...options
          });
        } catch {
          // Server Components cannot write cookies; safe to ignore here.
        }
      }
    }
  });
}

function createSupabaseAdminClient() {
  const { url, serviceRoleKey } = getServiceRoleEnv();
  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

export async function isAdminEmail(email: string): Promise<boolean> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) {
    return false;
  }

  const adminClient = createSupabaseAdminClient();
  const { data, error } = await adminClient
    .from("admins")
    .select("email")
    .eq("email", normalizedEmail)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to verify admin access: ${error.message}`);
  }

  return Boolean(data?.email);
}

export async function getCurrentUser(): Promise<User | null> {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
    error
  } = await supabase.auth.getUser();

  if (error) {
    return null;
  }

  return user;
}

export async function getCurrentAdminUser(): Promise<AdminUser | null> {
  const user = await getCurrentUser();

  if (!user?.email) {
    return null;
  }

  const allowed = await isAdminEmail(user.email);
  if (!allowed) {
    return null;
  }

  return {
    id: user.id,
    email: user.email
  };
}

export async function requireAdminUser(): Promise<AdminUser> {
  const adminUser = await getCurrentAdminUser();

  if (!adminUser) {
    redirect("/login");
  }

  return adminUser;
}

export async function signOutServerSide() {
  const supabase = createSupabaseServerClient();
  await supabase.auth.signOut();
}
