"use client";

import { useState } from "react";
import { ChevronLeft, Clock, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";

const Exam = ({ currentQuestion, setCurrentQuestion, examData }) => {
  const [showAnswer, setShowAnswer] = useState(false);
  const questions = examData.questions;
  const currentQ = questions[currentQuestion];

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Exam Header */}
      <div className="bg-card border-b border-border p-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => alert("Back to setup")}
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="font-semibold text-foreground">
                {examData.subject}
              </h1>
              <p className="text-sm text-muted-foreground">
                {examData.chapter}
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
                {currentQuestion + 1}
              </span>
              /{questions.length}
            </div>
          </div>
        </div>
      </div>

      {/* Exam Content */}
      <div className="max-w-4xl mx-auto p-6">
        {/* Section info */}
        <div className="edtech-card mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold text-foreground">
                Section: {examData.questionType}
              </h2>
              <p className="text-sm text-muted-foreground">
                {questions.length} Questions • 48 minutes
              </p>
            </div>
            <Progress
              value={((currentQuestion + 1) / questions.length) * 100}
              className="w-32 h-2"
            />
          </div>

          <div className="p-4 rounded-lg bg-accent/30">
            <h3 className="font-medium text-foreground mb-2">
              General Instructions
            </h3>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Total Time: 3 hours</li>
              <li>• Number of Questions: {questions.length}</li>
              <li>
                • Allowed Resources: Standard exam reference sheet only (no
                notes or textbooks)
              </li>
              <li>• Scoring: Total marks: 21</li>
            </ul>
          </div>
        </div>

        {/* Question */}
        <div className="edtech-card">
          <div className="flex items-start gap-4 mb-4">
            <span className="text-sm font-medium text-primary bg-primary/10 px-2 py-1 rounded">
              Q{currentQuestion + 1}
            </span>
            <div className="flex-1">
              <p className="text-foreground leading-relaxed">
                {currentQ?.question.replace(/\*\*/g, "")}
              </p>
            </div>
          </div>

          <Textarea
            placeholder="Write your answer here..."
            className="min-h-[200px] resize-none"
          />

          {/* Show/Hide Answer */}
          <div className="mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAnswer((s) => !s)}
            >
              {showAnswer ? "Hide Answer" : "Show Answer"}
            </Button>
            {showAnswer && (
              <div className="mt-2 p-4 bg-accent/20 rounded-lg text-sm">
                {currentQ?.answer.replace(/\*/g, "")}
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-6">
          {/* Question pills */}
          <div className="flex gap-2 flex-wrap">
            {questions.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentQuestion(i)}
                className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${
                  i === currentQuestion
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted hover:bg-accent text-muted-foreground"
                }`}
              >
                Q{i + 1}
              </button>
            ))}
          </div>

          <div className="flex gap-3">
            <Button variant="outline">Submit</Button>
            <Button
              variant="ghost"
              onClick={() =>
                setCurrentQuestion((p) => Math.min(p + 1, questions.length - 1))
              }
            >
              Skip
            </Button>
            <Button
              className="gradient-button"
              onClick={() =>
                setCurrentQuestion((p) => Math.min(p + 1, questions.length - 1))
              }
            >
              Next <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Exam;
