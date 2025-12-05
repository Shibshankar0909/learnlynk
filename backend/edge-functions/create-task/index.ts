// LearnLynk Tech Test - Task 3: Edge Function create-task

// Deno + Supabase Edge Functions style
// Docs reference: https://supabase.com/docs/guides/functions

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

type CreateTaskPayload = {
  application_id: string;
  task_type: string;
  due_at: string;
};

const VALID_TYPES = ["call", "email", "review"];

serve(async (req: Request) => {
  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Only POST supported" }), {
        status: 400,
      });
    }

    const body = await req.json().catch(() => null);

    if (!body) {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400,
      });
    }

    const { application_id, task_type, due_at } = body;

    // --- Validation ---
    const validTaskTypes = ["call", "email", "review"];

    if (!application_id || typeof application_id !== "string") {
      return new Response(
        JSON.stringify({ error: "application_id is required" }),
        { status: 400 }
      );
    }

    if (!validTaskTypes.includes(task_type)) {
      return new Response(JSON.stringify({ error: "Invalid task_type" }), {
        status: 400,
      });
    }

    const dueDate = new Date(due_at);
    if (isNaN(dueDate.getTime())) {
      return new Response(
        JSON.stringify({ error: "due_at must be a valid date" }),
        { status: 400 }
      );
    }

    if (dueDate <= new Date()) {
      return new Response(
        JSON.stringify({ error: "due_at must be in the future" }),
        { status: 400 }
      );
    }

    // --- Insert Task into Database ---
    const { data, error } = await supabase
      .from("tasks")
      .insert({
        related_id: application_id,
        type: task_type,
        due_at: dueDate.toISOString(),
        tenant_id: null, // If tenant_id must be looked up, update this logic.
      })
      .select("id")
      .single();

    if (error) {
      console.error("DB Insert Error:", error);
      return new Response(JSON.stringify({ error: "Failed to insert task" }), {
        status: 500,
      });
    }

    const taskId = data.id;

    // --- Emit Realtime Event ---
    const realtimeRes = await supabase.realtime.send({
      type: "broadcast",
      channel: "task.created",
      event: "task.created",
      payload: {
        task_id: taskId,
        application_id,
        task_type,
        due_at: due_at,
      },
    });

    if (!realtimeRes.success) {
      console.error("Realtime error:", realtimeRes);
      // Still return success — app may not want task creation to fail
    }

    return new Response(
      JSON.stringify({
        success: true,
        task_id: taskId,
      }),
      { status: 200 }
    );
  } catch (err) {
    console.error("Unexpected Error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
    });
  }
});
