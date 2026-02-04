import { useState } from "react";
import { ChevronLeft, Clock, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

const MCQ = ({ currentQuestion, setCurrentQuestion, examData }) => {
  const [answers, setAnswers] = useState({});

  const question = examData.questions[currentQuestion];
  console.log(currentQuestion);

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <div className="bg-card border-b border-border p-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon">
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="font-semibold text-foreground">
                {examData.subject}
              </h1>
              <p className="text-sm text-muted-foreground">
                {examData.chapter} • MCQ
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
              /{examData.questions.length}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto p-6">
        <div className="edtech-card mb-6">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-foreground">
              Multiple Choice Questions
            </h2>
            <Progress
              value={((currentQuestion + 1) / examData.questions.length) * 100}
              className="w-32 h-2"
            />
          </div>
        </div>

        {/* Question */}
        <div className="edtech-card">
          <div className="mb-4">
            <p className="text-foreground font-medium">{question?.question}</p>
          </div>

          <div className="space-y-3">
            {question?.options.map((option, i) => (
              <label
                key={i}
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition ${
                  answers[currentQuestion] === option
                    ? "border-primary bg-primary/10"
                    : "border-border hover:bg-accent"
                }`}
              >
                <input
                  type="radio"
                  name={`question-${currentQuestion}`}
                  checked={answers[currentQuestion] === option}
                  onChange={() =>
                    setAnswers({ ...answers, [currentQuestion]: option })
                  }
                />
                <span>{option}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-6">
          <div className="flex gap-2 flex-wrap">
            {examData.questions.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentQuestion(i)}
                className={`w-10 h-10 rounded-lg text-sm font-medium ${
                  i === currentQuestion
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted hover:bg-accent text-muted-foreground"
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>

          <div className="flex gap-3">
            <Button variant="outline">Submit</Button>
            <Button
              className="gradient-button"
              onClick={() =>
                setCurrentQuestion((p) =>
                  Math.min(p + 1, examData.questions.length - 1),
                )
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

export default MCQ;
