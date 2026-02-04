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
import UnifiedExam from "@/pages/components/AIPracticePage/UnifiedExam";
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
  const [step, setStep] = useState("setup");
  const [selectedChapters, setSelectedChapters] = useState([]);
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedClass, setSelectedClass] = useState("10");
  const [selectedLanguage, setSelectedLanguage] = useState("english");
  const [selectedSubject, setSelectedSubject] = useState("mathematics");
  const [examData, setExamData] = useState({});
  const [loading, setLoading] = useState(false);

  const [questionConfig, setQuestionConfig] = useState({});

  const updateQuestionCount = (typeId, value) => {
    setQuestionConfig((prev) => ({
      ...prev,
      [typeId]: value,
    }));
  };

  const toggleChapter = (chapter) => {
    setSelectedChapters((prev) =>
      prev.includes(chapter)
        ? prev.filter((c) => c !== chapter)
        : [...prev, chapter],
    );
  };

  const toggleType = (type) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type],
    );
  };

  const handleGenerateExam = async () => {
    const data = {
      subject:
        selectedSubject.charAt(0).toUpperCase() + selectedSubject.slice(1),
      // chapter: selectedChapters[0] || "",
      chapter: selectedChapters,
      // questionType: selectedTypes[0]?.toUpperCase() || "",
      questionType: selectedTypes.map((type) => type.toUpperCase()),
      class_: Number(selectedClass),
      language:
        selectedLanguage.charAt(0).toUpperCase() + selectedLanguage.slice(1),
      // questionsCount:
      //   questionConfig[selectedTypes[0]?.toLowerCase() ?? ""] ?? 1,
      questionsCount: questionConfig,
    };

    console.log("Generated Exam Data:", data);
    setLoading(true);

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
        setStep("exam");
        console.log(data);
      }
    } catch (error) {
      setLoading(false);
      console.error(error);
    }
  };

  // if (step === "SA" || step === "LA" || step === "PYQ" || step === "PQ") {
  //   return (
  //     <Exam
  //       currentQuestion={currentQuestion}
  //       setCurrentQuestion={setCurrentQuestion}
  //       examData={examData}
  //     />
  //   );
  // }

  // if (step === "MCQ") {
  //   return (
  //     <MCQ
  //       currentQuestion={currentQuestion}
  //       setCurrentQuestion={setCurrentQuestion}
  //       examData={examData}
  //     />
  //   );
  // }

  if (loading) {
    return <LoadingScreen />;
  }

  if (step === "exam") {
    console.log("exam");
    return <UnifiedExam examData={examData} />;
  }

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => currentYear - i - 1);

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
                    <div className="flex items-center">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleType(type.id)}
                      />
                      <span className="ml-2 text-sm">{type.label}</span>
                    </div>

                    {isSelected && type.id !== "pq" && (
                      <div className="ml-6 flex items-center gap-2">
                        {type.id === "pyq" ? (
                          <>
                            <span className="text-xs text-muted-foreground">
                              Select year range:
                            </span>

                            <div className="flex gap-2">
                              <select
                                value={questionConfig[type.id]?.from ?? ""}
                                onChange={(e) =>
                                  updateQuestionCount(type.id, {
                                    ...questionConfig[type.id],
                                    from: Number(e.target.value),
                                    to: "",
                                  })
                                }
                                className="w-24 px-2 py-1 border rounded-md text-sm"
                              >
                                <option value="" disabled>
                                  From
                                </option>
                                {years.map((year) => (
                                  <option key={year} value={year}>
                                    {year}
                                  </option>
                                ))}
                              </select>

                              <select
                                value={questionConfig[type.id]?.to ?? ""}
                                onChange={(e) =>
                                  updateQuestionCount(type.id, {
                                    ...questionConfig[type.id],
                                    to: Number(e.target.value),
                                  })
                                }
                                className="w-24 px-2 py-1 border rounded-md text-sm"
                                disabled={!questionConfig[type.id]?.from}
                              >
                                <option value="" disabled>
                                  To
                                </option>
                                {years
                                  .filter(
                                    (year) =>
                                      !questionConfig[type.id]?.from ||
                                      year >= questionConfig[type.id].from,
                                  )
                                  .map((year) => (
                                    <option key={year} value={year}>
                                      {year}
                                    </option>
                                  ))}
                              </select>
                            </div>
                          </>
                        ) : (
                          <>
                            <span className="text-xs text-muted-foreground">
                              No. of questions:
                            </span>
                            <input
                              type="number"
                              min={0}
                              max={100}
                              value={questionConfig[type.id] ?? 0}
                              onChange={(e) =>
                                updateQuestionCount(
                                  type.id,
                                  Number(e.target.value),
                                )
                              }
                              className="w-20 px-2 py-1 border rounded-md text-sm"
                            />
                          </>
                        )}
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
                  selectedChapters.length === 0 || // no chapters
                  selectedTypes.length === 0 || // no question types
                  (selectedTypes.includes("pyq") &&
                    (!questionConfig.pyq?.from || !questionConfig.pyq?.to)) // pyq selected but from/to not defined
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
