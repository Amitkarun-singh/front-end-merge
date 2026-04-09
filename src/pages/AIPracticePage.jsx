import { useState, useEffect } from "react";
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
// import Exam from "@/pages/components/AIPracticePage/Exam";
// import MCQ from "@/pages/components/AIPracticePage/MCQ";
import UnifiedExam from "@/pages/components/AIPracticePage/UnifiedExam";
import LoadingScreen from "@/pages/components/LoadingScreen";

import { config } from "../../app.config.js";

/**
 * @typedef {Object} QuestionType
 * @property {string} id - The unique identifier for the question type (e.g., 'mcq', 'sa').
 * @property {string} label - The display label for the question type.
 */

/** @type {QuestionType[]} */
const questionTypes = [
  { id: "mcq", label: "Multiple choice questions [MCQ]" },
  // { id: "sa", label: "Short answers [SA]" },
  // { id: "la", label: "Long answers [LA]" },
  // { id: "pyq", label: "Previous Year Questions [PQ]" },
  // { id: "pq", label: "Predicted This year Questions [PQ]" },
];

/**
 * AIPracticePage Component
 *
 * A comprehensive page for setting up and generating AI-powered mock exams.
 * Users can select class, subject, language, chapters, and specific question types
 * with custom counts or year ranges for previous year questions.
 *
 * @returns {JSX.Element} The rendered AI Practice Page.
 */
