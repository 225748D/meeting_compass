export default class AudioRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private isRecording = false;
  private silenceThreshold = 128 + 10; // 無音と判断する閾値
  private silenceDuration = 500; // 無音と判断する持続時間(ms)
  private silenceTimeout: NodeJS.Timeout | null = null;
  private preRecordingBuffer: Blob[] = []; // バッファ用
  private bufferDuration = 3000; // バッファする時間（ms）

  constructor(private stream: MediaStream) {
    this.mediaRecorder = new MediaRecorder(this.stream);
    this.startPreRecording();
  }

  private startPreRecording() {
    const options = { mimeType: "audio/webm" };
    this.mediaRecorder = new MediaRecorder(this.stream, options);

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        // 一定時間分のデータをバッファリング
        this.preRecordingBuffer.push(event.data);
        if (this.preRecordingBuffer.length > this.bufferDuration / 100) {
          this.preRecordingBuffer.shift();
        }
      }
    };

    this.mediaRecorder.start(100); // 100msごとにデータを取得
  }

  startMonitoring(onStart: () => void, onStop: () => void) {
    const audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(this.stream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    source.connect(analyser);

    const detectSound = () => {
      analyser.getByteTimeDomainData(dataArray);
      const data_max = dataArray.reduce((a, b) => Math.max(a, b));

      if (Math.abs(data_max) > this.silenceThreshold) {
        if (!this.mediaRecorder || this.mediaRecorder.state === "inactive") {
          this.startRecording();
          onStart();
        }
        if (this.silenceTimeout) {
          clearTimeout(this.silenceTimeout);
          this.silenceTimeout = null;
        }
      } else {
        if (
          this.mediaRecorder &&
          this.mediaRecorder.state === "recording" &&
          !this.silenceTimeout
        ) {
          this.silenceTimeout = setTimeout(() => {
            this.stopRecording();
            this.mediaRecorder?.addEventListener("stop", () => {
              onStop();
            });
          }, this.silenceDuration);
        }
      }

      requestAnimationFrame(detectSound);
    };

    detectSound();
  }

  private startRecording() {
    this.audioChunks = [...this.preRecordingBuffer]; // バッファのデータを最初に追加
    this.preRecordingBuffer = []; // バッファをクリア
    this.isRecording = true;

    this.mediaRecorder = new MediaRecorder(this.stream);

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.audioChunks.push(event.data);
      }
    };

    this.mediaRecorder.start();
  }

  private stopRecording() {
    if (this.mediaRecorder && this.mediaRecorder.state === "recording") {
      this.mediaRecorder.stop();
      this.isRecording = false;
    }
  }

  getAudioBlob(): Blob {
    const blob = new Blob(this.audioChunks, { type: "audio/webm" });
    return blob;
  }
}
