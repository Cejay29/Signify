import { supabase } from "./supabaseClient.js";

const urlParams = new URLSearchParams(window.location.search);
const lessonId = urlParams.get("lesson_id");

const signsSection = document.getElementById("signsSection");
const questionsSection = document.getElementById("questionsSection");
const modalContainer = document.getElementById("modalContainer");

// ===== Tab switching logic =====
document.getElementById("tab-signs").addEventListener("click", () => toggleTab("signs"));
document.getElementById("tab-questions").addEventListener("click", () => toggleTab("questions"));

function toggleTab(tab) {
    document.getElementById("tab-signs").classList.toggle("border-indigo-600", tab === "signs");
    document.getElementById("tab-signs").classList.toggle("text-indigo-600", tab === "signs");
    document.getElementById("tab-questions").classList.toggle("border-indigo-600", tab === "questions");
    document.getElementById("tab-questions").classList.toggle("text-indigo-600", tab === "questions");

    signsSection.classList.toggle("hidden", tab !== "signs");
    questionsSection.classList.toggle("hidden", tab !== "questions");
}

document.addEventListener("DOMContentLoaded", loadLessonContent);

// ===== Main Loader =====
async function loadLessonContent() {
    const { data: lesson } = await supabase.from("lesson").select("*").eq("id", lessonId).single();
    document.getElementById("lessonTitle").textContent = lesson.title;
    await Promise.all([loadLessonSigns(), loadLessonQuestions()]);
}

/* ==========================================================
   🧾 LESSON SIGNS CRUD
========================================================== */
async function loadLessonSigns() {
    const { data: signs } = await supabase
        .from("lesson_signs")
        .select("*")
        .eq("lesson_id", lessonId)
        .order("created_at");

    signsSection.innerHTML = `
    <div class="flex justify-between items-center mb-4">
      <h3 class="text-2xl font-bold text-gray-700">Lesson Signs</h3>
      <button onclick="openSignModal()" class="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600">+ Add Sign</button>
    </div>
    ${signs?.length
            ? `<table class="w-full text-left border-collapse">
            <thead class="bg-gray-100">
              <tr>
                <th class="py-2 px-3">Gloss</th>
                <th class="py-2 px-3">Video</th>
                <th class="py-2 px-3">Image</th>
                <th class="py-2 px-3">Description</th>
                <th class="py-2 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${signs
                .map(
                    (s) => `
                <tr class="border-b">
                  <td class="py-2 px-3">${s.gloss}</td>
                  <td class="py-2 px-3">${s.video_url ? "🎥" : "—"}</td>
                  <td class="py-2 px-3">${s.image_url ? "🖼️" : "—"}</td>
                  <td class="py-2 px-3">${s.description || ""}</td>
                  <td class="py-2 px-3 text-right">
                    <button onclick='openSignModal(${JSON.stringify(s)})' class="text-blue-500 hover:underline mr-2">Edit</button>
                    <button onclick="confirmDelete('sign', '${s.id}')" class="text-red-500 hover:underline">Delete</button>
                  </td>
                </tr>`
                )
                .join("")}
            </tbody>
          </table>`
            : `<p class="text-gray-500">No signs yet.</p>`
        }
  `;
}

