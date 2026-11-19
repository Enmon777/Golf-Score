import { useEffect, useRef, useState } from "react";

export function ScorecardCamera({
  onCapture,
  onClose,
}: {
  onCapture: (file: File) => void;
  onClose: () => void;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const mounted = useRef(false);
  const [ready, setReady] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    let stream: MediaStream | undefined;
    mounted.current = true;
    async function open() {
      try {
        if (!navigator.mediaDevices?.getUserMedia)
          throw new Error("Camera access requires HTTPS or localhost.");
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
        });
        if (!active || !video.current) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        video.current.srcObject = stream;
        await video.current.play();
        if (active) setReady(true);
      } catch (reason) {
        stream?.getTracks().forEach((track) => track.stop());
        if (!active) return;
        const message = !navigator.mediaDevices?.getUserMedia
          ? "Camera access requires HTTPS or localhost."
          : reason instanceof DOMException && reason.name === "NotAllowedError"
            ? "Camera permission was denied. Allow it in your browser settings or upload a photo."
            : "Could not open the camera. Try the device photo picker or upload a photo.";
        setError(message);
      }
    }
    void open();
    return () => {
      active = false;
      mounted.current = false;
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  function capture() {
    const frame = video.current;
    if (!frame?.videoWidth || !frame.videoHeight) {
      setError("The camera is still loading. Try again in a moment.");
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = frame.videoWidth;
    canvas.height = frame.videoHeight;
    const context = canvas.getContext("2d");
    if (!context) {
      setError(
        "Could not capture the photo. Use the device photo picker or upload a photo.",
      );
      return;
    }
    context.drawImage(frame, 0, 0);
    setCapturing(true);
    canvas.toBlob(
      (blob) => {
        if (!mounted.current) return;
        setCapturing(false);
        if (blob)
          onCapture(new File([blob], "scorecard.jpg", { type: blob.type }));
        else
          setError("Could not capture the photo. Try again or upload a photo.");
      },
      "image/jpeg",
      0.95,
    );
  }

  return (
    <section className="tile" aria-label="Scorecard camera">
      <video
        ref={video}
        className="scan-preview"
        autoPlay
        muted
        playsInline
        aria-label="Live scorecard camera preview"
        hidden={!ready}
      />
      {error ? (
        <p role="alert">{error}</p>
      ) : (
        !ready && <p role="status">Waiting for camera access…</p>
      )}
      <div className="actions">
        <button type="button" onClick={capture} disabled={!ready || capturing}>
          {capturing ? "Capturing…" : "Capture photo"}
        </button>
        <button type="button" className="secondary" onClick={onClose}>
          Close camera
        </button>
      </div>
    </section>
  );
}
