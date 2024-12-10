"use client";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { fileToBase64 } from "../utils/base64";
import { utils, MicVAD } from "@ricky0123/vad-web";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { peripheralPermissionCheck } from "../utils/peripheralPermissionCheck";

const RE_FETCH_INTERVAL = 10000;
async function getMicrophoneStream(deviceId?: string): Promise<MediaStream> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { deviceId: { exact: deviceId } },
    });
    return stream;
  } catch (err) {
    console.error("Error accessing microphone:", err);
    throw err;
  }
}

export default function Home() {
  const [speechTexts, setSpeechTexts] = useState<string[]>([]);
  const [topics, setTopics] = useState<string[]>([]);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [defaultDeviceId, setDefaultDeviceId] = useState<string | undefined>(
    undefined
  );
  const [deviceId, setDeviceId] = useState<string | undefined>(undefined);
  const [micChecked, setMicChecked] = useState(false);
  const [micStream, setMicStream] = useState<MediaStream | undefined>(
    undefined
  );
  const [micVAD, setMicVAD] = useState<MicVAD | undefined>(undefined);
  const [desktopChecked, setDesktopChecked] = useState(false);
  const [desktopStream, setDesktopStream] = useState<MediaStream | undefined>(
    undefined
  );
  const [desktopVAD, setDesktopVAD] = useState<MicVAD | undefined>(undefined);
  const speechTextsRef = useRef<string[]>([]);
  const topicRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    speechTextsRef.current = speechTexts;
    let isUpdateText = true;
    const intervalId = setInterval(() => {
      if (!isUpdateText) cleanup();
      getTopics();
    }, RE_FETCH_INTERVAL);
    const cleanup = () => {
      isUpdateText = false;
      clearInterval(intervalId);
    };
  }, [speechTexts]);

  const micEnabled = async () => {
    const stream = await getMicrophoneStream(deviceId);
    // 各トラックにendedイベントリスナーを追加
    stream.getTracks().forEach((track) => {
      track.addEventListener("ended", () => {
        setMicChecked(false);
        micDisabled();
      });
    });
    setMicStream(stream);
    await setupRecorder(stream, true);
  };

  const micDisabled = () => {
    // console.log("micDisabled", micVAD, micStream);
    if (micVAD) {
      micVAD.destroy();
      setMicVAD(undefined);
      console.log("micVAD destroyed");
    }
    if (micStream) {
      micStream.getTracks().forEach((track) => track.stop());
      setMicStream(undefined);
    }
  };

  const desktopEnabled = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      // 各トラックにendedイベントリスナーを追加
      stream.getTracks().forEach((track) => {
        track.addEventListener("ended", () => {
          desktopDisabled();
          setDesktopChecked(false);
        });
      });
      setDesktopStream(stream);
      const desktopCaptureContainer = document.getElementById(
        "screenCaptureContainer"
      );
      if (desktopCaptureContainer) {
        desktopCaptureContainer.innerHTML = "";
        const video = document.createElement("video");
        video.srcObject = stream;
        video.autoplay = true;
        video.muted = true;
        video.controls = true;
        video.width = 200;
        video.controls = false;
        desktopCaptureContainer.appendChild(video);
      }
      await setupRecorder(stream, false);
    } catch (err) {
      const desktopCaptureContainer = document.getElementById(
        "screenCaptureContainer"
      );
      setDesktopChecked(false);
      if (desktopCaptureContainer) {
        const error = document.createElement("p");
        desktopCaptureContainer.innerHTML = "";
        error.textContent =
          "画面をキャプチャできませんでした。再試行してください\n Failed to Capture Screen. Please Retry";
        error.style.color = "red";
        desktopCaptureContainer.appendChild(error);
      }
      console.error("Error accessing desktop capture  :", err);
    }
  };

  const desktopDisabled = () => {
    if (desktopVAD) {
      desktopVAD.destroy();
      setDesktopVAD(undefined);
      console.log("desktopVAD destroyed");
    }
    if (desktopStream) {
      desktopStream.getTracks().forEach((track) => track.stop());
      setDesktopStream(undefined);
    }
    const desktopCaptureContainer = document.getElementById(
      "screenCaptureContainer"
    );
    if (desktopCaptureContainer) {
      desktopCaptureContainer.innerHTML = "";
    }
  };

  const getMicrophoneDevices = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioDevices = devices.filter(
        (device) => device.kind === "audioinput"
      );
      setDevices(() => audioDevices);

      // 既定のデバイスを特定
      const defaultDevice = audioDevices.find(
        (device) => device.deviceId === "default"
      );
      if (defaultDevice) {
        setDefaultDeviceId(defaultDevice.deviceId);
      } else if (audioDevices.length > 0) {
        setDefaultDeviceId(audioDevices[0].deviceId);
      }
      console.dir(audioDevices);
    } catch (error) {
      console.error("Error accessing media devices.", error);
    }
  };

  const setupRecorder = async (stream: MediaStream, isMic?: boolean) => {
    if (isMic && micVAD) {
      micVAD.destroy();
      setMicVAD(undefined);
      console.log("micVAD destroyed");
    } else if (!isMic && desktopVAD) {
      desktopVAD.destroy();
      setDesktopVAD(undefined);
      console.log("desktopVAD destroyed");
    }

    // if (isMic) {
    //   micStream = stream;
    // } else {
    //   desktopStream = stream;
    // }
    // console.log("micStream, desktopStream", micStream, desktopStream);
    const vad = await MicVAD.new({
      workletURL: "/vad.worklet.bundle.min.js",
      modelURL: "/silero_vad.onnx",

      onSpeechStart() {
        console.log("Speech Start");
      },
      onSpeechEnd(audio: Float32Array) {
        console.log("Speech End");
        const wavBuffer = utils.encodeWAV(audio);
        const base64 = utils.arrayBufferToBase64(wavBuffer);
        const url = `data:audio/wav;base64,${base64}`;
        getSpeechToTextBase64(url);
      },
      onVADMisfire() {
        console.log("VAD Misfire");
      },
      ortConfig: (ort) => {
        ort.env.wasm.wasmPaths = "/";
      },
      stream,
    });

    if (isMic) {
      setMicVAD(vad);
      vad.start();
      console.log("micVAD started");
    } else {
      setDesktopVAD(vad);
      vad.start();
      console.log("DesktopVAD started");
    }
  };

  useEffect(() => {
    const permissionCheck = async () => {
      await peripheralPermissionCheck("microphone");
      await getMicrophoneDevices();
    };
    permissionCheck();

    if ("documentPictureInPicture" in window) {
      const pipButton = document.getElementById("pipButton");
      if (pipButton) {
        pipButton.addEventListener("click", async () => {
          const pipWindow =
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-expect-error
            (await window.documentPictureInPicture.requestWindow({
              width: 600,
              height: 150,
              disallowReturnToOpener: true,
            })) as Window;
          // Copy style sheets over from the initial document
          // so that the player looks the same.
          [...document.styleSheets].forEach((styleSheet) => {
            try {
              const cssRules = [...styleSheet.cssRules]
                .map((rule) => rule.cssText)
                .join("");
              const style = document.createElement("style");

              style.textContent = cssRules;
              pipWindow.document.head.appendChild(style);
              // eslint-disable-next-line @typescript-eslint/no-unused-vars
            } catch (e) {
              const link = document.createElement("link");

              link.rel = "stylesheet";
              link.type = styleSheet.type;
              // link.media = styleSheet.media;
              // link.href = styleSheet.href;
              pipWindow.document.head.appendChild(link);
            }
          });
          const topic = topicRef.current!;
          const marker = document.createElement("span");
          marker.id = "marker";
          marker.textContent = "Picture-in-Pictureで表示中";
          topic.before(marker);
          pipWindow.document.body.appendChild(topic);
          // Move the player back when the Picture-in-Picture window closes.
          pipWindow.addEventListener("pagehide", (event) => {
            const playerContainer = document.querySelector("#topicContainer");
            const pipPlayer = (event.target as typeof document)?.querySelector(
              "#topic"
            );
            playerContainer?.append(pipPlayer!);
            marker.remove();
          });
        });
      }
    }
  }, []);

  useEffect(() => {
    const scrollToBottom = () => {
      const scrollable = document.getElementById("scrollable");
      if (scrollable) {
        scrollable.scrollTop = scrollable.scrollHeight; // 一番下までスクロール
      }
    };
    scrollToBottom();
  }, [speechTexts]);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const getSpeechToText = async (blob: Blob) => {
    const base64_blob = await fileToBase64(blob);
    getSpeechToTextBase64(base64_blob);
  };

  const getSpeechToTextBase64 = async (base64_url: string) => {
    if (base64_url === "data:audio/webm;base64,") {
      return;
    }
    const response = await fetch("/api/whisper", {
      method: "POST",
      body: JSON.stringify({ blob: base64_url }),
    });
    // 変換されたテキストを出力
    const { result } = await response.json();
    setSpeechTexts((prev) => [...prev, result]);
  };


  const getTopics = async () => {
    const recentTexts = speechTextsRef.current.slice(-15);
    const promptText = recentTexts.join("\n");
    const response = await fetch("/api/gemini", {
      method: "POST",
      body: JSON.stringify({
        _prompt: `以下のテキストから主要なトピックだけを抽出し、簡潔に文章にしてテキストのみで返してください。\n\n${promptText}`,
      }),
    });
    const { result } = await response.json();
    setTopics([result]);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-10">
      {/* 中央にアイコンを配置 */}
      <Image
        src="/icon.svg" // アイコンの画像パスを指定
        alt="Transcription Icon"
        className="mt-8"
        width={200} // アイコンのサイズ
        height={200}
      />
      {/* 設定場所 */}
      <div className="flex flex-row mt-6 items-start">
        <div className="mx-7 flex flex-col items-center justify-center">
          <h2 className="text-xl font-bold mb-2 text-center">マイクの設定</h2>
          <Switch
            aria-label="マイクをオンにする"
            defaultChecked={false}
            onCheckedChange={(checked) => {
              setMicChecked(checked);
              checked ? micEnabled() : micDisabled();
            }}
          />
          <div className="my-5">
            <Select
              defaultValue={defaultDeviceId ?? "default"}
              onValueChange={async (value) => {
                setDeviceId(value);

                // マイクがONのとき => mediaStreamが存在している
                if (micChecked) {
                  micDisabled();
                  await micEnabled();
                }
              }}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select Microphone Device" />
              </SelectTrigger>
              <SelectContent>
                {devices.map((device, index) =>
                  device.deviceId ? (
                    <SelectItem key={index} value={device.deviceId}>
                      {device.label || `マイクデバイス ${index + 1}`}
                    </SelectItem>
                  ) : null
                )}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="mx-7 flex flex-col items-center justify-center">
          <h2 className="text-xl font-bold mb-2 text-center">
            デスクトップ・タブからの音声入力
          </h2>
          <Switch
            aria-label="デスクトップ・タブからの音声入力をオンにする"
            defaultChecked={false}
            checked={desktopChecked}
            onCheckedChange={(checked) => {
              // setDesktopChecked(checked);
              setDesktopChecked(checked);
              checked ? desktopEnabled() : desktopDisabled();
            }}
          />
          <div className="mt-3 text-sm">
            {" "}
            <p>Windows/ChromeOS: 画面・タブからの音声で対応</p>
            <p>macOS/Linux: タブからの音声のみ対応</p>
          </div>
          <div
            className="my-5 object-contain w-[200px]"
            id="screenCaptureContainer"
          >
            <p id="screenCaptureError">{""}</p>
          </div>
        </div>
      </div>

      {/* トピックを表示する枠 */}
      <div
        id="topicContainer"
        className="mt-8 p-4 bg-white rounded shadow-lg w-3/4"
      >
        <div id="topic" className="" ref={topicRef}>
          <h2 className="text-xl font-bold mb-2 text-center">
            Extracted Topics
          </h2>
          <div className="h-24 border border-gray-300 rounded p-2 text-gray-500 flex items-center justify-center">
            {topics.length <= 0 ? (
              <p>Topics will be displayed here</p>
            ) : (
              topics.map((topic, index) => <p key={index}>{topic}</p>)
            )}
          </div>
        </div>
      </div>
      <button
        id="pipButton"
        className="mt-4 px-5 py-2 text-lg rounded text-white bg-gray-400"
      >
        pipボタン
      </button>

      {/* 文字起こしのログを表示する枠 */}
      <div className="mt-4 mb-4 p-4 bg-white rounded shadow-lg w-3/4 max-h-96 overflow-y-auto">
        <h2 className="text-xl font-bold mb-2 text-center">
          Transcription Logs
        </h2>
        <div
          className="h-48 border border-gray-300 rounded p-2 text-gray-500 flex flex-col items-center overflow-y-auto"
          id="scrollable"
        >
          {speechTexts.length <= 0 ? (
            <p>Transcription logs will be displayed here</p>
          ) : (
            speechTexts.map((text, index) => <p key={index}>{text}</p>)
          )}
        </div>
      </div>
    </div>
  );
}
