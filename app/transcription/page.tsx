"use client";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import AudioRecorder from "../utils/AudioRecorder";
import { fileToBase64 } from "../utils/base64";

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

// pipのセットアップ
const setup = async (pipSourceId: string) => {
  const pipSource = document.getElementById(pipSourceId);
  if (!pipSource) {
    console.error("Failed to get pipSource");
    return;
  }
  // 描画する要素のサイズを取得したい
  // 画像の読み込みが終わるまで待つ
  const waitingImgList = Array.from(pipSource.querySelectorAll("img"));
  await Promise.all(
    waitingImgList.map(
      (el) =>
        new Promise<void>((resolve) => {
          el.addEventListener("load", () => resolve());
        })
    )
  );

  // 描画する要素のサイズを取得する
  // 注意：重い処理なので頻繁に呼び出さないように
  const { width, height } = pipSource.getBoundingClientRect();

  const updateCanvasImage = async (topicId: string) => {
    const topic = document.getElementById(topicId);
    if (!topic) {
      console.error("Failed to get topic");
      return;
    }
    // svgタグを作る
    // SVGはHTMLではないので作り方がちょっと違う
    // 決められたNS(Namespace)を指定して作る
    const ns = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(ns, "svg");
    svg.setAttribute("width", width.toString());
    svg.setAttribute("height", height.toString());

    // foreignObjectを作る
    // foreignObjectはその中身の描画を
    // SVG自身ではなく外側（ここではブラウザ）に任せる
    const foreignObject = document.createElementNS(ns, "foreignObject");
    foreignObject.setAttribute("width", width.toString());
    foreignObject.setAttribute("height", height.toString());

    // 表示したい要素のコピーを作る
    // xmlとしてのNSを追加
    const html = topic.cloneNode(true);
    // html.style.display = "content"

    // 画像をすべてDataURLに置き換える
    const imgList = Array.from(topic.querySelectorAll("img"));
    await Promise.all(
      imgList.map(async (el) => {
        const data = await fetch(el.src).then((res) => res.blob());
        const reader = new FileReader();
        const url: string = await new Promise((resolve) => {
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(data);
        });
        el.src = url;
        return el.decode();
      })
    );

    foreignObject.appendChild(html);
    svg.appendChild(foreignObject);

    // svgを文字列化してURL化する
    const svgStr = new XMLSerializer().serializeToString(svg);
    const svgUrl =
      "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgStr);

    // svgを画像として読み込む
    const img = new window.Image(width, height); // 修正: 'window'を追加
    img.src = svgUrl;
    await img.decode();
    return img;
  };

  // canvasを作る
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    console.error("Failed to get canvas context");
    return;
  }
  // canvasのサイズを設定
  canvas.width = width;
  canvas.height = height;

  (async function render() {
    // canvasのBGを白にする
    const img = await updateCanvasImage("topic");
    if (img) {
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, img.width, img.height);
    }
    requestAnimationFrame(() => render());
  })();

  // canvasを動画として取得
  const stream = canvas.captureStream(1);

  // canvasを表示するだけのvideo要素を作る
  const video = document.getElementById("pipVideo") as HTMLVideoElement;
  video.autoplay = true;
  video.muted = true;
  video.playsInline = true;
  video.width = width;
  video.height = height;
  console.dir(video);
  video.srcObject = stream;

  await new Promise<void>((resolve) => {
    video.ontimeupdate = () => {
      resolve();
    };
    video.play();
  });

  return video;
};

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
      const newRecorder = new AudioRecorder(stream);
      setRecorder(newRecorder);
      newRecorder.startMonitoring(
        () => setIsRecording(true),
        () => setIsRecording(false)
      );
    };

    function scrollToBottom() {
      const scrollable = document.getElementById("scrollable");
      if (scrollable) {
        scrollable.scrollTop = scrollable.scrollHeight; // 一番下までスクロール
        const observer = new MutationObserver(scrollToBottom);
        observer.observe(scrollable, { childList: true, subtree: true });
      }
    }

    (async function main() {
      console.log("main");
      const pipButton = document.getElementById("pipButton");
      const video = await setup("topic");
      if (!video || !pipButton) {
        return;
      }
      console.log("video called");
      // pipButton.style.opacity = 1;

      video.onenterpictureinpicture = () => {
        video.style.display = "none";
      };

      video.onleavepictureinpicture = () => {
        video.remove();
      };
      pipButton.addEventListener("click", () => {
        console.log("pipButton clicked");
        video.requestPictureInPicture();
      });
    })();

    // 初回実行
    scrollToBottom();

    setupRecorder();
  }, []);

  useEffect(() => {
    const getSpeechToText = async () => {
      if (!isRecording && recorder) {
        const newBlob = recorder.getAudioBlob();
        const base64_blob = await fileToBase64(newBlob);
        if (base64_blob === "data:audio/webm;base64,") {
          return;
        }
        const response = await fetch("/api/whisper", {
          method: "POST",
          body: JSON.stringify({ blob: base64_blob }),
        });
        // 変換されたテキストを出力
        const { result } = await response.json();
        setSpeechTexts((prev) => [...prev, result]);
      }
    };
    getSpeechToText();
  }, [isRecording, recorder]);

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
        id="topic"
        className="mt-8 p-4 bg-white rounded shadow-lg w-3/4"
        ref={topicRef}
      >
        <h2 className="text-xl font-bold mb-2 text-center">Extracted Topics</h2>
        <div className="h-24 border border-gray-300 rounded p-2 text-gray-500 flex items-center justify-center">
          {topics.length <= 0 ? (
            <p>Topics will be displayed here</p>
          ) : (
            topics.map((topic, index) => <p key={index}>{topic}</p>)
          )}
        </div>
      </div>
      <video id="pipVideo" style={{ display: "none" }}></video>
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