window.openSignModal = function (sign = null) {
    modalContainer.innerHTML = `
    <div class="bg-white rounded-lg p-6 w-[30rem]">
      <h3 class="text-xl font-bold mb-4">${sign ? "Edit Sign" : "Add Sign"}</h3>
      <form id="signForm" class="space-y-4" enctype="multipart/form-data">
        <input id="gloss" class="w-full border rounded p-2" placeholder="Gloss (unique label)" value="${sign?.gloss || ""}" required>
        
        <label class="block text-sm font-semibold text-gray-700 mt-2">Video File (optional)</label>
        <input id="videoFile" type="file" accept="video/*" class="w-full border rounded p-2">

        <label class="block text-sm font-semibold text-gray-700 mt-2">Image/GIF (optional)</label>
        <input id="imageFile" type="file" accept="image/*" class="w-full border rounded p-2">
        
        <textarea id="description" class="w-full border rounded p-2" rows="2" placeholder="Description">${sign?.description || ""}</textarea>
        
        <div class="flex justify-end gap-2 mt-4">
          <button type="button" onclick="closeModal()" class="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400">Cancel</button>
          <button type="submit" class="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700">Save</button>
        </div>
      </form>
    </div>
  `;
    modalContainer.classList.remove("hidden");

    document.getElementById("signForm").onsubmit = async (e) => {
        e.preventDefault();

        const gloss = document.getElementById("gloss").value.trim();
        const desc = document.getElementById("description").value.trim();
        const videoFile = document.getElementById("videoFile").files[0];
        const imageFile = document.getElementById("imageFile").files[0];

        let videoUrl = sign?.video_url || "";
        let imageUrl = sign?.image_url || "";

        // ⬆️ Upload video if selected
        if (videoFile) {
            const { data, error } = await supabase.storage
                .from("lesson-media")
                .upload(`videos/${Date.now()}_${videoFile.name}`, videoFile, {
                    cacheControl: "3600",
                    upsert: false,
                });
            if (error) console.error("Video upload failed:", error);
            else videoUrl = supabase.storage.from("lesson-media").getPublicUrl(data.path).data.publicUrl;
        }

        // ⬆️ Upload image/gif if selected
        if (imageFile) {
            const { data, error } = await supabase.storage
                .from("lesson-media")
                .upload(`images/${Date.now()}_${imageFile.name}`, imageFile, {
                    cacheControl: "3600",
                    upsert: false,
                });
            if (error) console.error("Image upload failed:", error);
            else imageUrl = supabase.storage.from("lesson-media").getPublicUrl(data.path).data.publicUrl;
        }

        const signData = {
            gloss,
            description: desc,
            video_url: videoUrl,
            image_url: imageUrl,
            lesson_id: lessonId,
        };

        if (sign?.id)
            await supabase.from("lesson_signs").update(signData).eq("id", sign.id);
        else await supabase.from("lesson_signs").insert(signData);

        closeModal();
        loadLessonSigns();
    };
};
window.openSignModal = function (sign = null) {
    modalContainer.innerHTML = `
    <div class="bg-white rounded-lg p-6 w-[32rem] z-50 relative">
      <h3 class="text-xl font-bold mb-4">${sign ? "Edit Sign" : "Add Sign"}</h3>

      <form id="signForm" class="space-y-4" enctype="multipart/form-data">
        <!-- Gloss -->
        <input 
          id="gloss" 
          class="w-full border rounded p-2" 
          placeholder="Gloss (unique label)" 
          value="${sign?.gloss || ""}" 
          required
        >

        <!-- Video -->
        <div>
          <label class="block text-sm font-semibold text-gray-700">Video</label>
          <input 
            id="video_url" 
            class="w-full border rounded p-2 mb-2" 
            placeholder="Paste video URL (optional)" 
            value="${sign?.video_url || ""}"
          >
          <input 
            id="videoFile" 
            type="file" 
            accept="video/*" 
            class="w-full border rounded p-2 cursor-pointer"
          >

          <!-- Video Preview -->
          <div id="videoPreview" class="mt-3">
            ${sign?.video_url
            ? `
                  <div class="relative">
                    <video src="${sign.video_url}" controls class="rounded-lg w-full max-h-48"></video>
                    <button id="removeVideo" 
                      class="absolute top-2 right-2 bg-red-600 text-white text-xs px-2 py-1 rounded hover:bg-red-700">✖</button>
                  </div>`
            : ""
        }
          </div>
        </div>

        <!-- Image / GIF -->
        <div>
          <label class="block text-sm font-semibold text-gray-700">Image / GIF</label>
          <input 
            id="image_url" 
            class="w-full border rounded p-2 mb-2" 
            placeholder="Paste image/GIF URL (optional)" 
            value="${sign?.image_url || ""}"
          >
          <input 
            id="imageFile" 
            type="file" 
            accept="image/*" 
            class="w-full border rounded p-2 cursor-pointer"
          >

          <!-- Image Preview -->
          <div id="imagePreview" class="mt-3">
            ${sign?.image_url
            ? `
                  <div class="relative">
                    <img src="${sign.image_url}" alt="Preview" class="rounded-lg w-full max-h-48 object-contain">
                    <button id="removeImage" 
                      class="absolute top-2 right-2 bg-red-600 text-white text-xs px-2 py-1 rounded hover:bg-red-700">✖</button>
                  </div>`
            : ""
        }
          </div>
        </div>

        <!-- Description -->
        <textarea 
          id="description" 
          class="w-full border rounded p-2" 
          rows="2" 
          placeholder="Description">${sign?.description || ""}
        </textarea>

        <!-- Buttons -->
        <div class="flex justify-end gap-2 mt-4">
          <button type="button" onclick="closeModal()" class="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400">Cancel</button>
          <button type="submit" class="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700">Save</button>
        </div>
      </form>
    </div>
  `;
    modalContainer.classList.remove("hidden");

    const videoInput = document.getElementById("videoFile");
    const imageInput = document.getElementById("imageFile");
    const videoUrlInput = document.getElementById("video_url");
    const imageUrlInput = document.getElementById("image_url");

    const videoPreview = document.getElementById("videoPreview");
    const imagePreview = document.getElementById("imagePreview");

    // 🔄 Function to refresh remove button listeners
    const attachRemoveButtons = () => {
        const removeVideo = document.getElementById("removeVideo");
        const removeImage = document.getElementById("removeImage");

        if (removeVideo)
            removeVideo.onclick = () => {
                videoPreview.innerHTML = "";
                videoUrlInput.value = "";
                videoInput.value = "";
            };

        if (removeImage)
            removeImage.onclick = () => {
                imagePreview.innerHTML = "";
                imageUrlInput.value = "";
                imageInput.value = "";
            };
    };

    // 🖼️ Show preview when file selected
    videoInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (file) {
            const blob = URL.createObjectURL(file);
            videoPreview.innerHTML = `
        <div class="relative">
          <video src="${blob}" controls class="rounded-lg w-full max-h-48"></video>
          <button id="removeVideo" 
            class="absolute top-2 right-2 bg-red-600 text-white text-xs px-2 py-1 rounded hover:bg-red-700">✖</button>
        </div>`;
            attachRemoveButtons();
        }
    });

    imageInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (file) {
            const blob = URL.createObjectURL(file);
            imagePreview.innerHTML = `
        <div class="relative">
          <img src="${blob}" alt="Preview" class="rounded-lg w-full max-h-48 object-contain">
          <button id="removeImage" 
            class="absolute top-2 right-2 bg-red-600 text-white text-xs px-2 py-1 rounded hover:bg-red-700">✖</button>
        </div>`;
            attachRemoveButtons();
        }
    });

    // 🧠 Show preview when URL pasted
    videoUrlInput.addEventListener("input", (e) => {
        const url = e.target.value.trim();
        if (url) {
            videoPreview.innerHTML = `
        <div class="relative">
          <video src="${url}" controls class="rounded-lg w-full max-h-48"></video>
          <button id="removeVideo" 
            class="absolute top-2 right-2 bg-red-600 text-white text-xs px-2 py-1 rounded hover:bg-red-700">✖</button>
        </div>`;
            attachRemoveButtons();
        } else {
            videoPreview.innerHTML = "";
        }
    });

    imageUrlInput.addEventListener("input", (e) => {
        const url = e.target.value.trim();
        if (url) {
            imagePreview.innerHTML = `
        <div class="relative">
          <img src="${url}" alt="Preview" class="rounded-lg w-full max-h-48 object-contain">
          <button id="removeImage" 
            class="absolute top-2 right-2 bg-red-600 text-white text-xs px-2 py-1 rounded hover:bg-red-700">✖</button>
        </div>`;
            attachRemoveButtons();
        } else {
            imagePreview.innerHTML = "";
        }
    });

    attachRemoveButtons();

    // 💾 Save form
    document.getElementById("signForm").onsubmit = async (e) => {
        e.preventDefault();

        const gloss = document.getElementById("gloss").value.trim();
        const desc = document.getElementById("description").value.trim();
        const videoFile = videoInput.files[0];
        const imageFile = imageInput.files[0];
        let videoUrl = videoUrlInput.value.trim();
        let imageUrl = imageUrlInput.value.trim();

        // Upload video if new file selected
        if (videoFile) {
            const { data, error } = await supabase.storage
                .from("lesson-media")
                .upload(`videos/${Date.now()}_${videoFile.name}`, videoFile);
            if (!error) videoUrl = supabase.storage.from("lesson-media").getPublicUrl(data.path).data.publicUrl;
        }

        // Upload image if new file selected
        if (imageFile) {
            const { data, error } = await supabase.storage
                .from("lesson-media")
                .upload(`images/${Date.now()}_${imageFile.name}`, imageFile);
            if (!error) imageUrl = supabase.storage.from("lesson-media").getPublicUrl(data.path).data.publicUrl;
        }

        const signData = {
            gloss,
            description: desc,
            video_url: videoUrl,
            image_url: imageUrl,
            lesson_id: lessonId,
        };

        if (sign?.id)
            await supabase.from("lesson_signs").update(signData).eq("id", sign.id);
        else await supabase.from("lesson_signs").insert(signData);

        closeModal();
        loadLessonSigns();
    };
};



