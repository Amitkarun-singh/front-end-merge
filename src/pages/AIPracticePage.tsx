import { useState } from "react";
import { ClipboardList, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Exam from "@/pages/components/AIPracticePage/Exam";
import MCQ from "@/pages/components/AIPracticePage/MCQ";
import LoadingScreen from "@/pages/components/LoadingScreen";

const chapters = [
  "Real Numbers",
  "Polynomials",
  "Pair of Linear Equations in Two Variables",
  "Quadratic Equations",
  "Arithmetic Progressions",
  "Triangles",
  "Coordinate Geometry",
  "Introduction to Trigonometry",
];

const questionTypes = [
  { id: "mcq", label: "Multiple choice questions [MCQ]" },
  { id: "sa", label: "Short answers [SA]" },
  { id: "la", label: "Long answers [LA]" },
  { id: "pyq", label: "Previous Year Questions [PQ]" },
  { id: "pq", label: "Predicted This year Questions [PQ]" },
];

export default function AIPracticePage() {
  const [step, setStep] = useState<
    "setup" | "SA" | "LA" | "PYQ" | "PQ" | "MCQ"
  >("setup");
  const [selectedChapters, setSelectedChapters] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedClass, setSelectedClass] = useState("10");
  const [selectedLanguage, setSelectedLanguage] = useState("english");
  const [selectedSubject, setSelectedSubject] = useState("mathematics");
  const [examData, setExamData] = useState({});
  const [loading, setLoading] = useState(false);
  // Stores number of questions for each selected type
  const [questionConfig, setQuestionConfig] = useState<Record<string, number>>(
    {},
  );

  const updateQuestionCount = (typeId: string, value: number) => {
    setQuestionConfig((prev) => ({
      ...prev,
      [typeId]: value,
    }));
  };

  const toggleChapter = (chapter: string) => {
    setSelectedChapters((prev) =>
      prev.includes(chapter)
        ? prev.filter((c) => c !== chapter)
        : [...prev, chapter],
    );
  };

  const toggleType = (type: string) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [type],
    );
  };

  const handleGenerateExam = async () => {
    // For simplicity, pick the first selected chapter & type
    const data = {
      subject:
        selectedSubject.charAt(0).toUpperCase() + selectedSubject.slice(1),
      chapter: selectedChapters[0] || "",
      questionType: selectedTypes[0]?.toUpperCase() || "", // convert to format like "MCQ"
      class_: Number(selectedClass),
      language:
        selectedLanguage.charAt(0).toUpperCase() + selectedLanguage.slice(1),
      questionsCount:
        questionConfig[selectedTypes[0]?.toLowerCase() ?? ""] ?? 1,
    };

    console.log("Generated Exam Data:", data);
    setLoading(true);

    // setStep("exam");
    try {
      const res = await fetch("http://localhost:3000/gini/practice/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      setLoading(false);
      if (res.ok) {
        const data = await res.json();
        setExamData(data);
        setStep(data.questionType);
        console.log(data);
      }
    } catch (error) {}

    // setStep("exam");
  };

  //  "exam" JSX

  if (step === "SA" || step === "LA" || step === "PYQ" || step === "PQ") {
    return (
      <Exam
        currentQuestion={currentQuestion}
        setCurrentQuestion={setCurrentQuestion}
        examData={examData}
      />
    );
  }

  if (step === "MCQ") {
    return (
      <MCQ
        currentQuestion={currentQuestion}
        setCurrentQuestion={setCurrentQuestion}
        examData={examData}
      />
    );
  }
  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <div className="min-h-screen p-6 lg:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-display text-2xl font-bold text-foreground">
            AI Practice
          </h1>
          <p className="text-muted-foreground mt-1">Create a Mock Exam</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Settings */}
          <div className="space-y-6">
            <div className="edtech-card">
              <h3 className="font-semibold text-foreground mb-4">
                Select Class
              </h3>
              <Select
                defaultValue={selectedClass}
                onValueChange={(val) => setSelectedClass(val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="9">9th Grade</SelectItem>
                  <SelectItem value="10">10th Grade</SelectItem>
                  <SelectItem value="11">11th Grade</SelectItem>
                  <SelectItem value="12">12th Grade</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="edtech-card">
              <h3 className="font-semibold text-foreground mb-4">
                Select Language
              </h3>
              <Select
                defaultValue={selectedLanguage}
                onValueChange={(val) => setSelectedLanguage(val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select language" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="english">English</SelectItem>
                  <SelectItem value="hindi">Hindi</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="edtech-card">
              <h3 className="font-semibold text-foreground mb-4">
                Select Subject
              </h3>
              <Select
                defaultValue={selectedSubject}
                onValueChange={(val) => setSelectedSubject(val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mathematics">Mathematics</SelectItem>
                  <SelectItem value="science">Science</SelectItem>
                  <SelectItem value="english">English</SelectItem>
                  <SelectItem value="physics">Physics</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="edtech-card">
              <h3 className="font-semibold text-foreground mb-4">Chapters</h3>
              <div className="space-y-2">
                <div className="flex items-center">
                  <Checkbox
                    checked={selectedChapters.length === chapters.length}
                    onCheckedChange={(checked) =>
                      setSelectedChapters(checked ? chapters : [])
                    }
                  />
                  <span className="ml-2 text-sm font-medium">Select All</span>
                </div>
                {chapters.map((chapter) => (
                  <div key={chapter} className="flex items-center">
                    <Checkbox
                      checked={selectedChapters.includes(chapter)}
                      onCheckedChange={() => toggleChapter(chapter)}
                    />
                    <span className="ml-2 text-sm">{chapter}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Middle Column - Question Types */}
          <div className="edtech-card">
            <h3 className="font-semibold text-foreground mb-4">
              Question Types
            </h3>
            <div className="space-y-4">
              {questionTypes.map((type) => {
                const isSelected = selectedTypes.includes(type.id);

                return (
                  <div key={type.id} className="space-y-1">
                    {/* Checkbox and label */}
                    <div className="flex items-center">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleType(type.id)}
                      />
                      <span className="ml-2 text-sm">{type.label}</span>
                    </div>

                    {/* Number of questions below */}
                    {isSelected && type.id !== "pyq" && type.id !== "pq" && (
                      <div className="ml-6 flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          No. of questions:
                        </span>
                        <input
                          type="number"
                          min={1}
                          max={100}
                          value={questionConfig[type.id] ?? 1}
                          onChange={(e) =>
                            updateQuestionCount(type.id, Number(e.target.value))
                          }
                          className="w-20 px-2 py-1 border rounded-md text-sm"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column - Summary */}
          <div className="edtech-card">
            <h3 className="font-semibold text-foreground mb-4">
              Mock Exam Summary
            </h3>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-2">
                  Selected options:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {selectedTypes.map((type) => (
                    <span
                      key={type}
                      className="px-2 py-1 rounded-full bg-primary/10 text-primary text-xs"
                    >
                      {type.toUpperCase()}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-2">
                  Selected chapters:
                </p>
                <ul className="text-sm space-y-1">
                  {selectedChapters.slice(0, 5).map((chapter) => (
                    <li key={chapter} className="flex items-center gap-2">
                      <Check className="w-3 h-3 text-primary" />
                      {chapter}
                    </li>
                  ))}
                  {selectedChapters.length > 5 && (
                    <li className="text-muted-foreground">
                      +{selectedChapters.length - 5} more
                    </li>
                  )}
                </ul>
              </div>

              <Button
                className="w-full gradient-button mt-4"
                onClick={handleGenerateExam}
                disabled={
                  selectedChapters.length === 0 || selectedTypes.length === 0
                }
              >
                <ClipboardList className="w-4 h-4 mr-2" />
                Generate Mock Exam
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
