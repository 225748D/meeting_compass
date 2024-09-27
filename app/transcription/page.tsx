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

export default function Home() {
  const [recorder, setRecorder] = useState<AudioRecorder | null>(null);
  const [speechTexts, setSpeechTexts] = useState<string[]>([]);
  const [topics, setTopics] = useState<string[]>([]);
  const [isRecording, setIsRecording] = useState<boolean>(false);

  const speechTextsRef = useRef(speechTexts);

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
    const response = await fetch("/api/gemini", {
      method: "POST",
      body: JSON.stringify({
        _prompt: `以下のテキストから主要なトピックだけを抽出し、簡潔に文章にしてテキストのみで返してください。\n\n${speechTextsRef.current.join(
          "\n"
        )}`,
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
      <div className="mt-8 p-4 bg-white rounded shadow-lg w-3/4">
        <h2 className="text-xl font-bold mb-2 text-center">Extracted Topics</h2>
        <div className="h-24 border border-gray-300 rounded p-2 text-gray-500 flex items-center justify-center">
          {topics.length <= 0 ? (
            <p>Topics will be displayed here</p>
          ) : (
            topics.map((topic, index) => <p key={index}>{topic}</p>)
          )}
        </div>
      </div>

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
