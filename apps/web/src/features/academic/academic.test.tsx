import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { UiProviders } from "../../app/Providers";
import { registerMessages, setLocale } from "../../shared/i18n";
import { flattenMessages } from "../../shared/i18n/flatten";
import { navItemsForRole } from "../../shared/nav";

import { AcademicProvider } from "./context";
import { AssignmentsPage } from "./pages/AssignmentsPage";
import { ClassSubjectsPage } from "./pages/ClassSubjectsPage";
import { HubPage } from "./pages/HubPage";
import { LevelsPage } from "./pages/LevelsPage";
import { PresetPage } from "./pages/PresetPage";
import { SectionsPage } from "./pages/SectionsPage";
import { SubjectsPage } from "./pages/SubjectsPage";
import { YearsPage } from "./pages/YearsPage";
import { academicNavItem, navItems, routes } from "./register";
import {
  emptyData,
  makeLevel,
  makeSubject,
  makeYear,
  memoryRepository,
  type MemoryData,
} from "./testing";

/* The shell registers feature translations at start-up; a unit test does it by hand. */
const files = import.meta.glob<unknown>("./i18n/{bn,en}.json", { eager: true, import: "default" });
registerMessages("en", flattenMessages(files["./i18n/en.json"]));
registerMessages("bn", flattenMessages(files["./i18n/bn.json"]));

beforeEach(() => setLocale("en"));
afterEach(cleanup);

function mount(
  path: string,
  data: MemoryData,
  opts: { canWrite?: boolean; failList?: boolean } = {},
) {
  const { repo, calls } = memoryRepository(data, { failList: opts.failList });
  render(
    <UiProviders>
      <MemoryRouter initialEntries={[path]}>
        <AcademicProvider value={{ repo, canWrite: opts.canWrite ?? true }}>
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
  return { calls };
}

const type = (label: RegExp, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });

