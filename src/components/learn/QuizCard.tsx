"use client";

import { useState } from "react";

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

interface QuizCardProps {
  questions: QuizQuestion[];
  onComplete: (score: number, answers: Record<string, number>) => void;
}

export default function QuizCard({ questions, onComplete }: QuizCardProps) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  const q = questions[currentIdx];
  const isAnswered = selectedAnswer !== null;
  const isCorrect = selectedAnswer === q?.correctIndex;

  function handleSelect(idx: number) {
    if (isAnswered) return;
    setSelectedAnswer(idx);
    const newAnswers = { ...answers, [q.id]: idx };
    setAnswers(newAnswers);
    if (idx === q.correctIndex) {
      setScore((s) => s + 1);
    }
  }

  function handleNext() {
    if (currentIdx < questions.length - 1) {
      setCurrentIdx((i) => i + 1);
      setSelectedAnswer(null);
    } else {
      const finalScore = score;
      setFinished(true);
      onComplete(finalScore, answers);
    }
  }

  if (finished) {
    const pct = Math.round((score / questions.length) * 100);
    const message =
      pct === 100
        ? "Perfect score!"
        : pct >= 80
          ? "Great job!"
          : pct >= 60
            ? "Good effort!"
            : "Keep studying!";
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 text-center">
        <div className="text-4xl font-bold text-gray-900 mb-1">{pct}%</div>
        <div className="text-sm text-gray-500 mb-3">
          {score} of {questions.length} correct
        </div>
        <div className="text-lg font-semibold text-gray-700">{message}</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
      {/* Progress dots */}
      <div className="flex gap-1.5 justify-center mb-4">
        {questions.map((_, i) => (
          <div
            key={i}
            className={`w-2 h-2 rounded-full transition-colors ${
              i === currentIdx
                ? "bg-blue-500"
                : i < currentIdx
                  ? "bg-blue-300"
                  : "bg-gray-200"
            }`}
          />
        ))}
      </div>

      {/* Question */}
      <p className="text-gray-900 font-semibold text-base mb-4">{q.question}</p>

      {/* Options */}
      <div className="flex flex-col gap-2 mb-4">
        {q.options.map((opt, i) => {
          let bg = "bg-gray-50 border-gray-200";
          if (isAnswered) {
            if (i === q.correctIndex) bg = "bg-green-50 border-green-400";
            else if (i === selectedAnswer) bg = "bg-red-50 border-red-400";
          }
          return (
            <button
              key={i}
              onClick={() => handleSelect(i)}
              disabled={isAnswered}
              className={`w-full text-left px-4 py-3 rounded-lg border text-sm font-medium transition-colors ${bg} ${
                !isAnswered ? "hover:bg-blue-50 hover:border-blue-300 active:bg-blue-100" : ""
              }`}
            >
              {opt}
            </button>
          );
        })}
      </div>

      {/* Explanation */}
      {isAnswered && (
        <div
          className={`text-sm p-3 rounded-lg mb-4 ${
            isCorrect ? "bg-green-50 text-green-800" : "bg-amber-50 text-amber-800"
          }`}
        >
          {isCorrect ? "Correct! " : "Not quite. "}
          {q.explanation}
        </div>
      )}

      {/* Next button */}
      {isAnswered && (
        <button
          onClick={handleNext}
          className="w-full py-2.5 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-600 active:bg-blue-700 transition-colors"
        >
          {currentIdx < questions.length - 1 ? "Next" : "See Results"}
        </button>
      )}
    </div>
  );
}
