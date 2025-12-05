"use client";

import { supabase } from "@/lib/supabaseClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import styles from "./TodayTasksPage.module.css";
import { Calendar, CheckCircle, Clock } from "lucide-react";

// ---------- Fetch Tasks ----------
async function fetchTodayTasks() {
  const today = new Date().toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("tasks")
    .select("id, title, related_id, due_at, status")
    .gte("due_at", `${today}T00:00:00Z`)
    .lte("due_at", `${today}T23:59:59Z`);

  if (error) throw new Error(error.message);
  return data;
}

// ---------- Mark as Complete ----------
async function markTaskComplete(taskId: string) {
  const { error } = await supabase
    .from("tasks")
    .update({ status: "completed" })
    .eq("id", taskId);

  if (error) throw new Error(error.message);
}

export default function TodayTasksPage() {
  const queryClient = useQueryClient();
  const [pendingTaskId, setPendingTaskId] = useState<string | null>(null);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["tasks-today"],
    queryFn: fetchTodayTasks,
  });

  const mutation = useMutation({
    mutationFn: markTaskComplete,
    onMutate: (taskId) => setPendingTaskId(taskId),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["tasks-today"] }),
    onSettled: () => setPendingTaskId(null),
  });

  // Loading UI
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-100">
        <div className="animate-spin h-12 w-12 border-4 border-indigo-500 border-t-transparent rounded-full"></div>
        <p className="mt-4 text-gray-600 text-lg font-medium">
          Fetching today’s tasks...
        </p>
      </div>
    );
  }

  // Error UI
  if (isError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-50">
        <div className="bg-white shadow-lg rounded-xl p-6 border border-red-200 max-w-md">
          <h2 className="text-xl font-semibold text-red-700">
            Error loading tasks
          </h2>
          <p className="text-red-600 mt-2">{(error as Error).message}</p>
        </div>
      </div>
    );
  }

  const completedCount =
    data?.filter((t) => t.status === "completed").length || 0;
  const totalCount = data?.length || 0;

  return (
    <div className={styles.pageContainer}>
      <div className={styles.pageContent}>
        <div className={styles.header}>
          <div className={styles.headerTitleRow}>
            <Calendar size={36} color="#3730a3" />
            <h1 className={styles.headerTitle}>Today’s Tasks</h1>
          </div>

          <p className={styles.headerDate}>
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>

          {totalCount > 0 && (
            <div className={styles.progressBadge}>
              <CheckCircle size={16} />
              {completedCount} of {totalCount} completed
            </div>
          )}
        </div>

        {data?.length === 0 && (
          <div className={styles.emptyBox}>
            <div className={styles.emptyIconCircle}>
              <CheckCircle size={48} color="#16a34a" />
            </div>
            <h2 className={styles.emptyTitle}>All Clear!</h2>
            <p className={styles.emptySub}>
              You have no tasks due today. Enjoy your time! 🎉
            </p>
          </div>
        )}

        {data && data.length > 0 && (
          <div className={styles.tableBox}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Task</th>
                  <th>Application ID</th>
                  <th>Due Time</th>
                  <th>Status</th>
                  <th style={{ textAlign: "center" }}>Action</th>
                </tr>
              </thead>

              <tbody>
                {data.map((task) => {
                  const isPending = pendingTaskId === task.id;
                  const isCompleted = task.status === "completed";

                  return (
                    <tr
                      key={task.id}
                      className={isCompleted ? styles.rowCompleted : ""}
                    >
                      <td>
                        {isCompleted ? (
                          <span className={styles.textMuted}>{task.title}</span>
                        ) : (
                          task.title
                        )}
                      </td>

                      <td>
                        <span className={styles.badgeGray}>
                          {task.related_id}
                        </span>
                      </td>

                      <td>
                        <div
                          style={{
                            display: "flex",
                            gap: "6px",
                            alignItems: "center",
                          }}
                        >
                          <Clock size={16} />
                          {new Date(task.due_at).toLocaleTimeString("en-US", {
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                            hour12: true,
                            timeZone: "UTC",
                          })}
                        </div>
                      </td>

                      <td>
                        {isCompleted ? (
                          <span className={styles.statusCompleted}>
                            <CheckCircle size={12} />
                            Completed
                          </span>
                        ) : (
                          <span className={styles.statusPending}>Pending</span>
                        )}
                      </td>

                      <td style={{ textAlign: "center" }}>
                        {!isCompleted ? (
                          <button
                            onClick={() => mutation.mutate(task.id)}
                            disabled={mutation.isPending}
                            className={`${styles.btnComplete} ${
                              mutation.isPending && isPending
                                ? styles.btnDisabled
                                : ""
                            }`}
                          >
                            {isPending ? (
                              <>
                                <div className={styles.spinner}></div>
                                Saving...
                              </>
                            ) : (
                              <>
                                <CheckCircle size={14} />
                                Complete
                              </>
                            )}
                          </button>
                        ) : (
                          <span className={styles.doneText}>
                            <CheckCircle size={18} />
                            Done
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
