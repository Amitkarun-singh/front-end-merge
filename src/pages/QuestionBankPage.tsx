import { useState, useEffect } from "react";
import {
  FileQuestion,
  Clock,
  BookOpen,
  Search,
  Filter,
  ChevronRight,
  Star,
  Calendar,
  Brain,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

import { config } from "../../app.config.js";

/**
 * QuestionBankPage Component
 * 
 * Provides a user interface for browsing and downloading previous year questions (PYQ)
 * and AI-predicted questions based on selected class, subject, and year.
 * 
 * @returns {JSX.Element} The rendered Question Bank Page.
 */
export default function QuestionBankPage() {
  const [selectedSubject, setSelectedSubject] = useState("all");
  const [selectedClass, setSelectedClass] = useState("all");
  const [selectedYear, setSelectedYear] = useState("2025");
  const [previousYearQuestions, setPreviousYearQuestions] = useState([]);
  const [predictQuestions, setPredictYearQuestions] = useState([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);

  const years = [2025, 2024, 2023];
  const token =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxLCJyb2xlIjoiQURNSU4iLCJwZXJtaXNzaW9ucyI6WyJNQU5BR0VfUk9MRVMiLCJNQU5BR0VfU0NIT09MIl0sInNjaG9vbF9pZCI6MSwiaWF0IjoxNzcyNzA2MzM5LCJleHAiOjE3NzM1NzAzMzl9.iQ-jqJx4DXMRzeBMjtf99k_r_HP9f0RgNROYgBsOChw";

  /**
   * Effect: Fetch available classes from the API on component mount.
   */
  useEffect(() => {
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
        }
      } catch (error) {
        console.error("Error fetching classes:", error);
      }
    };

    fetchClasses();
  }, []);

  /**
   * Effect: Fetch subjects whenever the selected class changes.
   * If 'all' is selected for class, it clears the subjects list.
   */
  useEffect(() => {
    const fetchSubjects = async () => {
      if (selectedClass === "all") {
        setSubjects([]);
        setSelectedSubject("all");
        return;
      }

      const currentClass = classes.find(
        (cls) => cls.class_id.toString() === selectedClass || cls.class_name === selectedClass
      );
      
      const className = currentClass ? currentClass.class_name : selectedClass;

      try {
        const response = await fetch(
          `${config.server}/api/subjects/${className.replace(" ", "")}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        const result = await response.json();
        if (result.success) {
          setSubjects(result.data);
        }
      } catch (error) {
        console.error("Error fetching subjects:", error);
      }
    };

    fetchSubjects();
  }, [selectedClass, classes]);

  /**
   * Fetches Previous Year Questions (PYQ) based on current filter selections.
   * 
   * @async
   * @function PYQ
   */
  const PYQ = async () => {
    try {
      const currentClass = classes.find(cls => cls.class_id.toString() === selectedClass);
      const className = currentClass ? currentClass.class_name : selectedClass;

      const queryParams = new URLSearchParams({
        board: "CBSE",
        year: selectedYear,
        className: className,
        subject: selectedSubject,
      });

      const url = `${config.server}/pyq/papers?${queryParams.toString()}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch papers");
      const data = await response.json();
      setPreviousYearQuestions(data);
    } catch (error) {
      console.error("Error fetching papers:", error);
    }
  };

  /**
   * Fetches AI-predicted questions based on current class and subject selections.
   * 
   * @async
   * @function getPredictQuestions
   */
  const getPredictQuestions = async () => {
    try {
      const currentClass = classes.find(cls => cls.class_id.toString() === selectedClass);
      const className = currentClass ? currentClass.class_name : selectedClass;

      const queryParams = new URLSearchParams({
        board: "CBSE",
        className: className,
        subject: selectedSubject,
      });

      const url = `${config.server}/predict/papers?${queryParams.toString()}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch papers");
      const data = await response.json();
      setPredictYearQuestions(data);
    } catch (error) {
      console.error("Error fetching papers:", error);
    }
  };

  return (
    <div className="min-h-screen p-6 lg:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-display text-2xl font-bold text-foreground">
            Question Bank
          </h1>
          <p className="text-muted-foreground mt-1">
            Browse previous year and AI-predicted questions
          </p>
        </div>

        {/* Filters */}
        <div className="edtech-card mb-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-full sm:w-[160px]">
                <SelectValue placeholder="Select Year" />
              </SelectTrigger>
              <SelectContent>
                {years.map((year) => (
                  <SelectItem key={year} value={String(year)}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedClass} onValueChange={setSelectedClass}>
              <SelectTrigger className="w-full sm:w-[160px]">
                <SelectValue placeholder="Class" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classes</SelectItem>
                {classes.map((cls) => (
                  <SelectItem key={cls.class_id} value={cls.class_id.toString()}>
                    {cls.class_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedSubject} onValueChange={setSelectedSubject}>
              <SelectTrigger className="w-full sm:w-[160px]">
                <SelectValue placeholder="Subject" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Subjects</SelectItem>
                {subjects.map((sub) => (
                  <SelectItem key={sub.subject_id} value={sub.subject_name}>
                    {sub.subject_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              className="ml-auto"
              onClick={() => {
                PYQ();
                getPredictQuestions();
              }}
              size="lg"
            >
              Search
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="pyq" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="pyq" className="gap-2">
              <Calendar className="w-4 h-4" />
              Previous Year Questions
            </TabsTrigger>
            <TabsTrigger value="aiq" className="gap-2">
              <Brain className="w-4 h-4" />
              Predicted This Year Questions
            </TabsTrigger>
          </TabsList>

          {/* Previous Year Questions */}
          <TabsContent value="pyq" className="space-y-4">
            {previousYearQuestions.map((q: any, id) => (
              <div
                key={id}
                className="edtech-card hover:shadow-md transition-shadow p-4"
              >
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="text-xs">
                        {q.year}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {q.subject}
                      </Badge>
                      <Badge variant="default" className="text-xs">
                        Class {q.className}
                      </Badge>
                      <Badge variant="destructive" className="text-xs">
                        {q.filePath?.split("/").pop()}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        window.open(
                          `${config.server}/pyq/${q.filePath}`,
                          "_blank"
                        )
                      }
                    >
                      Preview
                    </Button>

                    <Button
                      size="sm"
                      onClick={() =>
                        window.open(
                          `${config.server}/pyq/papers/download?filePath=${encodeURIComponent(
                            q.filePath
                          )}`,
                          "_blank"
                        )
                      }
                    >
                      Download
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </TabsContent>

          {/* Predicted Questions */}
          <TabsContent value="aiq" className="space-y-4">
            <div className="edtech-card bg-primary/5 border-primary/20 mb-4">
              <div className="flex items-center gap-3">
                <Brain className="w-5 h-5 text-primary" />
                <p className="text-sm text-foreground">
                  These questions are AI-predicted based on trends from previous
                  years. The confidence score indicates the likelihood of
                  similar questions appearing.
                </p>
              </div>
            </div>
            {predictQuestions.map((q: any) => (
              <div
                key={q.id}
                className="edtech-card hover:shadow-md transition-shadow p-4"
              >
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="secondary" className="text-xs">
                        {q.subject}
                      </Badge>
                      <Badge variant="default" className="text-xs">
                        Class {q?.class || "12th"}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        window.open(
                          `${config.server}/predict/${q.filePath}`,
                          "_blank"
                        )
                      }
                    >
                      Preview
                    </Button>

                    <Button
                      size="sm"
                      onClick={() =>
                        window.open(
                          `${config.server}/predict/papers/download?filePath=${encodeURIComponent(
                            q.filePath
                          )}`,
                          "_blank"
                        )
                      }
                    >
                      Download
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