/* ==========================================================
   🧠 LESSON QUESTIONS CRUD
========================================================== */
async function loadLessonQuestions() {
    const { data: questions } = await supabase
        .from("lesson_questions")
        .select("*")
        .eq("lesson_id", lessonId)
        .order("created_at");

    questionsSection.innerHTML = `
    <div class="flex justify-between items-center mb-4">
      <h3 class="text-2xl font-bold text-gray-700">Lesson Questions</h3>
      <button onclick="openQuestionModal()" class="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600">+ Add Question</button>
    </div>
    ${questions?.length
            ? `<table class="w-full text-left border-collapse">
            <thead class="bg-gray-100">
              <tr><th class="py-2 px-3">Type</th><th class="py-2 px-3">Question</th><th class="py-2 px-3">Answer</th><th class="py-2 px-3 text-right">Actions</th></tr>
            </thead>
            <tbody>
              ${questions
                .map(
                    (q) => `
                <tr class="border-b">
                  <td class="py-2 px-3 capitalize">${q.type}</td>
                  <td class="py-2 px-3">${q.question}</td>
                  <td class="py-2 px-3">${q.answer}</td>
                  <td class="py-2 px-3 text-right">
                    <button onclick='openQuestionModal(${JSON.stringify(q)})' class="text-blue-500 hover:underline mr-2">Edit</button>
                    <button onclick="confirmDelete('question', '${q.id}')" class="text-red-500 hover:underline">Delete</button>
                  </td>
                </tr>`
                )
                .join("")}
            </tbody>
          </table>`
            : `<p class="text-gray-500">No questions yet.</p>`
        }
  `;
}

