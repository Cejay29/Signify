import { supabase } from "./supabaseClient.js";

document.addEventListener("DOMContentLoaded", async () => {
  await loadDashboardData();

  document.getElementById("logoutBtn").addEventListener("click", async () => {
    await supabase.auth.signOut();
    window.location.href = "../login.html";
  });
});

async function loadDashboardData() {
  try {
    // 🧠 Fetch data from Supabase
    const [{ data: users, count: userCount }, { data: lesson, count: lessonCount }] = await Promise.all([
      supabase.from("users").select("*", { count: "exact" }),
      supabase.from("lesson").select("*", { count: "exact" }),
    ]);

    console.log("Users:", users);
    console.log("Lesson:", lesson);

    // 🧩 Count unique lesson levels
    const uniqueLevels = [...new Set(lesson.map((l) => l.level_id))].length;

    // ✅ Update dashboard summary cards
    document.getElementById("totalUsers").textContent = userCount ?? 0;
    document.getElementById("totalLessons").textContent = lessonCount ?? 0;
    document.getElementById("totalLevels").textContent = uniqueLevels ?? 0;

    // 🧾 Display recent lists
    renderRecentUsers(users.slice(0, 5));
    renderRecentLessons(lesson.slice(0, 5));

    console.log("✅ Dashboard data loaded:", { userCount, lessonCount, uniqueLevels });
  } catch (error) {
    console.error("❌ Error loading dashboard data:", error.message);
  }
}

// =========================
// Render Tables
// =========================

function renderRecentUsers(users) {
  const list = document.getElementById("recentUsers");
  list.innerHTML = users.length
    ? users
        .map(
          (u) => `
          <tr class="border-b hover:bg-gray-50">
            <td class="py-2 px-3">${u.id.slice(0, 6)}...</td>
            <td class="py-2 px-3">${u.level ?? "—"}</td>
            <td class="py-2 px-3 text-sm text-gray-500">${
              u.last_active ? new Date(u.last_active).toLocaleDateString() : "N/A"
            }</td>
          </tr>`
        )
        .join("")
    : `<tr><td colspan="3" class="text-center py-4 text-gray-500">No users found</td></tr>`;
}

function renderRecentLessons(lessons) {
  const list = document.getElementById("recentLessons");
  list.innerHTML = lessons.length
    ? lessons
        .map(
          (l) => `
          <tr class="border-b hover:bg-gray-50">
            <td class="py-2 px-3 font-medium">${l.title}</td>
            <td class="py-2 px-3">${l.level_id ?? "—"}</td>
            <td class="py-2 px-3 text-sm text-gray-500">${new Date(l.created_at).toLocaleDateString()}</td>
          </tr>`
        )
        .join("")
    : `<tr><td colspan="3" class="text-center py-4 text-gray-500">No lessons found</td></tr>`;
}
