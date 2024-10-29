"use client";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import AudioRecorder from "../utils/AudioRecorder";
import { fileToBase64 } from "../utils/base64";
import { utils, MicVAD } from "@ricky0123/vad-web";
const RE_FETCH_INTERVAL = 10000;
async function getMicrophoneStream(): Promise<MediaStream> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    return stream;
  } catch (err) {
    console.error("Error accessing microphone:", err);
    throw err;
  }
}

export default function Home() {
  const [recorder, setRecorder] = useState<AudioRecorder | null>(null);
  const [speechTexts, setSpeechTexts] = useState<string[]>([]);
  const [topics, setTopics] = useState<string[]>([]);
  const [isRecording, setIsRecording] = useState<boolean>(false);

  const speechTextsRef = useRef(speechTexts);
  const topicRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    speechTextsRef.current = speechTexts;
  }, [speechTexts]);

  useEffect(() => {
    const setupRecorder = async () => {
      const stream = await getMicrophoneStream();
      const micVAD = await MicVAD.new({
        workletURL: "/vad.worklet.bundle.min.js",
        modelURL: "/silero_vad.onnx",

        onSpeechStart() {
          console.log("Speech Start");
          setIsRecording(true);
        },
        onSpeechEnd(audio: Float32Array) {
          console.log("Speech End");
          setIsRecording(false);
          const wavBuffer = utils.encodeWAV(audio);
          const base64 = utils.arrayBufferToBase64(wavBuffer);
          const url = `data:audio/wav;base64,${base64}`;
          getSpeechToTextBase64(url);
        },
        stream,
      });
      micVAD.start();
      console.log("micVAD started");
      // micVAD.destroy();
    };

    function scrollToBottom() {
      const scrollable = document.getElementById("scrollable");
      if (scrollable) {
        scrollable.scrollTop = scrollable.scrollHeight; // 一番下までスクロール
        const observer = new MutationObserver(scrollToBottom);
        observer.observe(scrollable, { childList: true, subtree: true });
      }
    }

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

    // 初回実行
    scrollToBottom();

    setupRecorder();
  }, []);

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

  useEffect(() => {
    const intervalId = setInterval(() => {
      getTopics();
    }, RE_FETCH_INTERVAL);

    return () => clearInterval(intervalId);
  }, []);

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