window.openQuestionModal = async function (question = null) {
    const { data: signs } = await supabase
        .from("lesson_signs")
        .select("gloss")
        .eq("lesson_id", lessonId);

    const glossOptions = signs.map((s) => `<option value="${s.gloss}">${s.gloss}</option>`).join("");

    modalContainer.innerHTML = `
    <div class="bg-white rounded-lg p-6 w-[28rem]">
      <h3 class="text-xl font-bold mb-4">${question ? "Edit Question" : "Add Question"}</h3>
      <form id="questionForm" class="space-y-4">
        <select id="type" class="w-full border rounded p-2">
          <option value="gesture" ${question?.type === "gesture" ? "selected" : ""}>Gesture</option>
          <option value="flashcard" ${question?.type === "flashcard" ? "selected" : ""}>Flashcard</option>
          <option value="multiple-choice" ${question?.type === "multiple-choice" ? "selected" : ""}>Multiple Choice</option>
        </select>
        <input id="questionText" class="w-full border rounded p-2" placeholder="Question" value="${question?.question || ""}" required>
        <div id="dynamicFields"></div>
        <div class="flex justify-end gap-2 mt-4">
          <button type="button" onclick="closeModal()" class="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400">Cancel</button>
          <button type="submit" class="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700">Save</button>
        </div>
      </form>
    </div>
  `;
    modalContainer.classList.remove("hidden");

    const typeSelect = document.getElementById("type");
    const dynamicFields = document.getElementById("dynamicFields");

    function renderDynamicFields(type) {
        if (type === "gesture") {
            dynamicFields.innerHTML = `
        <label class="block text-sm font-semibold text-gray-700">Expected Gloss</label>
        <select id="answer" class="w-full border rounded p-2">${glossOptions}</select>`;
        } else if (type === "flashcard") {
            dynamicFields.innerHTML = `
        <label class="block text-sm font-semibold text-gray-700">Answer</label>
        <input id="answer" class="w-full border rounded p-2" value="${question?.answer || ""}">`;
        } else {
            dynamicFields.innerHTML = `
        <label class="block text-sm font-semibold text-gray-700">Choices (comma-separated)</label>
        <textarea id="choices" class="w-full border rounded p-2" rows="2">${question?.choices || ""}</textarea>
        <label class="block text-sm font-semibold text-gray-700">Correct Answer</label>
        <input id="answer" class="w-full border rounded p-2" value="${question?.answer || ""}">`;
        }
    }

    typeSelect.addEventListener("change", (e) => renderDynamicFields(e.target.value));
    renderDynamicFields(question?.type || "gesture");

    document.getElementById("questionForm").onsubmit = async (e) => {
        e.preventDefault();

        const data = {
            type: document.getElementById("type").value,
            question: document.getElementById("questionText").value,
            answer: document.getElementById("answer")?.value || "",
            choices: document.getElementById("choices")?.value || null,
            lesson_id: lessonId,
        };

        if (question?.id)
            await supabase.from("lesson_questions").update(data).eq("id", question.id);
        else await supabase.from("lesson_questions").insert(data);

        closeModal();
        loadLessonQuestions();
    };
};

