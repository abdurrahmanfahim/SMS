import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { UiProviders } from "../Providers";

import { SampleForm } from "./SampleForm";

afterEach(cleanup);

function mount() {
  render(
    <UiProviders>
      <SampleForm />
    </UiProviders>,
  );
}

describe("SampleForm", () => {
  it("shows inline errors, keeps typed values and accepts Bangla digits", async () => {
    mount();
    fireEvent.change(screen.getByLabelText("শিক্ষার্থীর নাম"), {
      target: { value: "রুবেল হোসেন" },
    });
    fireEvent.change(screen.getByLabelText("অভিভাবকের মোবাইল নম্বর"), {
      target: { value: "০১৭০০০০" },
    });
    fireEvent.click(screen.getByRole("button", { name: "সংরক্ষণ করুন" }));
    expect(screen.getByText("১১ সংখ্যার সঠিক মোবাইল নম্বর দিন।")).toBeInTheDocument();
    expect(screen.getByText("শ্রেণি বেছে নিন।")).toBeInTheDocument();
    expect(screen.getByLabelText("শিক্ষার্থীর নাম")).toHaveValue("রুবেল হোসেন");
  });

  it("saves and shows a toast when valid (Bangla digits accepted)", async () => {
    mount();
    fireEvent.change(screen.getByLabelText("শিক্ষার্থীর নাম"), {
      target: { value: "রুবেল হোসেন" },
    });
    fireEvent.change(screen.getByLabelText("অভিভাবকের মোবাইল নম্বর"), {
      target: { value: "০১৭০০০০০০০০" },
    });
    fireEvent.change(screen.getByLabelText("শ্রেণি"), { target: { value: "6" } });
    fireEvent.click(screen.getByRole("button", { name: "সংরক্ষণ করুন" }));
    expect(await screen.findByText("সংরক্ষণ হয়েছে")).toBeInTheDocument();
  });
});