describe("academic years", () => {
  it("lists years, marks the current one and adds a new year", async () => {
    const data = { ...emptyData(), years: [makeYear({ name_en: "2026", is_current: true })] };
    const { calls } = mount("/app/academic/years", data);
    expect(await screen.findByText("2026")).toBeInTheDocument();
    expect(screen.getByText("Current year")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Add academic year" }));
    type(/Name in English/, "2027");
    type(/First day/, "2027-01-01");
    type(/Last day/, "2027-12-31");
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(calls).toContain("createYear"));
    expect(await screen.findByText("2027")).toBeInTheDocument();
  });

  it("rejects an overlapping year with a clear message and sends nothing", async () => {
    const data = { ...emptyData(), years: [makeYear({ name_en: "2026" })] };
    const { calls } = mount("/app/academic/years", data);
    await screen.findByText("2026");
    fireEvent.click(screen.getByRole("button", { name: "Add academic year" }));
    type(/Name in English/, "Overlap");
    type(/First day/, "2026-12-31");
    type(/Last day/, "2027-06-30");
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByText(/overlaps another academic year/)).toBeInTheDocument();
    expect(calls).not.toContain("createYear");
  });

  it("asks for a name and keeps what was typed", async () => {
    mount("/app/academic/years", emptyData());
    fireEvent.click(await screen.findByRole("button", { name: "Add academic year" }));
    type(/First day/, "2027-01-01");
    type(/Last day/, "2027-12-31");
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByText("Write a name in Bangla or English.")).toBeInTheDocument();
    expect(screen.getByLabelText(/First day/)).toHaveValue("2027-01-01");
  });

  it("makes another year current through one call", async () => {
    const a = makeYear({ name_en: "2026", is_current: true });
    const b = makeYear({ name_en: "2027", starts_on: "2027-01-01", ends_on: "2027-12-31" });
    const { calls } = mount("/app/academic/years", { ...emptyData(), years: [a, b] });
    fireEvent.click(await screen.findByRole("button", { name: "Make current" }));
    await waitFor(() => expect(calls).toContain(`setCurrentYear:${b.id}`));
  });

  it("blocks deleting a year that has sections and says why", async () => {
    const y = makeYear({ name_en: "2026" });
    const l = makeLevel();
    const data = { ...emptyData(), years: [y], levels: [l] };
    const { repo } = memoryRepository(data);
    await repo.createSection({
      academicYearId: y.id,
      classLevelId: l.id,
      name: "A",
      shift: "",
      capacity: null,
    });
    mount("/app/academic/years", data);
    fireEvent.click(await screen.findByRole("button", { name: "Delete" }));
    const dialog = await screen.findByRole("alertdialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Delete" }));
    expect(await screen.findByText(/still in use/)).toBeInTheDocument();
    expect(screen.getByText("2026")).toBeInTheDocument();
  });

  it("shows an error with a retry when loading fails", async () => {
    mount("/app/academic/years", emptyData(), { failList: true });
    expect(await screen.findByText("Could not load this.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });
});

describe("read-only roles", () => {
  it("shows the structure without any edit control", async () => {
    const data = {
      ...emptyData(),
      years: [makeYear({ name_en: "2026" })],
      levels: [makeLevel()],
      subjects: [makeSubject()],
    };
    for (const path of ["years", "levels", "subjects"]) {
      mount(`/app/academic/${path}`, data, { canWrite: false });
      expect(await screen.findByRole("note")).toHaveTextContent(
        "You can view this but not change it.",
      );
      expect(screen.queryByRole("button", { name: /^Add / })).toBeNull();
      expect(screen.queryByRole("button", { name: "Edit" })).toBeNull();
      expect(screen.queryByRole("button", { name: "Delete" })).toBeNull();
      cleanup();
    }
  });
  it("hides the preset from the hub and refuses its page", async () => {
    mount("/app/academic", emptyData(), { canWrite: false });
    expect(screen.queryByText("Start from a preset")).toBeNull();
    cleanup();
    mount("/app/academic/preset", emptyData(), { canWrite: false });
    expect(await screen.findByRole("alert")).toHaveTextContent("You are not allowed to do this.");
  });
});

describe("class levels", () => {
  it("reorders with buttons and sends the new order", async () => {
    const one = makeLevel({ name_en: "Class 1", sort_order: 1 });
    const two = makeLevel({ name_en: "Class 2", sort_order: 2 });
    const { calls } = mount("/app/academic/levels", { ...emptyData(), levels: [one, two] });
    fireEvent.click(await screen.findByRole("button", { name: "Move Class 2 up" }));
    await waitFor(() => expect(calls).toContain(`reorderLevels:${two.id},${one.id}`));
  });

  it("blocks deleting a level with sections", async () => {
    const y = makeYear();
    const l = makeLevel({ name_en: "Class 1" });
    const data = { ...emptyData(), years: [y], levels: [l] };
    await memoryRepository(data).repo.createSection({
      academicYearId: y.id,
      classLevelId: l.id,
      name: "A",
      shift: "",
      capacity: null,
    });
    mount("/app/academic/levels", data);
    fireEvent.click(await screen.findByRole("button", { name: "Delete" }));
    const dialog = await screen.findByRole("alertdialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Delete" }));
    expect(await screen.findByText(/still in use/)).toBeInTheDocument();
  });

  it("rejects a duplicate name with a clear message", async () => {
    mount("/app/academic/levels", { ...emptyData(), levels: [makeLevel({ name_en: "Class 1" })] });
    fireEvent.click(await screen.findByRole("button", { name: "Add class level" }));
    type(/Name in English/, "Class 1");
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(
      await screen.findByText("This name is already used. Choose a different name."),
    ).toBeInTheDocument();
  });
});

