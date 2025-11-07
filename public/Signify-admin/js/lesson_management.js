import { supabase } from "./supabaseClient.js";

const levelList = document.getElementById("levelList");
const modalContainer = document.getElementById("modalContainer");
const addLevelBtn = document.getElementById("addLevelBtn");

document.addEventListener("DOMContentLoaded", loadLevels);
addLevelBtn.addEventListener("click", () => openLevelModal());

// ================== LOAD LEVELS ==================
async function loadLevels() {
    const { data: levels, error } = await supabase
        .from("levels")
        .select(`*, lesson(*)`)
        .order("order", { ascending: true });

    if (error) {
        console.error("Error loading levels:", error);
        return;
    }

    if (!levels?.length) {
        levelList.innerHTML = `<p class="text-gray-600">No levels yet. Click “Add Level” to get started.</p>`;
        return;
    }

    levelList.innerHTML = levels.map(renderLevelBlock).join("");
}

function renderLevelBlock(level) {
    const lessons = (level.lesson || []).sort((a, b) => a.order - b.order);
    return `
    <div class="bg-white rounded-lg shadow p-6">
      <div class="flex justify-between items-center mb-4">
        <div>
          <h3 class="text-xl font-bold text-indigo-600">${level.title}</h3>
          <p class="text-gray-500 text-sm">${level.description || ""}</p>
        </div>
        <div class="flex gap-2">
          <button onclick="openLessonModal('${level.id}')" 
            class="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600">+ Add Lesson</button>
          <button onclick="editLevel('${level.id}', '${level.title}', '${level.description || ""}', ${level.order || 0})" 
            class="text-blue-500 hover:underline">Edit</button>
          <button onclick="confirmDelete('level', '${level.id}')" 
            class="text-red-500 hover:underline">Delete</button>
        </div>
      </div>

      <table class="w-full text-left border-collapse">
        <thead class="bg-gray-100">
          <tr>
            <th class="py-2 px-3">Lesson Title</th>
            <th class="py-2 px-3">XP</th>
            <th class="py-2 px-3">Gems</th>
            <th class="py-2 px-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          ${lessons.length
            ? lessons
                .map(
                    (l) => `
              <tr class="border-b">
                <td class="py-2 px-3">${l.title}</td>
                <td class="py-2 px-3">${l.xp_reward}</td>
                <td class="py-2 px-3">${l.gem_reward}</td>
                <td class="py-2 px-3 text-right">
                  <button onclick="window.location.href='lesson_content.html?lesson_id=${l.id}'" 
                    class="text-indigo-600 hover:underline mr-2">Manage Content</button>
                  <button onclick="editLesson('${l.id}', '${l.title}', '${l.content}', ${l.xp_reward}, ${l.gem_reward}, '${level.id}')" 
                    class="text-blue-500 hover:underline mr-2">Edit</button>
                  <button onclick="confirmDelete('lesson', '${l.id}')" 
                    class="text-red-500 hover:underline">Delete</button>
                </td>
              </tr>`
                )
                .join("")
            : `<tr><td colspan="4" class="text-center py-3 text-gray-500">No lessons yet</td></tr>`
        }
        </tbody>
      </table>
    </div>`;
}