export default function AIPracticePage() {
  const [step, setStep] = useState("setup");
  const [selectedChapters, setSelectedChapters] = useState([]);
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedClass, setSelectedClass] = useState("");
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [chapters, setChapters] = useState([]);
  const [selectedLanguage, setSelectedLanguage] = useState("english");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [examData, setExamData] = useState({});
  const [loading, setLoading] = useState(false);

  /**
   * Configuration for question counts or year ranges.
   * Format: { [typeId]: number | { from: number, to: number } }
   */
  const [questionConfig, setQuestionConfig] = useState({});
  const local = JSON.parse(localStorage.getItem("schools2ai_auth"));
  const token = local?.token;

  /**
   * Effect: Fetch available classes on mount.
   */
  useEffect(() => {
    console.log(local.token);
    const fetchClasses = async () => {
      try {
        const response = await fetch(`${config.server}/api/classes`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const result = await response.json();
        if (result.success) {
          setClasses(result.data);
          if (result.data.length > 0) {
            setSelectedClass(result.data[0].class_id.toString());
          }
        }
      } catch (error) {
        console.error("Error fetching classes:", error);
      }
    };

    fetchClasses();
  }, [token]);

  /**
   * Effect: Fetch subjects based on the selected class.
   */
  useEffect(() => {
    const fetchSubjects = async () => {
      if (!selectedClass) return;

      const currentClass = classes.find(
        (cls) => cls.class_id.toString() === selectedClass,
      );
      if (!currentClass) return;

      try {
        const board = local?.user?.board || "CBSE";
        const language =
          selectedLanguage.charAt(0).toUpperCase() + selectedLanguage.slice(1);
        const response = await fetch(
          `${config.server}/api/subjects?class_id=${currentClass.class_id}&board=${board}&language=${language}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );
        const result = await response.json();
        if (result.success) {
          setSubjects(result.data);
          if (result.data.length > 0) {
            setSelectedSubject(result.data[0].subject_name);
          }
        }
      } catch (error) {
        console.error("Error fetching subjects:", error);
      }
    };

    fetchSubjects();
  }, [selectedClass, classes, token]);

  /**
   * Effect: Fetch chapters based on the selected class and subject.
   */
  useEffect(() => {
    const fetchChapters = async () => {
      if (!selectedClass || !selectedSubject) return;

      const currentClass = classes.find(
        (cls) => cls.class_id.toString() === selectedClass,
      );
      const currentSubject = subjects.find(
        (sub) => sub.subject_name === selectedSubject,
      );

      if (!currentClass || !currentSubject) return;

      try {
        const board = local?.user?.board || "CBSE";
        const language =
          selectedLanguage.charAt(0).toUpperCase() + selectedLanguage.slice(1);
        const response = await fetch(
          `${config.server}/api/subjects/${currentClass.class_id}/chapters/${currentSubject.subject_id}?board=${board}&language=${language}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );
        const result = await response.json();
        if (result.success) {
          setChapters(result.data);
          setSelectedChapters([]); // Reset selections when context changes
        }
      } catch (error) {
        console.error("Error fetching chapters:", error);
      }
    };

    fetchChapters();
  }, [
    selectedClass,
    selectedSubject,
    classes,
    subjects,
    token,
    selectedLanguage,
  ]);

  /**
   * Updates the count or configuration for a specific question type.
   *
   * @param {string} typeId - The ID of the question type to update.
   * @param {number|Object} value - The new value or configuration object.
   */
  const updateQuestionCount = (typeId, value) => {
    setQuestionConfig((prev) => ({
      ...prev,
      [typeId]: value,
    }));
  };

  /**
   * Toggles the selection of a chapter.
   *
   * @param {string} chapterName - The name of the chapter to toggle.
   */
  const toggleChapter = (chapterName) => {
    setSelectedChapters((prev) =>
      prev.includes(chapterName)
        ? prev.filter((c) => c !== chapterName)
        : [...prev, chapterName],
    );
  };

  /**
   * Toggles the selection of a question type.
   *
   * @param {string} type - The ID of the question type to toggle.
   */
  const toggleType = (type) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type],
    );
  };

  /**
   * Gathers all selected configurations and requests the AI to generate exam questions.
   * Switches the view to 'exam' mode upon success.
   *
   * @async
   * @function handleGenerateExam
   */
  const handleGenerateExam = async () => {
    const data = {
      subject:
        selectedSubject.charAt(0).toUpperCase() + selectedSubject.slice(1),
      chapter: selectedChapters,
      questionType: selectedTypes.map((type) => type.toUpperCase()),
      class_: Number(selectedClass),
      language:
        selectedLanguage.charAt(0).toUpperCase() + selectedLanguage.slice(1),
      questionsCount: questionConfig,
    };

    console.log("Generated Exam Data:", data);
    setLoading(true);

    try {
      const res = await fetch(`${config.server}/gini/practice/questions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
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
                value={selectedClass}
                onValueChange={(val) => setSelectedClass(val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((cls) => (
                    <SelectItem
                      key={cls.class_id}
                      value={cls.class_id.toString()}
                    >
                      {cls.class_name}
                    </SelectItem>
                  ))}
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
                value={selectedSubject}
                onValueChange={(val) => setSelectedSubject(val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((sub) => (
                    <SelectItem key={sub.subject_id} value={sub.subject_name}>
                      {sub.subject_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="edtech-card">
              <h3 className="font-semibold text-foreground mb-4">Chapters</h3>
              <div className="space-y-2">
                <div className="flex items-center">
                  <Checkbox
                    checked={
                      chapters.length > 0 &&
                      selectedChapters.length === chapters.length
                    }
                    onCheckedChange={(checked) =>
                      setSelectedChapters(
                        checked ? chapters.map((c) => c.chapter_name) : [],
                      )
                    }
                    disabled={chapters.length === 0}
                  />
                  <span className="ml-2 text-sm font-medium">Select All</span>
                </div>
                {chapters.map((chapter) => (
                  <div key={chapter.chapter_id} className="flex items-center">
                    <Checkbox
                      checked={selectedChapters.includes(chapter.chapter_name)}
                      onCheckedChange={() =>
                        toggleChapter(chapter.chapter_name)
                      }
                    />
                    <span className="ml-2 text-sm">{chapter.chapter_name}</span>
                  </div>
                ))}
                {chapters.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No chapters available
                  </p>
                )}
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
                  !selectedSubject || // no subject
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
