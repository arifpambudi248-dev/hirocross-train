import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const jsonResponse = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Sesi tidak ditemukan. Silakan login kembali." }, 401);
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return jsonResponse({ error: "Sesi tidak valid. Silakan login kembali." }, 401);
    }

    const { data: roles } = await userClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    const isCoach = roles?.some((role) => role.role === "coach" || role.role === "admin");
    if (!isCoach) {
      return jsonResponse({ error: "Hanya coach yang dapat assign atlet." }, 403);
    }

    const { athlete_id, email, direct_assign } = await req.json();
    let athleteId = typeof athlete_id === "string" ? athlete_id : "";
    const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";

    if (!athleteId && !normalizedEmail) {
      return jsonResponse({ error: "Pilih atlet atau masukkan email akun atlet." }, 400);
    }

    const admin = createClient(supabaseUrl, serviceRoleKey);

    if (!athleteId && normalizedEmail) {
      const { data: usersResult, error: listError } = await admin.auth.admin.listUsers();
      if (listError) {
        console.error("listUsers error:", listError);
        return jsonResponse({ error: "Gagal mencari akun atlet." }, 500);
      }

      const foundUser = usersResult.users.find(
        (authUser) => authUser.email?.toLowerCase() === normalizedEmail
      );

      if (!foundUser) {
        return jsonResponse({ error: "Akun dengan email ini belum terdaftar." }, 404);
      }

      athleteId = foundUser.id;
    }

    if (athleteId === user.id) {
      return jsonResponse({ error: "Coach tidak dapat assign akun sendiri sebagai atlet." }, 400);
    }

    const { data: athleteRoles } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", athleteId);

    const hasAthleteRole = athleteRoles?.some((role) => role.role === "athlete");
    if (!hasAthleteRole) {
      return jsonResponse({ error: "Akun ini bukan akun atlet." }, 400);
    }

    const { data: existing } = await admin
      .from("coach_athletes")
      .select("id, status")
      .eq("coach_id", user.id)
      .eq("athlete_id", athleteId)
      .maybeSingle();

    const nextStatus = direct_assign ? "accepted" : "pending";

    if (existing) {
      if (existing.status === "accepted") {
        return jsonResponse({
          success: true,
          already_assigned: true,
          message: "Atlet ini sudah aktif di roster Anda.",
        });
      }

      const { error: updateError } = await admin
        .from("coach_athletes")
        .update({
          status: nextStatus,
          invited_by: "coach",
          created_by: user.id,
        })
        .eq("id", existing.id);

      if (updateError) {
        console.error("update assignment error:", updateError);
        return jsonResponse({ error: "Gagal memperbarui status assign atlet." }, 500);
      }

      return jsonResponse({
        success: true,
        message: nextStatus === "accepted"
          ? "Atlet berhasil diaktifkan di roster Anda."
          : "Invitation berhasil dikirim ulang ke atlet.",
      });
    }

    const { error: insertError } = await admin
      .from("coach_athletes")
      .insert({
        coach_id: user.id,
        athlete_id: athleteId,
        status: nextStatus,
        invited_by: "coach",
        created_by: user.id,
      });

    if (insertError) {
      console.error("insert assignment error:", insertError);
      return jsonResponse({ error: "Gagal assign atlet. Silakan coba lagi." }, 500);
    }

    return jsonResponse({
      success: true,
      message: nextStatus === "accepted"
        ? "Atlet berhasil langsung ditambahkan ke roster."
        : "Invitation berhasil dikirim ke atlet.",
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return jsonResponse({ error: "Terjadi kesalahan saat assign atlet." }, 500);
  }
});