// ================== LEVEL MANAGEMENT ==================
function openLevelModal(level = null) {
    modalContainer.innerHTML = `
    <div class="bg-white rounded-lg p-6 w-96">
      <h3 class="text-xl font-bold mb-4">${level ? "Edit Level" : "Add Level"}</h3>
      <form id="levelForm" class="space-y-4">
        <input type="text" id="levelTitle" placeholder="Level / Section Title" 
          value="${level?.title || ""}" class="w-full border rounded p-2" required>
        <textarea id="levelDesc" placeholder="Description" 
          class="w-full border rounded p-2" rows="2">${level?.description || ""}</textarea>
        <input type="number" id="levelOrder" placeholder="Order" 
          value="${level?.order || ""}" class="w-full border rounded p-2">
        <div class="flex justify-end gap-2 mt-4">
          <button type="button" onclick="closeModal()" 
            class="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400">Cancel</button>
          <button type="submit" 
            class="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700">Save</button>
        </div>
      </form>
    </div>
  `;
    modalContainer.classList.remove("hidden");

    document.getElementById("levelForm").onsubmit = async (e) => {
        e.preventDefault();
        const title = document.getElementById("levelTitle").value.trim();
        const description = document.getElementById("levelDesc").value.trim();
        const order = Number(document.getElementById("levelOrder").value) || null;

        const data = { title, description, order };

        try {
            if (level?.id) {
                await supabase.from("levels").update(data).eq("id", level.id);
                console.log("✅ Level updated successfully!");
            } else {
                await supabase.from("levels").insert(data);
                console.log("✅ New level added!");
            }

            closeModal();
            loadLevels();
        } catch (error) {
            console.error("❌ Error saving level:", error);
            alert("Error saving level: " + error.message);
        }
    };
}

window.editLevel = (id, title, desc, order) =>
    openLevelModal({ id, title, description: desc, order });


// ================== LESSON MANAGEMENT ==================
window.openLessonModal = (levelId, lesson = null) => {
    modalContainer.innerHTML = `
    <div class="bg-white rounded-lg p-6 w-[28rem]">
      <h3 class="text-xl font-bold mb-4">${lesson ? "Edit Lesson" : "Add Lesson"}</h3>
      <form id="lessonForm" class="space-y-4">
        <input type="text" id="lessonTitle" placeholder="Lesson Title" 
          value="${lesson?.title || ""}" class="w-full border rounded p-2" required>

        <textarea id="lessonContent" placeholder="Lesson Content" 
          class="w-full border rounded p-2" rows="3">${lesson?.content || ""}</textarea>

        <input type="number" id="xpReward" placeholder="XP Reward" 
          value="${lesson?.xp_reward || 0}" class="w-full border rounded p-2">

        <input type="number" id="gemReward" placeholder="Gem Reward" 
          value="${lesson?.gem_reward || 0}" class="w-full border rounded p-2">
          
            <input type="number" id="lessonOrder" placeholder="Lesson Order (e.g. 1, 2, 3)"
    value="${lesson?.order || ""}" class="w-full border rounded p-2">


        <div class="flex justify-end gap-2 mt-4">
          <button type="button" onclick="closeModal()" 
            class="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400">Cancel</button>
          <button type="submit" 
            class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">Save</button>
        </div>
      </form>
    </div>
  `;
    modalContainer.classList.remove("hidden");

    document.getElementById("lessonForm").onsubmit = async (e) => {
        e.preventDefault();

        const title = document.getElementById("lessonTitle").value.trim();
        const content = document.getElementById("lessonContent").value.trim();
        const xp_reward = Number(document.getElementById("xpReward").value) || 0;
        const gem_reward = Number(document.getElementById("gemReward").value) || 0;

        const lessonData = { title, content, xp_reward, gem_reward, level_id: levelId };

        try {
            if (lesson?.id) {
                // 🧩 Editing lesson → keep same order
                const { data: existing, error: orderError } = await supabase
                    .from("lesson")
                    .select("order")
                    .eq("id", lesson.id)
                    .single();

                if (orderError) throw orderError;

                const { error: updateError } = await supabase
                    .from("lesson")
                    .update({ ...lessonData, order: existing?.order ?? null })
                    .eq("id", lesson.id);

                if (updateError) throw updateError;

                console.log("Lesson updated successfully!");
            } else {
                const { data: lastLesson, error: fetchError } = await supabase
                    .from("lesson")
                    .select("order")
                    .eq("level_id", levelId)
                    .order("order", { ascending: false })
                    .limit(1)
                    .maybeSingle();


                if (fetchError && fetchError.code !== "PGRST116") throw fetchError;

                const nextOrder = lastLesson?.order ? lastLesson.order + 1 : 1;

                const { error: insertError } = await supabase
                    .from("lesson")
                    .insert({ ...lessonData, order: nextOrder });

                if (insertError) throw insertError;

                console.log("✅ Lesson added successfully!");
            }

            closeModal();
            loadLevels();
        } catch (error) {
            console.error("Error saving lesson:", error);
            alert("Error saving lesson: " + error.message);
        }
    };
};