describe("sections, class subjects, assignments", () => {
  function base() {
    const y = makeYear({ name_en: "2026", is_current: true });
    const l = makeLevel({ name_en: "Class 1" });
    const s = makeSubject({ name_en: "Bangla" });
    return {
      y,
      l,
      s,
      data: {
        ...emptyData(),
        years: [y],
        levels: [l],
        subjects: [s],
        teachers: [{ membershipId: "m-1", name: "Rahim Uddin" }],
      },
    };
  }

  it("adds a section to a level for the chosen year and rejects a duplicate", async () => {
    const { data, y, l } = base();
    const { calls } = mount("/app/academic/sections", data);
    fireEvent.click(await screen.findByRole("button", { name: "Add section to Class 1" }));
    type(/Section name/, "A");
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(calls).toContain("createSection"));
    expect(data.sections[0]).toMatchObject({
      academic_year_id: y.id,
      class_level_id: l.id,
      name: "A",
    });
    fireEvent.click(await screen.findByRole("button", { name: "Add section to Class 1" }));
    type(/Section name/, "a");
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByText(/already has a section with that name/)).toBeInTheDocument();
    expect(data.sections).toHaveLength(1);
  });

  it("maps a subject to a class, toggles optional and removes it", async () => {
    const { data } = base();
    const { calls } = mount("/app/academic/class-subjects", data);
    fireEvent.change(await screen.findByLabelText("Add a subject"), {
      target: { value: data.subjects[0]?.id },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add to class" }));
    expect(await screen.findByText("Required")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Make optional" }));
    expect(await screen.findByText("Optional")).toBeInTheDocument();
    expect(calls).toContain("setOptional:true");
    fireEvent.click(screen.getByRole("button", { name: "Remove" }));
    await waitFor(() => expect(calls).toContain("removeClassSubject"));
  });

  it("assigns a class teacher and shows who teaches the section", async () => {
    const { data, y, l } = base();
    await memoryRepository(data).repo.createSection({
      academicYearId: y.id,
      classLevelId: l.id,
      name: "A",
      shift: "",
      capacity: null,
    });
    const { calls } = mount("/app/academic/assignments", data);
    fireEvent.click(await screen.findByRole("button", { name: "Assign a teacher" }));
    fireEvent.change(screen.getByLabelText("Section"), { target: { value: data.sections[0]?.id } });
    fireEvent.change(screen.getByLabelText("Teacher"), { target: { value: "m-1" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(calls).toContain("createAssignment"));
    expect(data.assignments[0]).toMatchObject({ role: "class_teacher", subject_id: null });
    expect(await screen.findByText(/Rahim Uddin/)).toBeInTheDocument();
  });

  it("explains when there are no teachers to assign", async () => {
    const { data, y, l } = base();
    data.teachers = [];
    await memoryRepository(data).repo.createSection({
      academicYearId: y.id,
      classLevelId: l.id,
      name: "A",
      shift: "",
      capacity: null,
    });
    mount("/app/academic/assignments", data);
    expect(await screen.findByText(/No teachers to assign yet/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Assign a teacher" })).toBeNull();
  });
});

describe("presets", () => {
  it("applies school-1-10 to the chosen year and is safe to apply twice", async () => {
    const data = { ...emptyData(), years: [makeYear({ name_en: "2026", is_current: true })] };
    const { calls } = mount("/app/academic/preset", data);
    fireEvent.click(await screen.findByRole("button", { name: "Add to this year" }));
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Added 10 class levels, 20 sections, 9 subjects",
    );
    expect(data.levels).toHaveLength(10);
    expect(data.sections).toHaveLength(20);
    expect(data.sections.every((s) => s.name === "A" || s.name === "B")).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Add to this year" }));
    await waitFor(() => expect(calls.filter((c) => c.startsWith("applyPreset"))).toHaveLength(2));
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Added 0 class levels, 0 sections, 0 subjects and 0 class subjects",
    );
    expect(data.levels).toHaveLength(10);
    expect(data.sections).toHaveLength(20);
  });

  it("offers a blank start that adds nothing, and asks for a year first", async () => {
    mount("/app/academic/preset", emptyData());
    expect(await screen.findByText("Add an academic year first")).toBeInTheDocument();
    cleanup();
    const data = { ...emptyData(), years: [makeYear()] };
    mount("/app/academic/preset", data);
    fireEvent.click(await screen.findByLabelText(/Blank start/));
    expect(screen.queryByRole("button", { name: "Add to this year" })).toBeNull();
    expect(screen.getByRole("link", { name: "Add class levels by hand" })).toBeInTheDocument();
    expect(data.levels).toHaveLength(0);
  });
});

describe("registration", () => {
  it("registers one parent route under /app/academic with all screens as children", () => {
    expect(routes).toHaveLength(1);
    const parent = routes[0];
    expect(parent?.path).toBe("/app/academic");
    expect(parent?.children?.map((c) => c.path ?? "index")).toEqual([
      "index",
      "years",
      "levels",
      "sections",
      "subjects",
      "class-subjects",
      "assignments",
      "preset",
    ]);
  });
  it("keeps the nav item ready but unregistered, and ready for staff roles only", () => {
    expect(navItems).toEqual([]);
    const seen = (role: Parameters<typeof navItemsForRole>[1]) =>
      navItemsForRole([academicNavItem], role).map((n) => n.key);
    expect(seen("institution_admin")).toEqual(["academic.home"]);
    expect(seen("teacher")).toEqual(["academic.home"]);
    expect(seen("accountant")).toEqual(["academic.home"]);
    expect(seen("guardian")).toEqual([]);
    expect(seen("student")).toEqual([]);
    expect(academicNavItem.path).toBe("/app/academic");
  });
});
