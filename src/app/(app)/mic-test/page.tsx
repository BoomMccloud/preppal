"use client";

import React, { useState, useRef, useEffect } from "react";
import { AudioRecorder } from "~/lib/audio/AudioRecorder";
import { AudioVisualizer } from "~/app/_components/AudioVisualizer";

export default function MicTestPage() {
  const [isRecording, setIsRecording] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);
  const audioRecorderRef = useRef<AudioRecorder | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const handleStart = async () => {
    if (!audioRecorderRef.current) {
      audioRecorderRef.current = new AudioRecorder();
    }
    try {
      await audioRecorderRef.current.start((_) => {
        // We don't need to do anything with the audio data in this test
      });
      setStream(audioRecorderRef.current.getStream());
      setIsRecording(true);
    } catch (error) {
      console.error("Failed to start recording:", error);
    }
  };

  const handleStop = () => {
    if (audioRecorderRef.current) {
      audioRecorderRef.current.stop();
      audioRecorderRef.current = null;
      setStream(null);
      setIsRecording(false);
      setAudioLevel(0);
    }
  };

  useEffect(() => {
    if (stream) {
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      // A smaller FFT size is more responsive to quick changes in audio level.
      analyser.fftSize = 32;
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      analyserRef.current = analyser;
      // Use time domain data to get volume, not frequency data.
      dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount);

      const updateAudioLevel = () => {
        if (analyserRef.current && dataArrayRef.current) {
          analyserRef.current.getByteTimeDomainData(dataArrayRef.current);
          // Find the peak volume in the current buffer.
          const max = dataArrayRef.current.reduce((a, b) => Math.max(a, b), 0);
          // Normalize the peak value (0-255) to a 0-1 range for the visualizer.
          setAudioLevel(max / 255);
        }
        animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
      };

      animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (analyserRef.current?.context.state !== "closed") {
        void analyserRef.current?.context.close();
      }
    };
  }, [stream]);

  return (
    <div className="container mx-auto p-4">
      <h1 className="mb-4 text-2xl font-bold">Microphone Test</h1>
      <div className="mb-4 flex items-center gap-4">
        <button
          onClick={handleStart}
          disabled={isRecording}
          className="rounded bg-blue-500 px-4 py-2 font-bold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          Start Microphone
        </button>
        <button
          onClick={handleStop}
          disabled={!isRecording}
          className="rounded bg-red-500 px-4 py-2 font-bold text-white hover:bg-red-700 disabled:opacity-50"
        >
          Stop Microphone
        </button>
        {isRecording && <div className="text-green-500">Microphone is ON</div>}
        {!isRecording && <div className="text-red-500">Microphone is OFF</div>}
      </div>
      <div>
        <h2 className="mb-2 text-xl font-semibold">Audio Visualizer</h2>
        {isRecording ? (
          <div className="flex items-center gap-4">
            <AudioVisualizer audioLevel={audioLevel} />
            <div className="h-4 w-full rounded-full bg-gray-200 dark:bg-gray-700">
              <div
                className="h-4 rounded-full bg-blue-600"
                style={{ width: `${audioLevel * 100}%` }}
              ></div>
            </div>
          </div>
        ) : (
          <div className="flex h-32 w-full items-center justify-center bg-gray-200">
            <p>Inactive</p>
          </div>
        )}
      </div>
    </div>
  );
}