window.editLesson = (id, title, content, xp, gems, levelId) =>
    openLessonModal(levelId, { id, title, content, xp_reward: xp, gem_reward: gems });

// ================== DELETE MODAL ==================
window.confirmDelete = function (type, id) {
    modalContainer.innerHTML = `
    <div class="bg-white rounded-xl p-6 w-80 text-center shadow-lg">
      <h2 class="text-xl font-bold text-gray-800 mb-3">Delete ${type === "level" ? "Level" : "Lesson"}?</h2>
      <p class="text-gray-500 mb-6 text-sm">This action cannot be undone.</p>
      <div class="flex justify-center gap-3">
        <button onclick="closeModal()" class="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400">Cancel</button>
        <button onclick="deleteItem('${type}', '${id}')" class="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">Delete</button>
      </div>
    </div>
  `;
    modalContainer.classList.remove("hidden");
};

window.deleteItem = async (type, id) => {
    // Handle Lesson deletion (already in your code)
    if (type === "lesson") {
        const { data: deletedLesson, error: fetchError } = await supabase
            .from("lesson")
            .select("order, level_id")
            .eq("id", id)
            .single();

        if (fetchError) {
            console.error("Error fetching lesson before delete:", fetchError);
            return;
        }

        // Delete the lesson
        const { error: deleteError } = await supabase
            .from("lesson")
            .delete()
            .eq("id", id);

        if (deleteError) {
            console.error("Error deleting lesson:", deleteError);
            return;
        }

        // Reorder remaining lessons
        const { data: remainingLessons, error: remainingError } = await supabase
            .from("lesson")
            .select("id, order")
            .eq("level_id", deletedLesson.level_id)
            .order("order", { ascending: true });

        if (remainingError) {
            console.error("Error fetching remaining lessons:", remainingError);
            return;
        }

        const updates = remainingLessons
            .filter((l) => l.order > deletedLesson.order)
            .map((l) => ({
                id: l.id,
                order: l.order - 1,
            }));

        for (const u of updates) {
            await supabase.from("lesson").update({ order: u.order }).eq("id", u.id);
        }

        console.log(`✅ Lesson deleted and order updated.`);
        loadLevels();
        closeModal();
        return;
    }

    // ✅ Handle LEVEL deletion safely (delete its lessons first)
    if (type === "level") {
        try {
            // Step 1: Delete lessons under this level
            const { error: lessonsError } = await supabase
                .from("lesson")
                .delete()
                .eq("level_id", id);

            if (lessonsError) throw lessonsError;

            // Step 2: Delete the level itself
            const { error: levelError } = await supabase
                .from("levels")
                .delete()
                .eq("id", id);

            if (levelError) throw levelError;

            console.log("✅ Level and its lessons deleted successfully!");
            closeModal();
            loadLevels();
        } catch (error) {
            console.error("❌ Error deleting level:", error.message);
            alert("Error deleting level: " + error.message);
        }
        return;
    }

    // 🔁 Handle other deletions normally
    const tableName =
        type === "section"
            ? "sections"
            : type === "lesson_sign"
                ? "lesson_signs"
                : type === "lesson_question"
                    ? "lesson_questions"
                    : null;

    if (!tableName) {
        console.error(`Unknown delete type: ${type}`);
        return;
    }

    const { error } = await supabase.from(tableName).delete().eq("id", id);
    if (error) console.error(`Error deleting ${type}:`, error);
    else console.log(`✅ ${type} deleted successfully`);

    // Reload after delete
    if (type === "section") loadLevels();
    if (type === "lesson_sign" || type === "lesson_question") loadLessonContent();
};


window.closeModal = function () {
    modalContainer.classList.add("hidden");
};