/* ==========================================================
   🗑️ DELETE MODAL
========================================================== */
window.confirmDelete = function (type, id) {
    modalContainer.innerHTML = `
    <div class="bg-white rounded-xl p-6 w-80 text-center shadow-lg">
      <h2 class="text-xl font-bold text-gray-800 mb-3">Delete ${type === "sign" ? "Sign" : "Question"}?</h2>
      <p class="text-gray-500 mb-6 text-sm">This action cannot be undone.</p>
      <div class="flex justify-center gap-3">
        <button onclick="closeModal()" class="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400">Cancel</button>
        <button onclick="deleteItem('${type}', '${id}')" class="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">Delete</button>
      </div>
    </div>
  `;
    modalContainer.classList.remove("hidden");
};

window.deleteItem = async function (type, id) {
    if (type === "sign") {
        const { data: sign } = await supabase.from("lesson_signs").select("video_url, image_url").eq("id", id).single();

        // Delete files from storage if they exist
        if (sign?.video_url) {
            const path = sign.video_url.split("/lesson-media/")[1];
            await supabase.storage.from("lesson-media").remove([path]);
        }
        if (sign?.image_url) {
            const path = sign.image_url.split("/lesson-media/")[1];
            await supabase.storage.from("lesson-media").remove([path]);
        }

        await supabase.from("lesson_signs").delete().eq("id", id);
    } else {
        await supabase.from("lesson_questions").delete().eq("id", id);
    }

    closeModal();
    loadLessonContent();
};


window.closeModal = function () {
    modalContainer.classList.add("hidden");
};
