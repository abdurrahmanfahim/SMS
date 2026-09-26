// Shared prototype helpers. No backend — everything lives in memory for the
// length of the test session, which is enough for a clickable usability
// prototype (per M1-U3 step 1). Reloading the page resets state by design.

function showToast(message, isError) {
  var region = document.getElementById("toast-region");
  if (!region) return;
  var el = document.createElement("div");
  el.className = "toast" + (isError ? " toast-error" : "");
  el.setAttribute("role", "status");
  el.setAttribute("aria-live", isError ? "assertive" : "polite");
  el.textContent = message;
  region.appendChild(el);
  setTimeout(function () {
    el.remove();
  }, isError ? 4200 : 2400);
}

// Facilitator-only control: a fixed corner switch that simulates the device
// going offline, so a moderator can test the offline/sync/queued states
// named in the task (step 1's "offline and sync states") without needing to
// physically disable the test phone's network mid-session.
var __offline = false;
function isOffline() {
  return __offline;
}
function initOfflineToggle() {
  var btn = document.getElementById("offline-toggle");
  if (!btn) return;
  btn.addEventListener("click", function () {
    __offline = !__offline;
    btn.setAttribute("aria-pressed", String(__offline));
    btn.textContent = __offline ? "🔌 অফলাইন মোড: চালু" : "🔌 অফলাইন মোড: বন্ধ";
    document.dispatchEvent(new CustomEvent("connectivitychange", { detail: { offline: __offline } }));
    showToast(__offline ? "পরীক্ষার জন্য: সংযোগ বিচ্ছিন্ন করা হলো" : "সংযোগ ফিরে এসেছে");
  });
}

document.addEventListener("DOMContentLoaded", initOfflineToggle);

// Realistic Bangla sample-data generator. Never lorem ipsum (design-system.md
// §1). Includes the exact long-name example from design-system.md §1 ("মোঃ
// আব্দুর রহমান ফাহিম চৌধুরী") to exercise truncation, and conjunct-heavy
// strings (দ্য, ক্ষ, র্থ, ষ্ট্র) called out in design-system.md §1's
// conjunct-rendering test list. No real student data anywhere
// (AGENT-PROTOCOL.md §8): every name below is invented.
var BN_FIRST = ["রাকিবুল", "সৈয়দা", "তানভীর", "ফারজানা", "মোঃ ইমরান", "নুসরাত", "শাহরিয়ার", "তাসনিয়া", "আব্দুল্লাহ", "মেহজাবিন", "রায়হান", "সুমাইয়া", "কাজী রিফাত", "জান্নাতুল", "মিনহাজ", "লামিয়া", "ওয়াসিফ", "তানজিলা", "হাসিবুল", "মারিয়া"];
var BN_LAST = ["ইসলাম", "রহমান", "হোসেন", "আক্তার", "চৌধুরী", "খান", "বেগম", "আহমেদ", "সরকার", "মন্ডল"];

function bnRoster(n) {
  var out = [];
  for (var i = 1; i <= n; i++) {
    var name = BN_FIRST[i % BN_FIRST.length] + " " + BN_LAST[(i * 3) % BN_LAST.length];
    out.push({ roll: i, name: name, id: "s" + i });
  }
  // Force two known edge cases into the list, per design-system.md §1:
  out[2] = { roll: out[2].roll, name: "মোঃ আব্দুর রহমান ফাহিম চৌধুরী", id: "s3" }; // long name, truncation test
  out[6] = { roll: out[6].roll, name: "শিক্ষার্থী রাষ্ট্রীয় বিদ্যালয়ের", id: "s7" }; // triple-conjunct ষ্ট্র test
  return out;
}
