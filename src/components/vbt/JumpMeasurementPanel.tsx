import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, Camera, Check, CircleStop, MoveUp, RotateCcw, Smartphone, Video, Wifi } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  calculateJumpHeightCm,
  calculateRealFlightTimeSeconds,
  type JumpCaptureMethod,
  type JumpProtocol,
} from "@/lib/jumpMeasurement";
import { toast } from "sonner";

export type JumpMeasurementResult = {
  heightCm: number;
  flightTimeSeconds: number;
  protocol: JumpProtocol;
  method: JumpCaptureMethod;
  qualityNote: string;
};

type CameraSource = "live" | "upload";

const MAX_SENSOR_GAP_MS = 180;

export function JumpMeasurementPanel({ onAccept }: { onAccept: (result: JumpMeasurementResult) => void }) {
  const [protocol, setProtocol] = useState<JumpProtocol>("cmj");
  const [method, setMethod] = useState<JumpCaptureMethod>("camera");
  const [cameraSource, setCameraSource] = useState<CameraSource>("live");
  const [captureFps, setCaptureFps] = useState("30");
  const [playbackFps, setPlaybackFps] = useState("30");
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [takeoffTime, setTakeoffTime] = useState<number | null>(null);
  const [landingTime, setLandingTime] = useState<number | null>(null);
  const [sensorStatus, setSensorStatus] = useState("Sensor belum aktif");
  const [sensorSamples, setSensorSamples] = useState(0);
  const [sensorHz, setSensorHz] = useState<number | null>(null);
  const [sensorFlightTime, setSensorFlightTime] = useState<number | null>(null);
  const [sensorRecording, setSensorRecording] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const objectUrlRef = useRef<string | null>(null);
  const sensorHandlerRef = useRef<((event: DeviceMotionEvent) => void) | null>(null);
  const sensorArmedAtRef = useRef<number | null>(null);
  const takeoffAtRef = useRef<number | null>(null);
  const lastSampleAtRef = useRef<number | null>(null);
  const lowGCountRef = useRef(0);
  const peakGRef = useRef(0);
  const sampleIntervalsRef = useRef<number[]>([]);

  const releaseCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const stopSensor = useCallback(() => {
    if (sensorHandlerRef.current) window.removeEventListener("devicemotion", sensorHandlerRef.current);
    sensorHandlerRef.current = null;
    setSensorRecording(false);
  }, []);

  useEffect(() => () => {
    releaseCamera();
    stopSensor();
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
  }, [releaseCamera, stopSensor]);

  const setVideoFile = (file: File | undefined) => {
    if (!file || !file.type.startsWith("video/")) {
      if (file) toast.error("Pilih berkas video yang valid");
      return;
    }
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    const url = URL.createObjectURL(file);
    objectUrlRef.current = url;
    setVideoUrl(url);
    setCameraSource("upload");
    setTakeoffTime(null);
    setLandingTime(null);
  };

  const startCameraRecording = async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      toast.error("Browser ini tidak mendukung perekaman kamera. Unggah video sebagai alternatif.");
      return;
    }
    if (!window.isSecureContext) {
      toast.error("Akses kamera memerlukan halaman HTTPS");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 60, max: 120 } },
      });
      streamRef.current = stream;
      const actualFps = stream.getVideoTracks()[0]?.getSettings().frameRate;
      if (actualFps && Number.isFinite(actualFps)) {
        setCaptureFps(String(Math.round(actualFps)));
        setPlaybackFps(String(Math.round(actualFps)));
      }
      const mimeType = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm", "video/mp4"]
        .find((type) => MediaRecorder.isTypeSupported(type));
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "video/webm" });
        if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
        const url = URL.createObjectURL(blob);
        objectUrlRef.current = url;
        setVideoUrl(url);
        setCameraSource("live");
        setTakeoffTime(null);
        setLandingTime(null);
        setIsRecording(false);
        releaseCamera();
      };
      if (videoRef.current) videoRef.current.srcObject = stream;
      recorder.start(200);
      setIsRecording(true);
    } catch (error) {
      releaseCamera();
      const name = error instanceof DOMException ? error.name : "";
      toast.error(name === "NotAllowedError" ? "Izin kamera ditolak" : "Kamera tidak dapat dibuka pada perangkat ini");
    }
  };

  const stopCameraRecording = () => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") recorder.stop();
    else {
      setIsRecording(false);
      releaseCamera();
    }
  };

  const markVideoEvent = (event: "takeoff" | "landing") => {
    const time = videoRef.current?.currentTime;
    if (time === undefined || !Number.isFinite(time)) {
      toast.error("Putar video lalu jeda pada frame yang ingin ditandai");
      return;
    }
    if (event === "takeoff") setTakeoffTime(time);
    else setLandingTime(time);
  };

  const getCameraResult = () => {
    if (takeoffTime === null || landingTime === null) return null;
    const captureRate = Number(captureFps);
    const playbackRate = Number(playbackFps);
    const flightTime = cameraSource === "live"
      ? calculateRealFlightTimeSeconds(takeoffTime, landingTime, 1, 1)
      : calculateRealFlightTimeSeconds(takeoffTime, landingTime, captureRate, playbackRate);
    const height = flightTime === null ? null : calculateJumpHeightCm(flightTime);
    if (height === null || flightTime === null) return null;
    return { height, flightTime };
  };

  const startSensor = async () => {
    if (!window.isSecureContext || !("DeviceMotionEvent" in window)) {
      toast.error("Sensor gerak tidak tersedia. Buka halaman HTTPS di perangkat yang mendukung.");
      return;
    }

    try {
      const MotionConstructor = DeviceMotionEvent as typeof DeviceMotionEvent & { requestPermission?: () => Promise<"granted" | "denied"> };
      if (MotionConstructor.requestPermission) {
        const permission = await MotionConstructor.requestPermission();
        if (permission !== "granted") {
          toast.error("Izin sensor gerak ditolak");
          return;
        }
      }
    } catch {
      toast.error("Izin sensor gerak tidak dapat diminta");
      return;
    }

    sensorArmedAtRef.current = null;
    takeoffAtRef.current = null;
    lastSampleAtRef.current = null;
    lowGCountRef.current = 0;
    peakGRef.current = 0;
    sampleIntervalsRef.current = [];
    setSensorSamples(0);
    setSensorHz(null);
    setSensorFlightTime(null);
    setSensorStatus("Menunggu sensor gerak...");

    let samples = 0;
    const handler = (event: DeviceMotionEvent) => {
      const acceleration = event.accelerationIncludingGravity;
      if (!acceleration || acceleration.x === null || acceleration.y === null || acceleration.z === null) return;
      const values = [acceleration.x, acceleration.y, acceleration.z];
      if (!values.every(Number.isFinite)) return;
      const magnitude = Math.sqrt(values.reduce((sum, axis) => sum + axis * axis, 0));
      const timestamp = event.timeStamp;
      if (lastSampleAtRef.current !== null) {
        const interval = timestamp - lastSampleAtRef.current;
        if (interval > 0 && interval <= MAX_SENSOR_GAP_MS) {
          sampleIntervalsRef.current.push(interval);
          if (sampleIntervalsRef.current.length > 80) sampleIntervalsRef.current.shift();
        } else if (interval > MAX_SENSOR_GAP_MS && takeoffAtRef.current !== null) {
          takeoffAtRef.current = null;
          lowGCountRef.current = 0;
          setSensorStatus("Sampel terputus — lompatan ditolak; coba ulangi");
        }
      }
      lastSampleAtRef.current = timestamp;
      samples += 1;
      if (samples % 5 === 0) setSensorSamples(samples);

      if (sensorArmedAtRef.current === null) {
        if (magnitude >= 7 && magnitude <= 13) {
          sensorArmedAtRef.current = timestamp;
          setSensorStatus("Siap — mulai setelah berdiri tenang");
        }
        return;
      }

      if (takeoffAtRef.current === null) {
        if (timestamp - sensorArmedAtRef.current < 800) {
          if (magnitude < 5) sensorArmedAtRef.current = timestamp;
          return;
        }
        if (magnitude < 5) lowGCountRef.current += 1;
        else lowGCountRef.current = 0;
        if (lowGCountRef.current >= 2) {
          takeoffAtRef.current = timestamp;
          peakGRef.current = magnitude;
          setSensorStatus("Lepas landas terdeteksi — mendarat dengan aman");
        }
        return;
      }

      peakGRef.current = Math.max(peakGRef.current, magnitude);
      const flightTime = (timestamp - takeoffAtRef.current) / 1000;
      if (magnitude >= 7 && flightTime >= 0.15) {
        const sampleRate = sampleIntervalsRef.current.length
          ? 1000 / (sampleIntervalsRef.current.reduce((sum, item) => sum + item, 0) / sampleIntervalsRef.current.length)
          : null;
        setSensorFlightTime(flightTime);
        setSensorHz(sampleRate);
        setSensorSamples(samples);
        setSensorStatus("Lompatan terdeteksi — tinjau estimasi sebelum menyimpan");
        stopSensor();
      } else if (flightTime > 1.2) {
        takeoffAtRef.current = null;
        lowGCountRef.current = 0;
        sensorArmedAtRef.current = timestamp;
        setSensorStatus("Sinyal tidak jelas — lompatan ditolak; coba ulangi");
      }
    };

    sensorHandlerRef.current = handler;
    window.addEventListener("devicemotion", handler);
    setSensorRecording(true);
    setSensorStatus("Sensor aktif — berdiri tenang untuk kalibrasi");
  };

  const cameraResult = getCameraResult();
  const cameraRatesValid = cameraSource === "live" || (Number(captureFps) > 0 && Number(playbackFps) > 0);
  const sensorHeight = sensorFlightTime === null ? null : calculateJumpHeightCm(sensorFlightTime);
  const protocolName = protocol === "cmj" ? "CMJ (Counter Movement Jump)" : "Squat Jump (VJ tanpa ayunan)";
  const canAccept = method === "camera" ? cameraResult !== null && cameraRatesValid : sensorHeight !== null;

  const acceptResult = () => {
    if (method === "camera" && cameraResult) {
      onAccept({
        heightCm: cameraResult.height,
        flightTimeSeconds: cameraResult.flightTime,
        protocol,
        method,
        qualityNote: `Video ${cameraSource === "live" ? `kamera (${captureFps} fps)` : `impor (${captureFps} fps sumber / ${playbackFps} fps pemutaran)`}; titik lepas dan mendarat ditandai manual. Estimasi flight-time; samakan tinggi tubuh saat lepas dan kontak mendarat.`,
      });
      return;
    }
    if (sensorHeight !== null && sensorFlightTime !== null) {
      const quality = sensorHz === null || sensorHz < 50
        ? `Sensor eksperimental; ${sensorHz === null ? "frekuensi sampel belum cukup" : `frekuensi sekitar ${Math.round(sensorHz)} Hz`}; hasil kasar, bukan pengganti force plate.`
        : `Sensor eksperimental; sekitar ${Math.round(sensorHz)} Hz, ${sensorSamples} sampel; hasil kasar, bukan pengganti force plate.`;
      onAccept({ heightCm: sensorHeight, flightTimeSeconds: sensorFlightTime, protocol, method, qualityNote: quality });
    }
  };

  const resetCameraMarkers = () => {
    setTakeoffTime(null);
    setLandingTime(null);
  };

  return (
    <Card className="overflow-hidden rounded-none border-border">
      <div className="border-b border-border bg-card px-4 py-4 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-vbt-heading text-sm uppercase text-primary">Tes Lompatan</p>
            <h2 className="font-vbt-heading text-xl uppercase sm:text-2xl">VJ / CMJ</h2>
          </div>
          <Badge variant="outline" className="gap-1"><Wifi className="h-3 w-3" /> Proses di perangkat</Badge>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(220px,280px)]">
          <div className="space-y-2">
            <Label htmlFor="jump-protocol">Protokol</Label>
            <select id="jump-protocol" value={protocol} onChange={(event) => setProtocol(event.target.value as JumpProtocol)} className="h-10 w-full border border-input bg-background px-3 text-sm text-foreground">
              <option value="cmj">CMJ — turun-ayun lalu melompat</option>
              <option value="vertical-jump">VJ — Squat Jump, tanpa ayunan</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label>Metode pengukuran</Label>
            <Tabs value={method} onValueChange={(value) => setMethod(value as JumpCaptureMethod)}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="camera" className="gap-1"><Camera className="h-4 w-4" /> Kamera</TabsTrigger>
                <TabsTrigger value="sensor" className="gap-1"><Smartphone className="h-4 w-4" /> Sensor HP</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
      </div>

      <CardContent className="space-y-5 p-4 sm:p-6">
        {method === "camera" ? (
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(260px,0.8fr)]">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold">Rekam atau unggah video</p>
                <div className="flex flex-wrap gap-2">
                  {isRecording ? (
                    <Button variant="destructive" onClick={stopCameraRecording} className="gap-2"><CircleStop className="h-4 w-4" /> Selesai merekam</Button>
                  ) : (
                    <Button variant="outline" onClick={startCameraRecording} className="gap-2"><Video className="h-4 w-4" /> Rekam dengan kamera</Button>
                  )}
                  <Label htmlFor="jump-video-upload" className="inline-flex h-10 cursor-pointer items-center gap-2 border border-input bg-background px-4 text-sm font-medium hover:bg-accent hover:text-accent-foreground">
                    <Camera className="h-4 w-4" /> Unggah video
                  </Label>
                  <Input id="jump-video-upload" type="file" accept="video/*" className="sr-only" onChange={(event) => setVideoFile(event.target.files?.[0])} />
                </div>
              </div>
              <div className="relative aspect-video overflow-hidden border border-border bg-muted">
                {videoUrl || isRecording ? (
                  <video ref={videoRef} src={videoUrl ?? undefined} controls={!isRecording} muted={isRecording} playsInline className="h-full w-full object-contain" />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-muted-foreground">
                    <Camera className="h-8 w-8" />
                    <p className="text-sm">Rekam klip pendek atau pilih video dari HP</p>
                    <p className="max-w-sm text-xs">Posisikan kamera tetap, terlihat kaki dan lantai; jangan letakkan HP di area mendarat.</p>
                  </div>
                )}
                {isRecording && <Badge className="absolute left-3 top-3 gap-2"><span className="h-2 w-2 animate-pulse rounded-full bg-destructive" /> Merekam</Badge>}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => videoRef.current && (videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 1 / Math.max(1, Number(playbackFps))))} disabled={!videoUrl || isRecording}>Frame sebelumnya</Button>
                <Button type="button" variant="outline" size="sm" onClick={() => videoRef.current && (videoRef.current.currentTime += 1 / Math.max(1, Number(playbackFps)))} disabled={!videoUrl || isRecording}>Frame berikutnya</Button>
                <Button type="button" variant="ghost" size="sm" onClick={resetCameraMarkers} disabled={takeoffTime === null && landingTime === null}><RotateCcw className="mr-1 h-4 w-4" /> Hapus tanda</Button>
              </div>
              {cameraSource === "upload" && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1"><Label htmlFor="jump-source-fps">FPS sumber video</Label><Input id="jump-source-fps" type="number" inputMode="numeric" min="1" step="1" value={captureFps} onChange={(event) => setCaptureFps(event.target.value)} /></div>
                  <div className="space-y-1"><Label htmlFor="jump-playback-fps">FPS pemutaran</Label><Input id="jump-playback-fps" type="number" inputMode="numeric" min="1" step="1" value={playbackFps} onChange={(event) => setPlaybackFps(event.target.value)} /></div>
                </div>
              )}
              <p className="text-xs text-muted-foreground">Video dianalisis lokal dan tidak diunggah. Untuk slow motion, isi FPS sumber asli serta FPS pemutaran berkas.</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-3 border-y border-border py-4">
                <p className="text-sm font-semibold">Tandai transisi pada video</p>
                <div className="grid gap-2">
                  <Button variant="outline" className="justify-between gap-2" onClick={() => markVideoEvent("takeoff")} disabled={!videoUrl || isRecording}>
                    <span className="flex items-center gap-2"><MoveUp className="h-4 w-4 text-primary" /> Lepas landas</span>
                    <span className="tabular-nums">{takeoffTime === null ? "—" : `${takeoffTime.toFixed(3)} s`}</span>
                  </Button>
                  <Button variant="outline" className="justify-between gap-2" onClick={() => markVideoEvent("landing")} disabled={!videoUrl || isRecording}>
                    <span className="flex items-center gap-2"><MoveUp className="h-4 w-4 rotate-180 text-primary" /> Kontak mendarat</span>
                    <span className="tabular-nums">{landingTime === null ? "—" : `${landingTime.toFixed(3)} s`}</span>
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">Jeda pada frame terakhir sebelum kaki terangkat dan frame kontak pertama saat mendarat.</p>
              </div>
              {cameraResult ? (
                <div className="grid grid-cols-2 gap-px border border-border bg-border">
                  <div className="bg-background p-3"><p className="text-xs uppercase text-muted-foreground">Tinggi estimasi</p><p className="font-vbt-heading text-3xl text-primary">{cameraResult.height.toFixed(1)} <span className="text-base">cm</span></p></div>
                  <div className="bg-background p-3"><p className="text-xs uppercase text-muted-foreground">Waktu melayang</p><p className="font-vbt-heading text-2xl tabular-nums">{cameraResult.flightTime.toFixed(3)} <span className="text-sm">s</span></p></div>
                </div>
              ) : <p className="border border-dashed border-border p-3 text-sm text-muted-foreground">Tandai kedua transisi untuk menghitung lompatan.</p>}
            </div>
          </div>
        ) : (
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.75fr)]">
            <div className="space-y-4">
              <div className="flex items-start gap-3 border-l-4 border-warning bg-warning/10 p-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
                <div><p className="text-sm font-semibold">Mode sensor eksperimental</p><p className="text-xs text-muted-foreground">Estimasi ini belum divalidasi untuk semua model HP. Tempelkan HP dengan aman di pinggang, jangan dipegang saat melompat.</p></div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {sensorRecording ? (
                  <Button variant="destructive" onClick={stopSensor} className="gap-2"><CircleStop className="h-4 w-4" /> Hentikan sensor</Button>
                ) : (
                  <Button onClick={startSensor} className="gap-2"><Smartphone className="h-4 w-4" /> Mulai sensor HP</Button>
                )}
                <span className="text-sm text-muted-foreground">{sensorStatus}</span>
              </div>
              <div className="grid grid-cols-3 gap-px border border-border bg-border">
                <div className="bg-background p-3"><p className="text-[10px] uppercase text-muted-foreground">Sampel</p><p className="font-vbt-heading text-xl tabular-nums">{sensorSamples}</p></div>
                <div className="bg-background p-3"><p className="text-[10px] uppercase text-muted-foreground">Frekuensi</p><p className="font-vbt-heading text-xl tabular-nums">{sensorHz ? `${Math.round(sensorHz)} Hz` : "—"}</p></div>
                <div className="bg-background p-3"><p className="text-[10px] uppercase text-muted-foreground">Terbang</p><p className="font-vbt-heading text-xl tabular-nums">{sensorFlightTime ? `${sensorFlightTime.toFixed(3)} s` : "—"}</p></div>
              </div>
              <p className="text-xs text-muted-foreground">Sensor mendeteksi fase tanpa gravitasi lalu kontak kembali. Jeda sampel yang terlalu panjang membatalkan percobaan.</p>
            </div>
            <div className="flex min-h-52 flex-col items-center justify-center border border-border bg-background px-4 py-6 text-center">
              <Smartphone className="mb-3 h-8 w-8 text-primary" />
              {sensorHeight !== null ? <><p className="text-xs uppercase text-muted-foreground">Tinggi lompatan estimasi</p><p className="font-vbt-heading text-5xl text-primary">{sensorHeight.toFixed(1)} <span className="text-xl">cm</span></p></> : <><p className="font-vbt-heading text-lg uppercase">Menunggu lompatan</p><p className="mt-2 max-w-xs text-xs text-muted-foreground">Berdiri tenang untuk kalibrasi, lakukan satu lompatan, lalu mendarat dengan nyaman.</p></>}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-2xl text-xs text-muted-foreground">Tinggi dihitung dari waktu melayang dan mengasumsikan tinggi pusat tubuh sama saat lepas dan kontak mendarat. Hasil kamera tetap perlu tinjauan; mode sensor hanya estimasi.</p>
          <Button onClick={acceptResult} disabled={!canAccept} className="gap-2"><Check className="h-4 w-4" /> Pakai hasil {protocolName}</Button>
        </div>
      </CardContent>
    </Card>
  );
}