// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { ScorecardCamera } from "./ScorecardCamera";

test("captures a camera frame and releases the camera when closed", async () => {
  const stop = vi.fn();
  const getUserMedia = vi.fn().mockResolvedValue({
    getTracks: () => [{ stop }],
  });
  const drawImage = vi.fn();
  vi.stubGlobal("navigator", { mediaDevices: { getUserMedia } });
  vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
    drawImage,
  } as unknown as CanvasRenderingContext2D);
  vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation(
    (callback) => callback(new Blob(["photo"], { type: "image/jpeg" })),
  );
  const onCapture = vi.fn();
  const camera = render(
    <ScorecardCamera onCapture={onCapture} onClose={() => camera.unmount()} />,
  );
  try {
    const video = screen.getByLabelText("Live scorecard camera preview");
    Object.defineProperties(video, {
      videoWidth: { value: 1920 },
      videoHeight: { value: 1080 },
    });
    const capture = screen.getByRole<HTMLButtonElement>("button", {
      name: "Capture photo",
    });
    await waitFor(() => expect(capture.disabled).toBe(false));
    fireEvent.click(capture);
    expect(getUserMedia).toHaveBeenCalledWith(
      expect.objectContaining({ audio: false }),
    );
    expect(drawImage).toHaveBeenCalledWith(video, 0, 0);
    expect(onCapture).toHaveBeenCalledWith(
      expect.objectContaining({ type: "image/jpeg" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Close camera" }));
    expect(stop).toHaveBeenCalledOnce();
  } finally {
    camera.unmount();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  }
});
