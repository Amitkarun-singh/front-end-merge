"use client";

import { useState } from "react";
import { ChevronLeft, Clock, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { config } from "@/../app.config.js";
import { toast } from "sonner";

const UnifiedExam = ({ examData }) => {
  const questionTypes = examData.questionType;
  const [currentTypeIndex, setCurrentTypeIndex] = useState(0); // Track SA, LA, MCQ
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [answers, setAnswers] = useState({}); // Unified state for all answers
  const [submitting, setSubmitting] = useState(false);

  const currentType = questionTypes[currentTypeIndex];
  const questions = examData.questions[currentType] || [];
  const currentQuestion = questions[currentQuestionIndex];

  const handleAnswerChange = (value) => {
    if (!currentQuestion) return;
    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: value,
    }));
  };

  const handleSubmit = async () => {
    if (!currentQuestion) return;

    const answer = answers[currentQuestion.id];
    if (!answer) {
      toast.error("Please provide an answer before submitting.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(
        `${config.server}/gini/practice/questions/answer-submit`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            questionId: currentQuestion.id,
            testId: examData.testId,
            answer: answer,
          }),
        },
      );

      if (!response.ok) {
        throw new Error("Failed to submit answer");
      }

      const result = await response.json();
      toast.success("Answer submitted successfully!");
      console.log("Submit Result:", result);

      // Optionally move to next question or show feedback
    } catch (error) {
      console.error("Submission error:", error);
      toast.error("Failed to submit answer. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const nextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else if (currentTypeIndex < questionTypes.length - 1) {
      setCurrentTypeIndex(currentTypeIndex + 1);
      setCurrentQuestionIndex(0);
      setShowAnswer(false);
    }
  };

  const prevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    } else if (currentTypeIndex > 0) {
      const prevType = questionTypes[currentTypeIndex - 1];
      setCurrentTypeIndex(currentTypeIndex - 1);
      setCurrentQuestionIndex((examData.questions[prevType] || []).length - 1);
      setShowAnswer(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <div className="bg-card border-b border-border p-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => alert("Back")}>
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="font-semibold text-foreground">
                {examData.subject}
              </h1>
              <p className="text-sm text-muted-foreground">
                {examData.chapter.join(", ")} • {currentType}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm">
              <Clock className="w-4 h-4" />
              <span>1:12 remaining</span>
            </div>
            <div className="text-sm text-muted-foreground">
              Question{" "}
              <span className="font-semibold text-foreground">
                {currentQuestionIndex + 1}
              </span>
              /{questions.length}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto p-6">
        {/* Section Info */}
        <div className="edtech-card mb-6">
          <div className="flex items-center justify-between mb-4">
            {/* Type Tabs */}
            <div className="flex gap-2 flex-wrap">
              {questionTypes.map((type, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setCurrentTypeIndex(idx);
                    setCurrentQuestionIndex(0); // reset to first question of that type
                    setShowAnswer(false);
                  }}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition ${
                    idx === currentTypeIndex
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted hover:bg-accent text-muted-foreground"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
            <Progress
              value={((currentQuestionIndex + 1) / questions.length) * 100}
              className="w-32 h-2"
            />
          </div>
        </div>

        {/* Question Card */}
        <div className="edtech-card">
          <div className="mb-4">
            <p className="text-foreground font-medium">
              {currentQuestion?.question.replace(/\*\*/g, "")}
            </p>
          </div>

          {/* Render based on question type */}
          {currentType === "MCQ" ? (
            <div className="space-y-3">
              {currentQuestion?.options.map((option, i) => (
                <label
                  key={i}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition ${
                    answers[currentQuestion.id] === option
                      ? "border-primary bg-primary/10"
                      : "border-border hover:bg-accent"
                  }`}
                >
                  <input
                    type="radio"
                    name={`question-${currentQuestion.id}`}
                    checked={answers[currentQuestion.id] === option}
                    onChange={() => handleAnswerChange(option)}
                  />
                  <span>{option}</span>
                </label>
              ))}
            </div>
          ) : (
            <>
              <Textarea
                placeholder="Write your answer here..."
                className="min-h-[200px] resize-none"
                value={answers[currentQuestion?.id] || ""}
                onChange={(e) => handleAnswerChange(e.target.value)}
              />
            </>
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-6">
          {/* Question Pills */}
          <div className="flex gap-2 flex-wrap">
            {questions.map((_, i) => (
              <button
                key={i}
                onClick={() => {
                  setCurrentQuestionIndex(i);
                  setShowAnswer(false);
                }}
                className={`w-10 h-10 rounded-lg text-sm font-medium ${
                  i === currentQuestionIndex
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted hover:bg-accent text-muted-foreground"
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>

          {/* Navigation Buttons */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit"
              )}
            </Button>
            <Button variant="ghost" onClick={prevQuestion}>
              Previous
            </Button>
            <Button className="gradient-button" onClick={nextQuestion}>
              Next <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UnifiedExam;
