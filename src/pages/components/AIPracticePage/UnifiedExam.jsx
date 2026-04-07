"use client";

import { useState } from "react";
import {
  ChevronLeft,
  Clock,
  ArrowRight,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { config } from "@/../app.config.js";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const local = JSON.parse(localStorage.getItem("schools2ai_auth"));
const token = local.token;

const UnifiedExam = ({ examData }) => {
  const questionTypes = examData.questionType;
  const [currentTypeIndex, setCurrentTypeIndex] = useState(0); // Track SA, LA, MCQ
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({}); // Unified state for all answers
  const [submitting, setSubmitting] = useState(false);
  const [testResults, setTestResults] = useState(null);
  const [showResults, setShowResults] = useState(false);

  const currentType = questionTypes[currentTypeIndex];
  const questions = examData.questions[currentType] || [];
  const currentQuestion = questions[currentQuestionIndex];

  const isLastQuestion =
    currentTypeIndex === questionTypes.length - 1 &&
    currentQuestionIndex === questions.length - 1;

  const handleAnswerChange = (value) => {
    if (!currentQuestion) return;
    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: value,
    }));
  };

  const fetchResults = async () => {
    try {
      const response = await fetch(
        `${config.server}/gini/practice/questions/test/result/${examData.testId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
      if (!response.ok) throw new Error("Failed to fetch results");
      const data = await response.json();
      if (data.isSuccessful) {
        setTestResults(data.result);
        setShowResults(true);
      }
    } catch (error) {
      console.error("Error fetching results:", error);
      toast.error("Failed to load test results.");
    }
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
            Authorization: `Bearer ${token}`,
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

      toast.success("Answer submitted successfully!");

      if (isLastQuestion) {
        await fetchResults();
      } else {
        nextQuestion();
      }
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
    }
  };

  const prevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    } else if (currentTypeIndex > 0) {
      const prevType = questionTypes[currentTypeIndex - 1];
      setCurrentTypeIndex(currentTypeIndex - 1);
      setCurrentQuestionIndex((examData.questions[prevType] || []).length - 1);
    }
  };

  if (showResults && testResults) {
    // Calculate total score and max marks
    const totalScore = testResults.reduce(
      (acc, curr) => acc + (Number(curr.is_correct) || 0),
      0,
    );
    const totalMaxMarks = testResults.reduce(
      (acc, curr) => acc + (Number(curr.marks) || 0),
      0,
    );
    const percentage =
      totalMaxMarks > 0 ? Math.round((totalScore / totalMaxMarks) * 100) : 0;

    // Flatten all questions to compare with results
    const allQuestions = questionTypes.flatMap(
      (type) => examData.questions[type] || [],
    );

    return (
      <div className="min-h-screen bg-muted/30 p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-foreground">Test Results</h1>
            <Button onClick={() => window.location.reload()}>Try Again</Button>
          </div>

          {/* Score Summary Card */}
          <Card className="bg-gradient-to-br from-primary/10 via-background to-background border-primary/20">
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                <div className="text-center md:text-left space-y-1">
                  <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                    Overall Score
                  </p>
                  <div className="flex items-baseline justify-center md:justify-start gap-1">
                    <span className="text-4xl font-bold text-primary">
                      {totalScore}
                    </span>
                    <span className="text-xl text-muted-foreground">
                      /{totalMaxMarks}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col items-center justify-center space-y-2">
                  <div className="relative w-24 h-24">
                    <svg className="w-full h-full" viewBox="0 0 100 100">
                      <circle
                        className="text-muted/20 stroke-current"
                        strokeWidth="8"
                        cx="50"
                        cy="50"
                        r="40"
                        fill="transparent"
                      ></circle>
                      <circle
                        className="text-primary stroke-current"
                        strokeWidth="8"
                        strokeLinecap="round"
                        cx="50"
                        cy="50"
                        r="40"
                        fill="transparent"
                        strokeDasharray="251.2"
                        strokeDashoffset={251.2 - (251.2 * percentage) / 100}
                        transform="rotate(-90 50 50)"
                      ></circle>
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-xl font-bold">{percentage}%</span>
                    </div>
                  </div>
                  <p className="text-xs font-medium text-muted-foreground">
                    Accuracy Rate
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Status</span>
                    <span
                      className={cn(
                        "font-bold",
                        percentage >= 80
                          ? "text-green-500"
                          : percentage >= 50
                            ? "text-yellow-500"
                            : "text-red-500",
                      )}
                    >
                      {percentage >= 80
                        ? "Excellent"
                        : percentage >= 50
                          ? "Good"
                          : "Needs Improvement"}
                    </span>
                  </div>
                  <Progress value={percentage} className="h-2" />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4">
            {allQuestions.map((q, idx) => {
              const result = testResults.find((r) => r.question_id === q.id);
              const isCorrect = result && Number(result.is_correct) > 0;
              const notAttended = !result || result.student_answer === null;

              return (
                <Card
                  key={q.id}
                  className="border-l-4 overflow-hidden"
                  style={{
                    borderLeftColor: notAttended
                      ? "#eab308"
                      : isCorrect
                        ? "#22c55e"
                        : "#ef4444",
                  }}
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span>Question {idx + 1}</span>
                        <span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded">
                          {result?.marks || 1} Marks
                        </span>
                      </div>
                      {notAttended ? (
                        <div className="flex items-center gap-1 text-yellow-500 text-sm">
                          <AlertCircle className="w-4 h-4" /> Not Attended
                        </div>
                      ) : isCorrect ? (
                        <div className="flex items-center gap-1 text-green-500 text-sm">
                          <CheckCircle2 className="w-4 h-4" /> Correct
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-red-500 text-sm">
                          <XCircle className="w-4 h-4" /> Incorrect
                        </div>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="font-medium text-foreground">
                      {q.question.replace(/\*\*/g, "")}
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div className="p-3 bg-muted rounded-lg">
                        <p className="text-muted-foreground mb-1">
                          Your Answer:
                        </p>
                        <p
                          className={
                            notAttended
                              ? "italic text-muted-foreground"
                              : "font-semibold"
                          }
                        >
                          {result?.student_answer || "Not attempted"}
                        </p>
                      </div>
                      <div className="p-3 bg-primary/5 rounded-lg">
                        <p className="text-primary/60 mb-1">Correct Answer:</p>
                        <p className="font-semibold text-primary">
                          {q.answer || result?.answer}
                        </p>
                      </div>
                    </div>

                    {(result?.answer_explanation || q.answer_explanation) && (
                      <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg">
                        <div className="flex items-center gap-2 mb-1 text-blue-700 dark:text-blue-400 font-semibold text-xs">
                          <Info className="w-3.5 h-3.5" />
                          Explanation
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {result?.answer_explanation || q.answer_explanation}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

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
                    answers[currentQuestion?.id] === option
                      ? "border-primary bg-primary/10"
                      : "border-border hover:bg-accent"
                  }`}
                >
                  <input
                    type="radio"
                    name={`question-${currentQuestion?.id}`}
                    checked={answers[currentQuestion?.id] === option}
                    onChange={() => handleAnswerChange(option)}
                    className="w-4 h-4 text-primary"
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
                onClick={() => setCurrentQuestionIndex(i)}
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
              variant="default"
              className={
                isLastQuestion
                  ? "!bg-emerald-600 hover:!bg-emerald-700 !text-white"
                  : ""
              }
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              {isLastQuestion ? "Finish & Submit" : "Submit Answer"}
            </Button>
            <Button variant="ghost" onClick={prevQuestion}>
              Previous
            </Button>
            <Button
              className="gradient-button"
              onClick={nextQuestion}
              disabled={isLastQuestion}
            >
              Next <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UnifiedExam;
