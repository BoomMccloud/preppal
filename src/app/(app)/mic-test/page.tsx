
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
      analyser.fftSize = 256;
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      analyserRef.current = analyser;
      dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount);

      const updateAudioLevel = () => {
        if (analyserRef.current && dataArrayRef.current) {
          analyserRef.current.getByteFrequencyData(dataArrayRef.current);
          const average =
            dataArrayRef.current.reduce((sum, value) => sum + value, 0) /
            dataArrayRef.current.length;
          setAudioLevel(average / 128); // Normalize to 0-1 range
        }
        animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
      };

      animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (analyserRef.current) {
        analyserRef.current.disconnect();
        analyserRef.current = null;
      }
    };
  }, [stream]);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Microphone Test</h1>
      <div className="flex items-center gap-4 mb-4">
        <button
          onClick={handleStart}
          disabled={isRecording}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
        >
          Start Microphone
        </button>
        <button
          onClick={handleStop}
          disabled={!isRecording}
          className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
        >
          Stop Microphone
        </button>
        {isRecording && <div className="text-green-500">Microphone is ON</div>}
        {!isRecording && <div className="text-red-500">Microphone is OFF</div>}
      </div>
      <div>
        <h2 className="text-xl font-semibold mb-2">Audio Visualizer</h2>
        {isRecording ? (
          <AudioVisualizer audioLevel={audioLevel} />
        ) : (
          <div className="w-full h-32 bg-gray-200 flex items-center justify-center">
            <p>Inactive</p>
          </div>
        )}
      </div>
    </div>
  );
}
