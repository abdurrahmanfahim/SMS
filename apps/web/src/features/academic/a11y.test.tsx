import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import axe from "axe-core";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";

import { UiProviders } from "../../app/Providers";
import { registerMessages, setLocale } from "../../shared/i18n";
import { flattenMessages } from "../../shared/i18n/flatten";

import { AcademicProvider } from "./context";
import { AssignmentsPage } from "./pages/AssignmentsPage";
import { ClassSubjectsPage } from "./pages/ClassSubjectsPage";
import { HubPage } from "./pages/HubPage";
import { LevelsPage } from "./pages/LevelsPage";
import { PresetPage } from "./pages/PresetPage";
import { SectionsPage } from "./pages/SectionsPage";
import { SubjectsPage } from "./pages/SubjectsPage";
import { YearsPage } from "./pages/YearsPage";
import {
  emptyData,
  makeLevel,
  makeSubject,
  makeYear,
  memoryRepository,
  type MemoryData,
} from "./testing";

const files = import.meta.glob<unknown>("./i18n/{bn,en}.json", { eager: true, import: "default" });
registerMessages("en", flattenMessages(files["./i18n/en.json"]));
registerMessages("bn", flattenMessages(files["./i18n/bn.json"]));

afterEach(cleanup);

/** Colour contrast needs real layout and colours; jsdom has neither, so that rule is off here (checked on a real phone instead). */
async function violations(container: HTMLElement) {
  const result = await axe.run(container, {
    rules: { "color-contrast": { enabled: false } },
    resultTypes: ["violations"],
  });
  return result.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
}

async function dataset(): Promise<MemoryData> {
  const y = makeYear({ name_en: "2026", name_bn: "২০২৬", is_current: true });
  const l1 = makeLevel({ name_en: "Class 1", name_bn: "প্রথম শ্রেণি", sort_order: 1 });
  const l2 = makeLevel({ name_en: "Class 2", name_bn: "দ্বিতীয় শ্রেণি", sort_order: 2 });
  const s = makeSubject({ name_en: "Bangla", name_bn: "বাংলা", code: "BAN" });
  const data: MemoryData = {
    ...emptyData(),
    years: [y],
    levels: [l1, l2],
    subjects: [s],
    teachers: [{ membershipId: "m-1", name: "রহিম উদ্দিন" }],
  };
  const { repo } = memoryRepository(data);
  await repo.createSection({
    academicYearId: y.id,
    classLevelId: l1.id,
    name: "A",
    shift: "Morning",
    capacity: 40,
  });
  await repo.addClassSubject(y.id, l1.id, s.id);
  await repo.createAssignment({
    academicYearId: y.id,
    membershipId: "m-1",
    sectionId: data.sections[0]?.id ?? "",
    subjectId: null,
  });
  return data;
}

function mount(path: string, data: MemoryData, canWrite = true) {
  const { repo } = memoryRepository(data);
  return render(
    <UiProviders>
      <MemoryRouter initialEntries={[path]}>
        <AcademicProvider value={{ repo, canWrite }}>
          <Routes>
            <Route path="/app/academic" element={<HubPage />} />
            <Route path="/app/academic/years" element={<YearsPage />} />
            <Route path="/app/academic/levels" element={<LevelsPage />} />
            <Route path="/app/academic/sections" element={<SectionsPage />} />
            <Route path="/app/academic/subjects" element={<SubjectsPage />} />
            <Route path="/app/academic/class-subjects" element={<ClassSubjectsPage />} />
            <Route path="/app/academic/assignments" element={<AssignmentsPage />} />
            <Route path="/app/academic/preset" element={<PresetPage />} />
          </Routes>
        </AcademicProvider>
      </MemoryRouter>
    </UiProviders>,
  );
}

const PAGES = [
  ["hub", "/app/academic", /Academic structure|শিক্ষা কাঠামো/],
  ["years", "/app/academic/years", /Academic years|শিক্ষাবর্ষ/],
  ["levels", "/app/academic/levels", /Class levels|শ্রেণি/],
  ["sections", "/app/academic/sections", /Sections|শাখা/],
  ["subjects", "/app/academic/subjects", /Subjects|বিষয়/],
  ["class subjects", "/app/academic/class-subjects", /Subjects of each class|শ্রেণির বিষয়/],
  ["assignments", "/app/academic/assignments", /Teacher assignments|শিক্ষকের দায়িত্ব/],
  ["preset", "/app/academic/preset", /Start from a preset|প্রিসেট/],
] as const;

describe("axe: no serious or critical violations", () => {
  for (const locale of ["bn", "en"] as const) {
    for (const [name, path, heading] of PAGES) {
      for (const canWrite of [true, false]) {
        if (name === "preset" && !canWrite) continue;
        it(`${name} page, ${locale}, ${canWrite ? "admin" : "read-only"}`, async () => {
          setLocale(locale);
          const { container } = mount(path, await dataset(), canWrite);
          await screen.findByRole("heading", { level: 1, name: heading });
          await new Promise((resolve) => setTimeout(resolve, 50));
          expect(await violations(container)).toEqual([]);
        });
      }
    }
  }

  it("the add-year form sheet is accessible and labelled", async () => {
    setLocale("bn");
    mount("/app/academic/years", await dataset());
    fireEvent.click(await screen.findByRole("button", { name: "শিক্ষাবর্ষ যোগ করুন" }));
    const dialog = await screen.findByRole("dialog");
    expect(await violations(document.body)).toEqual([]);
    expect(dialog).toHaveAccessibleName();
  });
});
