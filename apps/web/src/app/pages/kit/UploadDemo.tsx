import { useState } from "react";

import { formatNumber } from "../../../shared/format";
import { useT } from "../../../shared/i18n";
import { FileUpload, type UploadResult, type Uploader } from "../../../shared/upload";

/** A stand-in for storage: takes about two seconds, reports progress, honours cancel, can fail. */
function fakeUploader(shouldFail: () => boolean): Uploader {
  return (blob, { fileName, signal, onProgress }) =>
    new Promise((resolve, reject) => {
      let done = 0;
      const timer = setInterval(() => {
        done += 0.1;
        onProgress(Math.min(1, done));
        if (done >= 1) {
          clearInterval(timer);
          if (shouldFail()) reject(new Error("simulated failure"));
          else resolve({ path: `demo/${fileName}` });
        }
      }, 200);
      signal.addEventListener("abort", () => {
        clearInterval(timer);
        reject(new DOMException("aborted", "AbortError"));
      });
      void blob;
    });
}

export function UploadDemo() {
  const t = useT();
  const [fail, setFail] = useState(false);
  const [uploaded, setUploaded] = useState<UploadResult | null>(null);
  const [plainSize, setPlainSize] = useState<number | null>(null);
  const upload = fakeUploader(() => fail);
  return (
    <div className="flex max-w-xl flex-col gap-4">
      <label className="flex min-h-tap items-center gap-3">
        <input
          type="checkbox"
          className="h-5 w-5"
          checked={fail}
          onChange={(e) => setFail(e.target.checked)}
        />
        <span>{t("devkit.kit.uploadFail")}</span>
      </label>
      <FileUpload
        label={t("devkit.kit.uploadPhoto")}
        upload={upload}
        cropAspect={1}
        onUploaded={(result) => setUploaded(result)}
      />
      <FileUpload
        label={t("devkit.kit.uploadDoc")}
        upload={upload}
        accept={["application/pdf"]}
        maxBytes={5 * 1024 * 1024}
        onUploaded={(result) => setUploaded(result)}
      />
      <FileUpload
        label={t("devkit.kit.uploadPhotoPlain")}
        upload={upload}
        onUploaded={(_result, blob) => setPlainSize(blob.size)}
      />
      {plainSize !== null ? (
        <p className="m-0" data-testid="upload-plain-size" data-bytes={plainSize}>
          {t("devkit.kit.uploadedSize", { bytes: formatNumber(plainSize) })}
        </p>
      ) : null}
      {uploaded ? (
        <p className="m-0" data-testid="upload-result">
          {t("devkit.kit.uploaded", { path: uploaded.path })}
        </p>
      ) : null}
    </div>
  );
}
